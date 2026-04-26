const express = require('express');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust the first proxy hop (Netlify/Render/Fly/Cloudflare etc.) so that
// `req.ip` resolves to the real client and per-IP rate limiting works.
// Override with TRUST_PROXY env var (e.g. "2" for two proxy hops, "false" to disable).
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy === 'false') {
  app.set('trust proxy', false);
} else if (trustProxy && /^\d+$/.test(trustProxy)) {
  app.set('trust proxy', Number(trustProxy));
} else {
  app.set('trust proxy', 1);
}

// --- Security headers ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// --- CORS: restrict to known origins ---
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://nicht-anerkannt.info,https://www.nicht-anerkannt.info').split(',');

app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// --- Rate limiting for AI endpoints ---
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte warte eine Minute. / Too many requests. Please wait a minute.' }
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Nachrichten. Bitte warte eine Minute. / Too many messages. Please wait a minute.' }
});

// --- i18n infrastructure for API responses ---
const SUPPORTED_LANGS = ['de', 'en'];
const DEFAULT_LANG = 'de';
const FALLBACK_LANG = 'en';

function getLang(req) {
  const candidate = (req && req.body && req.body.lang) || (req && req.query && req.query.lang) || DEFAULT_LANG;
  return SUPPORTED_LANGS.includes(candidate) ? candidate : DEFAULT_LANG;
}

const LANG_INSTRUCTION = {
  de: 'Antworte ausschließlich auf Deutsch.',
  en: 'Respond exclusively in English.'
};

const ERR = {
  de: {
    apiKeyMissing: 'Anthropic API-Key nicht konfiguriert (ANTHROPIC_API_KEY/CLAUDE_API_KEY).',
    aiUnavailable: 'KI ist gerade nicht verfügbar.',
    connection: 'Verbindungsfehler zur KI.',
    noMessage: 'Keine Nachricht erhalten.',
    noThese: 'Keine These erhalten.',
    noText: 'Kein Text erhalten.',
    noThema: 'Kein Thema erhalten.',
    noPosition: 'Position und Perspektive erforderlich.',
    noProblem: 'Kein Problem angegeben.',
    noLangText: 'Text und Sprache erforderlich.',
    dilemmaRequired: 'Dilemma und Urteil erforderlich.',
    unknownAction: 'Unbekannte Aktion. Verwende "new" oder "judge".',
    invalidStep: 'Ungültiger Schritt (1-5).',
    textTooLong5k: 'Text zu lang (max. 5000 Zeichen).',
    textTooLong8k: 'Text zu lang (max. 8000 Zeichen).',
    noLogMessage: 'Keine Log-Nachricht erhalten.'
  },
  en: {
    apiKeyMissing: 'Anthropic API key not configured (ANTHROPIC_API_KEY/CLAUDE_API_KEY).',
    aiUnavailable: 'AI is currently unavailable.',
    connection: 'Connection error to the AI.',
    noMessage: 'No message received.',
    noThese: 'No thesis received.',
    noText: 'No text received.',
    noThema: 'No topic received.',
    noPosition: 'Position and perspective required.',
    noProblem: 'No problem specified.',
    noLangText: 'Text and language required.',
    dilemmaRequired: 'Dilemma and judgment required.',
    unknownAction: 'Unknown action. Use "new" or "judge".',
    invalidStep: 'Invalid step (1-5).',
    textTooLong5k: 'Text too long (max. 5000 characters).',
    textTooLong8k: 'Text too long (max. 8000 characters).',
    noLogMessage: 'No log message received.'
  }
};

function err(lang, key) {
  return (ERR[lang] && ERR[lang][key]) || ERR[DEFAULT_LANG][key] || key;
}

// --- Language routing (before static) ---
// New canonical URL structure:
//   /<lang>/         → <lang>-root index   (mapped from ./index.html or ./en/index.html)
//   /<lang>/<page>   → <lang>-subpage      (mapped from ./pages/<page>.html or ./en/pages/<page>.html)
// Legacy URLs (/index.html, /pages/*.html, /en/index.html, /en/pages/*.html)
// are answered with a permanent redirect (301) to the canonical form.
// Any random path falls through to the static middleware and, failing that,
// to the language-aware SPA fallback at the bottom of this file.

const LANG_URL = {
  de: { root: path.join(__dirname, 'de', 'index.html'),  pagesDir: path.join(__dirname, 'de') },
  en: { root: path.join(__dirname, 'en', 'index.html'),  pagesDir: path.join(__dirname, 'en') }
};

const PAGE_NAME_RE = /^[a-z0-9][a-z0-9-]{0,63}$/i;

