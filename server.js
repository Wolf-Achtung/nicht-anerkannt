const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;


app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// --- Static files ---
app.use(express.static(path.join(__dirname), {
  extensions: ['html']
}));

// --- Shared: call Claude API ---

function getConfiguredApiKey() {
  return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || process.env.AI_API_KEY || '';
}

const DAILY_QUESTIONS_PATH = path.join(__dirname, 'data', 'daily-questions.json');

function normalizeDailyQuestion(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (!entry.titel || !entry.impuls || !entry.frage) return null;
  return {
    titel: String(entry.titel).trim(),
    impuls: String(entry.impuls).trim(),
    frage: String(entry.frage).trim()
  };
}

function loadLocalDailyQuestions() {
  try {
    const raw = fs.readFileSync(DAILY_QUESTIONS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeDailyQuestion).filter(Boolean);
  } catch (error) {
    console.error('Daily questions could not be loaded:', error.message);
    return [];
  }
}

const LOCAL_DAILY_QUESTIONS = loadLocalDailyQuestions();

function dailySeedToIndex(seedInput, length) {
  const seed = String(seedInput || new Date().toISOString().slice(0, 10));
  const hash = seed.split('').reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 7);
  return hash % length;
}

function pickLocalDailyChallenge(seedInput) {
  const seed = String(seedInput || new Date().toISOString().slice(0, 10));
  if (!LOCAL_DAILY_QUESTIONS.length) {
    return {
      titel: 'Denkprobe des Tages',
      impuls: 'Der Tagesgenerator ist gerade nicht erreichbar. Die Denkprobe läuft im Notfallmodus.',
      frage: 'Welche Überzeugung würdest du heute überprüfen, wenn du nur eine prüfen dürftest?',
      source: 'emergency-fallback',
      seed
    };
  }

  const picked = LOCAL_DAILY_QUESTIONS[dailySeedToIndex(seed, LOCAL_DAILY_QUESTIONS.length)];
  return {
    ...picked,
    source: 'local-pool',
    seed
  };
}

