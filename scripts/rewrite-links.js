#!/usr/bin/env node
/**
 * rewrite-links.js — rewrite legacy relative hrefs in every HTML file to
 * the new canonical /de/<slug> and /en/<slug> URL scheme, so in-page
 * navigation no longer triggers 301 redirect hops.
 *
 * Idempotent: running on already-rewritten files is a no-op.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Known page slugs; only hrefs matching one of these are rewritten.
const SLUGS = [
  'werkstatt', 'salon', 'roadmap', 'kontakt', 'medien', 'ideen-archiv',
  'impressum', 'datenschutz', 'ai-governance', 'ki-renaissance',
  'ki-renaissance-analyse', 'zukunft-der-bildung'
];
const SLUG_RE = SLUGS.join('|');

// Ordered pairs of [regex, replacement].  Replacement preserves any
// trailing fragment (#section) or query string ($2 in each pattern).
function rulesFor(scope) {
  const slug = '(' + SLUG_RE + ')';
  const tail = '([#?][^"\']*)?';
  switch (scope) {
    case 'de-home':
      return [
        [new RegExp('href="pages\\/' + slug + '\\.html' + tail + '"', 'g'),        'href="/de/$1$2"'],
        [new RegExp("href='pages\\/" + slug + "\\.html" + tail + "'", 'g'),        "href='/de/$1$2'"],
        [new RegExp('href="en\\/pages\\/' + slug + '\\.html' + tail + '"', 'g'),   'href="/en/$1$2"'],
        [new RegExp("href='en\\/pages\\/" + slug + "\\.html" + tail + "'", 'g'),   "href='/en/$1$2'"],
        [/href="en\/index\.html([#?][^"]*)?"/g, 'href="/en/$1"']
      ];
    case 'en-home':
      return [
        [new RegExp('href="pages\\/' + slug + '\\.html' + tail + '"', 'g'),        'href="/en/$1$2"'],
        [new RegExp("href='pages\\/" + slug + "\\.html" + tail + "'", 'g'),        "href='/en/$1$2'"],
        [/href="\.\.\/index\.html([#?][^"]*)?"/g, 'href="/de/$1"'],
        [new RegExp('href="\\.\\.\\/pages\\/' + slug + '\\.html' + tail + '"', 'g'), 'href="/de/$1$2"']
      ];
    case 'de-sub':
      return [
        [/href="\.\.\/index\.html([#?][^"]*)?"/g, 'href="/de/$1"'],
        [/href="\.\.\/en\/index\.html([#?][^"]*)?"/g, 'href="/en/$1"'],
        [new RegExp('href="\\.\\.\\/en\\/pages\\/' + slug + '\\.html' + tail + '"', 'g'), 'href="/en/$1$2"'],
        [new RegExp('href="' + slug + '\\.html' + tail + '"', 'g'),                        'href="/de/$1$2"'],
        [new RegExp('href="\\.\\.\\/pages\\/' + slug + '\\.html' + tail + '"', 'g'),       'href="/de/$1$2"']
      ];
    case 'en-sub':
      return [
        [/href="\.\.\/index\.html([#?][^"]*)?"/g, 'href="/en/$1"'],
        [/href="\.\.\/\.\.\/index\.html([#?][^"]*)?"/g, 'href="/de/$1"'],
        [new RegExp('href="\\.\\.\\/\\.\\.\\/pages\\/' + slug + '\\.html' + tail + '"', 'g'), 'href="/de/$1$2"'],
        [new RegExp('href="' + slug + '\\.html' + tail + '"', 'g'),                           'href="/en/$1$2"'],
        [new RegExp('href="\\.\\.\\/pages\\/' + slug + '\\.html' + tail + '"', 'g'),          'href="/en/$1$2"']
      ];
  }
  return [];
}

function scopeOf(rel) {
  if (rel === 'index.html') return 'de-home';
  if (rel === 'en/index.html') return 'en-home';
  if (rel.startsWith('pages/') && rel.endsWith('.html')) return 'de-sub';
  if (rel.startsWith('en/pages/') && rel.endsWith('.html')) return 'en-sub';
  return null;
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(abs, out);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      out.push(abs);
    }
  }
}

function rewrite(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const scope = scopeOf(rel);
  if (!scope) return 0;

  const before = fs.readFileSync(filePath, 'utf8');
  let after = before;
  for (const [re, repl] of rulesFor(scope)) {
    after = after.replace(re, repl);
  }
  if (after !== before) {
    fs.writeFileSync(filePath, after, 'utf8');
    return 1;
  }
  return 0;
}

const files = [];
walk(ROOT, files);
const changed = files.map(rewrite).reduce((a, b) => a + b, 0);
console.log('rewrote links in ' + changed + ' file(s) (' + files.length + ' HTML files scanned)');