function resolvePage(lang, name) {
  const cfg = LANG_URL[lang];
  if (!cfg || !PAGE_NAME_RE.test(name || '')) return null;
  const file = path.join(cfg.pagesDir, name + '.html');
  if (!file.startsWith(cfg.pagesDir + path.sep)) return null; // path-traversal guard
  return fs.existsSync(file) ? file : null;
}

function detectRequestLang(req) {
  // cookie preference wins
  const cookieMatch = /(?:^|;\s*)atelier-lang=([a-z]{2})/i.exec(req.headers.cookie || '');
  if (cookieMatch && SUPPORTED_LANGS.includes(cookieMatch[1].toLowerCase())) {
    return cookieMatch[1].toLowerCase();
  }
  // Accept-Language parsing (simple: first supported match)
  const header = String(req.headers['accept-language'] || '').toLowerCase();
  const parts = header.split(',').map((s) => s.trim().slice(0, 2)).filter(Boolean);
  for (const p of parts) {
    if (SUPPORTED_LANGS.includes(p)) return p;
  }
  return DEFAULT_LANG;
}

// Language home — /de/, /en/
SUPPORTED_LANGS.forEach((lang) => {
  app.get(['/' + lang, '/' + lang + '/'], (req, res) => {
    res.sendFile(LANG_URL[lang].root);
  });
});

// Language sub-page — /de/<page>, /en/<page>
SUPPORTED_LANGS.forEach((lang) => {
  app.get('/' + lang + '/:page', (req, res, next) => {
    const file = resolvePage(lang, req.params.page);
    if (!file) return next();
    res.sendFile(file);
  });
});

// Legacy redirects: old /pages/* and /en/pages/* paths → new canonical form
app.get('/index.html', (req, res) => res.redirect(301, '/' + DEFAULT_LANG + '/'));
app.get('/en/index.html', (req, res) => res.redirect(301, '/en/'));
app.get('/pages/:page.html', (req, res) => {
  if (!PAGE_NAME_RE.test(req.params.page)) return res.redirect(301, '/' + DEFAULT_LANG + '/');
  res.redirect(301, '/' + DEFAULT_LANG + '/' + req.params.page);
});
app.get('/en/pages/:page.html', (req, res) => {
  if (!PAGE_NAME_RE.test(req.params.page)) return res.redirect(301, '/en/');
  res.redirect(301, '/en/' + req.params.page);
});

// Root — detect user language, redirect to /<lang>/
app.get('/', (req, res) => {
  res.redirect(302, '/' + detectRequestLang(req) + '/');
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

/**
 * Resolve a field that is either a multilingual object ({de,en,...}) or a
 * plain string (legacy schema) into the localized string for `lang`,
 * falling back across FALLBACK_LANG → DEFAULT_LANG → any other language.
 */
function localize(value, lang) {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    if (typeof value[lang] === 'string') return value[lang];
    if (typeof value[FALLBACK_LANG] === 'string') return value[FALLBACK_LANG];
    if (typeof value[DEFAULT_LANG] === 'string') return value[DEFAULT_LANG];
    const any = Object.keys(value).find((k) => typeof value[k] === 'string');
    if (any) return value[any];
  }
  return '';
}

/**
 * Normalize a daily-questions entry. Accepts both the new per-field
 * multilingual schema and the legacy flat-string schema.
 */
function normalizeDailyQuestion(entry, lang) {
  if (!entry || typeof entry !== 'object') return null;
  const titel = localize(entry.titel, lang);
  const impuls = localize(entry.impuls, lang);
  const frage = localize(entry.frage, lang);
  if (!titel || !impuls || !frage) return null;
  return { titel: titel.trim(), impuls: impuls.trim(), frage: frage.trim() };
}

function loadLocalDailyQuestions() {
  try {
    const raw = fs.readFileSync(DAILY_QUESTIONS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Daily questions could not be loaded:', error.message);
    return [];
  }
}

// Raw entries (language-agnostic); localization happens at pick time.
const LOCAL_DAILY_QUESTIONS_RAW = loadLocalDailyQuestions();

function dailySeedToIndex(seedInput, length) {
  const seed = String(seedInput || new Date().toISOString().slice(0, 10));
  const hash = seed.split('').reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 7);
  return hash % length;
}

const EMERGENCY_FALLBACK = {
  de: {
    titel: 'Denkprobe des Tages',
    impuls: 'Der Tagesgenerator ist gerade nicht erreichbar. Die Denkprobe läuft im Notfallmodus.',
    frage: 'Welche Überzeugung würdest du heute überprüfen, wenn du nur eine prüfen dürftest?'
  },
  en: {
    titel: 'Thinking Challenge of the Day',
    impuls: 'The daily generator is currently unreachable. The thinking challenge is running in emergency mode.',
    frage: 'Which conviction would you examine today, if you were only allowed to examine one?'
  }
};

function pickLocalDailyChallenge(seedInput, lang = DEFAULT_LANG) {
  const seed = String(seedInput || new Date().toISOString().slice(0, 10));

  if (!LOCAL_DAILY_QUESTIONS_RAW.length) {
    return { ...(EMERGENCY_FALLBACK[lang] || EMERGENCY_FALLBACK[DEFAULT_LANG]), source: 'emergency-fallback', seed };
  }

  // Seed picks the same entry regardless of language; localization is per field.
  const raw = LOCAL_DAILY_QUESTIONS_RAW[dailySeedToIndex(seed, LOCAL_DAILY_QUESTIONS_RAW.length)];
  const picked = normalizeDailyQuestion(raw, lang);
  if (!picked) {
    return { ...(EMERGENCY_FALLBACK[lang] || EMERGENCY_FALLBACK[DEFAULT_LANG]), source: 'emergency-fallback', seed };
  }
  return { ...picked, source: 'local-pool', seed };
}

async function callClaude(systemPrompt, messages, maxTokens = 300, lang = DEFAULT_LANG) {
  const apiKey = getConfiguredApiKey();
  if (!apiKey) {
    return { error: err(lang, 'apiKeyMissing'), status: 500 };
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

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
      return { error: err(lang, 'aiUnavailable'), status: 502 };
    }

    const data = await response.json();
    const text = data.content && data.content[0] && data.content[0].text
      ? data.content[0].text
      : '';

    return { text };
  } catch (e) {
    console.error('API call error:', e);
    return { error: err(lang, 'connection'), status: 500 };
  }
}

