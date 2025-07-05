const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Set in Render
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

app.use(cors());
app.use(bodyParser.json());

// Home route
app.get('/', (req, res) => {
  res.send('🤖 Chat API is online! I am Kaustav Ray, made by Kaustav Ray.');
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  const { message, messages } = req.body;

  // Validate input: prefer messages array, fallback to single message
  if (!messages && !message) {
    return res.status(400).json({ error: 'Messages array or message is required.' });
  }

  try {
    // Prepare contents for Gemini API
    const contents = [
      {
        parts: [
          {
            text: "Your name is Kaustav Ray. You are a helpful and intelligent assistant created by Kaustav Ray. Always speak respectfully."
          }
        ],
        role: 'user' // System prompt as user message
      }
    ];

    // Use messages array if provided, else use single message
    if (messages && Array.isArray(messages)) {
      contents.push(...messages.map(msg => ({
        parts: [{ text: msg.content }],
        role: msg.role === 'user' ? 'user' : 'model' // Map bot to model
      })));
    } else {
      contents.push({
        parts: [{ text: message }],
        role: 'user'
      });
    }

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'API request failed' });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';
    res.json({ reply });
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: 'Server error while getting response' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Chat API server running on http://localhost:${PORT}`);
});