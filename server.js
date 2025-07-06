const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Load API keys from environment
const GEMINI_KEYS = (process.env.GEMINI_API_KEY || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

if (GEMINI_KEYS.length === 0) {
  console.error('❌ No Gemini API keys found. Set GEMINI_API_KEY in Render dashboard.');
  process.exit(1);
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Home route
app.get('/', (req, res) => {
  res.send('🤖 Gemini Chat API is online! POST to /chat. Powered by Kaustav Ray.');
});

// Chat route
app.post('/chat', async (req, res) => {
  const { message, messages } = req.body;

  if (!message && (!Array.isArray(messages) || messages.length === 0)) {
    return res.status(400).json({ error: 'Please send a message or messages array.' });
  }

  // System prompt
  const contents = [
    {
      role: 'user',
      parts: [{
        text: "Your name is Kaustav Ray. You are a helpful and intelligent assistant created by Kaustav Ray. Always respond respectfully, briefly, and accurately."
      }]
    }
  ];

  // Add user messages
  if (Array.isArray(messages)) {
    const validMessages = messages.filter(
      m => m.role && m.content && ['user', 'bot'].includes(m.role)
    );

    contents.push(...validMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    })));
  } else if (message) {
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });
  }

  // Try all API keys
  for (const key of GEMINI_KEYS) {
    try {
      const response = await fetch(`${GEMINI_URL}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      const data = await response.json();

      if (!response.ok) {
        console.warn(`⚠️ Gemini API error [key ending in ${key.slice(-5)}]: ${data?.error?.message}`);
        continue;
      }

      // Try to extract a meaningful reply from the Gemini response
      const candidates = data?.candidates || [];

      for (const candidate of candidates) {
        const parts = candidate?.content?.parts || [];
        for (const part of parts) {
          if (part?.text) {
            return res.json({ reply: part.text });
          }
        }
      }

      console.warn(`⚠️ No valid reply found in response with key ending in ${key.slice(-5)}.`);

    } catch (err) {
      console.warn(`⚠️ Network or fetch error with key ending in ${key.slice(-5)}: ${err.message}`);
    }
  }

  // If all keys fail
  res.status(500).json({ error: 'All Gemini API keys failed or gave invalid response. Try again later.' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Gemini Chat API running at http://localhost:${PORT}`);
});