/**
 * Parse JSON object or array from Claude's text response.
 * @param {string} text - Raw response text
 * @param {'object'|'array'} type - Expected JSON shape
 * @param {*} fallback - Value returned when parsing fails
 * @returns {*} Parsed JSON or fallback
 */
function parseClaudeJSON(text, type, fallback) {
  try {
    const pattern = type === 'array' ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
    const match = text.match(pattern);
    if (match) return JSON.parse(match[0]);
  } catch (e) {
    // Parsing failed — return fallback
  }
  return fallback !== undefined ? fallback : { raw: text };
}

// ═══════════════════════════════════════════════════════════
// 1. CHAT – KI-Sparringspartner (+ Stille-Modus)
// ═══════════════════════════════════════════════════════════
app.use('/api/chat', express.json({ limit: '50kb' }));

app.post('/api/chat', chatLimiter, async (req, res) => {
  const { message, history, stille } = req.body;
  const lang = getLang(req);
  if (!message || typeof message !== 'string') return res.status(400).json({ reply: err(lang, 'noMessage') });

  const normalPrompt = `Du bist der KI-Sparringspartner des Ateliers der Radikalen Mitte.
Deine Aufgabe ist es, Nutzer:innen herauszufordern, nicht ihnen zuzustimmen.
Du stellst sokratische Gegenfragen, deckst Widersprüche auf und forderst präziseres Denken.
Du bist nicht nett, aber respektvoll. Du bist nicht neutral, sondern provokant im Dienst der Klarheit.
Deine Antworten sind kurz (2-4 Sätze), direkt.
Du orientierst dich am Manifest: Urteil statt Meinung, Handlung statt Pose, Widerspruch als Methode.
Vermeide Floskeln. Sei konkret. Fordere heraus.
${LANG_INSTRUCTION[lang]}`;

  const stillePrompt = `Du bist der Stille-Modus des Ateliers der Radikalen Mitte.
WICHTIGSTE REGEL: Du stellst NUR Fragen. Du gibst NIEMALS Antworten, Meinungen, Erklärungen oder Aussagen.
Du bist ein rein sokratischer Gesprächspartner.
Jede deiner Antworten besteht aus GENAU EINER Frage – kurz, präzise, bohrend.
Deine Fragen sollen:
- Annahmen sichtbar machen
- Widersprüche aufdecken
- Blinde Stellen beleuchten
- Zum tieferen Nachdenken zwingen
Kein Smalltalk. Keine Einleitungen. Nur die Frage.
${LANG_INSTRUCTION[lang]}`;

  const systemPrompt = stille ? stillePrompt : normalPrompt;

  const messages = [];
  if (history && Array.isArray(history)) {
    history.forEach(h => {
      messages.push({ role: h.sender === 'user' ? 'user' : 'assistant', content: h.text });
    });
  }
  messages.push({ role: 'user', content: message });

  const result = await callClaude(systemPrompt, messages, 300, lang);
  if (result.error) return res.status(result.status).json({ reply: result.error });
  res.json({ reply: result.text });
});

