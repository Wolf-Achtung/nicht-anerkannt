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

    return '<div class="quiz-progress-label">' +
      '<span>Frage ' + (currentQuestion + 1) + ' von ' + total + '</span>' +
      '<span>' + pct + '%</span>' +
      '</div>' +
      '<div class="quiz-progress-track">' +
      '<div class="quiz-progress-fill" style="width:' + pct + '%"></div>' +
      '</div>';
  }

  function renderQuestion() {
    if (!containerEl || !quizData) return;

    var q = quizData.questions[currentQuestion];

    var html = renderProgressBar();

    html += '<div class="quiz-content-fade" id="quiz-content">';
    html += '<h3 class="quiz-question-title">' + escapeHtml(q.text) + '</h3>';

    html += '<div class="quiz-options-container">';

    for (var i = 0; i < q.options.length; i++) {
      var opt = q.options[i];
      html += '<button class="quiz-option" data-index="' + i + '">' +
        escapeHtml(opt.text) + '</button>';
    }

    html += '</div></div>';

    containerEl.innerHTML = html;

    // Fade in
    var content = document.getElementById('quiz-content');
    if (content) {
      requestAnimationFrame(function () {
        content.classList.add('quiz-content-fade--visible');
      });
    }

    // Bind option clicks
    var buttons = containerEl.querySelectorAll('.quiz-option');
    for (var j = 0; j < buttons.length; j++) {
      (function (btn) {
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
      buttons[i].classList.add('quiz-option--disabled');
      if (i === optionIndex) {
        buttons[i].classList.add('quiz-option--selected');
      } else {
        buttons[i].classList.add('quiz-option--faded');
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

    var html = '<div class="quiz-result-fade" id="quiz-result">';

    // Full progress bar
    html += '<div class="quiz-progress-track">' +
      '<div class="quiz-progress-fill" style="width:100%"></div>' +
      '</div>';

    html += '<div class="quiz-result-container">';

    html += '<p class="quiz-result-label">Dein Ergebnis</p>';

    html += '<h3 class="quiz-result-title">' +
      escapeHtml(result.title) + '</h3>';

    html += '<p class="quiz-result-description">' + escapeHtml(result.description) + '</p>';

    html += '<div class="quiz-result-motto">' +
      '<span>' + escapeHtml(result.motto) + '</span></div>';

    // Score breakdown
    html += '<div class="quiz-result-scores">';
    html += '<span>Mitte: ' + (scores.mitte || 0) + '</span>';
    html += '<span>Lager: ' + (scores.lager || 0) + '</span>';
    html += '<span>Anpassung: ' + (scores.anpassung || 0) + '</span>';
    html += '</div>';

    html += '<button class="quiz-restart" id="quiz-restart">Nochmal</button>';

    html += '</div></div>';

    containerEl.innerHTML = html;

    // Fade in
    var resultDiv = document.getElementById('quiz-result');
    if (resultDiv) {
      requestAnimationFrame(function () {
        resultDiv.classList.add('quiz-result-fade--visible');
      });
    }

    // Bind restart
    var restartBtn = document.getElementById('quiz-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', resetQuiz);
    }
  }

  function renderIntro() {
    if (!containerEl || !quizData) return;

    var html = '<div class="quiz-intro-wrapper">';
    html += '<h2>' + escapeHtml(quizData.title) + '</h2>';
    html += '<p>' + escapeHtml(quizData.description) + '</p>';
    html += '<button class="quiz-start" id="quiz-start">Quiz starten</button>';
    html += '</div>';

    containerEl.innerHTML = html;

    var startBtn = document.getElementById('quiz-start');
    if (startBtn) {
      startBtn.addEventListener('click', function () {
        resetQuiz();
      });
    }
  }

  function init() {
    containerEl = document.getElementById('quiz-container');
    if (!containerEl) return;

    containerEl.innerHTML = '<p class="quiz-loading">Quiz wird geladen...</p>';

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
        containerEl.innerHTML = '<p class="quiz-error">Quiz konnte nicht geladen werden.</p>';
        console.error('[AtelierQuiz]', err);
      });
  }

  window.AtelierQuiz = {
    init: init
  };
}());
