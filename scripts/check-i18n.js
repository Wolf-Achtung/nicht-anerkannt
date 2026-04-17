#!/usr/bin/env node
/**
 * check-i18n.js — parity check for the multilingual catalog.
 *
 * Fails (exit 1) if any catalog is missing, drifts from the others in
 * key coverage, or contains empty translations. Emits warnings (exit 0)
 * for things that are allowed-but-suspicious, e.g. a DE page that has
 * no EN sibling.
 *
 * Checks performed:
 *   1) BUILTIN (assets/js/i18n.js) vs /i18n/<lang>.json files — same key set
 *   2) /i18n/<lang>.json pairwise — same key set, no empty strings
 *   3) /data/daily-questions.json — every entry has every lang for every field
 *   4) HTML page pairs — pages/X.html has en/pages/X.html (or is DE-only whitelisted)
 *   5) HTML pages — every file carries a <!-- hreflang:begin --> block
 *
 * Usage:  node scripts/check-i18n.js          (fail-fast)
 *         npm run i18n:check
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SUPPORTED_LANGS = ['de', 'en'];
const DE_ONLY_PAGES = new Set([]); // Every DE page currently has an EN sibling.

const errors = [];
const warnings = [];

function readJSON(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  try { return JSON.parse(fs.readFileSync(abs, 'utf8')); }
  catch (e) { errors.push('Invalid JSON: ' + rel + ' — ' + e.message); return null; }
}

function extractBuiltinKeys() {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'i18n.js'), 'utf8');
  const start = src.indexOf('var BUILTIN = {');
  if (start === -1) { errors.push('BUILTIN table not found in i18n.js'); return []; }
  let depth = 0;
  let i = src.indexOf('{', start);
  const open = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  // eslint-disable-next-line no-new-func
  const obj = new Function('return ' + src.slice(open, i + 1))();
  return Object.keys(obj);
}

// 1 + 2: BUILTIN ↔ /i18n/<lang>.json parity
function checkCatalogs() {
  const builtinKeys = new Set(extractBuiltinKeys());
  const catalogs = {};
  for (const lang of SUPPORTED_LANGS) {
    const data = readJSON(path.join('i18n', lang + '.json'));
    if (!data) { errors.push('Missing catalog: i18n/' + lang + '.json'); continue; }
    catalogs[lang] = data;
  }

  for (const lang of Object.keys(catalogs)) {
    const keys = new Set(Object.keys(catalogs[lang]));
    for (const k of builtinKeys) {
      if (!keys.has(k)) errors.push('i18n/' + lang + '.json missing key: ' + k + ' (in BUILTIN)');
    }
    for (const k of keys) {
      if (!builtinKeys.has(k)) warnings.push('i18n/' + lang + '.json has orphan key: ' + k + ' (not in BUILTIN)');
      const v = catalogs[lang][k];
      if (typeof v !== 'string' || !v.trim()) errors.push('i18n/' + lang + '.json empty value for key: ' + k);
    }
  }

  // Cross-lang parity
  const langs = Object.keys(catalogs);
  for (let a = 0; a < langs.length; a++) {
    for (let b = a + 1; b < langs.length; b++) {
      const la = langs[a], lb = langs[b];
      const ka = new Set(Object.keys(catalogs[la]));
      const kb = new Set(Object.keys(catalogs[lb]));
      for (const k of ka) if (!kb.has(k)) errors.push('Key only in ' + la + ' catalog: ' + k);
      for (const k of kb) if (!ka.has(k)) errors.push('Key only in ' + lb + ' catalog: ' + k);
    }
  }
}

// 3: data/daily-questions.json — per-field multilingual completeness
function checkDailyQuestions() {
  const data = readJSON(path.join('data', 'daily-questions.json'));
  if (!data) { errors.push('Missing data/daily-questions.json'); return; }
  if (!Array.isArray(data)) { errors.push('data/daily-questions.json is not an array'); return; }

  const FIELDS = ['titel', 'impuls', 'frage'];
  data.forEach((entry, i) => {
    FIELDS.forEach((f) => {
      const v = entry && entry[f];
      if (!v || typeof v !== 'object') {
        errors.push('daily-questions[' + i + '].' + f + ': expected {lang: string} object');
        return;
      }
      for (const lang of SUPPORTED_LANGS) {
        if (typeof v[lang] !== 'string' || !v[lang].trim()) {
          errors.push('daily-questions[' + i + '].' + f + '.' + lang + ': missing or empty');
        }
      }
    });
  });
}

// 4: HTML page pair parity
function checkPagePairs() {
  const deDir = path.join(ROOT, 'de');
  const enDir = path.join(ROOT, 'en');
  if (!fs.existsSync(deDir) || !fs.existsSync(enDir)) {
    warnings.push('Language directory missing (de/ or en/)');
    return;
  }
  // Skip index.html — language home is tracked separately.
  const listPages = (dir) => new Set(
    fs.readdirSync(dir)
      .filter((n) => n.endsWith('.html') && n !== 'index.html')
      .map((n) => n.replace(/\.html$/, ''))
  );
  const de = listPages(deDir);
  const en = listPages(enDir);

  for (const slug of de) {
    if (!en.has(slug) && !DE_ONLY_PAGES.has(slug)) {
      warnings.push('EN page missing for DE page: ' + slug + ' (add to DE_ONLY_PAGES if intentional)');
    }
  }
  for (const slug of en) {
    if (!de.has(slug)) errors.push('DE page missing for EN page: ' + slug);
  }
}

// 5: hreflang block present in every HTML page
function checkHreflang() {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        walk(abs);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        files.push(abs);
      }
    }
  }
  walk(ROOT);
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    if (!content.includes('<!-- hreflang:begin -->')) {
      warnings.push('No hreflang block: ' + path.relative(ROOT, f) + ' (run scripts/add-hreflang.js)');
    }
  }
}

// --- Run ---
checkCatalogs();
checkDailyQuestions();
checkPagePairs();
checkHreflang();

if (warnings.length) {
  console.warn('\x1b[33m' + warnings.length + ' warning(s):\x1b[0m');
  warnings.forEach((w) => console.warn('  ⚠ ' + w));
}

if (errors.length) {
  console.error('\x1b[31m' + errors.length + ' error(s):\x1b[0m');
  errors.forEach((e) => console.error('  ✘ ' + e));
  process.exit(1);
}

console.log('\x1b[32m✓ i18n parity OK\x1b[0m');