// ═══════════════════════════════════════════════════════════
// 2. WIDERSPRUCHSSALON – These → 3 Gegenpositionen
// ═══════════════════════════════════════════════════════════
app.use('/api/widerspruch', express.json({ limit: '50kb' }));

app.post('/api/widerspruch', aiLimiter, async (req, res) => {
  const { these } = req.body;
  const lang = getLang(req);
  if (!these || typeof these !== 'string') return res.status(400).json({ error: err(lang, 'noThese') });

  const systemPrompt = `Du bist der Widerspruchssalon des Ateliers der Radikalen Mitte.
Du erhältst eine These und erzeugst genau DREI fundierte Gegenpositionen aus verschiedenen Perspektiven.
Jede Gegenposition soll:
- Aus einer klar benannten Perspektive argumentieren (z.B. libertär, kommunitaristisch, pragmatisch, technologisch, historisch, ökologisch etc.)
- In 2-3 Sätzen das stärkste Gegenargument formulieren
- Respektvoll aber scharf sein
- Keine Strohmann-Argumente verwenden

${LANG_INSTRUCTION[lang]} Antworte im folgenden JSON-Format (nur das JSON, kein anderer Text). Die JSON-Schlüsselnamen bleiben wie angegeben (auf Deutsch), nur die Werte sind in der Zielsprache:
[
  {"perspektive": "Name der Perspektive", "argument": "Das Gegenargument..."},
  {"perspektive": "Name der Perspektive", "argument": "Das Gegenargument..."},
  {"perspektive": "Name der Perspektive", "argument": "Das Gegenargument..."}
]`;

  const messages = [{ role: 'user', content: `These: "${these}"` }];
  const result = await callClaude(systemPrompt, messages, 800, lang);
  if (result.error) return res.status(result.status).json({ error: result.error });

  const gegenpositionen = parseClaudeJSON(result.text, 'array', []);
  res.json({ these, gegenpositionen: Array.isArray(gegenpositionen) ? gegenpositionen : [] });
});

// ═══════════════════════════════════════════════════════════
// 3. MANIFEST-ÜBERSETZER – kulturelle Adaptation
// ═══════════════════════════════════════════════════════════
app.use('/api/translate', express.json({ limit: '50kb' }));

app.post('/api/translate', aiLimiter, async (req, res) => {
  const { text, language } = req.body;
  const lang = getLang(req);
  if (!text || typeof text !== 'string' || !language || typeof language !== 'string') return res.status(400).json({ error: err(lang, 'noLangText') });

  const systemPrompt = `Du bist ein kultureller Übersetzer für das Manifest des Ateliers der Radikalen Mitte.
Deine Aufgabe ist NICHT eine wörtliche Übersetzung, sondern eine KULTURELLE ADAPTATION.
Du übersetzt den Sinn und findest kulturell passende Äquivalente in der Zielsprache.
Wo nötig, erklärst du in einer kurzen Anmerkung, warum du ein bestimmtes Äquivalent gewählt hast.

Antworte im folgenden JSON-Format. Die "translation" ist in der Zielsprache (${language}); die "notes" in ${lang === 'en' ? 'English' : 'Deutsch'}:
{
  "translation": "Die Übersetzung/Adaptation in der Zielsprache",
  "notes": "Kurze Anmerkung zur kulturellen Adaptation (1-2 Sätze)"
}`;

  const messages = [{ role: 'user', content: `Übersetze/adaptiere folgenden Text ins ${language}:\n\n"${text}"` }];
  const result = await callClaude(systemPrompt, messages, 600, lang);
  if (result.error) return res.status(result.status).json({ error: result.error });

  res.json(parseClaudeJSON(result.text, 'object', { translation: result.text, notes: '' }));
});

// ═══════════════════════════════════════════════════════════
// 4. DENKPROBEN-GENERATOR – Thema → strukturierte Denkprobe
// ═══════════════════════════════════════════════════════════
app.use('/api/denkprobe', express.json({ limit: '50kb' }));