async function callClaude(systemPrompt, messages, maxTokens = 300) {
  const apiKey = getConfiguredApiKey();
  if (!apiKey) {
    return { error: 'Anthropic API-Key nicht konfiguriert (ANTHROPIC_API_KEY/CLAUDE_API_KEY).', status: 500 };
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
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
// 1. CHAT – KI-Sparringspartner (+ Stille-Modus)
// ═══════════════════════════════════════════════════════════
app.use('/api/chat', express.json());

app.post('/api/chat', async (req, res) => {
  const { message, history, stille } = req.body;
  if (!message) return res.status(400).json({ reply: 'Keine Nachricht erhalten.' });

  const normalPrompt = `Du bist der KI-Sparringspartner des Ateliers der Radikalen Mitte.
Deine Aufgabe ist es, Nutzer:innen herauszufordern, nicht ihnen zuzustimmen.
Du stellst sokratische Gegenfragen, deckst Widersprüche auf und forderst präziseres Denken.
Du bist nicht nett, aber respektvoll. Du bist nicht neutral, sondern provokant im Dienst der Klarheit.
Deine Antworten sind kurz (2-4 Sätze), direkt und auf Deutsch.
Du orientierst dich am Manifest: Urteil statt Meinung, Handlung statt Pose, Widerspruch als Methode.
Vermeide Floskeln. Sei konkret. Fordere heraus.`;

  const stillePrompt = `Du bist der Stille-Modus des Ateliers der Radikalen Mitte.
WICHTIGSTE REGEL: Du stellst NUR Fragen. Du gibst NIEMALS Antworten, Meinungen, Erklärungen oder Aussagen.
Du bist ein rein sokratischer Gesprächspartner.
Jede deiner Antworten besteht aus GENAU EINER Frage – kurz, präzise, bohrend.
Deine Fragen sollen:
- Annahmen sichtbar machen
- Widersprüche aufdecken
- Blinde Stellen beleuchten
- Zum tieferen Nachdenken zwingen
Du antwortest auf Deutsch. Kein Smalltalk. Keine Einleitungen. Nur die Frage.`;

  const systemPrompt = stille ? stillePrompt : normalPrompt;

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

app.use('/api/client-log', express.json({ limit: '10kb' }));

app.post('/api/client-log', (req, res) => {
  const level = req.body && req.body.level ? String(req.body.level) : 'error';
  const context = req.body && req.body.context ? String(req.body.context) : 'client';
  const message = req.body && req.body.message ? String(req.body.message) : '';

  if (!message) return res.status(400).json({ error: 'Keine Log-Nachricht erhalten.' });

  const shortMessage = message.replace(/\s+/g, ' ').slice(0, 280);
  const line = `[client-log] level=${level} context=${context} message=${shortMessage}`;

  if (level === 'warn') {
    console.warn(line);
  } else {
    console.error(line);
  }

  return res.status(202).json({ ok: true });
});

// ═══════════════════════════════════════════════════════════
// 8. TÄGLICHE DENKPROBE (Daily Challenge)
// ═══════════════════════════════════════════════════════════
app.use('/api/daily', express.json());

app.post('/api/daily', async (req, res) => {
  const { seed } = req.body;
  const resolvedSeed = seed || new Date().toISOString().slice(0, 10);

  if (!getConfiguredApiKey()) {
    return res.json(pickLocalDailyChallenge(resolvedSeed));
  }

  const systemPrompt = `Du bist der Generator der Täglichen Denkprobe des Ateliers der Radikalen Mitte.
Erzeuge eine kurze, scharfe Denkprobe des Tages. Sie soll:
- Ein aktuelles oder zeitloses Thema aufgreifen
- In 2-3 Sätzen eine Spannung formulieren
- Eine einzige, präzise Frage stellen, die in einem Satz beantwortbar ist
- Zum Nachdenken zwingen, nicht zum Googeln

Antworte auf Deutsch im JSON-Format:
{
  "titel": "Kurzer Titel (max 8 Wörter)",
  "impuls": "2-3 Sätze, die die Spannung aufbauen",
  "frage": "Die eine Frage des Tages"
}`;

  const messages = [{ role: 'user', content: `Generiere die Denkprobe des Tages. Seed: ${resolvedSeed}` }];
  const result = await callClaude(systemPrompt, messages, 400);
  if (result.error) {
    return res.json(pickLocalDailyChallenge(resolvedSeed));
  }

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    const normalized = normalizeDailyQuestion(parsed);
    if (normalized) {
      return res.json({ ...normalized, source: 'ai', seed: resolvedSeed });
    }
  } catch (e) {
    // Falls KI-Antwort unlesbar ist, auf lokale Denkprobe ausweichen.
  }

  res.json(pickLocalDailyChallenge(resolvedSeed));
});

// ═══════════════════════════════════════════════════════════
// 9. PERSPEKTIVENWECHSEL-MASCHINE
// ═══════════════════════════════════════════════════════════
app.use('/api/perspektive', express.json());

app.post('/api/perspektive', async (req, res) => {
  const { position, perspektive } = req.body;
  if (!position || !perspektive) return res.status(400).json({ error: 'Position und Perspektive erforderlich.' });

  const systemPrompt = `Du bist die Perspektivenwechsel-Maschine des Ateliers der Radikalen Mitte.
Du erhältst eine Position/Meinung und eine gewählte Perspektive.
Deine Aufgabe: Formuliere die Position EMPATHISCH und ÜBERZEUGEND aus der gewählten Perspektive um.
Nicht als Karikatur, nicht als Strohmann – sondern als bestmögliche Version dieser Perspektive.
Zeige, wie jemand aus dieser Perspektive EHRLICH und INTELLIGENT argumentieren würde.

Antworte auf Deutsch im JSON-Format:
{
  "perspektive": "Name der eingenommenen Perspektive",
  "reformulierung": "Die Position aus der neuen Perspektive (3-5 Sätze, empathisch und überzeugend)",
  "ueberraschung": "Ein Punkt, den die Originalperspektive übersehen hat (1-2 Sätze)",
  "bruecke": "Was beide Perspektiven gemeinsam haben könnten (1-2 Sätze)"
}`;

  const messages = [{
    role: 'user',
    content: `Position: "${position}"\nPerspektive: ${perspektive}`
  }];
  const result = await callClaude(systemPrompt, messages, 700);
  if (result.error) return res.status(result.status).json({ error: result.error });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    res.json(jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text });
  } catch (e) {
    res.json({ raw: result.text });
  }
});

// ═══════════════════════════════════════════════════════════
// 10. KI-GEGENREDE zu Nachrichtenartikeln
// ═══════════════════════════════════════════════════════════
app.use('/api/gegenrede', express.json({ limit: '50kb' }));

app.post('/api/gegenrede', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Kein Artikeltext erhalten.' });
  if (text.length > 8000) return res.status(400).json({ error: 'Text zu lang (max. 8000 Zeichen).' });

  const systemPrompt = `Du bist die KI-Gegenrede des Ateliers der Radikalen Mitte.
Du erhältst den Text eines Nachrichtenartikels oder Meinungsbeitrags.
Deine Aufgabe ist es, den Text kritisch zu durchleuchten – nicht parteiisch, sondern im Dienst besseren Denkens.

Liefere:
1. GEGENPOSITION: Die stärkste Gegenposition zum Artikel (3-4 Sätze)
2. UNGESTELLTE FRAGE: Die wichtigste Frage, die der Artikel nicht stellt (1-2 Sätze)
3. UNGESAGTE ANNAHMEN: 2-3 implizite Annahmen, die der Artikel macht, ohne sie auszusprechen
4. FEHLENDE STIMME: Welche Perspektive/Betroffenengruppe kommt nicht zu Wort?

Sei scharf, aber fair. Keine Polemik. Antworte auf Deutsch im JSON-Format:
{
  "gegenposition": "...",
  "ungestellte_frage": "...",
  "annahmen": ["...", "...", "..."],
  "fehlende_stimme": "..."
}`;

  const messages = [{ role: 'user', content: `Analysiere diesen Artikel:\n\n${text}` }];
  const result = await callClaude(systemPrompt, messages, 1000);
  if (result.error) return res.status(result.status).json({ error: result.error });

  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    res.json(jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.text });
  } catch (e) {
    res.json({ raw: result.text });
  }
});

