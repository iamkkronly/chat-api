// Load environment variables
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Gemini API Key (set this in Render's Environment Variables)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Test Route
app.get('/', (req, res) => {
  res.send('🤖 Gemini Chat API is online! Made by Kaustav Ray. POST to /chat to talk.');
});

// Main Chat Route
app.post('/chat', async (req, res) => {
  const { message, messages } = req.body;

  if (!message && (!Array.isArray(messages) || messages.length === 0)) {
    return res.status(400).json({ error: 'Please send a message or messages array.' });
  }

  try {
    // Personality system message
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

    if (Array.isArray(messages)) {
      const validMessages = messages.filter(m =>
        m.role && m.content && ['user', 'bot'].includes(m.role)
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

    // Send to Gemini
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Gemini API error' });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '⚠️ No reply from Gemini.';
    res.json({ reply });

  } catch (err) {
    console.error('❌ Server error:', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Fallback Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Gemini Chat API is running at http://localhost:${PORT}`);
});