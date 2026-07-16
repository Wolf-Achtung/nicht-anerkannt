#!/usr/bin/env node
/**
 * sync-chrome.js — apply a single canonical header-nav and footer-links
 * set to every subpage (everything except de/index.html and en/index.html,
 * which keep their own homepage-anchor nav and are maintained by hand).
 *
 * Root cause this addresses: header/footer chrome was a hand-maintained
 * copy per HTML file with no shared source, so subpages had drifted onto
 * 5+ mutually inconsistent nav variants (some linking to homepage anchors
 * that no longer exist) and 5+ inconsistent footer link sets. Re-run this
 * after editing NAV_PAGES/FOOTER_LINKS below; scripts/check-chrome.js
 * (wired into `npm run chrome:check` / CI) fails if a subpage drifts from
 * what this script would produce.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Order matters: rendered in this sequence. `group` marks the first item of
// a new visual cluster (see .nav-group-start in styles.css).
const NAV_PAGES = [
  { slug: 'salon', key: 'nav.salon' },
  { slug: 'ideen-archiv', key: 'nav.ideenArchiv' },
  { slug: 'werkstatt', key: 'nav.werkstatt' },
  { slug: 'zukunft-der-bildung', key: 'nav.zukunftBildung' },
  { slug: 'ki-renaissance', key: 'nav.kiRenaissance' },
  { slug: 'medien', key: 'nav.medien', group: true },
  { slug: 'roadmap', key: 'nav.roadmap' },
  { slug: 'kontakt', key: 'nav.kontakt' },
  { slug: 'impressum', key: 'nav.impressum' }
];

const FOOTER_LINKS = [
  { slug: 'kontakt', key: 'nav.kontakt' },
  { slug: 'impressum', key: 'nav.impressum' },
  { slug: 'datenschutz', key: 'nav.datenschutz' },
  { slug: 'ai-governance', key: 'nav.aiGovernance' }
];

const LABELS = {
  de: {
    home: 'Startseite',
    salon: 'Salon',
    'ideen-archiv': 'Ideen-Archiv',
    werkstatt: 'KI-Werkstatt',
    'zukunft-der-bildung': 'Zukunft der Bildung',
    'ki-renaissance': 'KI-Renaissance',
    medien: 'Medien',
    roadmap: 'Roadmap',
    kontakt: 'Kontakt',
    impressum: 'Impressum',
    datenschutz: 'Datenschutz',
    'ai-governance': 'AI-Governance',
    ariaLabel: 'Seitenbereiche',
    langSwitchText: 'DE / EN'
  },
  en: {
    home: 'Home',
    salon: 'Salon',
    'ideen-archiv': 'Ideas Archive',
    werkstatt: 'AI Workshop',
    'zukunft-der-bildung': 'The Future of Education',
    'ki-renaissance': 'AI Renaissance',
    medien: 'Media',
    roadmap: 'Roadmap',
    kontakt: 'Contact',
    impressum: 'Legal Notice',
    datenschutz: 'Privacy Policy',
    'ai-governance': 'AI Governance',
    ariaLabel: 'Page sections',
    langSwitchText: 'EN / DE'
  }
};

function buildNav(lang, currentSlug) {
  const l = LABELS[lang];
  const otherLang = lang === 'de' ? 'en' : 'de';
  const links = [
    `<a href="/${lang}/"${currentSlug === '' ? ' aria-current="page"' : ''} data-i18n="footer.home">${l.home}</a>`
  ];
  NAV_PAGES.forEach((p) => {
    const active = p.slug === currentSlug ? ' aria-current="page"' : '';
    const cls = p.group ? ' class="nav-group-start"' : '';
    links.push(`<a href="/${lang}/${p.slug}"${cls}${active} data-i18n="${p.key}">${l[p.slug]}</a>`);
  });
  links.push(
    `<a class="lang-switch" href="/${otherLang}/${currentSlug}" hreflang="${otherLang}" lang="${otherLang}">${l.langSwitchText}</a>`
  );
  return (
    `<nav class="header-links" id="main-nav" aria-label="${l.ariaLabel}" data-i18n-attr="aria-label:site.sectionsLabel">\n` +
    links.map((li) => `        ${li}`).join('\n') +
    `\n      </nav>`
  );
}

function buildFooterLinks(lang) {
  const l = LABELS[lang];
  const links = FOOTER_LINKS.map(
    (f) => `<a href="/${lang}/${f.slug}" data-i18n="${f.key}">${l[f.slug]}</a>`
  );
  return `<p class="footer-links">${links.join(' · ')}</p>`;
}

function rewriteFile(filePath, lang, slug) {
  const original = fs.readFileSync(filePath, 'utf8');
  let html = original;

  html = html.replace(
    /<nav\s+class="header-links"[^>]*>[\s\S]*?<\/nav>/,
    buildNav(lang, slug)
  );
  html = html.replace(
    /<p\s+class="footer-links">[\s\S]*?<\/p>/,
    buildFooterLinks(lang)
  );

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf8');
    return 1;
  }
  return 0;
}

function forEachSubpage(fn) {
  ['de', 'en'].forEach((lang) => {
    const dir = path.join(ROOT, lang);
    fs.readdirSync(dir).forEach((name) => {
      if (!name.endsWith('.html') || name === 'index.html') return;
      const slug = name.slice(0, -'.html'.length);
      fn(path.join(dir, name), lang, slug);
    });
  });
}

function run() {
  let changed = 0;
  let scanned = 0;
  forEachSubpage((filePath, lang, slug) => {
    scanned += 1;
    changed += rewriteFile(filePath, lang, slug);
  });
  console.log(`sync-chrome: rewrote ${changed}/${scanned} subpage(s)`);
}

module.exports = { buildNav, buildFooterLinks, forEachSubpage };

if (require.main === module) run();
