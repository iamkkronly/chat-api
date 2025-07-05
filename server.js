const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000; // Render.com assigns port
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Set in Render dashboard
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Middleware
app.use(cors()); // Allow cross-origin requests (e.g., from client)
app.use(bodyParser.json({ limit: '10mb' })); // Handle large JSON payloads
app.use(bodyParser.urlencoded({ extended: true })); // Handle URL-encoded data

// Home route for testing
app.get('/', (req, res) => {
  res.send('🤖 Gemini Chat API is online! I am Kaustav Ray, created by Kaustav Ray. Use POST /chat to interact.');
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  // Log incoming request for debugging
  console.log('📥 Request body:', req.body);

  // Extract message or messages from request
  const { message, messages } = req.body;

  // Validate input
  if (!message && (!messages || !Array.isArray(messages))) {
    console.warn('⚠️ Invalid input: message or messages array required');
    return res.status(400).json({ error: 'Please provide a message or messages array.' });
  }

  try {
    // Prepare contents for Gemini API
    const contents = [
      {
        parts: [
          {
            text: "Your name is Kaustav Ray. You are a helpful and intelligent assistant created by Kaustav Ray. Always speak respectfully and provide accurate, concise answers."
          }
        ],
        role: 'user' // System prompt as user message
      }
    ];

    // Handle single message or messages array
    if (messages && Array.isArray(messages)) {
      // Validate and limit to 10 messages (5 exchanges)
      const validMessages = messages
        .slice(-10) // Keep last 5 exchanges (10 messages)
        .filter(msg => msg.role && msg.content && ['user', 'bot'].includes(msg.role));
      
      if (validMessages.length === 0) {
        console.warn('⚠️ Invalid messages array: no valid messages');
        return res.status(400).json({ error: 'Messages array contains invalid entries.' });
      }

      // Map to Gemini format
      contents.push(...validMessages.map(msg => ({
        parts: [{ text: msg.content }],
        role: msg.role === 'user' ? 'user' : 'model' // Map bot to model
      })));
    } else {
      // Handle single message
      contents.push({
        parts: [{ text: message }],
        role: 'user'
      });
    }

    // Log contents sent to Gemini
    console.log('📤 Sending to Gemini:', JSON.stringify({ contents }, null, 2));

    // Call Gemini API
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await response.json();

    // Log Gemini response
    console.log('📥 Gemini Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('❌ Gemini API error:', data.error?.message || 'Unknown error');
      return res.status(500).json({ error: data.error?.message || 'Gemini API request failed' });
    }

    // Extract reply
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini';

    // Send response to client
    res.json({ reply });
  } catch (err) {
    console.error('❌ Server error:', err.message);
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unexpected error:', err.stack);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Gemini Chat API server running on http://localhost:${PORT}`);
});