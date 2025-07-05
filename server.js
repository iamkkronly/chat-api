const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('🤖 Gemini Chat API is online! Made by Kaustav Ray. POST to /chat to talk.');
});

app.post('/chat', async (req, res) => {
  const { message, messages = [] } = req.body;

  if (!message && messages.length === 0) {
    return res.status(400).json({ error: 'Please send a message or messages array.' });
  }

  try {
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

    // Add up to 5 previous messages
    const recentMessages = messages
      .filter(m => m.role && m.content && ['user', 'bot'].includes(m.role))
      .slice(-5);

    contents.push(...recentMessages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    })));

    // Add current message
    if (message) {
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });
    }

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();
    console.log('🔁 Gemini API Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Gemini API error' });
    }

    // SAFELY extract the reply
    let reply = '⚠️ No reply from Gemini.';
    try {
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        reply = data.candidates[0].content.parts[0].text;
      }
    } catch (e) {
      console.error('⚠️ Failed to extract reply:', e.message);
    }

    res.json({ reply, response: reply });

  } catch (err) {
    console.error('❌ Server error:', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`✅ Gemini Chat API is running at http://localhost:${PORT}`);
});