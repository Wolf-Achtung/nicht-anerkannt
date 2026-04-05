const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Static files ---
app.use(express.static(path.join(__dirname), {
  extensions: ['html']
}));

// --- Shared: call Claude API ---
async function callClaude(systemPrompt, messages, maxTokens = 300) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { error: 'ANTHROPIC_API_KEY nicht konfiguriert.', status: 500 };
  }

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
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('Anthropic API error:', response.status, errBody);
      return { error: 'KI ist gerade nicht verfügbar.', status: 502 };
    }

    const data = await response.json();
    const text = data.content && data.content[0] && data.content[0].text
      ? data.content[0].text
      : '';

    return { text };
  } catch (err) {
    console.error('API call error:', err);
    return { error: 'Verbindungsfehler zur KI.', status: 500 };
  }
}

// ═══════════════════════════════════════════════════════════
// 1. CHAT – KI-Sparringspartner
// ═══════════════════════════════════════════════════════════
app.use('/api/chat', express.json());

app.post('/api/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ reply: 'Keine Nachricht erhalten.' });

  const systemPrompt = `Du bist der KI-Sparringspartner des Ateliers der Radikalen Mitte.
Deine Aufgabe ist es, Nutzer:innen herauszufordern, nicht ihnen zuzustimmen.
Du stellst sokratische Gegenfragen, deckst Widersprüche auf und forderst präziseres Denken.
Du bist nicht nett, aber respektvoll. Du bist nicht neutral, sondern provokant im Dienst der Klarheit.
Deine Antworten sind kurz (2-4 Sätze), direkt und auf Deutsch.
Du orientierst dich am Manifest: Urteil statt Meinung, Handlung statt Pose, Widerspruch als Methode.
Vermeide Floskeln. Sei konkret. Fordere heraus.`;

  const messages = [];
  if (history && Array.isArray(history)) {
    history.forEach(h => {
      messages.push({ role: h.sender === 'user' ? 'user' : 'assistant', content: h.text });
    });
  }
  messages.push({ role: 'user', content: message });

  const result = await callClaude(systemPrompt, messages, 300);
  if (result.error) return res.status(result.status).json({ reply: result.error });
  res.json({ reply: result.text });
});

// ═══════════════════════════════════════════════════════════
// 2. WIDERSPRUCHSSALON – These → 3 Gegenpositionen
// ═══════════════════════════════════════════════════════════
app.use('/api/widerspruch', express.json());

app.post('/api/widerspruch', async (req, res) => {
  const { these } = req.body;
  if (!these) return res.status(400).json({ error: 'Keine These erhalten.' });

  const systemPrompt = `Du bist der Widerspruchssalon des Ateliers der Radikalen Mitte.
Du erhältst eine These und erzeugst genau DREI fundierte Gegenpositionen aus verschiedenen Perspektiven.
Jede Gegenposition soll:
- Aus einer klar benannten Perspektive argumentieren (z.B. libertär, kommunitaristisch, pragmatisch, technologisch, historisch, ökologisch etc.)
- In 2-3 Sätzen das stärkste Gegenargument formulieren
- Respektvoll aber scharf sein
- Keine Strohmann-Argumente verwenden

Antworte auf Deutsch im folgenden JSON-Format (nur das JSON, kein anderer Text):
[
  {"perspektive": "Name der Perspektive", "argument": "Das Gegenargument..."},
  {"perspektive": "Name der Perspektive", "argument": "Das Gegenargument..."},
  {"perspektive": "Name der Perspektive", "argument": "Das Gegenargument..."}
]`;

  const messages = [{ role: 'user', content: `These: "${these}"` }];
  const result = await callClaude(systemPrompt, messages, 800);
  if (result.error) return res.status(result.status).json({ error: result.error });

  try {
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    const gegenpositionen = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    res.json({ these, gegenpositionen });
  } catch (e) {
    res.json({ these, gegenpositionen: [], raw: result.text });
  }
});

// ═══════════════════════════════════════════════════════════
// 3. MANIFEST-ÜBERSETZER – kulturelle Adaptation
// ═══════════════════════════════════════════════════════════
app.use('/api/translate', express.json());

app.post('/api/translate', async (req, res) => {
  const { text, language } = req.body;
  if (!text || !language) return res.status(400).json({ error: 'Text und Sprache erforderlich.' });

  const systemPrompt = `Du bist ein kultureller Übersetzer für das Manifest des Ateliers der Radikalen Mitte.
Deine Aufgabe ist NICHT eine wörtliche Übersetzung, sondern eine KULTURELLE ADAPTATION.
Du übersetzt den Sinn und findest kulturell passende Äquivalente in der Zielsprache.
Wo nötig, erklärst du in einer kurzen Anmerkung, warum du ein bestimmtes Äquivalent gewählt hast.

Antworte auf Deutsch UND in der Zielsprache im folgenden JSON-Format:
{
  "translation": "Die Übersetzung/Adaptation in der Zielsprache",
  "notes": "Kurze Anmerkung zur kulturellen Adaptation (auf Deutsch, 1-2 Sätze)"
}`;

  const messages = [{ role: 'user', content: `Übersetze/adaptiere folgenden Text ins ${language}:\n\n"${text}"` }];
  const result = await callClaude(systemPrompt, messages, 600);
  if (result.error) return res.status(result.status).json({ error: result.error });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { translation: result.text, notes: '' };
    res.json(parsed);
  } catch (e) {
    res.json({ translation: result.text, notes: '' });
  }
});

