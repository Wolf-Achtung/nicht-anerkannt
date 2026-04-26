# Security Audit Report — nicht-anerkannt

**Datum:** 2026-04-26
**Auditiert:** Claude Code via SEC-AUDIT-Briefing
**Tier:** P2 (öffentliche Plattform, kein User-Login, keine Persistenz, AI-Proxy)
**Branch:** `claude/security-audit-hardening-HWlsY`

## Executive Summary

- **Findings gesamt:** 7 (Critical: 0, High: 0, Medium: 4, Low: 3)
- **Top-3-Risiken:**
  1. Fehlendes `app.set('trust proxy', ...)` → Rate-Limiting per IP wirkt hinter Reverse-Proxy nicht
  2. `Content-Security-Policy` erlaubt `'unsafe-inline'` für `script-src` und `style-src` → schwächt XSS-Defense-in-Depth
  3. Fehlende CI-Security-Pipeline & Dependabot → keine kontinuierliche CVE-Erkennung
- **Geschätzter Fix-Aufwand:** ~1 Stunde für Auto-Fixes (alle Findings sind Low/Medium); CSP-Hardening (mit Nonces) wäre mittelgroß und sollte separat angegangen werden.

## Stack-Übersicht

| Komponente | Wert |
|---|---|
| Sprache / Runtime | Node.js (>=18), reines HTML/CSS/JS Frontend |
| Framework | Express 4.21.0, helmet 8.0.0, express-rate-limit 7.5.0 |
| Public Endpoints | 12 `/api/*` POST/GET-Routen, alle Proxy-Aufrufe an Anthropic API |
| Persistenz | Keine (alles stateless), `data/daily-questions.json` als statische Daten |
| Auth | Keine (öffentlicher Service) |
| Secrets | `ANTHROPIC_API_KEY` über ENV |

## Tool-Ergebnisse (Roh)

| Layer | Tool | Ergebnis |
|---|---|---|
| Secrets HEAD | gitleaks 8.21.2 | ✅ 0 leaks (55 commits scanned) |
| Secrets History | gitleaks `--all` | ✅ 0 leaks |
| Dependencies | `npm audit` | ✅ 0 vulnerabilities (159 deps) |
| Dependencies | osv-scanner | ⚠ Network blocked (osv.dev nicht erreichbar im Sandbox) |
| SAST | semgrep registry | ⚠ Network blocked → manuelle Code-Review als Ersatz |
| Tests | `npm test` | ✅ 26/26 pass |
| Filesystem | `.env`/`.pem`/`.key`/`.p12` im Tree | ✅ keine gefunden |

## Findings nach Severity

### CRITICAL
*Keine.*

### HIGH
*Keine.*

### MEDIUM

| ID | Kategorie | Datei | Beschreibung | Fix | Auto-Fix? |
|---|---|---|---|---|---|
| SEC-M01 | Trust Proxy | `server.js:7` | `app.set('trust proxy', ...)` fehlt. `express-rate-limit` warnt in neueren Versionen, dass ohne korrekte Proxy-Konfiguration alle Requests dieselbe IP teilen (die der Proxy-IP) → Rate-Limit pro IP wirkungslos hinter Netlify/Render/Fly/Cloudflare. | `app.set('trust proxy', Number(process.env.TRUST_PROXY) \|\| 1)` ergänzen. | ✅ Ja |
| SEC-M02 | CSP — script-src | `server.js:15` | `scriptSrc: ["'self'", "'unsafe-inline'"]`. Inline-Scripts in HTMLs erforderlich macht XSS-Mitigation auf reines Output-Encoding angewiesen. Nonce/Hash-basierter Ansatz wäre robuster. | Mittelfristig: Nonces einführen. Kurzfristig: dokumentiert lassen, Inline-Scripts schrittweise externalisieren. | ❌ Größeres Refactoring → manueller Plan |
| SEC-M03 | CSP — style-src | `server.js:16` | `styleSrc: ["'self'", "'unsafe-inline'"]`. Erlaubt CSS-Injection zur Datenexfiltration (z.B. `background:url(...)`-Tricks) sofern attacker DOM-Injection erreicht. | Inline-Styles entfernen oder per Hash whitelisten. | ❌ Größeres Refactoring |
| SEC-M04 | Body-Limit Inkonsistenz | `server.js:388,421,449,484,549,642,689,759` | Manche `/api/*` nutzen explizit `{ limit: '50kb' }` (chat, stresstest, gegenrede, blindspot, client-log), andere lassen den Default (100kb) — inkonsistent. Reichhaltige LLM-Prompts könnten unnötig Bandbreite/Tokens binden. | Body-Limit konsistent auf `'50kb'` setzen (oder `'10kb'` für reine Aktion-Endpunkte). | ✅ Ja |

### LOW

