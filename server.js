const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Split GEMINI_API_KEY by commas to support multiple keys
const GEMINI_KEYS = (process.env.GEMINI_API_KEY || '')
  .split(',')
  .map(key => key.trim())
  .filter(key => key.length > 0);

if (GEMINI_KEYS.length === 0) {
  console.error("❌ No GEMINI_API_KEYs provided in environment!");
  process.exit(1);
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('🤖 Gemini Chat API is online! Made by Kaustav Ray. POST to /chat to talk.');
});

app.post('/chat', async (req, res) => {
  const { message, messages } = req.body;

  if (!message && (!Array.isArray(messages) || messages.length === 0)) {
    return res.status(400).json({ error: 'Please send a message or messages array.' });
  }

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

  for (const key of GEMINI_KEYS) {
    try {
      const response = await fetch(`${GEMINI_URL}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      const data = await response.json();

      if (response.ok && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const reply = data.candidates[0].content.parts[0].text;
        return res.json({ reply });
      } else {
        console.warn(`⚠️ Key failed (${key.slice(-5)}): ${data.error?.message || 'Unknown error'}`);
      }

    } catch (err) {
      console.warn(`⚠️ Request error with key (${key.slice(-5)}):`, err.message);
    }
  }

  res.status(500).json({ error: 'All GEMINI_API_KEYs failed. Please try again later.' });
});

app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`✅ Gemini Chat API is running at http://localhost:${PORT}`);
});