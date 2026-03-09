require('dotenv').config();
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory store for the current document
let docChunks = [];
let docEmbeddings = [];
let docName = '';

function chunkText(text, maxLen = 1500) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + ' ' + s).length > maxLen && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += ' ' + s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function cosineSim(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

app.post('/api/upload', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const data = await pdfParse(req.file.buffer);
    const text = data.text;
    if (!text.trim()) return res.status(400).json({ error: 'Could not extract text from PDF' });

    docChunks = chunkText(text);
    docName = req.file.originalname;

    // Get embeddings for all chunks
    const embResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: docChunks
    });
    docEmbeddings = embResponse.data.map(d => d.embedding);

    res.json({ name: docName, chunks: docChunks.length, pages: data.numpages });
  } catch (err) {
    console.error('Upload failed:', err.message);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

app.post('/api/ask', async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'No question provided' });
  if (docChunks.length === 0) return res.status(400).json({ error: 'Upload a PDF first' });

  try {
    // Embed the question
    const qEmb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question
    });
    const qVector = qEmb.data[0].embedding;

    // Find top 3 most relevant chunks
    const scored = docEmbeddings.map((emb, i) => ({ i, score: cosineSim(qVector, emb) }));
    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, 3).map(s => docChunks[s.i]);

    const context = topChunks.join('\n\n---\n\n');

    const chat = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You answer questions based on the provided document excerpts. If the answer isn't in the excerpts, say so. Be direct and concise. Document: "${docName}"`
        },
        {
          role: 'user',
          content: `Document excerpts:\n\n${context}\n\nQuestion: ${question}`
        }
      ],
      temperature: 0.3
    });

    res.json({
      answer: chat.choices[0].message.content,
      sources: topChunks.map(c => c.substring(0, 150) + '...')
    });
  } catch (err) {
    console.error('Ask failed:', err.message);
    res.status(500).json({ error: 'Failed to get answer' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
