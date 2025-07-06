import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

// Load Gemini API keys from environment variable
const GEMINI_KEYS = (process.env.GEMINI_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

if (GEMINI_KEYS.length === 0) {
  console.error('❌ No Gemini API keys found. Set GEMINI_API_KEY in environment variables.');
  process.exit(1);
}

// ✅ Gemini 2.0 Flash endpoint (NO space before `:generateContent`)
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Health check
app.get('/', (req, res) => {
  res.send('✅ Gemini 2.0 Flash API is running. Use POST /chat to interact.');
});

// Main chat endpoint
app.post('/chat', async (req, res) => {
  const {
    message,
    messages = [],
    customPrompt = '',
    temperature = 0.8,
    topK = 40,
    topP = 0.9
  } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ success: false, error: 'message is required and must be a string' });
  }

  const defaultPrompt = `
Your name is Kaustav Ray.
You are a helpful, intelligent, and creative AI assistant made by Kaustav Ray.
Always give different responses, with variety in tone, language, and format.
Never repeat the same reply twice. Avoid generic or repetitive wording.
`;

  const contents = [
    { role: 'system', parts: [{ text: customPrompt || defaultPrompt }] },
    ...messages
      .filter(m => m.role && m.content && ['user', 'assistant'].includes(m.role))
      .map(m => ({ role: m.role, parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: message }] }
  ];

  const generationConfig = {
    temperature: Math.max(0, Math.min(1, temperature)),
    topK: Math.max(1, Math.min(80, topK)),
    topP: Math.max(0, Math.min(1, topP)),
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
        console.warn(`⚠️ Gemini API (${key.slice(-5)}): ${data.error?.message}`);
        lastError = data.error?.message;
        continue;
      }

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (reply) {
        return res.json({
          success: true,
          reply: reply.trim()
        });
      }

      lastError = 'No valid response from Gemini API';
    } catch (err) {
      console.error(`❌ Network error: ${err.message}`);
      lastError = err.message;
    }
  }

  res.status(500).json({
    success: false,
    error: lastError || 'All API keys failed'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Gemini 2.0 Flash API is running on port ${PORT}`);
});