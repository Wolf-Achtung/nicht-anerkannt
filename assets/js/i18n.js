/**
 * i18n.js — Internationalisation for Das Atelier der Radikalen Mitte
 *
 * Architecture:
 *   - SUPPORTED_LANGS lists every language the site can serve.
 *     Adding a new EU language = add the code here + provide /i18n/<code>.json.
 *   - Built-in BUILTIN strings (legacy {key:{de,en}} structure) are the
 *     last-resort fallback so the site never shows a raw key, even if the
 *     external catalog fails to load.
 *   - External per-language catalogs at /i18n/<code>.json (flat key → string)
 *     are loaded asynchronously and override BUILTIN entries.
 *   - Lookup chain: external[lang] → external[FALLBACK_LANG] → BUILTIN[key][lang]
 *                   → BUILTIN[key][FALLBACK_LANG] → BUILTIN[key][DEFAULT_LANG] → key
 *
 * DOM attributes (applied automatically on DOMContentLoaded and after async load):
 *   <span data-i18n="some.key">…</span>           – textContent
 *   <p   data-i18n-html="some.key">…</p>          – innerHTML (trusted only)
 *   <a   data-i18n-attr="title:k1,aria-label:k2"> – attribute(s)
 *
 * Public API:
 *   window.AtelierI18n.lang                – detected language code
 *   window.AtelierI18n.supported           – array of language codes
 *   window.AtelierI18n.defaultLang         – default fallback
 *   window.AtelierI18n.t(key)              – translate single key
 *   window.AtelierI18n.dataPrefix()        – per-language data/ prefix
 *   window.AtelierI18n.datePath()          – relative data path
 *   window.AtelierI18n.ready               – Promise<void>, resolves after JSON load
 *   window.AtelierI18n.applyTranslations(root) – apply data-i18n* under root
 *   window.AtelierI18n.setLang(code)       – switch language (navigates to /<code>/...)
 */
