/**
 * experiment.js — Das Experiment: mit KI / ohne KI
 *
 * Guided self-experiment implementing the site's core principle
 * ("Erst du, dann die KI") as an experience:
 *   1. A thinking question is shown (from /api/daily with a random seed,
 *      local fallback pool if the API is unreachable).
 *   2. Round 1: the user answers entirely without AI.
 *   3. Round 2: the AI challenges that answer (/api/urteil judge:
 *      blind spot, strength, follow-up question) and the user may revise.
 *   4. Comparison: both versions side by side plus reflection prompts —
 *      what changed, what was yours, what came from the machine.
 *
 * Nothing is stored server-side; both answers live only in this page view.
 */
(function () {
  'use strict';

  var API_BASE = (typeof window !== 'undefined' && window.ATELIER_API_BASE) ? window.ATELIER_API_BASE : '';
  var container = null;
  var state = { frage: null, v1: '', v2: '', feedback: null };

  var FALLBACK_QUESTIONS = [
    {
      titel: { de: 'Die geliehene Gewissheit', en: 'The Borrowed Certainty' },
      frage: {
        de: 'Welche deiner Überzeugungen hast du übernommen, ohne sie je selbst geprüft zu haben — und woran würdest du das merken?',
        en: 'Which of your convictions did you adopt without ever examining it yourself — and how would you notice?'
      }
    },
    {
      titel: { de: 'Der unbequeme Kompromiss', en: 'The Uncomfortable Compromise' },
      frage: {
        de: 'Bei welchem Konflikt in deinem Umfeld haben beide Seiten etwas Richtiges gesehen — und was wäre ein Kompromiss, der beiden wehtut?',
        en: 'In which conflict around you did both sides see something true — and what would a compromise look like that hurts both?'
      }
    },
    {
      titel: { de: 'Die Regel für alle', en: 'The Rule for Everyone' },
      frage: {
        de: 'Welche Regel würdest du für alle einführen — und wärst du bereit, ihre unangenehmste Nebenwirkung selbst zu tragen?',
        en: 'What rule would you introduce for everyone — and would you be willing to bear its most unpleasant side effect yourself?'
      }
    }
  ];

  function lang() {
    return (window.AtelierI18n && window.AtelierI18n.lang) || 'de';
  }

  function L(de, en) {
    return lang() === 'en' ? en : de;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = (str === null || str === undefined) ? '' : String(str);
    return div.innerHTML;
  }

  function loadingHtml() {
    if (window.AtelierLoading && typeof window.AtelierLoading.html === 'function') {
      return window.AtelierLoading.html();
    }
    return '<div class="werkstatt-loading">' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-text">' + L('Lade…', 'Loading…') + '</span></div>';
  }

  function pickFallbackQuestion() {
    var entry = FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
    return { titel: entry.titel[lang()] || entry.titel.de, frage: entry.frage[lang()] || entry.frage.de };
  }

  function fetchQuestion() {
    var seed = 'experiment-' + Math.random().toString(36).slice(2, 10);
    return fetch(API_BASE + '/api/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed: seed, lang: lang() })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.frage) throw new Error('No question in response');
        return { titel: data.titel || L('Denkprobe', 'Thinking Challenge'), frage: data.frage };
      })
      .catch(function () {
        return pickFallbackQuestion();
      });
  }

  function renderIntro() {
    var html = '<div class="quiz-intro-wrapper">';
    html += '<p>' + L(
      'Runde 1: Du antwortest ganz ohne Hilfe. Runde 2: Die KI fordert dich heraus — und du entscheidest, was du änderst. Am Ende siehst du beide Fassungen nebeneinander. Deine Antworten bleiben in deinem Browser und werden nicht gespeichert.',
      'Round 1: you answer entirely without help. Round 2: the AI challenges you — and you decide what to change. At the end you see both versions side by side. Your answers stay in your browser and are not stored.'
    ) + '</p>';
    html += '<button class="quiz-start" id="exp-start" type="button">' + L('Experiment starten', 'Start the experiment') + '</button>';
    html += '</div>';
    container.innerHTML = html;
    document.getElementById('exp-start').addEventListener('click', startExperiment);
  }

  function startExperiment() {
    state = { frage: null, v1: '', v2: '', feedback: null };
    container.innerHTML = loadingHtml();
    fetchQuestion().then(function (q) {
      state.frage = q;
      renderPhase1();
    });
  }

  function renderPhase1() {
    var html = '<div class="werkstatt-dilemma">';
    html += '<p class="quiz-result-label">' + L('Runde 1 von 2 — ohne KI', 'Round 1 of 2 — without AI') + '</p>';
    html += '<h3>' + escapeHtml(state.frage.titel) + '</h3>';
    html += '<p><strong>' + escapeHtml(state.frage.frage) + '</strong></p>';
    html += '</div>';
    html += '<label class="sr-only" for="exp-input-v1">' + L('Deine Antwort ohne KI', 'Your answer without AI') + '</label>';
    html += '<textarea class="werkstatt-input" id="exp-input-v1" rows="5" maxlength="1000" placeholder="' +
      L('Deine Antwort — nur dein Kopf, kein Werkzeug. 2–5 Sätze reichen.', 'Your answer — just your head, no tools. 2–5 sentences are enough.') + '"></textarea>';
    html += '<button class="button button--accent" id="exp-to-ai" type="button">' + L('Fertig — jetzt soll die KI widersprechen', 'Done — now let the AI push back') + '</button>';
    container.innerHTML = html;

    document.getElementById('exp-to-ai').addEventListener('click', function () {
      var v1 = document.getElementById('exp-input-v1').value.trim();
      if (!v1) { document.getElementById('exp-input-v1').focus(); return; }
      state.v1 = v1;
      requestFeedback();
    });
  }

  function requestFeedback() {
    container.innerHTML = loadingHtml();
    fetch(API_BASE + '/api/urteil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'judge',
        dilemma: state.frage.titel + ': ' + state.frage.frage,
        urteil: state.v1,
        lang: lang()
      })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || data.error || !(data.blinde_stelle || data.staerke || data.vertiefung)) {
          state.feedback = null;
        } else {
          state.feedback = data;
        }
        renderPhase2();
      })
      .catch(function () {
        state.feedback = null;
        renderPhase2();
      });
  }

  function renderPhase2() {
    var html = '<p class="quiz-result-label">' + L('Runde 2 von 2 — mit KI', 'Round 2 of 2 — with AI') + '</p>';

    if (state.feedback) {
      html += '<div class="werkstatt-output">';
      if (state.feedback.blinde_stelle) {
        html += '<p><strong>' + L('Blinde Stelle', 'Blind spot') + ':</strong> ' + escapeHtml(state.feedback.blinde_stelle) + '</p>';
      }
      if (state.feedback.staerke) {
        html += '<p><strong>' + L('Stärke', 'Strength') + ':</strong> ' + escapeHtml(state.feedback.staerke) + '</p>';
      }
      if (state.feedback.vertiefung) {
        html += '<p><strong>' + L('Weiterdenken', 'Think further') + ':</strong> ' + escapeHtml(state.feedback.vertiefung) + '</p>';
      }
      html += '</div>';
    } else {
      html += '<div class="werkstatt-output"><p>' + L(
        'Die KI ist gerade nicht erreichbar. Zweite Runde ohne Sparring: Lies deine Antwort noch einmal wie eine fremde — was würdest du ihr entgegnen?',
        'The AI is unreachable right now. Second round without sparring: reread your answer as if it were a stranger’s — what would you say against it?'
      ) + '</p></div>';
    }

    html += '<label class="sr-only" for="exp-input-v2">' + L('Deine überarbeitete Antwort', 'Your revised answer') + '</label>';
    html += '<textarea class="werkstatt-input" id="exp-input-v2" rows="5" maxlength="1000"></textarea>';
    html += '<button class="button button--accent" id="exp-compare" type="button">' + L('Zum Vergleich', 'Compare versions') + '</button> ';
    html += '<button class="button" id="exp-keep" type="button">' + L('Nichts ändern — direkt vergleichen', 'Change nothing — compare directly') + '</button>';
    container.innerHTML = html;

    var v2El = document.getElementById('exp-input-v2');
    v2El.value = state.v1;

    document.getElementById('exp-compare').addEventListener('click', function () {
      state.v2 = v2El.value.trim() || state.v1;
      renderPhase3();
    });
    document.getElementById('exp-keep').addEventListener('click', function () {
      state.v2 = state.v1;
      renderPhase3();
    });
  }

  function renderPhase3() {
    var unchanged = state.v1 === state.v2;
    var html = '<p class="quiz-result-label">' + L('Der Vergleich', 'The Comparison') + '</p>';
    html += '<div class="werkstatt-dilemma"><p><strong>' + escapeHtml(state.frage.frage) + '</strong></p></div>';

    html += '<div class="cards">';
    html += '<article class="card"><h3>' + L('Ohne KI', 'Without AI') + '</h3><p>' + escapeHtml(state.v1) + '</p></article>';
    html += '<article class="card"><h3>' + L('Nach dem Sparring', 'After the sparring') + '</h3><p>' + escapeHtml(state.v2) + '</p></article>';
    html += '</div>';

    html += '<div class="werkstatt-output">';
    if (unchanged) {
      html += '<p>' + L(
        'Du hast nichts geändert. Das kann Standfestigkeit sein — oder eine verpasste Chance. Woran erkennst du den Unterschied?',
        'You changed nothing. That can be steadfastness — or a missed opportunity. How would you tell the difference?'
      ) + '</p>';
    } else {
      html += '<p>' + L(
        'Drei Fragen zum Schluss — nur für dich: Was hat sich verändert, und warum? Welcher Gedanke in Fassung 2 ist wirklich deiner, welcher kam von der Maschine? Und der Merk-Check: Kannst du deine zweite Fassung sinngemäß wiedergeben, ohne hinzuschauen?',
        'Three closing questions — for you alone: What changed, and why? Which thought in version 2 is truly yours, which came from the machine? And the recall check: can you restate your second version without looking?'
      ) + '</p>';
    }
    html += '<p><strong>' + L('Das war das Prinzip: Erst du, dann die KI.', 'That was the principle: first you, then the AI.') + '</strong></p>';
    html += '</div>';

    html += '<button class="button button--accent" id="exp-again" type="button">' + L('Neues Experiment', 'New experiment') + '</button>';
    container.innerHTML = html;

    document.getElementById('exp-again').addEventListener('click', startExperiment);

    if (window.AtelierScore && window.AtelierScore.track) {
      window.AtelierScore.track('urteil');
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    container = document.getElementById('experiment-container');
    if (!container) return;
    renderIntro();
  });
}());
