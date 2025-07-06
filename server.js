const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const GEMINI_KEYS = (process.env.GEMINI_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

if (GEMINI_KEYS.length === 0) {
  console.error('❌ No Gemini API keys found.');
  process.exit(1);
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('✅ Universal Gemini API is online. POST to /chat with "prompt" or "messages". Made by Kaustav Ray.');
});

app.post('/chat', async (req, res) => {
  const { prompt, message, messages, system_prompt } = req.body;

  if (!prompt && !message && (!Array.isArray(messages) || messages.length === 0)) {
    return res.status(400).json({ error: 'Send "prompt", "message", or "messages" array.' });
  }

  const contents = [];

  // Add optional system prompt
  contents.push({
    role: 'user',
    parts: [
      {
        text: system_prompt || "You are a helpful AI created by Kaustav Ray. Respond intelligently and politely."
      }
    ]
  });

  // If using chat history
  if (Array.isArray(messages)) {
    const validMessages = messages
      .filter(m => m.role && m.content)
      .slice(-10);

    contents.push(...validMessages.map(m => ({
      role: m.role === 'bot' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })));
  }

  // If simple message
  else if (message || prompt) {
    contents.push({
      role: 'user',
      parts: [{ text: message || prompt }]
    });
  }

  // Try all API keys
  for (const key of GEMINI_KEYS) {
    try {
      const response = await fetch(`${GEMINI_URL}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 512
          }
        })
      });

      const data = await response.json();

      if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const text = data.candidates[0].content.parts[0].text;
        return res.json({
          reply: text,
          response: text,
          raw: data
        });
      } else {
        console.warn(`⚠️ Failed with key ending in ${key.slice(-5)}: ${data.error?.message}`);
      }
    } catch (err) {
      console.warn(`⚠️ Error with key ending in ${key.slice(-5)}: ${err.message}`);
    }
  }

  res.status(500).json({ error: 'All Gemini API keys failed.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Universal AI Server is live at http://localhost:${PORT}`);
});