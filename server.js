const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Load Gemini API keys from environment
const GEMINI_KEYS = (process.env.GEMINI_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

if (GEMINI_KEYS.length === 0) {
  console.error('❌ No Gemini API keys found. Set GEMINI_API_KEY in environment variables.');
  process.exit(1);
}

// Correct Gemini API endpoint (no space before :generateContent)
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash :generateContent';

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('🤖 Gemini Chat API is online! POST to /chat to talk.');
});

app.post('/chat', async (req, res) => {
  const { message, messages, customPrompt } = req.body;

  const defaultPrompt = `
Your name is Kaustav Ray.
You are a smart, friendly, and creative AI assistant built by Kaustav Ray.
Always answer differently each time — use varied words, tone, and style.
You can be slightly funny, poetic, deep, or curious — but always helpful and respectful.
If asked the same thing again, reply in a new unique way.
Avoid repeating the same sentence structure.
Make each reply feel fresh and personalized.
`;

  let contents = [];

  // Add system prompt as a separate instruction
  contents.push({
    role: 'system',
    parts: [{ text: customPrompt || defaultPrompt }]
  });

  // Add message history if provided
  if (Array.isArray(messages)) {
    const validMessages = messages.filter(
      m => m.role && m.content && ['user', 'assistant'].includes(m.role)
    );

    contents.push(
      ...validMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }))
    );
  } else if (message) {
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });
  }

  const generationConfig = {
    temperature: Math.min(1.0, Math.max(0.0, req.body.temperature || 0.8)),
    topK: Math.min(80, Math.max(1, req.body.topK || 50)),
    topP: Math.min(1.0, Math.max(0.0, req.body.topP || 0.95)),
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
        console.error(
          `⚠️ Gemini API Error (Key: ${key.slice(-5)}): ${data.error?.message}`
        );
        lastError = data.error?.message || 'API request failed';
        continue;
      }

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (reply) {
        return res.json({
          success: true,
          reply: reply.trim(),
          data
        });
      } else {
        lastError = 'No response from Gemini API';
      }
    } catch (err) {
      console.error(`⚠️ Network error: ${err.message}`);
      lastError = err.message;
    }
  }

  res.status(500).json({
    success: false,
    error: lastError || 'All API keys failed. Try again later.'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});