// ═══════════════════════════════════════════════════════════
// 4. DENKPROBEN-GENERATOR – Thema → strukturierte Denkprobe
// ═══════════════════════════════════════════════════════════
app.use('/api/denkprobe', express.json());

app.post('/api/denkprobe', async (req, res) => {
  const { thema } = req.body;
  if (!thema) return res.status(400).json({ error: 'Kein Thema erhalten.' });

  const systemPrompt = `Du bist der Denkproben-Generator des Ateliers der Radikalen Mitte.
Du erhältst ein aktuelles Thema und erzeugst eine strukturierte Denkprobe im Stil des Ateliers.

Eine Denkprobe hat folgende Struktur:
1. PROBLEMSTELLUNG: Was ist die Kernspannung dieses Themas? (2-3 Sätze)
2. DIE FALSCHE ALTERNATIVE: Welche zwei Extrempositionen werden typischerweise angeboten? (je 1-2 Sätze pro Position)
3. RADIKALE MITTE: Was wäre eine Position, die beide Seiten ernst nimmt, Widerspruch aushält und trotzdem handelt? (2-3 Sätze)
4. OFFENE FRAGEN: Drei Fragen, die niemand sofort beantworten kann und die zum Weiterdenken einladen.

Antworte auf Deutsch im folgenden JSON-Format:
{
  "thema": "Das Thema",
  "problemstellung": "...",
  "falsche_alternative": {"position_a": "...", "position_b": "..."},
  "radikale_mitte": "...",
  "offene_fragen": ["Frage 1", "Frage 2", "Frage 3"]
}`;

  const messages = [{ role: 'user', content: `Thema: "${thema}"` }];
  const result = await callClaude(systemPrompt, messages, 1000);
  if (result.error) return res.status(result.status).json({ error: result.error });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    res.json(parsed || { raw: result.text });
  } catch (e) {
    res.json({ raw: result.text });
  }
});

// ═══════════════════════════════════════════════════════════
// 5. URTEILSTRAINING – Dilemma + Feedback
// ═══════════════════════════════════════════════════════════
app.use('/api/urteil', express.json());

app.post('/api/urteil', async (req, res) => {
  const { action } = req.body;

  // Action: "new" → generiere neues Dilemma
  if (action === 'new') {
    const systemPrompt = `Du bist das Urteilstraining des Ateliers der Radikalen Mitte.
Erzeuge ein komplexes, aktuelles ethisches Dilemma, das kein eindeutiges Richtig oder Falsch hat.
Das Dilemma soll real und relevant sein (Politik, Technologie, Gesellschaft, Bildung, Umwelt).
Es soll verschiedene berechtigte Perspektiven ermöglichen.

Antworte im JSON-Format:
{
  "titel": "Kurzer Titel des Dilemmas",
  "situation": "Beschreibung der Situation in 3-5 Sätzen",
  "frage": "Die zentrale Urteilsfrage, die der/die Nutzer:in beantworten soll"
}`;

    const result = await callClaude(systemPrompt, [{ role: 'user', content: 'Generiere ein neues Dilemma.' }], 600);
    if (result.error) return res.status(result.status).json({ error: result.error });

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      res.json(jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text });
    } catch (e) {
      res.json({ raw: result.text });
    }
    return;
  }

  // Action: "judge" → bewerte das Urteil des Nutzers
  if (action === 'judge') {
    const { dilemma, urteil } = req.body;
    if (!dilemma || !urteil) return res.status(400).json({ error: 'Dilemma und Urteil erforderlich.' });

    const systemPrompt = `Du bist das Urteilstraining des Ateliers der Radikalen Mitte.
Du bewertest NICHT ob ein Urteil richtig oder falsch ist.
Stattdessen prüfst du die QUALITÄT des Denkens:

1. BLINDE STELLE: Welche Perspektive oder welchen Aspekt hat die Person nicht berücksichtigt?
2. STÄRKE: Was ist das stärkste Element der Argumentation?
3. VERTIEFUNG: Eine Folgefrage, die das Denken weitertreibt.

Sei direkt, respektvoll und fordernd. 2-3 Sätze pro Punkt.
Antworte auf Deutsch im JSON-Format:
{
  "blinde_stelle": "...",
  "staerke": "...",
  "vertiefung": "..."
}`;

    const messages = [{
      role: 'user',
      content: `Dilemma: ${dilemma}\n\nUrteil der Person: "${urteil}"`
    }];
    const result = await callClaude(systemPrompt, messages, 600);
    if (result.error) return res.status(result.status).json({ error: result.error });

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      res.json(jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text });
    } catch (e) {
      res.json({ raw: result.text });
    }
    return;
  }

  res.status(400).json({ error: 'Unbekannte Aktion. Verwende "new" oder "judge".' });
});

