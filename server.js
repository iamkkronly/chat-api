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
  console.error('❌ No Gemini API keys found. Add GEMINI_API_KEY in your environment.');
  process.exit(1);
}

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('🤖 Gemini Chat API is online! POST to /chat to talk. Powered by Kaustav Ray.');
});

app.post('/chat', async (req, res) => {
  const { message, messages } = req.body;

  if (!message && (!Array.isArray(messages) || messages.length === 0)) {
    return res.status(400).json({ error: 'Please send a message or messages array.' });
  }

  const contents = [
    {
      role: 'user',
      parts: [{
        text: "Your name is Kaustav Ray. You are a helpful and intelligent assistant created by Kaustav Ray. Always respond respectfully, briefly, and accurately."
      }]
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

      // Try multiple paths for a valid reply
      let replyText = null;

      // Preferred structured Gemini response
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        replyText = data.candidates[0].content.parts[0].text;
      }

      // Fallback to other common structures
      else if (data?.candidates?.[0]?.content?.text) {
        replyText = data.candidates[0].content.text;
      }
      else if (data?.output) {
        replyText = data.output;
      }
      else if (data?.response) {
        replyText = data.response;
      }
      else if (data?.choices?.[0]?.message?.content) {
        replyText = data.choices[0].message.content;
      }

      // Final fallback — return the full data if something is there
      if (!replyText && typeof data === 'object') {
        replyText = JSON.stringify(data, null, 2);
      }

      if (replyText) {
        return res.json({ reply: replyText });
      } else {
        console.warn(`⚠️ Key ending in ${key.slice(-5)} returned empty or unrecognized structure.`);
      }

    } catch (err) {
      console.warn(`⚠️ Error with key ending in ${key.slice(-5)}: ${err.message}`);
    }
  }

  res.status(500).json({ error: 'All Gemini API keys failed. Please try again later.' });
});

app.listen(PORT, () => {
  console.log(`✅ Gemini Chat API is running at http://localhost:${PORT}`);
});