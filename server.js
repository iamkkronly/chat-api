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

// Home route (optional)
app.get('/', (req, res) => {
  res.send('🤖 Gemini Chat API is online! I am Kaustav Ray, made by Kaustav Ray.');
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: "Your name is Kaustav Ray. You are a helpful and intelligent assistant created by Kaustav Ray. Always speak respectfully, stay in character, and mention your identity when appropriate."
              },
              {
                text: userMessage
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'API request failed' });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';
    res.json({ reply });
  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ error: 'Server error while getting Gemini response' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Gemini Chat API server running on http://localhost:${PORT}`);
});