const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Gemini API keys from environment variable, comma-separated
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
  res.send('🤖 Gemini Chat API is online! POST to /chat with "message", "messages" or "history". Powered by Kaustav Ray.');
});

app.post('/chat', async (req, res) => {
  const { prompt, message, messages, history, system_prompt } = req.body;

  // Validate input presence
  if (
    !prompt &&
    !message &&
    (!Array.isArray(messages) || messages.length === 0) &&
    (!Array.isArray(history) || history.length === 0)
  ) {
    return res.status(400).json({ error: 'Please send "prompt", "message", "messages" or "history".' });
  }

  // Combine messages and history into one array for processing
  const chatHistory = Array.isArray(messages)
    ? messages
    : Array.isArray(history)
    ? history
    : [];

  // Start with a system prompt or default personality
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text:
            system_prompt ||
            "Your name is Kaustav Ray. You are a helpful and intelligent assistant created by Kaustav Ray. Always respond respectfully, briefly, and accurately."
        }
      ]
    }
  ];

  // Add chat history if any
  if (chatHistory.length > 0) {
    const validMessages = chatHistory
      .filter(m => m.role && m.content)
      .slice(-10); // limit to last 10 messages (5 exchanges)

    contents.push(
      ...validMessages.map(m => ({
        role: m.role === 'bot' || m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))
    );
  }
  // Else if just prompt or message string, add as single user message
  else if (prompt || message) {
    contents.push({
      role: 'user',
      parts: [{ text: prompt || message }]
    });
  }

  // Try all Gemini API keys until success
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
            maxOutputTokens: 5120
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

  res.status(500).json({ error: 'All Gemini API keys failed. Please try again later.' });
});

app.listen(PORT, () => {
  console.log(`✅ Gemini Chat API running at http://localhost:${PORT}`);
});