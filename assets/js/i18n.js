/**
 * i18n.js — Lightweight internationalisation for Das Atelier der Radikalen Mitte
 *
 * Detects the current language from <html lang="…"> and exposes:
 *   window.AtelierI18n.lang   – 'de' | 'en'
 *   window.AtelierI18n.t(key) – translated string
 *   window.AtelierI18n.dataPath(file) – language-aware data path
 */
(function () {
  'use strict';

  var lang = (document.documentElement.lang || 'de').slice(0, 2);
  if (lang !== 'en') lang = 'de';

  /* ──────────────────────────────────────────────
   * Translation strings: { key: { de: '…', en: '…' } }
   * ────────────────────────────────────────────── */
  var strings = {

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
    'persp.analysisFail':  { de: 'Analyse gerade nicht möglich.', en: 'Analysis currently not possible.' },
    'persp.blindspotBtn':  { de: 'Welche Perspektive fehlt hier?', en: 'What perspective is missing here?' },
    'persp.blindspotLabel':{ de: 'Dieser Text spricht stark aus einer bestimmten Ecke. Eine Perspektive fehlt:', en: 'This text speaks strongly from one particular angle. A perspective is missing:' },
    'persp.grp1':          { de: 'Politisch / Sozial',  en: 'Political / Social' },
    'persp.grp2':          { de: 'Alter / Generation',   en: 'Age / Generation' },
    'persp.grp3':          { de: 'Zeit',                  en: 'Time' },
    'persp.grp4':          { de: 'Kultur / Sprache',      en: 'Culture / Language' },
    'persp.grp5':          { de: 'Radikal anders',        en: 'Radically different' }
  };

  function t(key) {
    var entry = strings[key];
    if (!entry) return key;
    return entry[lang] || entry.de || key;
  }

  /**
   * Returns the correct data path prefix for the current language.
   * German loads from 'data/', English from 'data/en/'.
   */
  function dataPrefix() {
    var base = document.querySelector('script[src*="i18n"]');
    var prefix = base ? base.src.replace(/assets\/js\/i18n\.js.*$/, '') : '';
    return prefix + (lang === 'en' ? 'data/en/' : 'data/');
  }

  function datePath() {
    return lang === 'en' ? 'data/en/' : 'data/';
  }

  window.AtelierI18n = {
    lang: lang,
    t: t,
    dataPrefix: dataPrefix,
    datePath: datePath
  };
}());