app.post('/api/denkprobe', aiLimiter, async (req, res) => {
  const { thema } = req.body;
  const lang = getLang(req);
  if (!thema || typeof thema !== 'string') return res.status(400).json({ error: err(lang, 'noThema') });

  const systemPrompt = `Du bist der Denkproben-Generator des Ateliers der Radikalen Mitte.
Du erhältst ein aktuelles Thema und erzeugst eine strukturierte Denkprobe im Stil des Ateliers.

Eine Denkprobe hat folgende Struktur:
1. PROBLEMSTELLUNG: Was ist die Kernspannung dieses Themas? (2-3 Sätze)
2. DIE FALSCHE ALTERNATIVE: Welche zwei Extrempositionen werden typischerweise angeboten? (je 1-2 Sätze pro Position)
3. RADIKALE MITTE: Was wäre eine Position, die beide Seiten ernst nimmt, Widerspruch aushält und trotzdem handelt? (2-3 Sätze)
4. OFFENE FRAGEN: Drei Fragen, die niemand sofort beantworten kann und die zum Weiterdenken einladen.

${LANG_INSTRUCTION[lang]} JSON-Schlüsselnamen bleiben wie angegeben, nur die Werte in der Zielsprache:
{
  "thema": "Das Thema",
  "problemstellung": "...",
  "falsche_alternative": {"position_a": "...", "position_b": "..."},
  "radikale_mitte": "...",
  "offene_fragen": ["Frage 1", "Frage 2", "Frage 3"]
}`;

  const messages = [{ role: 'user', content: `Thema: "${thema}"` }];
  const result = await callClaude(systemPrompt, messages, 1000, lang);
  if (result.error) return res.status(result.status).json({ error: result.error });

  res.json(parseClaudeJSON(result.text, 'object'));
});

// ═══════════════════════════════════════════════════════════
// 5. URTEILSTRAINING – Dilemma + Feedback
// ═══════════════════════════════════════════════════════════
app.use('/api/urteil', express.json({ limit: '50kb' }));

app.post('/api/urteil', aiLimiter, async (req, res) => {
  const { action } = req.body;
  const lang = getLang(req);

  // Action: "new" → generiere neues Dilemma
  if (action === 'new') {
    const systemPrompt = `Du bist das Urteilstraining des Ateliers der Radikalen Mitte.
Erzeuge ein komplexes, aktuelles ethisches Dilemma, das kein eindeutiges Richtig oder Falsch hat.
Das Dilemma soll real und relevant sein (Politik, Technologie, Gesellschaft, Bildung, Umwelt).
Es soll verschiedene berechtigte Perspektiven ermöglichen.

${LANG_INSTRUCTION[lang]} JSON-Schlüsselnamen bleiben wie angegeben, nur die Werte in der Zielsprache:
{
  "titel": "Kurzer Titel des Dilemmas",
  "situation": "Beschreibung der Situation in 3-5 Sätzen",
  "frage": "Die zentrale Urteilsfrage, die der/die Nutzer:in beantworten soll"
}`;

    const result = await callClaude(systemPrompt, [{ role: 'user', content: 'Generiere ein neues Dilemma.' }], 600, lang);
    if (result.error) return res.status(result.status).json({ error: result.error });

    res.json(parseClaudeJSON(result.text, 'object'));
    return;
  }

  // Action: "judge" → bewerte das Urteil des Nutzers
  if (action === 'judge') {
    const { dilemma, urteil } = req.body;
    if (!dilemma || !urteil) return res.status(400).json({ error: err(lang, 'dilemmaRequired') });

    const systemPrompt = `Du bist das Urteilstraining des Ateliers der Radikalen Mitte.
Du bewertest NICHT ob ein Urteil richtig oder falsch ist.
Stattdessen prüfst du die QUALITÄT des Denkens:

1. BLINDE STELLE: Welche Perspektive oder welchen Aspekt hat die Person nicht berücksichtigt?
2. STÄRKE: Was ist das stärkste Element der Argumentation?
3. VERTIEFUNG: Eine Folgefrage, die das Denken weitertreibt.

Sei direkt, respektvoll und fordernd. 2-3 Sätze pro Punkt.
${LANG_INSTRUCTION[lang]} JSON-Schlüsselnamen bleiben wie angegeben, nur die Werte in der Zielsprache:
{
  "blinde_stelle": "...",
  "staerke": "...",
  "vertiefung": "..."
}`;

    const messages = [{
      role: 'user',
      content: `Dilemma: ${dilemma}\n\nUrteil der Person: "${urteil}"`
    }];
    const result = await callClaude(systemPrompt, messages, 600, lang);
    if (result.error) return res.status(result.status).json({ error: result.error });

    res.json(parseClaudeJSON(result.text, 'object'));
    return;
  }

  res.status(400).json({ error: err(lang, 'unknownAction') });
});

// ═══════════════════════════════════════════════════════════
// 6. WICKED-PROBLEM-WERKSTATT – geführter Denkprozess
// ═══════════════════════════════════════════════════════════
app.use('/api/wicked', express.json({ limit: '50kb' }));

