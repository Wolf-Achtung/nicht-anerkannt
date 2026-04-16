# Adding a new language

The site is built so a new EU language can be added without restructuring
the codebase. This document is the checklist. Concrete example throughout:
**adding French (`fr`)**.

Estimated effort per language: ~2–4 hours of human review on top of
AI-drafted translations, depending on the amount of long-form content.

---

## 1. Register the language code

Two places need the new code added to their `SUPPORTED_LANGS` array:

**`assets/js/i18n.js`** (browser-side language detection + catalog loading)

```js
var SUPPORTED_LANGS = ['de', 'en', 'fr']; // ← add 'fr'
```

**`server.js`** (URL routing, AI endpoint validation, CORS)

```js
const SUPPORTED_LANGS = ['de', 'en', 'fr']; // ← add 'fr'
```

That's the only code change needed for the runtime to recognize the
language. Everything else is data.

---

## 2. Add the AI output-language directive

**`server.js`** has a `LANG_INSTRUCTION` map injected into every AI prompt.
Add an entry:

```js
const LANG_INSTRUCTION = {
  de: 'Antworte ausschließlich auf Deutsch.',
  en: 'Respond exclusively in English.',
  fr: 'Réponds exclusivement en français.'
};
```

Also add a localized error-message dictionary in `ERR`:

```js
const ERR = {
  de: { /* existing */ },
  en: { /* existing */ },
  fr: {
    apiKeyMissing: 'Clé API Anthropic non configurée…',
    aiUnavailable: 'L\'IA est momentanément indisponible.',
    // …copy keys from ERR.en and translate
  }
};
```

Without `ERR.fr`, the server falls back to `ERR.de` — the validation
errors will still be in German for FR users until you fill this in.

---

## 3. Drop in the UI translation catalog

The flat per-language JSON catalogs at **`/i18n/<lang>.json`** are what
the browser fetches at runtime. Generate a starter from the canonical
source (BUILTIN in `i18n.js`):

```bash
npm run i18n:extract        # writes /i18n/de.json, /i18n/en.json
```

For a brand-new language you have two options:

**Option A — AI-drafted, human-reviewed (recommended).**
Copy `/i18n/en.json` to `/i18n/fr.json`, then ask Claude / DeepL / a
translator to render every value into French. Keep keys and placeholders
(`{p}`, `{0}`) untouched.

**Option B — fully human translation.**
Same process, no AI in the loop.

Then enrich the BUILTIN table inside `i18n.js` so the offline fallback
also covers the new language (optional but recommended — without it,
users on a flaky connection see English fallback for any key the catalog
fails to load):

```js
var BUILTIN = {
  'daily.badge': {
    de: 'Denkprobe des Tages',
    en: 'Thinking Challenge of the Day',
    fr: 'Défi de réflexion du jour'    // ← add
  },
  …
};
```

Re-run `npm run i18n:extract` to regenerate `/i18n/fr.json` from BUILTIN
once you've populated all keys there.

---

## 4. Translate the dynamic-content data

Files under **`/data/`** use a per-field multilingual object schema.
Every field that ships text to the user is `{ "de": "…", "en": "…" }` —
add the new lang as another key.

```jsonc
// data/daily-questions.json (current)
{
  "titel":  { "de": "Grenzen des Mutes", "en": "Limits of Courage" },
  "impuls": { "de": "…",                "en": "…" },
  "frage":  { "de": "…",                "en": "…" }
}
```

Add `"fr": "…"` to every `titel`, `impuls`, `frage` object across all
17 entries.

The same pattern will apply to other data files as they are migrated.
Until a file is migrated, the legacy parallel `/data/<lang>/` directory
fallback in `i18n.js#dataPrefix()` covers it.

---

## 5. Add the language home + sub-pages

The Express router (`server.js`) automatically serves `/<lang>/...` from
the directories defined in `LANG_URL`:

```js
const LANG_URL = {
  de: { root: 'index.html',       pagesDir: 'pages' },
  en: { root: 'en/index.html',    pagesDir: 'en/pages' },
  fr: { root: 'fr/index.html',    pagesDir: 'fr/pages' }   // ← add
};
```

Then provide the actual files:

```bash
mkdir -p fr/pages
cp index.html        fr/index.html
cp -r pages/*.html   fr/pages/
```

…and translate every user-visible string in those HTML files. Keep:
- `<html lang="fr">` (update)
- All `class="lang-switch"` hrefs
- All internal nav hrefs (point to `/fr/...`)

The helper scripts can rewrite the structural bits for you:

```bash
npm run i18n:rewrite-links   # rewrites legacy hrefs to /<lang>/ scheme
npm run i18n:hreflang        # adds canonical + hreflang link tags
```

For `i18n:hreflang` to know about French, also extend
`scripts/add-hreflang.js`:

```js
const PAGES = [
  { slug: '',           de: 'index.html', en: 'en/index.html', fr: 'fr/index.html' },
  …
];
```

(Currently the script only handles DE+EN; mirror the loop logic for the
new language.)

---

## 6. Validate

Run the parity checker — it will tell you exactly what is missing:

```bash
npm run i18n:check
```

Errors fail the build (CI-suitable). Warnings flag intentional gaps
(e.g. a DE-only page without an EN/FR sibling, listed in `DE_ONLY_PAGES`).

```bash
npm test                 # runs the server route tests
npm run lint
```

Smoke test the language end-to-end:

```bash
curl -i http://localhost:3000/             # → 302 /de/, /en/, or /fr/
curl    http://localhost:3000/fr/          # → fr/index.html
curl    http://localhost:3000/fr/werkstatt # → fr/pages/werkstatt.html
curl -X POST -H 'Content-Type: application/json' \
  -d '{"action":"new","lang":"fr"}' \
  http://localhost:3000/api/urteil          # → French dilemma
```

---

## Quick checklist (copy/paste into PR description)

- [ ] `SUPPORTED_LANGS` extended in `assets/js/i18n.js` and `server.js`
- [ ] `LANG_INSTRUCTION[<lang>]` added in `server.js`
- [ ] `ERR[<lang>]` dictionary added in `server.js`
- [ ] BUILTIN in `i18n.js` carries `<lang>:` value for every key
- [ ] `/i18n/<lang>.json` regenerated via `npm run i18n:extract`
- [ ] `/data/daily-questions.json` has `<lang>:` for every entry/field
- [ ] `/<lang>/index.html` + `/<lang>/pages/*.html` created and translated
- [ ] `LANG_URL[<lang>]` added in `server.js`
- [ ] `scripts/add-hreflang.js` PAGES inventory extended for `<lang>`
- [ ] `npm run i18n:hreflang` re-run
- [ ] `npm run i18n:rewrite-links` re-run
- [ ] `npm run i18n:check` exits 0
- [ ] `npm test` passes
- [ ] Manual smoke test: `/<lang>/`, `/<lang>/werkstatt`, AI tool returns
      content in `<lang>`
