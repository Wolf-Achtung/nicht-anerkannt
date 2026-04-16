#!/usr/bin/env node
/**
 * rewrite-chrome.js — attach data-i18n attributes to the shared site
 * chrome (skip link, brand, header nav, footer nav) across every HTML
 * file, without altering body content.
 *
 * Scope guarantees (why body text is safe):
 *   - Nav-link rewrites only touch <a> elements INSIDE <nav class="header-links">
 *     or <p class="footer-links"> regions. Links elsewhere (CTAs, prose links,
 *     quote callouts) keep their original text and do not receive data-i18n.
 *   - The skip-link, brand-pre/main/tagline, nav-toggle, and nav aria-label
 *     rewrites match by unique markup that only appears in the site chrome.
 *   - <a class="lang-switch"> is explicitly excluded — its visible text
 *     ("DE / EN" / "EN / DE") is static per page.
 *
 * Idempotent: re-runs skip elements that already carry data-i18n.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Nav-link rules inside chrome regions, keyed by the slug or hash the href contains.
//   href-absolute:   matches /de/<slug> or /en/<slug>
//   href-same-page:  matches bare #<hash> (index.html hash anchors)
//   href-home:       matches /de/ or /en/ exactly (footer "home" link)
const LINK_RULES = [
  // Home-section hash anchors (same-page on index.html OR cross-page)
  { key: 'nav.problem',         hash: 'problem'      },
  { key: 'nav.radikaleMitte',   hash: 'mitte'        },
  { key: 'nav.atelier',         hash: 'atelier'      },
  { key: 'nav.einladung',       hash: 'einladung'    },
  { key: 'nav.denkprofil',      hash: 'score'        },
  { key: 'nav.manifest',        hash: 'manifest'     },
  { key: 'nav.hintergrund',     hash: 'hintergrund'  },
  { key: 'nav.mitmachen',       hash: 'mitmachen'    },
  // Sub-page links
  { key: 'nav.salon',           slug: 'salon'                  },
  { key: 'nav.ideenArchiv',     slug: 'ideen-archiv'           },
  { key: 'nav.werkstatt',       slug: 'werkstatt'              },
  { key: 'nav.medien',          slug: 'medien'                 },
  { key: 'nav.roadmap',         slug: 'roadmap'                },
  { key: 'nav.kontakt',         slug: 'kontakt'                },
  { key: 'nav.impressum',       slug: 'impressum'              },
  { key: 'nav.datenschutz',     slug: 'datenschutz'            },
  { key: 'nav.aiGovernance',    slug: 'ai-governance'          },
  { key: 'nav.kiRenaissance',   slug: 'ki-renaissance'         },
  { key: 'nav.zukunftBildung',  slug: 'zukunft-der-bildung'    },
  // Footer-only home link
  { key: 'footer.home',         home: true                     }
];

const FOOTER_LITERAL_LINKS = [
  { key: 'footer.backToMedia',  de: 'Zurück zu Medien',    en: 'Back to Media' }
];

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Chrome-region match: attrs have no data-i18n AND no class="lang-switch"
const SAFE = '(?:(?!data-i18n|class="lang-switch")[^>])*?';

function hrefPatternFor(rule) {
  if (rule.home) return 'href="/(?:de|en)/"';
  if (rule.hash) return 'href="(?:/(?:de|en)/)?#' + escapeRegex(rule.hash) + '"';
  if (rule.slug) return 'href="/(?:de|en)/' + escapeRegex(rule.slug) + '"';
  throw new Error('Invalid link rule: ' + JSON.stringify(rule));
}

function rewriteChromeRegion(regionHtml) {
  let out = regionHtml;
  for (const rule of LINK_RULES) {
    const href = hrefPatternFor(rule);
    const re = new RegExp(
      '<a(' + SAFE + '\\b' + href + SAFE + ')>([^<]+)</a>',
      'g'
    );
    out = out.replace(re, (m, attrs, text) => {
      return '<a' + attrs + ' data-i18n="' + rule.key + '">' + text + '</a>';
    });
  }
  return out;
}

function rewriteFooterLiteral(html) {
  for (const rule of FOOTER_LITERAL_LINKS) {
    const de = escapeRegex(rule.de);
    const en = escapeRegex(rule.en);
    const re = new RegExp(
      '<a(' + SAFE + ')>(' + de + '|' + en + ')</a>',
      'g'
    );
    html = html.replace(re, (m, attrs, text) => {
      return '<a' + attrs + ' data-i18n="' + rule.key + '">' + text + '</a>';
    });
  }
  return html;
}

function rewriteFile(filePath) {
  const original = fs.readFileSync(filePath, 'utf8');
  let html = original;

  // 1) Chrome regions: <nav class="header-links" ...>...</nav>
  html = html.replace(
    /(<nav\s+class="header-links"[^>]*>)([\s\S]*?)(<\/nav>)/g,
    (m, open, body, close) => open + rewriteChromeRegion(body) + close
  );

  // 2) Chrome regions: <p class="footer-links">...</p>
  html = html.replace(
    /(<p\s+class="footer-links"[^>]*>)([\s\S]*?)(<\/p>)/g,
    (m, open, body, close) => open + rewriteFooterLiteral(rewriteChromeRegion(body)) + close
  );

  // 3) Skip link
  html = html.replace(
    /<a class="skip-link" href="#main-content">(Zum Inhalt springen|Skip to content)<\/a>/g,
    '<a class="skip-link" href="#main-content" data-i18n="site.skipToContent">$1</a>'
  );

  // 4) Nav toggle button label
  html = html.replace(
    /(<button class="nav-toggle"(?:(?!data-i18n)[^>])*?)(>)(Menü|Menu)(<\/button>)/g,
    '$1 data-i18n="site.menu"$2$3$4'
  );

  // 5) Header nav aria-label → via data-i18n-attr.  Negative lookahead on
  //    both sides of aria-label blocks re-application on an already-tagged nav.
  html = html.replace(
    /<nav(\s+class="header-links"(?:(?!data-i18n)[^>])*?\s+aria-label=")(Seitenbereiche|Page sections)(")((?:(?!data-i18n)[^>])*)>/g,
    '<nav$1$2$3$4 data-i18n-attr="aria-label:site.sectionsLabel">'
  );

  // 6) Brand elements
  html = html.replace(
    /<span class="brand-pre">(Staatlich|State)<\/span>/g,
    '<span class="brand-pre" data-i18n="site.brandPre">$1</span>'
  );
  html = html.replace(
    /<span class="brand-main">(NICHT ANERKANNT|NOT ACCREDITED)<\/span>/g,
    '<span class="brand-main" data-i18n="site.brandMain">$1</span>'
  );
  html = html.replace(
    /<span>(Das Atelier der Radikalen Mitte|The Atelier of the Radical Middle)<\/span>/g,
    '<span data-i18n="site.brandTagline">$1</span>'
  );

  if (html !== original) {
    fs.writeFileSync(filePath, html, 'utf8');
    return 1;
  }
  return 0;
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

const files = [];
walk(ROOT, files);
let changed = 0;
for (const f of files) changed += rewriteFile(f);
console.log('rewrote chrome in ' + changed + ' file(s) (' + files.length + ' HTML files scanned)');