app.post('/api/wicked', aiLimiter, async (req, res) => {
  const { problem, step, previousAnswers } = req.body;
  const lang = getLang(req);
  if (!problem || typeof problem !== 'string') return res.status(400).json({ error: err(lang, 'noProblem') });

  const steps = {
    1: `Beleuchte das Wicked Problem "${problem}" aus VIER verschiedenen Disziplinen (z.B. Ökonomie, Psychologie, Technologie, Ethik). Für jede Disziplin: 2 Sätze, die einen neuen Aspekt aufzeigen. JSON-Format: {"disziplinen": [{"name": "...", "perspektive": "..."}, ...]}`,
    2: `Zum Problem "${problem}": Beschreibe DREI Stakeholder-Perspektiven – also Menschen/Gruppen, die unterschiedlich betroffen sind. Für jeden: Name, Position, berechtigtes Anliegen. JSON-Format: {"stakeholder": [{"name": "...", "position": "...", "anliegen": "..."}, ...]}`,
    3: `Zum Problem "${problem}" mit bisherigen Erkenntnissen: ${previousAnswers || '(keine)'}\n\nBenenne DREI zentrale Widersprüche in diesem Problem – Spannungen, die sich nicht einfach auflösen lassen. JSON-Format: {"widersprueche": [{"spannung": "...", "warum_unlösbar": "..."}, ...]}`,
    4: `Zum Problem "${problem}" mit bisherigen Erkenntnissen: ${previousAnswers || '(keine)'}\n\nEntwickle DREI Handlungsoptionen, die die Widersprüche ernst nehmen und trotzdem handlungsfähig machen. Keine perfekten Lösungen, sondern kluge Kompromisse. JSON-Format: {"optionen": [{"titel": "...", "beschreibung": "...", "tradeoff": "..."}, ...]}`,
    5: `Fasse zusammen und formuliere EINE zentrale Urteilsfrage, die die Person für sich beantworten muss, um handlungsfähig zu werden. JSON-Format: {"zusammenfassung": "2-3 Sätze", "urteilsfrage": "Die Frage"}`
  };

  const currentStep = step || 1;
  if (!steps[currentStep]) return res.status(400).json({ error: err(lang, 'invalidStep') });

  const systemPrompt = `Du bist die Wicked-Problem-Werkstatt des Ateliers der Radikalen Mitte.
Du führst Nutzer:innen durch einen strukturierten Denkprozess zu komplexen Problemen.
Sei konkret, differenziert und vermeide Plattitüden.
${LANG_INSTRUCTION[lang]} Antworte ausschließlich im angegebenen JSON-Format. JSON-Schlüsselnamen bleiben wie angegeben, nur die Werte in der Zielsprache.`;

  const messages = [{ role: 'user', content: steps[currentStep] }];
  const result = await callClaude(systemPrompt, messages, 800, lang);
  if (result.error) return res.status(result.status).json({ error: result.error });

  const parsed = parseClaudeJSON(result.text, 'object');
  res.json({ step: currentStep, ...parsed });
});

// ═══════════════════════════════════════════════════════════
// 7. TEXT-STRESSTEST – Denkprüfung für eigene Texte
// ═══════════════════════════════════════════════════════════
app.use('/api/stresstest', express.json({ limit: '50kb' }));

app.post('/api/stresstest', aiLimiter, async (req, res) => {
  const { text } = req.body;
  const lang = getLang(req);
  if (!text || typeof text !== 'string') return res.status(400).json({ error: err(lang, 'noText') });
  if (text.length > 5000) return res.status(400).json({ error: err(lang, 'textTooLong5k') });

  const systemPrompt = `Du bist der Text-Stresstest des Ateliers der Radikalen Mitte.
Du prüfst Texte NICHT auf Grammatik oder Stil, sondern auf DENKQUALITÄT.

Analysiere den Text und gib Feedback in diesen Kategorien:
1. BEHAUPTUNGEN OHNE BEGRÜNDUNG: Stellen, wo etwas behauptet wird, ohne es zu belegen oder herzuleiten.
2. FEHLENDER WIDERSPRUCH: Perspektiven oder Gegenargumente, die ignoriert werden.
3. MEINUNG ALS URTEIL: Stellen, wo persönliche Präferenz als objektive Einschätzung verkauft wird.
4. STÄRKEN: Was gut gedacht ist – wo zeigt sich echtes Urteil?
5. EINE FRAGE: Die wichtigste Frage, die der Text nicht stellt, aber stellen sollte.

Sei direkt und konkret. Zitiere Passagen wo möglich. ${LANG_INSTRUCTION[lang]} JSON-Schlüsselnamen bleiben wie angegeben, nur die Werte in der Zielsprache:
{
  "behauptungen": ["...", "..."],
  "fehlender_widerspruch": ["...", "..."],
  "meinung_als_urteil": ["...", "..."],
  "staerken": ["...", "..."],
  "fehlende_frage": "..."
}`;

  const messages = [{ role: 'user', content: `Prüfe diesen Text:\n\n${text}` }];
  const result = await callClaude(systemPrompt, messages, 1000, lang);
  if (result.error) return res.status(result.status).json({ error: result.error });

  res.json(parseClaudeJSON(result.text, 'object'));
});

