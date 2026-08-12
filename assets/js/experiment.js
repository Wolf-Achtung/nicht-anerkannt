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
    var steps = [
      [L('Du bekommst eine Frage und beantwortest sie allein.', 'You get a question and answer it on your own.'),
       L('Kein Nachschlagen, keine KI. 2–5 Sätze.', 'No looking things up, no AI. 2–5 sentences.')],
      [L('Die KI widerspricht deiner Antwort.', 'The AI pushes back on your answer.'),
       L('Sie sagt dir nicht, was richtig ist — sie zeigt, was du übersehen hast.', 'It doesn\'t tell you what is right — it shows you what you overlooked.')],
      [L('Du entscheidest, was du änderst.', 'You decide what to change.'),
       L('Danach stehen beide Fassungen und der Einwand untereinander. Du siehst, was von dir kam und was von der Maschine.', 'Afterwards both versions and the objection sit one below the other. You see what came from you and what came from the machine.')]
    ];

    var html = '<div class="quiz-intro-wrapper">';
    html += '<p class="exp-lead">' + L(
      'Dauert etwa fünf Minuten. So läuft es ab:',
      'Takes about five minutes. Here is how it works:'
    ) + '</p>';
    html += '<ol class="exp-steps">';
    steps.forEach(function (step) {
      html += '<li><strong>' + step[0] + '</strong><span>' + step[1] + '</span></li>';
    });
    html += '</ol>';
    html += '<button class="quiz-start" id="exp-start" type="button">' + L('Experiment starten', 'Start the experiment') + '</button>';
    html += '<p class="exp-privacy">' + L(
      'Alles bleibt in deinem Browser. Nichts wird gespeichert.',
      'Everything stays in your browser. Nothing is stored.'
    ) + '</p>';
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
    var html = '<p class="quiz-result-label">' + L('Schritt 1 von 3 — nur du', 'Step 1 of 3 — you alone') + '</p>';
    html += '<div class="werkstatt-dilemma">';
    html += '<h3>' + escapeHtml(state.frage.titel) + '</h3>';
    html += '<p><strong>' + escapeHtml(state.frage.frage) + '</strong></p>';
    html += '</div>';
    html += '<label class="exp-label" for="exp-input-v1">' +
      L('Deine Antwort — ohne KI, ohne Nachschlagen', 'Your answer — no AI, no looking things up') + '</label>';
    html += '<textarea class="werkstatt-input" id="exp-input-v1" rows="5" maxlength="1000" placeholder="' +
      L('2–5 Sätze reichen.', '2–5 sentences are enough.') + '"></textarea>';
    html += '<button class="button button--accent" id="exp-to-ai" type="button">' + L('Weiter — die KI soll widersprechen', 'Next — let the AI push back') + '</button>';
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

  function feedbackHtml() {
    var html = '';
    if (state.feedback.blinde_stelle) {
      html += '<p><strong>' + L('Was du übersehen hast', 'What you overlooked') + ':</strong> ' + escapeHtml(state.feedback.blinde_stelle) + '</p>';
    }
    if (state.feedback.staerke) {
      html += '<p><strong>' + L('Was stark war', 'What was strong') + ':</strong> ' + escapeHtml(state.feedback.staerke) + '</p>';
    }
    if (state.feedback.vertiefung) {
      html += '<p><strong>' + L('Frage zum Weiterdenken', 'Question to take further') + ':</strong> ' + escapeHtml(state.feedback.vertiefung) + '</p>';
    }
    return html;
  }

  function renderPhase2() {
    var html = '<p class="quiz-result-label">' + L('Schritt 2 von 3 — die KI widerspricht', 'Step 2 of 3 — the AI pushes back') + '</p>';

    if (state.feedback) {
      html += '<div class="werkstatt-output">' + feedbackHtml() + '</div>';
    } else {
      html += '<div class="werkstatt-output"><p>' + L(
        'Die KI ist gerade nicht erreichbar. Übernimm den Widerspruch selbst: Lies deine Antwort noch einmal wie die einer fremden Person — was würdest du ihr entgegnen?',
        'The AI is unreachable right now. Take over the objection yourself: reread your answer as if a stranger had written it — what would you say against it?'
      ) + '</p></div>';
    }

    html += '<label class="exp-label" for="exp-input-v2">' + L(
      'Unten steht deine Antwort von eben. Ändere, was du ändern willst — oder lass sie so.',
      'Below is the answer you just wrote. Change what you want to change — or leave it as it is.'
    ) + '</label>';
    html += '<textarea class="werkstatt-input" id="exp-input-v2" rows="5" maxlength="1000"></textarea>';
    html += '<div class="exp-actions">';
    html += '<button class="button button--accent" id="exp-compare" type="button">' + L('Fertig — Ergebnis zeigen', 'Done — show the result') + '</button>';
    html += '<button class="button" id="exp-keep" type="button">' + L('Ich bleibe dabei', 'I stand by my answer') + '</button>';
    html += '</div>';
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
    var html = '<p class="quiz-result-label">' + L('Schritt 3 von 3 — dein Ergebnis', 'Step 3 of 3 — your result') + '</p>';
    html += '<div class="werkstatt-dilemma"><p><strong>' + escapeHtml(state.frage.frage) + '</strong></p></div>';

    // Vertical flow, in the order it happened: the objection stays visible
    // between the two versions — otherwise the cause of the change is lost
    // exactly where it should be judged.
    html += '<ol class="exp-flow">';
    html += '<li class="exp-flow-step"><span class="exp-flow-label">' +
      L('Deine Antwort — allein gedacht', 'Your answer — thought alone') + '</span>' +
      '<p>' + escapeHtml(state.v1) + '</p></li>';

    html += '<li class="exp-flow-step exp-flow-step--ai"><span class="exp-flow-label">' +
      L('Was die KI dagegen hielt', 'What the AI held against it') + '</span>';
    if (state.feedback) {
      html += feedbackHtml();
    } else {
      html += '<p>' + L('Die KI war nicht erreichbar — den Widerspruch hast du selbst übernommen.',
        'The AI was unreachable — you took over the objection yourself.') + '</p>';
    }
    html += '</li>';

    html += '<li class="exp-flow-step"><span class="exp-flow-label">' +
      (unchanged
        ? L('Deine Antwort danach — unverändert', 'Your answer afterwards — unchanged')
        : L('Deine Antwort danach — überarbeitet', 'Your answer afterwards — revised')) + '</span>' +
      '<p>' + escapeHtml(state.v2) + '</p></li>';
    html += '</ol>';

    html += '<div class="werkstatt-output">';
    html += '<p class="exp-question-label">' + L('Eine Frage zum Schluss — nur für dich:', 'One closing question — for you alone:') + '</p>';
    if (unchanged) {
      html += '<p class="big-line">' + L(
        'Du bist bei deiner Antwort geblieben. War das Standfestigkeit — oder hast du dem Einwand nur ausweichen wollen?',
        'You stood by your answer. Was that steadfastness — or did you just want to dodge the objection?'
      ) + '</p>';
    } else {
      html += '<p class="big-line">' + L(
        'Welcher Gedanke in deiner zweiten Antwort ist wirklich deiner — und welcher gehört der Maschine?',
        'Which thought in your second answer is truly yours — and which one belongs to the machine?'
      ) + '</p>';
    }
    html += '<p>' + L(
      'Genau das ist der Unterschied, um den es hier geht. Die KI hat dir nichts abgenommen — sie hat dich gezwungen, noch einmal hinzusehen. Erst du, dann die KI.',
      'That is exactly the difference this place is about. The AI did not do the work for you — it forced you to look again. First you, then the AI.'
    ) + '</p>';
    html += '</div>';

    html += '<button class="button button--accent" id="exp-again" type="button">' + L('Noch ein Experiment', 'Another experiment') + '</button>';
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
