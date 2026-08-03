# Nichts geschenkt — Das Denkatelier

**Staatlich NICHT anerkannt. Politisch NICHT vereinnahmbar.**

Manifest und interaktive Plattform fuer Nichts geschenkt — Das Denkatelier -- ein Denkraum fuer Menschen, die nicht in Lager passen und trotzdem handeln wollen.

## Projektstruktur

```
nicht-anerkannt/
  index.html                              - Sprach-Redirect-Stub (/de/ oder /en/)
  manifest-das-atelier-radikale-mitte.md  - Das Manifest
  server.js                               - Express-Backend (Sprachrouting + /api/*)
  assets/
    css/styles.css                        - Stylesheets
    js/                                   - JavaScript-Module (main.js, chat.js, quiz.js, roadmap.js, ...)
    media/                                - Mediendateien
  de/, en/                                - Statische Seiten je Sprache (index, salon, werkstatt, ...)
  data/, data/en/                         - JSON-Datenquellen je Sprache
  i18n/                                   - UI-String-Kataloge (de.json, en.json)
```

## Deployment

Zwei getrennte Hosts:

- **Netlify** liefert die statischen Seiten (`de/`, `en/`, `assets/`, `data/`) unter der Produktionsdomain aus. `_redirects` deckt nur Legacy-URLs ab.
- **Railway** betreibt `server.js` ausschließlich als API-Backend für `/api/*` (Chat, Denkproben, Werkstatt etc.). Seiten mit KI-Features setzen dafür `window.ATELIER_API_BASE` auf die Railway-URL.

## Lokale Entwicklung

```bash
git clone https://github.com/Wolf-Achtung/nicht-anerkannt.git
cd nicht-anerkannt
npm install
```

Für die reinen statischen Seiten reicht `index.html`/`de/index.html` direkt im Browser oder:

```bash
npx serve .
```

Für die vollständige Anwendung inkl. `/api/*` (Chat, Denkproben-Generator, Werkstatt, ...) den Express-Server starten:

```bash
cp .env.example .env   # ANTHROPIC_API_KEY eintragen (oder CLAUDE_API_KEY/AI_API_KEY)
npm start              # http://localhost:3000
```

Ohne konfigurierten API-Key laufen die KI-Endpunkte im lokalen Fallback-Modus (z. B. `data/daily-questions.json` für die tägliche Denkprobe).

```bash
npm test        # Server-Tests (node --test)
npm run lint    # ESLint
```

Kein Build-Prozess noetig -- reines HTML/CSS/JS plus ein schlankes Express-Backend.

## Features

1. **Manifest-Remixer** -- Manifest-Fragmente neu zusammenwuerfeln und eigene Versionen erzeugen
2. **Stempel-Generator** -- Visuelle Stempel im Dada-Stil erstellen und teilen
3. **Live-Ticker** -- Laufende Kurznachrichten und Impulse in Echtzeit
4. **KI-Sparringspartner** -- Chat-Widget, das Positionen hinterfragt statt bestaetigt
5. **Ideen-Archiv** -- Gesammelte Vorschlaege und Denkanstoesse der Community
6. **Medienbereich** -- Texte, Audio und Video rund um das Denkatelier
7. **Widerspruchsquiz** -- Eigene Annahmen testen und blinde Flecken entdecken
8. **Interaktive Roadmap** -- Zeitstrahl der geplanten Aktionen und Meilensteine
9. **Denkprobe des Tages** -- Deterministische Tagesfrage via `/api/daily`, mit lokalem Archiv- und Offline-Fallback

## Designprinzipien

- **Dada-inspiriert:** asymmetrisch, provokant, merkfaehig
- **Farben:** Creme `#f3ecdf`, Papier `#fffaf1`, Rot `#be1e1e`, Tinte `#111111`
- **Typografie:** Georgia (Serif, Fliesstext), Arial (Sans, Labels/Buttons)
- **Lesemodus** als Zugaenglichkeitsalternative
- **Responsive Design** (Breakpoints: 980px, 640px)

## Mitmachen

1. Repository forken
2. Feature-Branch erstellen (`git checkout -b mein-feature`)
3. Aenderungen committen und Pull Request oeffnen
4. Ideen und Vorschlaege koennen als GitHub Issue eingereicht werden

## Lizenz

MIT

## Daily API (Kurzüberblick)

`POST /api/daily` erwartet ein JSON-Objekt mit `seed` (z. B. `2026-04-06`) und liefert eine Denkprobe im Format:

```json
{
  "titel": "...",
  "impuls": "...",
  "frage": "...",
  "source": "ai|local-pool|emergency-fallback",
  "seed": "2026-04-06"
}
```

Wenn keine KI-Konfiguration vorhanden ist oder die KI-Antwort unbrauchbar ist, wird deterministisch aus `data/daily-questions.json` gewählt. Das Frontend zeigt nur im Fehlerfall eine explizite Offline-Hinweismeldung an.