app.use('/api/client-log', express.json({ limit: '10kb' }));

app.post('/api/client-log', (req, res) => {
  const level = req.body && req.body.level ? String(req.body.level) : 'error';
  const context = req.body && req.body.context ? String(req.body.context) : 'client';
  const message = req.body && req.body.message ? String(req.body.message) : '';
  const lang = getLang(req);

  if (!message) return res.status(400).json({ error: err(lang, 'noLogMessage') });

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
app.use('/api/daily', express.json({ limit: '50kb' }));

async function handleDaily(req, res) {
  const body = req.body || {};
  const seed = body.seed || (req.query && req.query.seed);
  const resolvedSeed = seed || new Date().toISOString().slice(0, 10);
  const lang = getLang(req);

  if (!getConfiguredApiKey()) {
    return res.json(pickLocalDailyChallenge(resolvedSeed, lang));
  }

  const systemPrompt = `Du bist der Generator der Täglichen Denkprobe des Ateliers der Radikalen Mitte.
Erzeuge eine kurze, scharfe Denkprobe des Tages. Sie soll:
- Ein aktuelles oder zeitloses Thema aufgreifen
- In 2-3 Sätzen eine Spannung formulieren
- Eine einzige, präzise Frage stellen, die in einem Satz beantwortbar ist
- Zum Nachdenken zwingen, nicht zum Googeln

${LANG_INSTRUCTION[lang]} JSON-Schlüsselnamen bleiben wie angegeben, nur die Werte in der Zielsprache:
{
  "titel": "Kurzer Titel (max 8 Wörter)",
  "impuls": "2-3 Sätze, die die Spannung aufbauen",
  "frage": "Die eine Frage des Tages"
}`;

  const messages = [{ role: 'user', content: `Generiere die Denkprobe des Tages. Seed: ${resolvedSeed}` }];
  const result = await callClaude(systemPrompt, messages, 400, lang);
  if (result.error) {
    return res.json(pickLocalDailyChallenge(resolvedSeed, lang));
  }

  const parsed = parseClaudeJSON(result.text, 'object', null);
  const normalized = parsed ? normalizeDailyQuestion(parsed, lang) : null;
  if (normalized) {
    return res.json({ ...normalized, source: 'ai', seed: resolvedSeed });
  }

  res.json(pickLocalDailyChallenge(resolvedSeed, lang));
}

app.post('/api/daily', aiLimiter, handleDaily);
app.get('/api/daily', aiLimiter, handleDaily);

// ═══════════════════════════════════════════════════════════
// 9. PERSPEKTIVENWECHSEL-MASCHINE
// ═══════════════════════════════════════════════════════════
app.use('/api/perspektive', express.json({ limit: '50kb' }));

app.post('/api/perspektive', aiLimiter, async (req, res) => {
  const { position, perspektive } = req.body;
  const lang = getLang(req);
  if (!position || typeof position !== 'string' || !perspektive || typeof perspektive !== 'string') return res.status(400).json({ error: err(lang, 'noPosition') });

  const systemPrompt = `Du bist die Perspektivenwechsel-Maschine des Ateliers der Radikalen Mitte.
Du erhältst eine Position/Meinung und eine gewählte Perspektive.
Deine Aufgabe: Formuliere die Position EMPATHISCH und ÜBERZEUGEND aus der gewählten Perspektive um.
Nicht als Karikatur, nicht als Strohmann – sondern als bestmögliche Version dieser Perspektive.
Zeige, wie jemand aus dieser Perspektive EHRLICH und INTELLIGENT argumentieren würde.

${LANG_INSTRUCTION[lang]} JSON-Schlüsselnamen bleiben wie angegeben, nur die Werte in der Zielsprache:
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
  const result = await callClaude(systemPrompt, messages, 700, lang);
  if (result.error) return res.status(result.status).json({ error: result.error });

  res.json(parseClaudeJSON(result.text, 'object'));
});

// ═══════════════════════════════════════════════════════════
// 10. KI-GEGENREDE zu Nachrichtenartikeln
// ═══════════════════════════════════════════════════════════
app.use('/api/gegenrede', express.json({ limit: '50kb' }));

app.post('/api/gegenrede', aiLimiter, async (req, res) => {
  const { text } = req.body;
  const lang = getLang(req);
  if (!text || typeof text !== 'string') return res.status(400).json({ error: err(lang, 'noText') });
  if (text.length > 8000) return res.status(400).json({ error: err(lang, 'textTooLong8k') });

  const systemPrompt = `Du bist die KI-Gegenrede des Ateliers der Radikalen Mitte.
Du erhältst den Text eines Nachrichtenartikels oder Meinungsbeitrags.
Deine Aufgabe ist es, den Text kritisch zu durchleuchten – nicht parteiisch, sondern im Dienst besseren Denkens.

Liefere:
1. GEGENPOSITION: Die stärkste Gegenposition zum Artikel (3-4 Sätze)
2. UNGESTELLTE FRAGE: Die wichtigste Frage, die der Artikel nicht stellt (1-2 Sätze)
3. UNGESAGTE ANNAHMEN: 2-3 implizite Annahmen, die der Artikel macht, ohne sie auszusprechen
4. FEHLENDE STIMME: Welche Perspektive/Betroffenengruppe kommt nicht zu Wort?

Sei scharf, aber fair. Keine Polemik. ${LANG_INSTRUCTION[lang]} JSON-Schlüsselnamen bleiben wie angegeben, nur die Werte in der Zielsprache:
{
  "gegenposition": "...",
  "ungestellte_frage": "...",
  "annahmen": ["...", "...", "..."],
  "fehlende_stimme": "..."
}`;

  const messages = [{ role: 'user', content: `Analysiere diesen Artikel:\n\n${text}` }];
  const result = await callClaude(systemPrompt, messages, 1000, lang);
  if (result.error) return res.status(result.status).json({ error: result.error });

  res.json(parseClaudeJSON(result.text, 'object'));
});

// ═══════════════════════════════════════════════════════════
// 11. ARGUMENTKARTE (Argument Mapping)
// ═══════════════════════════════════════════════════════════
app.use('/api/argumentkarte', express.json({ limit: '50kb' }));

app.post('/api/argumentkarte', aiLimiter, async (req, res) => {
  const { these } = req.body;
  const lang = getLang(req);
  if (!these || typeof these !== 'string') return res.status(400).json({ error: err(lang, 'noThese') });

  const systemPrompt = `Du bist die Argumentkarte des Ateliers der Radikalen Mitte.
Du erhältst eine These und erstellst eine strukturierte Argumentkarte.
Die Karte hat die These im Zentrum, mit Pro- und Contra-Ästen.
Jeder Ast hat Unterargumente und mögliche Einwände.

${LANG_INSTRUCTION[lang]} JSON-Schlüsselnamen bleiben wie angegeben, nur die Werte in der Zielsprache:
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
  const result = await callClaude(systemPrompt, messages, 1200, lang);
  if (result.error) return res.status(result.status).json({ error: result.error });

  res.json(parseClaudeJSON(result.text, 'object'));
});

// ═══════════════════════════════════════════════════════════
// 12. BLINDER-FLECK-DETEKTOR
// ═══════════════════════════════════════════════════════════
app.use('/api/blindspot', express.json({ limit: '50kb' }));

app.post('/api/blindspot', aiLimiter, async (req, res) => {
  const { text } = req.body;
  const lang = getLang(req);
  if (!text || typeof text !== 'string') return res.status(400).json({ error: err(lang, 'noText') });
  if (text.length > 5000) return res.status(400).json({ error: err(lang, 'textTooLong5k') });

  const systemPrompt = `Du bist der Blinder-Fleck-Detektor des Ateliers der Radikalen Mitte.
Du erhältst einen Text und identifizierst präzise EINE Perspektive, die systematisch fehlt oder nicht zu Wort kommt.
Nicht die naheliegendste Gegenposition, sondern eine echte blinde Stelle — eine Gruppe, ein Blickwinkel, eine Lebensrealität, die der Text übersieht.

${LANG_INSTRUCTION[lang]} JSON-Schlüsselnamen bleiben wie angegeben, nur die Werte in der Zielsprache:
{
  "perspektive": "Name der fehlenden Perspektive (kurz, präzise)",
  "begruendung": "1-2 Sätze: Warum fehlt sie und was würde sie einbringen?",
  "frage": "Eine Frage, die diese Perspektive dem Text stellen würde (1 Satz)"
}`;

  const messages = [{ role: 'user', content: `Analysiere diesen Text auf die fehlende Perspektive:\n\n${text}` }];
  const result = await callClaude(systemPrompt, messages, 500, lang);
  if (result.error) return res.status(result.status).json({ error: result.error });

  res.json(parseClaudeJSON(result.text, 'object'));
});

// --- SPA fallback ---
// For any unmatched GET, redirect to the language home so bookmarks to
// moved/renamed routes land somewhere meaningful instead of on the raw
// German index. /api/* is handled separately and never reaches here.
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.redirect(302, '/' + detectRequestLang(req) + '/');
});

const server = app.listen(PORT, () => {
  console.log(`Atelier server running on port ${PORT}`);
});

module.exports = server;
