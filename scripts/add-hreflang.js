#!/usr/bin/env node
/**
 * add-hreflang.js — insert canonical + hreflang <link> tags into every
 * HTML page. Idempotent: re-running on a file that already has the tags
 * replaces the existing block rather than duplicating it.
 *
 * Usage:  node scripts/add-hreflang.js
 *
 * Run this whenever a page is added or the SITE_URL changes.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE_URL = process.env.SITE_URL || 'https://nichts-geschenkt.de';

// Page inventory is discovered from the de/ directory (slug = filename,
// index.html = language home) so newly added pages are covered
// automatically; the EN sibling is included when it exists on disk.
const PAGES = fs.readdirSync(path.join(ROOT, 'de'))
  .filter((n) => n.endsWith('.html'))
  .map((n) => {
    const slug = n === 'index.html' ? '' : n.replace(/\.html$/, '');
    const enFile = 'en/' + n;
    return {
      slug: slug,
      de: 'de/' + n,
      en: fs.existsSync(path.join(ROOT, enFile)) ? enFile : null
    };
  });

const MARKER_BEGIN = '<!-- hreflang:begin -->';
const MARKER_END   = '<!-- hreflang:end -->';

function buildBlock(slug, hasEN) {
  const dePath = '/de/' + slug;
  const enPath = '/en/' + slug;
  const lines = [
    '  ' + MARKER_BEGIN,
    '  <link rel="canonical" href="' + SITE_URL + '{SELF}">',
    '  <link rel="alternate" hreflang="de" href="' + SITE_URL + dePath + '">'
  ];
  if (hasEN) lines.push('  <link rel="alternate" hreflang="en" href="' + SITE_URL + enPath + '">');
  lines.push('  <link rel="alternate" hreflang="x-default" href="' + SITE_URL + dePath + '">');
  lines.push('  ' + MARKER_END);
  return lines.join('\n');
}

function processFile(filePath, lang, slug, hasEN) {
  const abs = path.join(ROOT, filePath);
  if (!fs.existsSync(abs)) {
    console.warn('skip (missing): ' + filePath);
    return false;
  }
  let html = fs.readFileSync(abs, 'utf8');

  const selfPath = '/' + lang + '/' + slug;
  const block = buildBlock(slug, hasEN).replace('{SELF}', selfPath);

  // Replace existing block if present, else inject before </head>.
  const blockRe = new RegExp(
    MARKER_BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') +
    '[\\s\\S]*?' +
    MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    ''
  );
  if (blockRe.test(html)) {
    html = html.replace(blockRe, block.trim());
  } else {
    if (!/<\/head>/i.test(html)) {
      console.error('no </head> in ' + filePath + ', skipping');
      return false;
    }
    html = html.replace(/<\/head>/i, block + '\n</head>');
  }

  fs.writeFileSync(abs, html, 'utf8');
  return true;
}

let changed = 0;
PAGES.forEach((p) => {
  const hasEN = !!p.en;
  if (processFile(p.de, 'de', p.slug, hasEN)) changed++;
  if (p.en && processFile(p.en, 'en', p.slug, hasEN)) changed++;
});

console.log('updated ' + changed + ' file(s)');