// ═══════════════════════════════════════════════════════════
// 11. ARGUMENTKARTE (Argument Mapping)
// ═══════════════════════════════════════════════════════════
app.use('/api/argumentkarte', express.json());

app.post('/api/argumentkarte', async (req, res) => {
  const { these } = req.body;
  if (!these) return res.status(400).json({ error: 'Keine These erhalten.' });

  const systemPrompt = `Du bist die Argumentkarte des Ateliers der Radikalen Mitte.
Du erhältst eine These und erstellst eine strukturierte Argumentkarte.
Die Karte hat die These im Zentrum, mit Pro- und Contra-Ästen.
Jeder Ast hat Unterargumente und mögliche Einwände.

Antworte auf Deutsch im JSON-Format:
{
  "these": "Die Originalthese",
  "pro": [
    {"argument": "Pro-Argument 1", "begruendung": "Kurze Begründung", "einwand": "Möglicher Einwand"},
    {"argument": "Pro-Argument 2", "begruendung": "Kurze Begründung", "einwand": "Möglicher Einwand"},
    {"argument": "Pro-Argument 3", "begruendung": "Kurze Begründung", "einwand": "Möglicher Einwand"}
  ],
  "contra": [
    {"argument": "Contra-Argument 1", "begruendung": "Kurze Begründung", "einwand": "Möglicher Einwand"},
    {"argument": "Contra-Argument 2", "begruendung": "Kurze Begründung", "einwand": "Möglicher Einwand"},
    {"argument": "Contra-Argument 3", "begruendung": "Kurze Begründung", "einwand": "Möglicher Einwand"}
  ],
  "synthese": "Eine Synthese-Position, die das Beste beider Seiten ernst nimmt (2-3 Sätze)"
}`;

  const messages = [{ role: 'user', content: `These: "${these}"` }];
  const result = await callClaude(systemPrompt, messages, 1200);
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
