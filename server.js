import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

// Load API keys
const GEMINI_KEYS = (process.env.GEMINI_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

if (GEMINI_KEYS.length === 0) {
  console.error('❌ No Gemini API keys found. Set GEMINI_API_KEY.');
  process.exit(1);
}

// ✅ Gemini 2.0 Flash endpoint (no space!)
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.send('✅ Gemini 2.0 Flash API is running. Use POST /chat');
});

app.post('/chat', async (req, res) => {
  const { message, messages = [], customPrompt = '', temperature = 0.8 } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, error: 'message is required' });
  }

  // ✅ Simulate system prompt as first user message
  const defaultPrompt = `
You are Kaustav Ray, a smart,genz, creative, and helpful assistant.
Always answer differently — be original.
Never repeat the same sentence structure or style.
  `.trim();

  const fullPrompt = `${customPrompt || defaultPrompt}\n\nUser: ${message}`;

  const contents = [
    ...messages
      .filter(m => m.role && m.content && ['user', 'assistant'].includes(m.role))
      .map(m => ({ role: m.role, parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: fullPrompt }] } // simulated system + user input
  ];

  const generationConfig = {
    temperature: Math.max(0, Math.min(1, temperature)),
    topK: 40,
    topP: 0.9,
    candidateCount: 1
  };

  let lastError = null;

  for (const key of GEMINI_KEYS) {
    try {
      const response = await fetch(`${GEMINI_URL}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig })
      });

      const data = await response.json();

      if (!response.ok) {
        lastError = data.error?.message;
        console.warn(`❗ Gemini error (${key.slice(-5)}): ${lastError}`);
        continue;
      }

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) {
        return res.json({ success: true, reply: reply.trim() });
      }

      lastError = 'Empty response from Gemini';
    } catch (err) {
      lastError = err.message;
      console.error(`❌ Network error: ${err.message}`);
    }
  }

  res.status(500).json({
    success: false,
    error: lastError || 'All Gemini keys failed'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Gemini 2.0 Flash server running on port ${PORT}`);
});