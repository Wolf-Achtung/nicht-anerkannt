# Das Atelier der Radikalen Mitte

**Staatlich NICHT anerkannt. Politisch NICHT vereinnahmbar.**

Manifest und interaktive Plattform fuer Das Atelier der Radikalen Mitte -- ein Denkraum fuer junge Menschen, die nicht in Lager passen und trotzdem handeln wollen.

## Projektstruktur

```
nicht-anerkannt/
  index.html                              - Hauptseite
  manifest-das-atelier-radikale-mitte.md  - Das Manifest
  assets/
    css/styles.css                        - Stylesheets
    js/                                   - JavaScript-Module
      main.js
      remixer.js
      stempel.js
      ticker.js
      chat.js
      quiz.js
      roadmap.js
    media/                                - Mediendateien
  pages/                                  - Unterseiten
    ideen-archiv/
    medien/
    roadmap/
  data/                                   - JSON-Datenquellen
```

## Lokale Entwicklung

```bash
git clone https://github.com/Wolf-Achtung/nicht-anerkannt.git
cd nicht-anerkannt
```

`index.html` direkt im Browser oeffnen oder einen lokalen Server starten:

```bash
npx serve .
```

Kein Build-Prozess noetig -- reines HTML/CSS/JS.

## Features

1. **Manifest-Remixer** -- Manifest-Fragmente neu zusammenwuerfeln und eigene Versionen erzeugen
2. **Stempel-Generator** -- Visuelle Stempel im Dada-Stil erstellen und teilen
3. **Live-Ticker** -- Laufende Kurznachrichten und Impulse in Echtzeit
4. **KI-Sparringspartner** -- Chat-Widget, das Positionen hinterfragt statt bestaetigt
5. **Ideen-Archiv** -- Gesammelte Vorschlaege und Denkanstoesse der Community
6. **Medienbereich** -- Texte, Audio und Video rund um die Radikale Mitte
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
