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
const SITE_URL = process.env.SITE_URL || 'https://nicht-anerkannt.info';

// Page inventory:
//   slug                              de file on disk               en file on disk (null = DE-only)
const PAGES = [
  { slug: '',                          de: 'index.html',             en: 'en/index.html' },
  { slug: 'werkstatt',                 de: 'pages/werkstatt.html',   en: 'en/pages/werkstatt.html' },
  { slug: 'salon',                     de: 'pages/salon.html',       en: 'en/pages/salon.html' },
  { slug: 'roadmap',                   de: 'pages/roadmap.html',     en: 'en/pages/roadmap.html' },
  { slug: 'kontakt',                   de: 'pages/kontakt.html',     en: 'en/pages/kontakt.html' },
  { slug: 'medien',                    de: 'pages/medien.html',      en: 'en/pages/medien.html' },
  { slug: 'ideen-archiv',              de: 'pages/ideen-archiv.html',en: 'en/pages/ideen-archiv.html' },
  { slug: 'impressum',                 de: 'pages/impressum.html',   en: 'en/pages/impressum.html' },
  { slug: 'datenschutz',               de: 'pages/datenschutz.html', en: 'en/pages/datenschutz.html' },
  { slug: 'ai-governance',             de: 'pages/ai-governance.html', en: 'en/pages/ai-governance.html' },
  { slug: 'ki-renaissance',            de: 'pages/ki-renaissance.html', en: 'en/pages/ki-renaissance.html' },
  { slug: 'ki-renaissance-analyse',    de: 'pages/ki-renaissance-analyse.html', en: 'en/pages/ki-renaissance-analyse.html' },
  { slug: 'zukunft-der-bildung',       de: 'pages/zukunft-der-bildung.html',    en: 'en/pages/zukunft-der-bildung.html' }
];

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