| ID | Kategorie | Datei | Beschreibung | Fix | Auto-Fix? |
|---|---|---|---|---|---|
| SEC-L01 | `.gitignore`-Lücken | `.gitignore` | Aktuell nur 6 Einträge. Fehlen: `.env.*`, `*.pem`, `*.key`, `*.p12`, `coverage/`, `.idea/`, `.vscode/`, `*.swp`, `Thumbs.db`, `.audit-temp/`, `npm-debug.log*`. | Hardening-Patterns ergänzen. | ✅ Ja |
| SEC-L02 | `SECURITY.md` fehlt | (root) | Kein Security-Reporting-Eingang dokumentiert. | Standard-`SECURITY.md` mit Reporting-Adresse anlegen. | ✅ Ja |
| SEC-L03 | Keine CI-Security-Pipeline | `.github/` | Kein Dependabot, keine automatischen gitleaks-/audit-Scans auf PR. | `.github/dependabot.yml` und `.github/workflows/security.yml` anlegen. | ✅ Ja |

## Was geprüft wurde — Negativbestand (nichts gefunden)

Diese typischen Schwachstellen wurden geprüft und **nicht** gefunden:

- **Hardcoded Secrets / API-Keys** in Code oder History — gitleaks 0 Findings über 55 Commits (HEAD + `--all`).
- **`.env`/`.pem`/`.key`/`.p12`** im aktuellen Tree — keine.
- **CORS `allow_origins=["*"]`** — Server prüft Origin gegen Allowlist (`server.js:27-38`). ✅
- **SQL-Injection** — keine SQL-Datenbank, alles stateless.
- **Path-Traversal** in `resolvePage` — explizit per `PAGE_NAME_RE` und `startsWith(pagesDir + sep)` abgesichert (`server.js:131-137`). ✅
- **`shell: true` mit User-Input** / `child_process.exec` — kein Vorkommen im Repo.
- **`eval()` / `Function()` / `document.write`** — kein Vorkommen.
- **Pickle / `yaml.load` ohne `safe_load`** — kein YAML/Pickle im Code.
- **JWT-Algorithmus `none`** — kein JWT verwendet.
- **Client-side XSS-Sinks**: `innerHTML`-Verwendungen in `assets/js/*.js` (40+ Stellen) wurden manuell überprüft. Alle dynamischen Werte werden konsistent durch `escapeHtml()` geleitet (siehe `werkstatt.js:30,107,171,202,378`, `daily.js:219-220`, `ticker.js:29-32+40-44`, `perspektive-global.js:176`, `roadmap.js:11`). i18n-Bundles (`assets/js/i18n.js:352`) sind dokumentiert "trusted only" und werden nur aus statischen JSON-Bundles befüllt. ✅
- **PII-Logging** — `client-log` whitespace-normalisiert und auf 280 Zeichen gekürzt; kein Email-/Token-Pattern-Logging. ✅
- **Rate Limiting** — `aiLimiter` (20/min) und `chatLimiter` (30/min) sind aktiv (siehe SEC-M01 für Caveat).
- **Helmet Security Headers** — aktiv mit ordentlicher CSP-Basis (siehe SEC-M02/M03 für Restrisiken).
- **Body-Size Limits** — Default 100kb, plus explizite 50kb auf den heißen Pfaden (siehe SEC-M04 für Konsistenz-Hinweis).
- **CSRF**: Mitigiert durch Origin-Allowlist + JSON-Content-Type (Browser preflight). Kein Session/Cookie-State, keine state-ändernden Aktionen außer LLM-Aufruf. ✅

## Tool-Outputs (Roh-Ergebnisse)

Die Roh-Outputs liegen während des Audits in `.audit-temp/` und werden vor dem finalen Commit gelöscht.

- `.audit-temp/gitleaks-head.json`: 0 leaks
- `.audit-temp/gitleaks-history.json`: 0 leaks
- `.audit-temp/npm-audit.json`: `total: 0` (info/low/moderate/high/critical alle 0)
- `.audit-temp/osv.json`: API-Network-Block (osv.dev nicht erreichbar)
- `.audit-temp/semgrep.json`: Registry-Network-Block (semgrep.dev 403)

## Empfehlungen (nicht in diesem PR)

- **CSP-Härtung mit Nonces** (M02/M03): Inline-Scripts/Styles entfernen oder per Build-Schritt mit Nonces versehen. Mittelgroßes Refactoring; sollte als eigenes Issue verfolgt werden.
- **Subresource Integrity (SRI)** für externe Assets — aktuell keine externen Skripte, daher nicht akut.
- **Branch-Protection für `main`** im GitHub-UI aktivieren (erfordert Owner-Rechte).
- **Secret Scanning + Push Protection** in den GitHub-Settings einschalten (Public-Repo → kostenlos verfügbar).

## Definition of Done

- [x] `SECURITY-AUDIT.md` im Repo-Root committed
- [x] Alle Critical/High haben Wolf-Entscheidung dokumentiert (entfällt: keine gefunden)
- [x] Low/Medium-Fixes als Commits auf `claude/security-audit-hardening-HWlsY` angewendet
- [x] Hardening-Baseline-PR (Dependabot, Workflow, SECURITY.md, .gitignore) Teil dieses PRs
- [x] `.audit-temp/` aus Repo entfernt vor finalem Commit
- [x] Tagesbericht in PR-Beschreibung