(function () {
  'use strict';

  var SUPPORTED_LANGS = ['de', 'en']; // Add EU languages here, e.g. 'fr','es','it'…
  var DEFAULT_LANG = 'de';
  var FALLBACK_LANG = 'en';
  var STORAGE_KEY = 'atelier-lang';

  function detectLang() {
    // 1. URL path /xx/…
    var pathMatch = (location.pathname || '').match(/^\/([a-z]{2})(?:\/|$)/i);
    if (pathMatch) {
      var fromPath = pathMatch[1].toLowerCase();
      if (SUPPORTED_LANGS.indexOf(fromPath) !== -1) return fromPath;
    }
    // 2. <html lang>
    var htmlLang = (document.documentElement.lang || '').slice(0, 2).toLowerCase();
    if (SUPPORTED_LANGS.indexOf(htmlLang) !== -1) return htmlLang;
    // 3. localStorage user preference
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED_LANGS.indexOf(stored) !== -1) return stored;
    } catch (e) { /* ignore */ }
    // 4. navigator.languages
    var navLangs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
    for (var i = 0; i < navLangs.length; i++) {
      var nl = (navLangs[i] || '').slice(0, 2).toLowerCase();
      if (SUPPORTED_LANGS.indexOf(nl) !== -1) return nl;
    }
    return DEFAULT_LANG;
  }

  var lang = detectLang();
  // Ensure <html lang> reflects the detected language (helps screen readers + CSS :lang()).
  if ((document.documentElement.lang || '').slice(0, 2).toLowerCase() !== lang) {
    document.documentElement.lang = lang;
  }

  function getScriptBase() {
    var tag = document.querySelector('script[src*="i18n.js"]');
    if (!tag) return '/';
    return tag.src.replace(/assets\/js\/i18n\.js.*$/, '');
  }

  var loaded = {}; // { de: {key: "value"}, en: {...} }
  var inflight = {};

  function loadCatalog(code) {
    if (loaded[code]) return Promise.resolve(loaded[code]);
    if (inflight[code]) return inflight[code];
    var url = getScriptBase() + 'i18n/' + code + '.json';
    inflight[code] = fetch(url, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .catch(function () { return {}; })
      .then(function (data) {
        loaded[code] = (data && typeof data === 'object') ? data : {};
        return loaded[code];
      });
    return inflight[code];
  }

  /* ──────────────────────────────────────────────
   * BUILTIN strings (last-resort fallback). Keep in sync with /i18n/*.json.
   * Format: { key: { de: '…', en: '…' } }
   * ────────────────────────────────────────────── */
  var BUILTIN = {

    /* ── daily.js ── */
    'daily.badge':              { de: 'Denkprobe des Tages',   en: 'Thinking Challenge of the Day' },
    'daily.fallbackTitle':      { de: 'Denkprobe Archivmodus', en: 'Thinking Challenge Archive Mode' },
    'daily.fallbackNotice':     { de: 'Unser Tagesserver ist gerade nicht erreichbar. Hier ist stattdessen eine Ersatzfrage aus unserem Archiv.', en: 'Our daily server is currently unavailable. Here is a substitute question from our archive instead.' },
    'daily.answerLabel':        { de: 'Deine Antwort:',        en: 'Your answer:' },
    'daily.answerPlaceholder':  { de: 'Deine Antwort in einem Satz...', en: 'Your answer in one sentence...' },
    'daily.answerBtn':          { de: 'Antworten',             en: 'Submit' },
    'daily.privacy':            { de: 'Deine Antwort bleibt lokal in deinem Browser gespeichert und wird nicht an den Server übertragen.', en: 'Your answer is stored locally in your browser and is not transmitted to the server.' },
    'daily.archiveBtn':         { de: 'Frühere Denkproben',    en: 'Previous Thinking Challenges' },
    'daily.archiveClearBtn':    { de: 'Denkprobe-Archiv löschen', en: 'Delete Thinking Challenge Archive' },
    'daily.archiveTitle':       { de: 'Frühere Denkproben',    en: 'Previous Thinking Challenges' },
    'daily.archiveClose':       { de: 'Schließen',             en: 'Close' },
    'daily.archiveEmpty':       { de: 'Noch keine archivierten Denkproben.', en: 'No archived thinking challenges yet.' },
    'daily.archiveError':       { de: 'Archiv konnte nicht geladen werden.', en: 'Archive could not be loaded.' },
    'daily.archiveConfirm':     { de: 'Willst du alle lokal gespeicherten Denkproben wirklich löschen?', en: 'Do you really want to delete all locally stored thinking challenges?' },
    'daily.sourceAI':           { de: 'KI-gestützt',           en: 'AI-generated' },
    'daily.sourceArchive':      { de: 'Archivfrage',           en: 'Archive question' },
    'daily.loading':            { de: 'Silizium denkt…',       en: 'Silicon is thinking…' },

    /* ── quiz.js ── */
    'quiz.questionOf':     { de: 'Frage',       en: 'Question' },
    'quiz.of':             { de: 'von',          en: 'of' },
    'quiz.result':         { de: 'Dein Ergebnis', en: 'Your Result' },
    'quiz.mitte':          { de: 'Mitte',        en: 'Middle' },
    'quiz.lager':          { de: 'Lager',        en: 'Camp' },
    'quiz.anpassung':      { de: 'Anpassung',    en: 'Conformity' },
    'quiz.restart':        { de: 'Nochmal',      en: 'Try Again' },
    'quiz.start':          { de: 'Quiz starten', en: 'Start Quiz' },
    'quiz.loading':        { de: 'Quiz wird geladen...', en: 'Loading quiz...' },
    'quiz.error':          { de: 'Quiz konnte nicht geladen werden.', en: 'Quiz could not be loaded.' },

    /* ── ticker.js ── */
    'ticker.prev':         { de: 'Vorherige Nachricht', en: 'Previous message' },
    'ticker.next':         { de: 'Nächste Nachricht',   en: 'Next message' },

    /* ── score.js ── */
    'score.dim0':          { de: 'Widerspruchstoleranz',  en: 'Tolerance of Contradiction' },
    'score.dim1':          { de: 'Perspektivbreite',      en: 'Breadth of Perspective' },
    'score.dim2':          { de: 'Urteilstiefe',          en: 'Depth of Judgment' },
    'score.dim3':          { de: 'Handlungsbereitschaft', en: 'Readiness to Act' },
    'score.dim4':          { de: 'Komplexitätstoleranz',  en: 'Tolerance of Complexity' },
    'score.label0':        { de: 'Wie gut du Widersprüche aushältst',    en: 'How well you endure contradictions' },
    'score.label1':        { de: 'Wie viele Perspektiven du einnimmst',  en: 'How many perspectives you adopt' },
    'score.label2':        { de: 'Wie tief du Urteile durchdenkst',      en: 'How deeply you think through judgments' },
    'score.label3':        { de: 'Wie bereit du bist, zu handeln',       en: 'How ready you are to act' },
    'score.label4':        { de: 'Wie viel Komplexität du verarbeitest', en: 'How much complexity you process' },
    'score.noStorage':     { de: 'Denkprofil kann nicht gespeichert werden (Privatsphäre-Einstellung).', en: 'Thinking profile cannot be saved (privacy setting).' },
    'score.empty':         { de: 'Nutze die Werkzeuge des Ateliers, um dein Denkprofil aufzubauen.', en: 'Use the Atelier\'s tools to build your thinking profile.' },
    'score.reset':         { de: 'Denkprofil zurücksetzen', en: 'Reset thinking profile' },
    'score.actions':       { de: 'Denkaktionen',   en: 'thinking actions' },
    'score.strength':      { de: 'Deine Stärke:',  en: 'Your strength:' },

    /* ── remixer.js ── */
    'remixer.empty':       { de: 'Keine Remix-Linien verfügbar. Bitte später erneut versuchen.', en: 'No remix lines available. Please try again later.' },
    'remixer.error':       { de: 'Remix-Daten konnten nicht geladen werden. Bitte Seite neu laden.', en: 'Remix data could not be loaded. Please reload the page.' },

    /* ── stempel.js ── */
    'stempel.line1':       { de: 'STAATLICH NICHT', en: 'STATE-NOT' },
    'stempel.line2':       { de: 'ANERKANNT',       en: 'ACCREDITED' },
    'stempel.extrem':      { de: 'EXTREM MITTIG',   en: 'EXTREMELY CENTRIST' },
    'stempel.perspective':  { de: 'Aus Sicht der ',  en: 'From the perspective of ' },
    'stempel.ariaPrefix':  { de: 'Stempel: ',       en: 'Stamp: ' },
    'stempel.copied':      { de: 'Kopiert!',        en: 'Copied!' },
    'stempel.share':       { de: 'Teilen',           en: 'Share' },
    'stempel.copyFail':    { de: 'Kopieren nicht möglich', en: 'Unable to copy' },
    'stempel.shareText1':  { de: 'Staatlich NICHT anerkannt. Politisch NICHT vereinnahmbar.', en: 'State-NOT accredited. Politically NOT co-optable.' },
    'stempel.shareText2':  { de: 'Das Atelier der Radikalen Mitte', en: 'The Atelier of the Radical Middle' },
    'stempel.shareText3':  { de: 'Nicht mehr Stoff. Mehr Urteil.', en: 'Not more material. More judgment.' },

    /* ── chat.js ── */
    'chat.welcome':        { de: 'Willkommen im Sparring. Sag mir, was dich beschäftigt — ich werde nicht nett sein, sondern ehrlich.', en: 'Welcome to the sparring ring. Tell me what\'s on your mind — I won\'t be nice, but I\'ll be honest.' },
    'chat.fabLabel':       { de: 'KI-Sparring öffnen', en: 'Open AI Sparring' },
    'chat.fabText':        { de: 'KI-Sparring',        en: 'AI Sparring' },
    'chat.title':          { de: 'KI-Sparringspartner', en: 'AI Sparring Partner' },
    'chat.newConvo':       { de: 'Neues Gespräch',      en: 'New Conversation' },
    'chat.closeLabel':     { de: 'Chat schließen',      en: 'Close chat' },
    'chat.messagesLabel':  { de: 'Chat-Nachrichten',    en: 'Chat messages' },
    'chat.placeholder':    { de: 'Was denkst du?',      en: 'What are you thinking?' },
    'chat.inputLabel':     { de: 'Nachricht eingeben',  en: 'Enter message' },
    'chat.send':           { de: 'Senden',              en: 'Send' },
    'chat.sendLabel':      { de: 'Nachricht senden',    en: 'Send message' },

    /* ── werkstatt.js ── */
    'ws.loading':          { de: 'Silizium denkt…',     en: 'Silicon is thinking…' },
    'ws.connectionError':  { de: 'Verbindungsfehler. Bitte erneut versuchen.', en: 'Connection error. Please try again.' },
    'ws.connectionShort':  { de: 'Verbindungsfehler.',  en: 'Connection error.' },
    'ws.resultTitle':      { de: 'Gegenpositionen zu:', en: 'Counter-positions to:' },
    'ws.problemstellung':  { de: 'Problemstellung',     en: 'Problem Statement' },
    'ws.falscheAlt':       { de: 'Die falsche Alternative', en: 'The False Alternative' },
    'ws.positionA':        { de: 'Position A:',         en: 'Position A:' },
    'ws.positionB':        { de: 'Position B:',         en: 'Position B:' },
    'ws.radikaleMitte':    { de: 'Radikale Mitte',      en: 'Radical Middle' },
    'ws.offeneFragen':     { de: 'Offene Fragen',       en: 'Open Questions' },
    'ws.dilemmaError':     { de: 'Konnte kein Dilemma laden.', en: 'Could not load dilemma.' },
    'ws.blindeStelle':     { de: 'Blinde Stelle',       en: 'Blind Spot' },
    'ws.staerke':          { de: 'Stärke',              en: 'Strength' },
    'ws.vertiefung':       { de: 'Vertiefung',          en: 'Deepening' },
    'ws.stepDisziplinen':  { de: 'Disziplinen',         en: 'Disciplines' },
    'ws.stepStakeholder':  { de: 'Stakeholder',         en: 'Stakeholders' },
    'ws.stepWidersprueche':{ de: 'Widersprüche',        en: 'Contradictions' },
    'ws.stepHandlung':     { de: 'Handlungsoptionen',   en: 'Options for Action' },
    'ws.stepUrteil':       { de: 'Urteilsfrage',        en: 'Judgment Question' },
    'ws.nextStep':         { de: 'Weiter:',             en: 'Next:' },
    'ws.workshopDone':     { de: 'Werkstatt abgeschlossen', en: 'Workshop completed' },
    'ws.workshopDoneText': { de: 'Du hast alle fünf Schritte durchlaufen. Dein Denkprozess ist dokumentiert.', en: 'You have completed all five steps. Your thinking process is documented.' },
    'ws.spannung':         { de: 'Spannung',            en: 'Tension' },
    'ws.zusammenfassung':  { de: 'Zusammenfassung',     en: 'Summary' },
    'ws.deineUrteilsfrage':{ de: 'Deine Urteilsfrage',  en: 'Your Judgment Question' },
    'ws.staerken':         { de: 'Stärken',             en: 'Strengths' },
    'ws.behauptungen':     { de: 'Behauptungen ohne Begründung', en: 'Claims without reasoning' },
    'ws.fehlenderWid':     { de: 'Fehlender Widerspruch', en: 'Missing contradiction' },
    'ws.meinungAlsUrteil': { de: 'Meinung als Urteil verkleidet', en: 'Opinion disguised as judgment' },
    'ws.fehlendeFrage':    { de: 'Die fehlende Frage',  en: 'The missing question' },
    'ws.kulturAnmerkung':  { de: 'Kulturelle Anmerkung', en: 'Cultural note' },
    'ws.ausSicht':         { de: 'Aus Sicht:',          en: 'From the perspective of:' },
    'ws.uebersehen':       { de: 'Was du übersehen hast', en: 'What you overlooked' },
    'ws.bruecke':          { de: 'Brücke zwischen den Perspektiven', en: 'Bridge between perspectives' },
    'ws.gegenposition':    { de: 'Gegenposition',       en: 'Counter-position' },
    'ws.ungestellteFrage': { de: 'Die ungestellte Frage', en: 'The unasked question' },
    'ws.ungesagteAnnahmen':{ de: 'Ungesagte Annahmen',  en: 'Unspoken assumptions' },
    'ws.fehlendeStimme':   { de: 'Fehlende Stimme',     en: 'Missing voice' },
    'ws.these':            { de: 'These',                en: 'Thesis' },
    'ws.pro':              { de: 'Pro',                  en: 'Pro' },
    'ws.contra':           { de: 'Contra',               en: 'Contra' },
    'ws.einwand':          { de: 'Einwand:',             en: 'Objection:' },
    'ws.synthese':         { de: 'Synthese – Radikale Mitte', en: 'Synthesis – Radical Middle' },
    'ws.noReply':          { de: 'Keine Antwort erhalten.', en: 'No reply received.' },
    'ws.erstheitTitle':    { de: 'Erstheits-Provokation',   en: 'Firstness Provocation' },
    'ws.erstheitAufgabe':  { de: 'Aufgabenstellung',         en: 'Assignment' },
    'ws.erstheitIrritation': { de: 'Irritation',              en: 'Irritation' },
    'ws.erstheitFrage':    { de: 'Offene Frage',              en: 'Open Question' },
    'ws.tradeoff':         { de: 'Trade-off:',                en: 'Trade-off:' },

    /* ── loading-messages.js ── */
    'loading.0':  { de: 'Silizium denkt…',                        en: 'Silicon is thinking…' },
    'loading.1':  { de: 'Interessant…',                            en: 'Interesting…' },
    'loading.2':  { de: 'Lass mich kurz unterscheiden…',           en: 'Let me distinguish for a moment…' },
    'loading.3':  { de: 'Ich sortiere die Widersprüche…',          en: 'Sorting the contradictions…' },
    'loading.4':  { de: 'Ich suche das stärkste Gegenargument…',   en: 'Searching for the strongest counter-argument…' },
    'loading.5':  { de: 'Ich lege deine Annahme aufs Mikroskop…',  en: 'Putting your assumption under the microscope…' },
    'loading.6':  { de: 'Hmm – das ist nicht trivial…',            en: 'Hmm – that\'s not trivial…' },
    'loading.7':  { de: 'Ich höre dem Problem zu…',                en: 'Listening to the problem…' },
    'loading.8':  { de: 'Ich tippe leise vor mich hin…',           en: 'Typing quietly to myself…' },
    'loading.9':  { de: 'Ich nehme eine andere Perspektive ein…',  en: 'Taking a different perspective…' },
    'loading.10': { de: 'Ich messe die Spannung…',                 en: 'Measuring the tension…' },
    'loading.11': { de: 'Ich prüfe, was du nicht gesagt hast…',    en: 'Checking what you didn\'t say…' },
    'loading.12': { de: 'Ich tausche kurz die Brille…',            en: 'Swapping lenses for a moment…' },
    'loading.13': { de: 'Ich denke gegen meinen ersten Reflex…',   en: 'Thinking against my first reflex…' },
    'loading.14': { de: 'Ich prüfe drei Mal, bevor ich rede…',     en: 'Checking three times before I speak…' },

    /* ── main.js ── */
    'main.slogan0':        { de: 'Nicht mehr Stoff. Mehr Urteil.',            en: 'Not more material. More judgment.' },
    'main.slogan1':        { de: 'Keine Lager. Echte Fragen.',                en: 'No camps. Real questions.' },
    'main.slogan2':        { de: 'KI ist Sparringspartner, nicht Orakel.',    en: 'AI is a sparring partner, not an oracle.' },
    'main.slogan3':        { de: 'Widerspruch ist Methode.',                  en: 'Contradiction is method.' },
    'main.slogan4':        { de: 'Nicht angepasst. Handlungsfähig.',          en: 'Not conforming. Capable of action.' },
    'main.readMode':       { de: 'Lesemodus',          en: 'Reading Mode' },
    'main.composeMode':    { de: 'Kompositionsmodus',  en: 'Composition Mode' },
    'main.linkCopied':     { de: 'Link kopiert',       en: 'Link copied' },
    'main.copyFailed':     { de: 'Kopieren fehlgeschlagen', en: 'Copy failed' },
    'main.clipboardNA':    { de: 'Zwischenablage nicht verfügbar', en: 'Clipboard not available' },

    /* ── sharecard.js ── */
    'sharecard.download':  { de: 'Als Share-Card herunterladen', en: 'Download as share card' },
    'sharecard.brand':     { de: 'Das Atelier der Radikalen Mitte', en: 'The Atelier of the Radical Middle' },
    'sharecard.tagline':   { de: 'Nicht mehr Stoff. Mehr Urteil.', en: 'Not more material. More judgment.' },
    'sharecard.stamp':     { de: 'NICHT ANERKANNT',    en: 'NOT ACCREDITED' },
    'sharecard.claim':     { de: 'POLITISCH NICHT VEREINNAHMBAR', en: 'POLITICALLY NOT CO-OPTABLE' },
    'sharecard.extrem':    { de: 'EXTREM MITTIG',      en: 'EXTREMELY CENTRIST' },

    /* ── perspektive-global.js ── */
    'persp.button':        { de: 'Perspektive wechseln', en: 'Change perspective' },
    'persp.reading':       { de: 'Du liest als:',      en: 'Reading as:' },
    'persp.resetTip':      { de: 'Klick, um zum Original zurückzukehren', en: 'Click to return to the original' },
    'persp.dialogTitle':   { de: 'Diese Seite mit anderen Augen lesen', en: 'Read this page through different eyes' },
    'persp.dialogIntro':   { de: 'Wähle eine Perspektive. Die KI formuliert längere Textblöcke dieser Seite empathisch in der gewählten Sicht um. Das Original bleibt — du kannst jederzeit zurück.', en: 'Choose a perspective. The AI will empathetically rephrase longer text blocks on this page from the chosen viewpoint. The original remains — you can return at any time.' },
    'persp.cancel':        { de: 'Abbrechen',          en: 'Cancel' },
    'persp.statusReading': { de: 'Manifest wird gerade aus Sicht "', en: 'Manifesto is currently being read from the perspective "' },
    'persp.statusSuffix':  { de: '" gelesen.',          en: '".' },
    'persp.statusManifest':{ de: 'Manifest wird gerade aus Sicht „{p}" gelesen.', en: 'Manifesto is currently being read from the perspective of "{p}".' },
    'persp.statusEssay':   { de: 'Essay wird gerade aus Sicht „{p}" gelesen.',    en: 'Essay is currently being read from the perspective of "{p}".' },
    'persp.analysisFail':  { de: 'Analyse gerade nicht möglich.', en: 'Analysis currently not possible.' },
    'persp.blindspotBtn':  { de: 'Welche Perspektive fehlt hier?', en: 'What perspective is missing here?' },
    'persp.blindspotLabel':{ de: 'Dieser Text spricht stark aus einer bestimmten Ecke. Eine Perspektive fehlt:', en: 'This text speaks strongly from one particular angle. A perspective is missing:' },
    'persp.grp1':          { de: 'Politisch / Sozial',  en: 'Political / Social' },
    'persp.grp2':          { de: 'Alter / Generation',   en: 'Age / Generation' },
    'persp.grp3':          { de: 'Zeit',                  en: 'Time' },
    'persp.grp4':          { de: 'Kultur / Sprache',      en: 'Culture / Language' },
    'persp.grp5':          { de: 'Radikal anders',        en: 'Radically different' },

    /* ── chrome: skip link, header brand, nav toggle ── */
    'site.skipToContent':  { de: 'Zum Inhalt springen',   en: 'Skip to content' },
    'site.menu':           { de: 'Menü',                   en: 'Menu' },
    'site.sectionsLabel':  { de: 'Seitenbereiche',         en: 'Page sections' },
    'site.brandPre':       { de: 'Staatlich',              en: 'State' },
    'site.brandMain':      { de: 'NICHT ANERKANNT',        en: 'NOT ACCREDITED' },
    'site.brandTagline':   { de: 'Das Atelier der Radikalen Mitte', en: 'The Atelier of the Radical Middle' },

    /* ── chrome: header + footer navigation links ── */
    'nav.problem':         { de: 'Problem',                en: 'Problem' },
    'nav.radikaleMitte':   { de: 'Radikale Mitte',         en: 'Radical Middle' },
    'nav.atelier':         { de: 'Atelier',                en: 'Atelier' },
    'nav.einladung':       { de: 'Einladung',              en: 'Invitation' },
    'nav.denkprofil':      { de: 'Denkprofil',             en: 'Thinking Profile' },
    'nav.manifest':        { de: 'Manifest',               en: 'Manifesto' },
    'nav.hintergrund':     { de: 'Hintergrund',            en: 'Background' },
    'nav.mitmachen':       { de: 'Mitmachen',              en: 'Join' },
    'nav.salon':           { de: 'Salon',                  en: 'Salon' },
    'nav.ideenArchiv':     { de: 'Ideen-Archiv',           en: 'Ideas Archive' },
    'nav.werkstatt':       { de: 'KI-Werkstatt',           en: 'AI Workshop' },
    'nav.medien':          { de: 'Medien',                 en: 'Media' },
    'nav.roadmap':         { de: 'Roadmap',                en: 'Roadmap' },
    'nav.kontakt':         { de: 'Kontakt',                en: 'Contact' },
    'nav.impressum':       { de: 'Impressum',              en: 'Legal Notice' },
    'nav.datenschutz':     { de: 'Datenschutz',            en: 'Privacy Policy' },
    'nav.aiGovernance':    { de: 'AI Governance',          en: 'AI Governance' },
    'nav.kiRenaissance':   { de: 'KI-Renaissance',         en: 'AI Renaissance' },
    'nav.zukunftBildung':  { de: 'Zukunft der Bildung',    en: 'The Future of Education' },

    /* ── chrome: footer-only link labels ── */
    'footer.home':         { de: 'Startseite',             en: 'Home' },
    'footer.backToMedia':  { de: 'Zurück zu Medien',       en: 'Back to Media' }
  };

  function t(key) {
    // 1. external catalog (primary lang)
    var primary = loaded[lang];
    if (primary && Object.prototype.hasOwnProperty.call(primary, key)) return primary[key];
    // 2. external catalog (fallback lang)
    var fb = loaded[FALLBACK_LANG];
    if (fb && Object.prototype.hasOwnProperty.call(fb, key)) return fb[key];
    // 3. BUILTIN (legacy nested object)
    var entry = BUILTIN[key];
    if (entry) return entry[lang] || entry[FALLBACK_LANG] || entry[DEFAULT_LANG] || key;
    return key;
  }

  /**
   * Apply data-i18n* attributes within `root` (or document.body).
   * Safe to call multiple times; idempotent if translations haven't changed.
   */
  function applyTranslations(root) {
    var scope = root || document.body;
    if (!scope || typeof scope.querySelectorAll !== 'function') return;

    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = t(key);
      if (val !== key) el.textContent = val;
    });

    scope.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      var val = t(key);
      if (val !== key) el.innerHTML = val;
    });

    scope.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      var spec = el.getAttribute('data-i18n-attr') || '';
      spec.split(',').forEach(function (pair) {
        var p = pair.split(':');
        if (p.length !== 2) return;
        var attr = p[0].trim();
        var key = p[1].trim();
        var val = t(key);
        if (attr && val !== key) el.setAttribute(attr, val);
      });
    });
  }

  /**
   * Returns the correct data/ prefix for the current language.
   * Backward compatible: DE → 'data/', any other lang → 'data/<lang>/'.
   * Once per-field multilingual data files land, callers will not need this.
   */
  function dataPrefix() {
    var prefix = getScriptBase();
    return prefix + (lang === DEFAULT_LANG ? 'data/' : 'data/' + lang + '/');
  }

  function datePath() {
    return lang === DEFAULT_LANG ? 'data/' : 'data/' + lang + '/';
  }

  /**
   * Switch language by navigating to the same path under a new /xx/ prefix.
   * Stores the choice in localStorage so direct visits to /pages/* honor it.
   */
  function setLang(code) {
    if (SUPPORTED_LANGS.indexOf(code) === -1) return;
    try { localStorage.setItem(STORAGE_KEY, code); } catch (e) { /* ignore */ }
    if (code === lang) return;
    var path = location.pathname || '/';
    var m = path.match(/^\/([a-z]{2})(\/|$)/i);
    var newPath = m && SUPPORTED_LANGS.indexOf(m[1].toLowerCase()) !== -1
      ? path.replace(/^\/[a-z]{2}/, '/' + code)
      : '/' + code + (path === '/' ? '/' : path);
    location.href = newPath + (location.search || '') + (location.hash || '');
  }

  // Load primary + fallback catalogs in parallel; apply translations afterwards.
  var ready = Promise.all([
    loadCatalog(lang),
    lang === FALLBACK_LANG ? Promise.resolve({}) : loadCatalog(FALLBACK_LANG)
  ]).then(function () {
    if (document.body) applyTranslations(document.body);
    try {
      document.dispatchEvent(new CustomEvent('atelier-i18n-ready', { detail: { lang: lang } }));
    } catch (e) { /* IE — never mind */ }
  });

  // Apply BUILTIN/early translations as soon as the DOM is available, so the
  // page doesn't flash untranslated text while the JSON catalog is fetched.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { applyTranslations(document.body); });
  } else {
    applyTranslations(document.body);
  }

  window.AtelierI18n = {
    lang: lang,
    supported: SUPPORTED_LANGS.slice(),
    defaultLang: DEFAULT_LANG,
    fallbackLang: FALLBACK_LANG,
    t: t,
    dataPrefix: dataPrefix,
    datePath: datePath,
    ready: ready,
    applyTranslations: applyTranslations,
    setLang: setLang
  };
}());
