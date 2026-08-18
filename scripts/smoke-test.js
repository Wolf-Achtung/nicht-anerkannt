#!/usr/bin/env node
/**
 * smoke-test.js — ruft jeden Bestandteil des Projekts einmal wirklich auf.
 *
 * Warum es das gibt: Der Gegenrede-Ausfall im August 2026 war monatelang
 * möglich, weil nichts die *Form* der Antworten prüfte. Der Server lieferte
 * brav HTTP 200 mit einem Körper, den die Seite nicht darstellen konnte.
 * Dieser Test prüft deshalb nicht nur "antwortet es?", sondern "enthält die
 * Antwort die Felder, die die Seite tatsächlich anzeigt?".
 *
 * Aufruf:
 *   npm run smoke                  # Seiten + API (KI-Aufrufe kosten Geld)
 *   npm run smoke -- --no-ai       # nur Seiten und kostenlose Endpoints
 *   npm run smoke -- --site-only   # nur die statischen Seiten
 *   npm run smoke -- --api-only    # nur die API
 *   npm run smoke -- --api http://localhost:3000 --site http://localhost:3000
 *   npm run smoke -- --json        # maschinenlesbar (für CI)
 *
 * Exit-Code 0 = alles grün, 1 = mindestens ein Fehler.
 */
'use strict';

const DEFAULT_API = 'https://nicht-anerkannt-production.up.railway.app';
const DEFAULT_SITE = 'https://nichts-geschenkt.de';

