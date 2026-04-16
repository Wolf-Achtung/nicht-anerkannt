#!/usr/bin/env node
/**
 * extract-i18n.js — generate /i18n/<lang>.json from the BUILTIN table
 * inside assets/js/i18n.js.
 *
 * Re-run whenever BUILTIN changes to refresh the external catalogs:
 *   node scripts/extract-i18n.js
 *
 * The BUILTIN object literal is the canonical source; the emitted JSON
 * files are what the browser actually fetches at runtime (see i18n.js
 * loadCatalog). BUILTIN stays in i18n.js as last-resort fallback.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'js', 'i18n.js');
const OUT_DIR = path.join(ROOT, 'i18n');

const LANGS = ['de', 'en'];

function extractBuiltin(source) {
  const start = source.indexOf('var BUILTIN = {');
  if (start === -1) throw new Error('BUILTIN table not found in ' + SRC);
  // Walk braces from the first { to find the matching closing brace.
  let depth = 0;
  let i = source.indexOf('{', start);
  const open = i;
  for (; i < source.length; i++) {
    const c = source[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        // eslint-disable-next-line no-new-func
        return new Function('return ' + source.slice(open, i + 1))();
      }
    }
  }
  throw new Error('Unterminated BUILTIN object literal');
}

function main() {
  const source = fs.readFileSync(SRC, 'utf8');
  const builtin = extractBuiltin(source);

  const keys = Object.keys(builtin);
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const missing = { };
  LANGS.forEach((lang) => {
    const out = {};
    const missingKeys = [];
    keys.forEach((k) => {
      const entry = builtin[k];
      if (entry && typeof entry[lang] === 'string') {
        out[k] = entry[lang];
      } else {
        missingKeys.push(k);
      }
    });
    const dest = path.join(OUT_DIR, lang + '.json');
    fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log('wrote ' + path.relative(ROOT, dest) + ' (' + Object.keys(out).length + ' keys)');
    if (missingKeys.length) missing[lang] = missingKeys;
  });

  if (Object.keys(missing).length) {
    console.warn('\nmissing translations:');
    Object.keys(missing).forEach((lang) => {
      console.warn('  ' + lang + ': ' + missing[lang].join(', '));
    });
    process.exitCode = 0; // warn, do not fail — BUILTIN fallback chain handles it
  }
}

main();
