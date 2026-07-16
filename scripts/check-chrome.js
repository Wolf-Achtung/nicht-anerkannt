#!/usr/bin/env node
/**
 * check-chrome.js — parity check for the shared site chrome (header nav +
 * footer links) across every subpage.
 *
 * Fails (exit 1) if any subpage's <nav class="header-links"> or
 * <p class="footer-links"> block has drifted from what
 * scripts/sync-chrome.js would generate for it. This is the guard rail
 * against the exact failure mode a prior audit found: 5+ hand-edited nav
 * variants, including dead anchor links, because there was no single
 * source of truth for the chrome.
 *
 * de/index.html and en/index.html are intentionally excluded -- they keep
 * their own homepage-anchor nav, maintained by hand.
 *
 * Usage:  node scripts/check-chrome.js
 *         npm run chrome:check
 *
 * If this fails after an intentional chrome change, update
 * NAV_PAGES/FOOTER_LINKS/LABELS in scripts/sync-chrome.js, then run
 * `npm run chrome:sync` to apply it everywhere before committing.
 */
'use strict';

const fs = require('fs');
const { buildNav, buildFooterLinks, forEachSubpage } = require('./sync-chrome');

const errors = [];

function extractFirst(html, re) {
  const m = html.match(re);
  return m ? m[0] : null;
}

forEachSubpage((filePath, lang, slug) => {
  const html = fs.readFileSync(filePath, 'utf8');
  const rel = filePath.replace(process.cwd() + '/', '');

  const actualNav = extractFirst(html, /<nav\s+class="header-links"[^>]*>[\s\S]*?<\/nav>/);
  const expectedNav = buildNav(lang, slug);
  if (actualNav !== expectedNav) {
    errors.push(rel + ': header nav drifted from scripts/sync-chrome.js output');
  }

  const actualFooter = extractFirst(html, /<p\s+class="footer-links">[\s\S]*?<\/p>/);
  const expectedFooter = buildFooterLinks(lang);
  if (actualFooter !== expectedFooter) {
    errors.push(rel + ': footer-links drifted from scripts/sync-chrome.js output');
  }
});

if (errors.length) {
  console.error('\x1b[31m' + errors.length + ' error(s):\x1b[0m');
  errors.forEach((e) => console.error('  ✘ ' + e));
  console.error('\nRun `npm run chrome:sync` to fix, then review the diff before committing.');
  process.exit(1);
}

console.log('\x1b[32m✓ chrome parity OK\x1b[0m');
