const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Static files ---
app.use(express.static(path.join(__dirname), {
  extensions: ['html']
}));

// --- Chat API Proxy ---
app.use('/api/chat', express.json());

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      reply: 'KI-Sparring ist noch nicht konfiguriert. Bitte ANTHROPIC_API_KEY als Environment Variable setzen.'
    });
  }

  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ reply: 'Keine Nachricht erhalten.' });
  }

  // Build conversation for Claude
  const systemPrompt = `Du bist der KI-Sparringspartner des Ateliers der Radikalen Mitte.
Deine Aufgabe ist es, Nutzer:innen herauszufordern, nicht ihnen zuzustimmen.
Du stellst sokratische Gegenfragen, deckst Widersprüche auf und forderst präziseres Denken.
Du bist nicht nett, aber respektvoll. Du bist nicht neutral, sondern provokant im Dienst der Klarheit.
Deine Antworten sind kurz (2-4 Sätze), direkt und auf Deutsch.
Du orientierst dich am Manifest: Urteil statt Meinung, Handlung statt Pose, Widerspruch als Methode.
Vermeide Floskeln. Sei konkret. Fordere heraus.`;

  const messages = [];

  // Add history if present
  if (history && Array.isArray(history)) {
    history.forEach(h => {
      if (h.sender === 'user') {
        messages.push({ role: 'user', content: h.text });
      } else {
        messages.push({ role: 'assistant', content: h.text });
      }
    });
  }

  messages.push({ role: 'user', content: message });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', response.status, errBody);
      return res.status(502).json({
        reply: 'Der Sparringspartner ist gerade nicht verfügbar. Versuche es später erneut.'
      });
    }

    const data = await response.json();
    const reply = data.content && data.content[0] && data.content[0].text
      ? data.content[0].text
      : 'Keine Antwort erhalten.';

    res.json({ reply });

  } catch (err) {
    console.error('Chat proxy error:', err);
    res.status(500).json({
      reply: 'Verbindungsfehler zum Sparringspartner.'
    });
  }
});

// --- SPA fallback: serve index.html for unknown routes ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Atelier server running on port ${PORT}`);
});
