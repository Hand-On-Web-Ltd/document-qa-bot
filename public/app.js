(function () {
  const uploadArea = document.getElementById('upload-area');
  const fileInput = document.getElementById('file-input');
  const docInfo = document.getElementById('doc-info');
  const docName = document.getElementById('doc-name');
  const docStats = document.getElementById('doc-stats');
  const chat = document.getElementById('chat');
  const questionInput = document.getElementById('question');
  const askBtn = document.getElementById('ask-btn');

  uploadArea.addEventListener('click', () => fileInput.click());
  uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.borderColor = '#1a73e8'; });
  uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = '#ccc'; });
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.style.borderColor = '#ccc';
    if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) uploadFile(fileInput.files[0]);
  });

  async function uploadFile(file) {
    uploadArea.classList.add('uploading');
    uploadArea.querySelector('p').textContent = 'Processing...';

    const form = new FormData();
    form.append('pdf', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      docName.textContent = data.name;
      docStats.textContent = `${data.pages} pages, ${data.chunks} chunks indexed`;
      docInfo.classList.remove('hidden');
      questionInput.disabled = false;
      askBtn.disabled = false;
      uploadArea.querySelector('p').textContent = 'Upload a different PDF';
    } catch (err) {
      uploadArea.querySelector('p').textContent = `Error: ${err.message}`;
    } finally {
      uploadArea.classList.remove('uploading');
    }
  }

  async function askQuestion() {
    const q = questionInput.value.trim();
    if (!q) return;

    addMessage(q, 'user');
    questionInput.value = '';
    askBtn.disabled = true;

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      let html = data.answer;
      if (data.sources && data.sources.length) {
        html += `<div class="sources"><strong>Sources:</strong><br>${data.sources.map((s, i) => `${i + 1}. ${s}`).join('<br>')}</div>`;
      }
      addMessage(html, 'bot', true);
    } catch (err) {
      addMessage(`Error: ${err.message}`, 'bot');
    } finally {
      askBtn.disabled = false;
    }
  }

  function addMessage(text, type, isHtml = false) {
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    if (isHtml) div.innerHTML = text;
    else div.textContent = text;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  askBtn.addEventListener('click', askQuestion);
  questionInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') askQuestion();
  });
})();
