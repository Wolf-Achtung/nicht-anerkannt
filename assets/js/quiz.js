/**
 * quiz.js — Widerspruchsquiz for Das Atelier der Radikalen Mitte
 * Fetches quiz data, shows questions one at a time, tracks scores, shows result.
 */
(function () {
  'use strict';

  var quizData = null;
  var containerEl = null;
  var currentQuestion = 0;
  var scores = { mitte: 0, lager: 0, anpassung: 0 };

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function resetQuiz() {
    currentQuestion = 0;
    scores = { mitte: 0, lager: 0, anpassung: 0 };
    renderQuestion();
  }

  function renderProgressBar() {
    if (!quizData) return '';
    var total = quizData.questions.length;
    var pct = Math.round((currentQuestion / total) * 100);

    return '<div style="margin-bottom:1.4rem;">' +
      '<div style="display:flex;justify-content:space-between;font-family:Arial,sans-serif;' +
      'font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em;color:#5d5d5d;' +
      'margin-bottom:0.35rem;">' +
      '<span>Frage ' + (currentQuestion + 1) + ' von ' + total + '</span>' +
      '<span>' + pct + '%</span>' +
      '</div>' +
      '<div style="width:100%;height:6px;background:rgba(17,17,17,0.1);border-radius:3px;overflow:hidden;">' +
      '<div style="width:' + pct + '%;height:100%;background:#be1e1e;' +
      'transition:width 0.4s ease;border-radius:3px;"></div>' +
      '</div></div>';
  }

  function renderQuestion() {
    if (!containerEl || !quizData) return;

    var q = quizData.questions[currentQuestion];

    var html = renderProgressBar();

    html += '<div style="opacity:0;transition:opacity 0.4s ease;" id="quiz-content">';
    html += '<h3 style="margin:0 0 1.2rem;font-size:clamp(1.15rem,2vw,1.4rem);' +
      'line-height:1.35;font-family:Georgia,serif;">' + escapeHtml(q.text) + '</h3>';

    html += '<div style="display:flex;flex-direction:column;gap:0.6rem;">';

    for (var i = 0; i < q.options.length; i++) {
      var opt = q.options[i];
      html += '<button class="quiz-option" data-index="' + i + '" style="' +
        'text-align:left;padding:0.85rem 1rem;' +
        'border:2px solid #111;background:#fffaf1;color:#111;' +
        'font-family:Georgia,serif;font-size:0.95rem;line-height:1.45;' +
        'cursor:pointer;transition:transform 120ms ease,box-shadow 120ms ease,background 120ms ease;' +
        'box-shadow:0.2rem 0.2rem 0 rgba(17,17,17,0.9);">' +
        escapeHtml(opt.text) + '</button>';
    }

    html += '</div></div>';

    containerEl.innerHTML = html;

    // Fade in
    var content = document.getElementById('quiz-content');
    if (content) {
      requestAnimationFrame(function () {
        content.style.opacity = '1';
      });
    }

    // Bind option clicks
    var buttons = containerEl.querySelectorAll('.quiz-option');
    for (var j = 0; j < buttons.length; j++) {
      (function (btn) {
        btn.addEventListener('mouseenter', function () {
          btn.style.transform = 'translate(-2px,-2px)';
          btn.style.boxShadow = '0.35rem 0.35rem 0 rgba(17,17,17,0.9)';
          btn.style.background = '#f3ecdf';
        });
        btn.addEventListener('mouseleave', function () {
          btn.style.transform = '';
          btn.style.boxShadow = '0.2rem 0.2rem 0 rgba(17,17,17,0.9)';
          btn.style.background = '#fffaf1';
        });
        btn.addEventListener('click', function () {
          var idx = parseInt(btn.getAttribute('data-index'), 10);
          selectOption(idx);
        });
      })(buttons[j]);
    }
  }

  function selectOption(optionIndex) {
    var q = quizData.questions[currentQuestion];
    var opt = q.options[optionIndex];

    // Highlight selected
    var buttons = containerEl.querySelectorAll('.quiz-option');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].style.pointerEvents = 'none';
      if (i === optionIndex) {
        buttons[i].style.background = '#be1e1e';
        buttons[i].style.color = '#fff';
        buttons[i].style.borderColor = '#be1e1e';
      } else {
        buttons[i].style.opacity = '0.4';
      }
    }

    // Add scores
    if (opt.scores) {
      for (var key in opt.scores) {
        if (opt.scores.hasOwnProperty(key)) {
          scores[key] = (scores[key] || 0) + opt.scores[key];
        }
      }
    }

    // Advance after short delay
    setTimeout(function () {
      currentQuestion++;
      if (currentQuestion < quizData.questions.length) {
        renderQuestion();
      } else {
        renderResult();
      }
    }, 600);
  }

  function renderResult() {
    if (!containerEl || !quizData) return;

    // Determine winner
    var maxKey = 'mitte';
    var maxVal = 0;
    for (var key in scores) {
      if (scores.hasOwnProperty(key) && scores[key] > maxVal) {
        maxVal = scores[key];
        maxKey = key;
      }
    }

    var result = quizData.results[maxKey];

    var html = '<div style="opacity:0;transition:opacity 0.5s ease;" id="quiz-result">';

    // Full progress bar
    html += '<div style="margin-bottom:1.4rem;">' +
      '<div style="width:100%;height:6px;background:rgba(17,17,17,0.1);border-radius:3px;overflow:hidden;">' +
      '<div style="width:100%;height:100%;background:#be1e1e;border-radius:3px;"></div>' +
      '</div></div>';

    html += '<div style="text-align:center;padding:1rem 0;">';

    html += '<p style="font-family:Arial,sans-serif;font-size:0.78rem;text-transform:uppercase;' +
      'letter-spacing:0.14em;color:#5d5d5d;margin:0 0 0.6rem;">Dein Ergebnis</p>';

    html += '<h3 style="margin:0 0 1rem;font-size:clamp(1.8rem,4vw,2.8rem);' +
      'line-height:1;letter-spacing:-0.03em;font-family:Georgia,serif;">' +
      escapeHtml(result.title) + '</h3>';

    html += '<p style="font-size:1.05rem;line-height:1.6;max-width:36rem;margin:0 auto 1.2rem;' +
      'font-family:Georgia,serif;">' + escapeHtml(result.description) + '</p>';

    html += '<div style="display:inline-block;padding:0.8rem 1.2rem;border:2px solid #111;' +
      'box-shadow:0.3rem 0.3rem 0 rgba(17,17,17,0.9);background:#fffaf1;' +
      'transform:rotate(-1.5deg);margin-bottom:1.5rem;">' +
      '<span style="font-family:Arial,sans-serif;font-size:0.85rem;text-transform:uppercase;' +
      'letter-spacing:0.08em;font-weight:700;">' + escapeHtml(result.motto) + '</span></div>';

    // Score breakdown
    html += '<div style="display:flex;justify-content:center;gap:1.5rem;margin:1rem 0 1.5rem;' +
      'font-family:Arial,sans-serif;font-size:0.78rem;text-transform:uppercase;' +
      'letter-spacing:0.08em;color:#5d5d5d;">';
    html += '<span>Mitte: ' + (scores.mitte || 0) + '</span>';
    html += '<span>Lager: ' + (scores.lager || 0) + '</span>';
    html += '<span>Anpassung: ' + (scores.anpassung || 0) + '</span>';
    html += '</div>';

    html += '<button id="quiz-restart" style="' +
      'border:2px solid #111;background:#111;color:#fff;' +
      'padding:0.75rem 1.2rem;font-family:Arial,Helvetica,sans-serif;' +
      'font-size:0.85rem;text-transform:uppercase;letter-spacing:0.08em;' +
      'font-weight:700;cursor:pointer;' +
      'box-shadow:0.25rem 0.25rem 0 rgba(17,17,17,0.6);' +
      'transition:transform 120ms ease,box-shadow 120ms ease;">Nochmal</button>';

    html += '</div></div>';

    containerEl.innerHTML = html;

    // Fade in
    var resultDiv = document.getElementById('quiz-result');
    if (resultDiv) {
      requestAnimationFrame(function () {
        resultDiv.style.opacity = '1';
      });
    }

    // Bind restart
    var restartBtn = document.getElementById('quiz-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', resetQuiz);
      restartBtn.addEventListener('mouseenter', function () {
        restartBtn.style.transform = 'translate(-2px,-2px)';
        restartBtn.style.boxShadow = '0.38rem 0.38rem 0 rgba(17,17,17,0.6)';
      });
      restartBtn.addEventListener('mouseleave', function () {
        restartBtn.style.transform = '';
        restartBtn.style.boxShadow = '0.25rem 0.25rem 0 rgba(17,17,17,0.6)';
      });
    }
  }

  function renderIntro() {
    if (!containerEl || !quizData) return;

    var html = '<div style="text-align:center;padding:1rem 0;">';
    html += '<h2 style="margin:0 0 0.6rem;font-size:clamp(1.6rem,3vw,2.4rem);' +
      'line-height:1.05;letter-spacing:-0.02em;font-family:Georgia,serif;">' +
      escapeHtml(quizData.title) + '</h2>';
    html += '<p style="font-size:1rem;line-height:1.55;max-width:36rem;margin:0 auto 1.4rem;' +
      'color:#5d5d5d;font-family:Georgia,serif;">' +
      escapeHtml(quizData.description) + '</p>';
    html += '<button id="quiz-start" style="' +
      'border:2px solid #111;background:#be1e1e;color:#fff;' +
      'padding:0.82rem 1.4rem;font-family:Arial,Helvetica,sans-serif;' +
      'font-size:0.92rem;text-transform:uppercase;letter-spacing:0.08em;' +
      'font-weight:700;cursor:pointer;' +
      'box-shadow:0.25rem 0.25rem 0 rgba(17,17,17,0.95);' +
      'transition:transform 120ms ease,box-shadow 120ms ease;">Quiz starten</button>';
    html += '</div>';

    containerEl.innerHTML = html;

    var startBtn = document.getElementById('quiz-start');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        resetQuiz();
      });
      startBtn.addEventListener('mouseenter', function () {
        startBtn.style.transform = 'translate(-2px,-2px)';
        startBtn.style.boxShadow = '0.38rem 0.38rem 0 rgba(17,17,17,0.95)';
      });
      startBtn.addEventListener('mouseleave', function () {
        startBtn.style.transform = '';
        startBtn.style.boxShadow = '0.25rem 0.25rem 0 rgba(17,17,17,0.95)';
      });
    }
  }

  function init() {
    containerEl = document.getElementById('quiz-container');
    if (!containerEl) return;

    containerEl.innerHTML = '<p style="font-family:Arial,sans-serif;font-size:0.85rem;' +
      'color:#5d5d5d;text-align:center;">Quiz wird geladen...</p>';

    var base = document.querySelector('script[src*="quiz"]');
    var prefix = base ? base.src.replace(/assets\/js\/quiz\.js.*$/, '') : '';
    fetch(prefix + 'data/quiz-data.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load quiz data');
        return res.json();
      })
      .then(function (data) {
        quizData = data;
        renderIntro();
      })
      .catch(function (err) {
        containerEl.innerHTML = '<p style="color:#be1e1e;font-family:Arial,sans-serif;' +
          'font-size:0.9rem;">Quiz konnte nicht geladen werden.</p>';
        console.error('[AtelierQuiz]', err);
      });
  }

  window.AtelierQuiz = {
    init: init
  };
}());
