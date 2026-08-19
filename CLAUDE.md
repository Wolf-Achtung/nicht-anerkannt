# Steckbrief — Nichts geschenkt

Wartungsrelevante Fakten des Projekts. Angelegt beim Wartungsdurchgang am
**18.08.2026**. Bei jedem weiteren Durchgang aktualisieren, nicht anhängen.

## Aufbau

| Teil | Wo | Was |
|---|---|---|
| Seiten | Netlify | Statisches HTML/CSS/JS aus `de/` und `en/`, deployt von `main` |
| API | Railway | `server.js` (Express 4) unter `nicht-anerkannt-production.up.railway.app`, deployt von `main` |
| Domain | nichts-geschenkt.de | `nicht-anerkannt.info` leitet dauerhaft (301) dorthin |

Die Seiten sprechen die API über `window.ATELIER_API_BASE` an. Es gibt keine
Datenbank; alles, was Nutzer:innen eingeben, bleibt in ihrem Browser.

## Laufzeit

- **Vorgabe:** `package.json` → `engines.node: ">=22"` (Untergrenze, keine Festlegung)
- **Tatsächlich:** über `GET /api/health` → Feld `node` ablesbar. Beim
  Durchgang lokal `v22.22.2`.
- **Keine** Pin-Datei (`.nvmrc`, `railway.json`, `Dockerfile`) — die Plattform
  wählt aus der Untergrenze. Node 22 ist LTS.
- **Offen:** Die in Railway laufende Version wurde beim Durchgang nicht
  abgelesen. `/api/health` beantwortet das ab sofort ohne Plattformzugang.

## KI-Anbindung

- **Modell:** `claude-sonnet-5`, in `server.js` als `DEFAULT_MODEL`,
  überschreibbar per `ANTHROPIC_MODEL`.
- **API-Version:** Header `anthropic-version: 2023-06-01` (fest).
- **Endpunkt:** `https://api.anthropic.com/v1/messages`, überschreibbar per
  `ANTHROPIC_BASE_URL` (nur für Tests gegen eine Attrappe gedacht).
- **Denken:** Standard `disabled`. Aktuelle Modelle denken sonst
  voreingestellt mit, und diese Token zählen gegen dasselbe `max_tokens`-
  Budget wie die Antwort — das hat im August 2026 mehrere Werkzeuge stumm
  lahmgelegt. Mit `AI_THINKING=adaptive` bekommt das Denken automatisch
  eigenes Budget (Antwort × 4, mindestens 6000, höchstens 16000 Token).
- **Preisstichtag:** Für `claude-sonnet-5` gilt laut der im Projekt
  gebündelten, auf **24.06.2026** datierten API-Referenz ein Einführungspreis
  von 2,00 $ / 10,00 $ je Million Token **bis 31.08.2026**; danach 3,00 $ /
  15,00 $. Das ist kein Abschaltdatum, aber eine Kostenänderung um rund 50 %.
- **Kein Abkündigungsdatum** für `claude-sonnet-5` bekannt. Die Live-Doku war
  beim Durchgang aus der Prüfumgebung nicht erreichbar (Egress gesperrt);
  Grundlage ist die gebündelte Referenz. Beim nächsten Durchgang gegen
  `docs.anthropic.com` gegenprüfen.

## ENV-Vertrag

Alles außer dem Schlüssel hat einen brauchbaren Standardwert.

| Variable | Pflicht | Standard | Wirkung |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | **ja** | — | Ohne ihn antworten alle KI-Endpunkte mit Fehler; `/api/daily` fällt auf den lokalen Fragenvorrat zurück. Alternativen: `CLAUDE_API_KEY`, `AI_API_KEY` (in dieser Reihenfolge geprüft). |
| `ANTHROPIC_MODEL` | nein | `claude-sonnet-5` | Modellwechsel ohne Deploy |
| `AI_THINKING` | nein | `disabled` | `adaptive` schaltet das Denken ein |
| `AI_EFFORT` | nein | `low` | nur wirksam bei `AI_THINKING=adaptive` |
| `AI_THINKING_HEADROOM` / `_MIN_TOKENS` / `_MAX_TOKENS` | nein | 4 / 6000 / 16000 | Budgetzuschlag fürs Denken |
| `AI_RATE_LIMIT_WAIT_MS` / `_MAX_MS` | nein | 12000 / 30000 | Warten bei Mengenbegrenzung (der `Retry-After` des Anbieters hat Vorrang) |
| `AI_RETRY_BASE_MS` | nein | 700 | Abstand bei sonstigen wiederholbaren Fehlern |
| `ANTHROPIC_BASE_URL` | nein | `https://api.anthropic.com` | nur für Tests |
| `ALLOWED_ORIGINS` | nein | beide Domains mit und ohne `www` | CORS |
| `TRUST_PROXY` | nein | `1` | Proxy-Hops für korrektes Rate-Limit je IP |
| `PORT` | nein | `3000` | Railway setzt das selbst |

**Nur zur Bauzeit:** `SITE_URL` (Standard `https://nichts-geschenkt.de`) wird
ausschließlich von `scripts/add-hreflang.js` gelesen. In der Deploy-Umgebung
gesetzt bleibt sie wirkungslos.

Die `SMOKE_*`-Variablen gehören zum Prüfskript, nicht zum Server.

## Prüfen

```bash
npm test              # Server-Tests (27)
npm run lint          # ESLint (0 Fehler, 19 bekannte Warnungen)
npm run i18n:check    # DE/EN-Parität der Übersetzungen
npm run chrome:check  # Menü und Footer auf allen Seiten gleich
npm run smoke         # ruft Seiten und API live auf und prüft die Antwortform
```

`npm run smoke` gibt es auch ohne Terminal: GitHub → Actions → „Rundum-Test
(live)" → Run workflow. Läuft zusätzlich montags automatisch.

## Bekannte offene Punkte

Stand 18.08.2026, gemeldet im Wartungsdurchgang, noch nicht entschieden:

1. `/api/widerspruch` antwortet mit HTTP 200 und leerer Liste, wenn die
   KI-Antwort unlesbar ist — der Salon zeigt dann nichts an, ohne Fehler.
2. `/api/translate` gibt bei unlesbarer Antwort den Rohtext des Modells als
   Übersetzung aus.
3. Vier Datendateien ohne jede Referenz: `data/manifest-fragments.json`,
   `data/ticker-messages.json` und beide `data/en/`-Entsprechungen.
4. Rund 24 CSS-Regeln für entfernte Bauteile (Ticker, Stempel-Panel).
5. Die `data.raw`-Zweige in `assets/js/werkstatt.js` und `daily.js` sind tot —
   der Server sendet dieses Feld nicht mehr.

## Verlauf der Wartungsdurchgänge

| Datum | Befund in einem Satz |
|---|---|
| 18.08.2026 | Erster Durchgang: eine Dev-Abhängigkeit mit Advisory behoben, zwei Endpunkte melden Fehler weiterhin als Erfolg, vier tote Datendateien. |
