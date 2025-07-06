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
  const { message, messages, customPrompt, contents: customContents } = req.body;

  let contents = [];

  // Allow full custom contents
  if (Array.isArray(customContents) && customContents.length > 0) {
    contents = customContents;
  } else {
    // Add system prompt
    contents.push({
      role: 'user',
      parts: [{
        text: customPrompt || "Your name is Kaustav Ray. You are a helpful and intelligent assistant created by Kaustav Ray. Always respond respectfully, briefly, and accurately."
      }]
    });

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
  }

  // Add randomness settings
  const generationConfig = {
    temperature: 1.5,   // More creativity/randomness (range: 0 - 2)
    topK: 50,           // Choose randomly from top 50
    topP: 0.95,         // Nucleus sampling
    candidateCount: 1
  };

  for (const key of GEMINI_KEYS) {
    try {
      const response = await fetch(`${GEMINI_URL}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig })
      });

      const data = await response.json();

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (response.ok && text) {
        return res.json({
          success: true,
          reply: text.trim(),
          data // full response
        });
      } else {
        console.warn(`⚠️ Key ${key.slice(-5)} failed: ${data?.error?.message}`);
      }
    } catch (err) {
      console.warn(`⚠️ Error with key ${key.slice(-5)}: ${err.message}`);
    }
  }

  res.status(500).json({ success: false, error: 'All Gemini API keys failed. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`✅ Gemini Chat API is running at http://localhost:${PORT}`);
});