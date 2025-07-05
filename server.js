// 📦 Load environment variables (for local development)
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 Gemini API Key from Render Dashboard > Environment Variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ✅ Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// 🌐 Health Check Route
app.get('/', (req, res) => {
  res.send('🤖 Gemini Chat API is online! Made by Kaustav Ray. Use POST /chat to talk to the bot.');
});

// 💬 Chat Route
app.post('/chat', async (req, res) => {
  const { message, messages } = req.body;

  if (!message && (!Array.isArray(messages) || messages.length === 0)) {
    return res.status(400).json({ error: 'Please send a message or a messages array.' });
  }

  try {
    // 🧠 Initial system message / personality
    const contents = [
      {
        role: 'user',
        parts: [
          {
            text: "Your name is Kaustav Ray. You are a helpful and intelligent assistant created by Kaustav Ray. Always respond respectfully, briefly, and accurately."
          }
        ]
      }
    ];

    // 🧠 Use memory (up to 5 exchanges / 10 messages)
    if (messages && Array.isArray(messages)) {
      const limited = messages
        .slice(-10)
        .filter(m => m.role && m.content && ['user', 'bot'].includes(m.role));

      contents.push(...limited.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      })));
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });
    }

    // 📤 Send to Gemini API
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Gemini API error' });
    }

    // ✅ Return reply
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '⚠️ No reply from Gemini.';
    res.json({ reply });

  } catch (err) {
    console.error('❌ Server error:', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// 🔧 Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

// 🚀 Start Server
app.listen(PORT, () => {
  console.log(`✅ Gemini Chat API is running at http://localhost:${PORT}`);
});