const args = process.argv.slice(2);
function flagValue(name, fallback) {
  const i = args.indexOf('--' + name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}
const OPTS = {
  api: flagValue('api', process.env.SMOKE_API || DEFAULT_API).replace(/\/+$/, ''),
  site: flagValue('site', process.env.SMOKE_SITE || DEFAULT_SITE).replace(/\/+$/, ''),
  noAi: args.includes('--no-ai'),
  siteOnly: args.includes('--site-only'),
  apiOnly: args.includes('--api-only'),
  json: args.includes('--json'),
  timeout: Number(flagValue('timeout', process.env.SMOKE_TIMEOUT || 90000)),
  // Pause zwischen KI-Aufrufen. Ohne sie feuert der Test 17 Anfragen in
  // wenigen Minuten und läuft selbst in die Mengenbegrenzung des Anbieters
  // — der Test würde dann seinen eigenen Fehlalarm erzeugen.
  pace: Number(flagValue('pace', process.env.SMOKE_PACE || 4000))
};

// ─── Seiten, die erreichbar sein müssen ────────────────────────────────
const PAGES = [
  '/de/', '/en/',
  '/de/fuer-dich', '/en/fuer-dich',
  '/de/schueler', '/en/schueler',
  '/de/lehrkraefte', '/en/lehrkraefte',
  '/de/werkstatt', '/en/werkstatt',
  '/de/ki-und-lernen', '/en/ki-und-lernen',
  '/de/salon', '/en/salon',
  '/de/ideen-archiv', '/en/ideen-archiv',
  '/de/medien', '/en/medien',
  '/de/roadmap', '/en/roadmap',
  '/de/kontakt', '/en/kontakt',
  '/de/impressum', '/en/impressum',
  '/de/datenschutz', '/en/datenschutz',
  '/de/ai-governance', '/en/ai-governance',
  '/de/zukunft-der-bildung', '/en/zukunft-der-bildung',
  '/de/ki-renaissance', '/en/ki-renaissance',
  '/de/ki-renaissance-analyse', '/en/ki-renaissance-analyse'
];

const ASSETS = [
  '/assets/css/styles.css',
  '/assets/js/i18n.js',
  '/assets/js/main.js',
  '/assets/js/daily.js',
  '/assets/js/chat.js',
  '/assets/js/werkstatt.js',
  '/i18n/de.json',
  '/i18n/en.json',
  '/manifest-das-atelier-radikale-mitte.md',
  '/manifest-das-atelier-radikale-mitte.en.md'
];

// ─── API-Prüfungen: Nutzlast rein, Pflichtfelder raus ──────────────────
// `keys` sind die Felder, ohne die die Seite nichts anzeigen kann.
// `anyOf: true` heisst: eines davon genügt (so prüft es auch das Frontend).
const API_CHECKS = [
  { name: 'health', method: 'GET', path: '/api/health', ai: false,
    verify: (b) => (b.ok === true ? null : 'ok !== true') },

  // Nimmt Meldungen entgegen und quittiert mit 202 (angenommen).
  { name: 'client-log', path: '/api/client-log', ai: false, expectStatus: [202],
    body: { level: 'info', context: 'smoke-test', message: 'smoke test ping' },
    verify: (b) => (b && b.ok === true ? null : 'ok !== true') },

  { name: 'daily', path: '/api/daily', ai: true,
    body: { lang: 'de' }, keys: ['titel', 'frage'] },

  { name: 'denkprobe-konter', path: '/api/denkprobe-konter', ai: true,
    body: { frage: 'Wem gehört deine Aufmerksamkeit?', antwort: 'Wahrscheinlich dem Lautesten.', runde: 1, lang: 'de' },
    keys: ['widerspruch', 'gegenfrage'], anyOf: true },

  { name: 'chat', path: '/api/chat', ai: true,
    body: { message: 'Ich frage bei allem zuerst die KI.', history: [], lang: 'de' },
    keys: ['reply'] },

  { name: 'chat (Stille)', path: '/api/chat', ai: true,
    body: { message: 'Mir fehlt die Ruhe zum Denken.', history: [], stille: true, lang: 'de' },
    keys: ['reply'] },

  { name: 'widerspruch', path: '/api/widerspruch', ai: true,
    body: { these: 'Hausaufgaben gehören abgeschafft.', lang: 'de' },
    verify: (b) => (Array.isArray(b.gegenpositionen) && b.gegenpositionen.length
      ? null : 'gegenpositionen fehlt oder ist leer') },

  { name: 'translate', path: '/api/translate', ai: true,
    body: { text: 'Nicht mehr Stoff. Mehr Urteil.', language: 'Englisch', lang: 'de' },
    keys: ['translation'] },

  { name: 'denkprobe', path: '/api/denkprobe', ai: true,
    body: { thema: 'Handyverbot an Schulen', lang: 'de' },
    keys: ['thema', 'problemstellung'], anyOf: true },

  { name: 'urteil (neu)', path: '/api/urteil', ai: true,
    body: { action: 'new', lang: 'de' },
    keys: ['situation', 'titel', 'frage'], anyOf: true },

  { name: 'wicked', path: '/api/wicked', ai: true,
    body: { problem: 'Wie gehen Schulen mit KI um?', step: 1, previousAnswers: [], lang: 'de' },
    verify: (b) => (b.step ? null : 'step fehlt') },

  { name: 'stresstest', path: '/api/stresstest', ai: true,
    body: { text: 'Digitalisierung löst die Bildungskrise, weil Technik Fortschritt bedeutet.', lang: 'de' },
    keys: ['behauptungen', 'fehlende_frage', 'staerken'], anyOf: true },

  { name: 'perspektive', path: '/api/perspektive', ai: true,
    body: { position: 'Schulnoten sind nötig.', perspektive: 'Ein Schulkind von heute', lang: 'de' },
    keys: ['reformulierung', 'perspektive'], anyOf: true },

  { name: 'gegenrede', path: '/api/gegenrede', ai: true,
    body: { text: 'Künstliche Intelligenz wird die Bildung retten.', lang: 'de' },
    keys: ['gegenposition', 'ungestellte_frage', 'fehlende_stimme'], anyOf: true },

  { name: 'argumentkarte', path: '/api/argumentkarte', ai: true,
    body: { these: 'Wir sollten das Projekt verschieben.', lang: 'de' },
    keys: ['pro', 'contra'], anyOf: true },

  { name: 'blindspot', path: '/api/blindspot', ai: true,
    body: { text: 'Alle profitieren von schnellerem Internet.', lang: 'de' },
    keys: ['perspektive', 'frage'], anyOf: true },

  { name: 'erstheit-labor', path: '/api/erstheit-labor', ai: true,
    body: { these: 'Denken lässt sich automatisieren.', modus: 'paradox', lang: 'de' },
    keys: ['irritation', 'aufgabe', 'frage'], anyOf: true },

  { name: 'denkpraxis', path: '/api/denkpraxis', ai: true,
    body: { ziel: 'Weniger zuerst die KI fragen.', hindernis: 'Es geht so schnell.', lang: 'de' },
    keys: ['spiegel', 'leitsatz', 'heute'], anyOf: true },

  // Englischer Stichprobenlauf: die Sprachweiche muss greifen.
  { name: 'daily (EN)', path: '/api/daily', ai: true,
    body: { lang: 'en' }, keys: ['titel', 'frage'] }
];

// ─── Ausführung ────────────────────────────────────────────────────────
const results = [];
let rateLimited = 0;

function record(group, name, ok, detail, ms) {
  results.push({ group, name, ok, detail: detail || '', ms });
  if (OPTS.json) return;
  const mark = ok ? '[32m✓[0m' : '[31m✗[0m';
  const time = ms === undefined ? '' : String(ms).padStart(6) + ' ms';
  process.stdout.write('  ' + mark + ' ' + name.padEnd(34) + time + (ok ? '' : '  → ' + detail) + '\n');
}

async function timedFetch(url, options) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPTS.timeout);
  try {
    const res = await fetch(url, Object.assign({ signal: controller.signal }, options));
    return { res, ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

async function checkPages() {
  if (!OPTS.json) process.stdout.write('\nSeiten (' + OPTS.site + ')\n');
  for (const path of PAGES) {
    try {
      const { res, ms } = await timedFetch(OPTS.site + path, { redirect: 'follow' });
      const html = await res.text();
      const lang = path.startsWith('/en') ? 'en' : 'de';
      const problems = [];
      if (res.status !== 200) problems.push('HTTP ' + res.status);
      if (!/<!doctype html/i.test(html)) problems.push('kein HTML');
      if (!new RegExp('lang="' + lang + '"', 'i').test(html)) problems.push('lang != ' + lang);
      if (!/hreflang:begin/.test(html) && path !== '/de/' && path !== '/en/') problems.push('hreflang fehlt');
      if (!/class="footer-links"/.test(html)) problems.push('Footer-Menü fehlt');
      record('Seiten', path, problems.length === 0, problems.join(', '), ms);
    } catch (e) {
      record('Seiten', path, false, e.name === 'AbortError' ? 'Zeitüberschreitung' : e.message);
    }
  }

  if (!OPTS.json) process.stdout.write('\nDateien\n');
  for (const path of ASSETS) {
    try {
      const { res, ms } = await timedFetch(OPTS.site + path);
      const body = await res.text();
      const problems = [];
      if (res.status !== 200) problems.push('HTTP ' + res.status);
      if (!body.length) problems.push('leer');
      if (path.endsWith('.json')) {
        try { JSON.parse(body); } catch (e) { problems.push('kein gültiges JSON'); }
      }
      record('Dateien', path, problems.length === 0, problems.join(', '), ms);
    } catch (e) {
      record('Dateien', path, false, e.name === 'AbortError' ? 'Zeitüberschreitung' : e.message);
    }
  }
}

function verifyKeys(body, check) {
  if (!body || typeof body !== 'object') return 'Antwort ist kein Objekt';
  if (body.error) return 'Fehlerfeld: ' + String(body.error).slice(0, 80);
  if (body.raw !== undefined) return 'unverarbeitete Rohantwort (raw)';
  if (!check.keys) return check.verify ? check.verify(body) : null;

  const present = check.keys.filter((k) => {
    const v = body[k];
    if (typeof v === 'string') return v.trim().length > 0;
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  });
  if (check.anyOf) {
    return present.length ? null : 'keines der Felder ' + check.keys.join('/') + ' gefüllt';
  }
  const missing = check.keys.filter((k) => !present.includes(k));
  return missing.length ? 'Felder fehlen: ' + missing.join(', ') : null;
}

async function checkApi() {
  if (!OPTS.json) {
    process.stdout.write('\nAPI (' + OPTS.api + ')' + (OPTS.noAi ? '  — KI-Aufrufe übersprungen' : '') + '\n');
  }
  let firstAiCall = true;
  for (const check of API_CHECKS) {
    if (check.ai && OPTS.noAi) {
      record('API', check.name, true, 'übersprungen (--no-ai)');
      continue;
    }
    if (check.ai && OPTS.pace > 0) {
      if (!firstAiCall) await new Promise((r) => setTimeout(r, OPTS.pace));
      firstAiCall = false;
    }
    try {
      const { res, ms } = await timedFetch(OPTS.api + check.path, {
        method: check.method || 'POST',
        headers: { 'Content-Type': 'application/json', Origin: OPTS.site },
        body: check.method === 'GET' ? undefined : JSON.stringify(check.body || {})
      });
      let body = null;
      try { body = await res.json(); } catch (e) { /* kein JSON */ }

      const allowed = check.expectStatus || [200];
      if (!allowed.includes(res.status)) {
        const hint = body && body.error ? String(body.error).slice(0, 90) : '';
        // Zwei verschiedene Bremsen, beide kein Defekt:
        // 503 = Mengenbegrenzung des KI-Anbieters (Anthropic),
        // 429 = eigener Schutz des Servers (20 Anfragen pro Minute und IP).
        let label;
        if (res.status === 503) {
          label = 'Mengenbegrenzung des KI-Anbieters — kein Defekt (HTTP 503)';
        } else if (res.status === 429) {
          label = 'Eigener Anfrageschutz des Servers — kein Defekt (HTTP 429)';
        } else {
          label = 'HTTP ' + res.status + ' (erwartet ' + allowed.join('/') + ')' + (hint ? ' — ' + hint : '');
        }
        record('API', check.name, false, label, ms);
        if (res.status === 503 || res.status === 429) rateLimited++;
        continue;
      }
      const problem = verifyKeys(body, check);
      record('API', check.name, !problem, problem, ms);
    } catch (e) {
      record('API', check.name, false, e.name === 'AbortError' ? 'Zeitüberschreitung' : e.message);
    }
  }
}

(async () => {
  if (!OPTS.json) {
    process.stdout.write('\nRundum-Test „Nichts geschenkt"\n');
  }
  if (!OPTS.apiOnly) await checkPages();
  if (!OPTS.siteOnly) await checkApi();

  const failed = results.filter((r) => !r.ok);
  if (OPTS.json) {
    process.stdout.write(JSON.stringify({ ok: failed.length === 0, total: results.length, failed: failed.length, rateLimited, results }, null, 2) + '\n');
  } else {
    process.stdout.write('\n' + (failed.length === 0
      ? '[32m' + results.length + ' Prüfungen, alle grün.[0m\n'
      : '[31m' + failed.length + ' von ' + results.length + ' fehlgeschlagen:[0m\n' +
        failed.map((f) => '  • ' + f.name + ' — ' + f.detail).join('\n') + '\n'));
  }
  if (rateLimited > 0 && !OPTS.json) {
    process.stdout.write('\nHinweis: ' + rateLimited + ' Fehlschlag/Fehlschlaege stammen von der ' +
      'Mengenbegrenzung des KI-Anbieters,\nnicht von einem Defekt. Mit groesserem Abstand erneut ' +
      'versuchen:\n  npm run smoke -- --pace 8000\n');
  }
  process.exit(failed.length === 0 ? 0 : 1);
})();