// ═══════════════════════════════════════════════════════════
// 6. WICKED-PROBLEM-WERKSTATT – geführter Denkprozess
// ═══════════════════════════════════════════════════════════
app.use('/api/wicked', express.json());

app.post('/api/wicked', async (req, res) => {
  const { problem, step, previousAnswers } = req.body;
  if (!problem) return res.status(400).json({ error: 'Kein Problem angegeben.' });

  const steps = {
    1: `Beleuchte das Wicked Problem "${problem}" aus VIER verschiedenen Disziplinen (z.B. Ökonomie, Psychologie, Technologie, Ethik). Für jede Disziplin: 2 Sätze, die einen neuen Aspekt aufzeigen. JSON-Format: {"disziplinen": [{"name": "...", "perspektive": "..."}, ...]}`,
    2: `Zum Problem "${problem}": Beschreibe DREI Stakeholder-Perspektiven – also Menschen/Gruppen, die unterschiedlich betroffen sind. Für jeden: Name, Position, berechtigtes Anliegen. JSON-Format: {"stakeholder": [{"name": "...", "position": "...", "anliegen": "..."}, ...]}`,
    3: `Zum Problem "${problem}" mit bisherigen Erkenntnissen: ${previousAnswers || '(keine)'}\n\nBenenne DREI zentrale Widersprüche in diesem Problem – Spannungen, die sich nicht einfach auflösen lassen. JSON-Format: {"widersprueche": [{"spannung": "...", "warum_unlösbar": "..."}, ...]}`,
    4: `Zum Problem "${problem}" mit bisherigen Erkenntnissen: ${previousAnswers || '(keine)'}\n\nEntwickle DREI Handlungsoptionen, die die Widersprüche ernst nehmen und trotzdem handlungsfähig machen. Keine perfekten Lösungen, sondern kluge Kompromisse. JSON-Format: {"optionen": [{"titel": "...", "beschreibung": "...", "tradeoff": "..."}, ...]}`,
    5: `Fasse zusammen und formuliere EINE zentrale Urteilsfrage, die die Person für sich beantworten muss, um handlungsfähig zu werden. JSON-Format: {"zusammenfassung": "2-3 Sätze", "urteilsfrage": "Die Frage"}`
  };

  const currentStep = step || 1;
  if (!steps[currentStep]) return res.status(400).json({ error: 'Ungültiger Schritt (1-5).' });

  const systemPrompt = `Du bist die Wicked-Problem-Werkstatt des Ateliers der Radikalen Mitte.
Du führst Nutzer:innen durch einen strukturierten Denkprozess zu komplexen Problemen.
Sei konkret, differenziert und vermeide Plattitüden.
Antworte auf Deutsch ausschließlich im angegebenen JSON-Format.`;

  const messages = [{ role: 'user', content: steps[currentStep] }];
  const result = await callClaude(systemPrompt, messages, 800);
  if (result.error) return res.status(result.status).json({ error: result.error });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text };
    res.json({ step: currentStep, ...parsed });
  } catch (e) {
    res.json({ step: currentStep, raw: result.text });
  }
});

// ═══════════════════════════════════════════════════════════
// 7. TEXT-STRESSTEST – Denkprüfung für eigene Texte
// ═══════════════════════════════════════════════════════════
app.use('/api/stresstest', express.json({ limit: '50kb' }));

app.post('/api/stresstest', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Kein Text erhalten.' });
  if (text.length > 5000) return res.status(400).json({ error: 'Text zu lang (max. 5000 Zeichen).' });

  const systemPrompt = `Du bist der Text-Stresstest des Ateliers der Radikalen Mitte.
Du prüfst Texte NICHT auf Grammatik oder Stil, sondern auf DENKQUALITÄT.

Analysiere den Text und gib Feedback in diesen Kategorien:
1. BEHAUPTUNGEN OHNE BEGRÜNDUNG: Stellen, wo etwas behauptet wird, ohne es zu belegen oder herzuleiten.
2. FEHLENDER WIDERSPRUCH: Perspektiven oder Gegenargumente, die ignoriert werden.
3. MEINUNG ALS URTEIL: Stellen, wo persönliche Präferenz als objektive Einschätzung verkauft wird.
4. STÄRKEN: Was gut gedacht ist – wo zeigt sich echtes Urteil?
5. EINE FRAGE: Die wichtigste Frage, die der Text nicht stellt, aber stellen sollte.

Sei direkt und konkret. Zitiere Passagen wo möglich. Antworte auf Deutsch im JSON-Format:
{
  "behauptungen": ["...", "..."],
  "fehlender_widerspruch": ["...", "..."],
  "meinung_als_urteil": ["...", "..."],
  "staerken": ["...", "..."],
  "fehlende_frage": "..."
}`;

  const messages = [{ role: 'user', content: `Prüfe diesen Text:\n\n${text}` }];
  const result = await callClaude(systemPrompt, messages, 1000);
  if (result.error) return res.status(result.status).json({ error: result.error });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    res.json(jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text });
  } catch (e) {
    res.json({ raw: result.text });
  }
});

// --- SPA fallback ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Atelier server running on port ${PORT}`);
});
