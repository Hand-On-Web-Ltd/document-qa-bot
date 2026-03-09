# Document QA Bot

Upload a PDF and ask questions about it. The app extracts text from the PDF, chunks it up, and uses OpenAI embeddings + chat to find answers from the document.

## Setup

```bash
npm install
cp .env.example .env
# Add your OpenAI API key to .env
npm start
```

Then open http://localhost:3000

## How It Works

1. Upload a PDF through the web UI
2. The server extracts text using `pdf-parse`
3. Text gets split into chunks (~500 tokens each)
4. Each chunk is embedded using OpenAI's `text-embedding-3-small` model
5. When you ask a question, it finds the most relevant chunks by cosine similarity
6. Those chunks are sent to GPT-4o-mini as context, along with your question
7. You get an answer based on what's actually in the document

## Features

- Split-panel UI: PDF upload on the left, chat on the right
- Handles multi-page PDFs
- Conversational — ask follow-up questions
- Shows which chunks were used to answer

## Requirements

- Node.js 18+
- An [OpenAI](https://platform.openai.com) API key

## Tech Stack

- Express + multer for file uploads
- pdf-parse for text extraction
- OpenAI API for embeddings and chat


## About Hand On Web
We build AI chatbots, voice agents, and automation tools for businesses.
- 🌐 [handonweb.com](https://www.handonweb.com)
- 📧 outreach@handonweb.com
- 📍 Chester, UK

## Licence
MIT
