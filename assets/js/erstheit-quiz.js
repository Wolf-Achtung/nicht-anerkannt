/**
 * erstheit-quiz.js — Erstheits-Test: Staunende:r, Schnellschließer:in oder Ambiguitäts-Athlet:in?
 * Standalone quiz module following the disegno-quiz.js pattern.
 */
(function () {
  'use strict';

  var quizData = null;
  var containerEl = null;
  var currentQuestion = 0;
  var scores = { staunen: 0, schliessen: 0, verweilen: 0 };

  function t(key) {
    return (window.AtelierI18n && window.AtelierI18n.t) ? window.AtelierI18n.t(key) : key;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function resetQuiz() {
    currentQuestion = 0;
    scores = { staunen: 0, schliessen: 0, verweilen: 0 };
    renderQuestion();
  }

  function renderProgressBar() {
    if (!quizData) return '';
    var total = quizData.questions.length;
    var pct = Math.round((currentQuestion / total) * 100);

    return '<div class="quiz-progress-label">' +
      '<span>' + t('quiz.questionOf') + ' ' + (currentQuestion + 1) + ' ' + t('quiz.of') + ' ' + total + '</span>' +
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
    html += '<div class="quiz-content-fade" id="erstheit-content">';
    html += '<h3 class="quiz-question-title">' + escapeHtml(q.text) + '</h3>';
    html += '<div class="quiz-options-container">';

    for (var i = 0; i < q.options.length; i++) {
      html += '<button class="quiz-option" data-index="' + i + '">' +
        escapeHtml(q.options[i].text) + '</button>';
    }

    html += '</div></div>';
    containerEl.innerHTML = html;

    var content = document.getElementById('erstheit-content');
    if (content) {
      requestAnimationFrame(function () {
        content.classList.add('quiz-content-fade--visible');
      });
    }

    var buttons = containerEl.querySelectorAll('.quiz-option');
    for (var j = 0; j < buttons.length; j++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          selectOption(parseInt(btn.getAttribute('data-index'), 10));
        });
      })(buttons[j]);
    }
  }

  function selectOption(optionIndex) {
    var q = quizData.questions[currentQuestion];
    var opt = q.options[optionIndex];

    var buttons = containerEl.querySelectorAll('.quiz-option');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.add('quiz-option--disabled');
      if (i === optionIndex) {
        buttons[i].classList.add('quiz-option--selected');
      } else {
        buttons[i].classList.add('quiz-option--faded');
      }
    }

    if (opt.scores) {
      for (var key in opt.scores) {
        if (opt.scores.hasOwnProperty(key)) {
          scores[key] = (scores[key] || 0) + opt.scores[key];
        }
      }
    }

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

    var maxKey = 'staunen';
    var maxVal = 0;
    for (var key in scores) {
      if (scores.hasOwnProperty(key) && scores[key] > maxVal) {
        maxVal = scores[key];
        maxKey = key;
      }
    }

    var result = quizData.results[maxKey];
    var lang = (window.AtelierI18n && window.AtelierI18n.lang) || 'de';
    var labelResult = lang === 'en' ? 'Your Result' : 'Dein Ergebnis';
    var labelStaunen = lang === 'en' ? 'Wonder' : 'Staunen';
    var labelVerweilen = lang === 'en' ? 'Dwelling' : 'Verweilen';
    var labelSchliessen = lang === 'en' ? 'Closure' : 'Schließen';
    var labelRestart = lang === 'en' ? 'Try Again' : 'Nochmal';

    var html = '<div class="quiz-result-fade" id="erstheit-result">';
    html += '<div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:100%"></div></div>';
    html += '<div class="quiz-result-container">';
    html += '<p class="quiz-result-label">' + labelResult + '</p>';
    html += '<h3 class="quiz-result-title">' + escapeHtml(result.title) + '</h3>';
    html += '<p class="quiz-result-description">' + escapeHtml(result.description) + '</p>';
    html += '<div class="quiz-result-motto"><span>' + escapeHtml(result.motto) + '</span></div>';

    html += '<div class="quiz-result-scores">';
    html += '<span>' + labelStaunen + ': ' + (scores.staunen || 0) + '</span>';
    html += '<span>' + labelVerweilen + ': ' + (scores.verweilen || 0) + '</span>';
    html += '<span>' + labelSchliessen + ': ' + (scores.schliessen || 0) + '</span>';
    html += '</div>';

    html += '<button class="quiz-restart" id="erstheit-restart">' + labelRestart + '</button>';
    html += '</div></div>';
    containerEl.innerHTML = html;

    var resultDiv = document.getElementById('erstheit-result');
    if (resultDiv) {
      requestAnimationFrame(function () {
        resultDiv.classList.add('quiz-result-fade--visible');
      });
    }

    var restartBtn = document.getElementById('erstheit-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', resetQuiz);
    }

    if (window.AtelierScore && window.AtelierScore.track) {
      window.AtelierScore.track('quiz');
    }
  }

  function renderIntro() {
    if (!containerEl || !quizData) return;
    var lang = (window.AtelierI18n && window.AtelierI18n.lang) || 'de';
    var startLabel = lang === 'en' ? 'Start Test' : 'Test starten';

    var html = '<div class="quiz-intro-wrapper">';
    html += '<h2>' + escapeHtml(quizData.title) + '</h2>';
    html += '<p>' + escapeHtml(quizData.description) + '</p>';
    html += '<button class="quiz-start" id="erstheit-start">' + startLabel + '</button>';
    html += '</div>';
    containerEl.innerHTML = html;

    document.getElementById('erstheit-start').addEventListener('click', function () {
      resetQuiz();
    });
  }

  function init() {
    containerEl = document.getElementById('erstheit-quiz-container');
    if (!containerEl) return;

    var lang = (window.AtelierI18n && window.AtelierI18n.lang) || 'de';
    containerEl.innerHTML = '<p class="quiz-loading">' + t('quiz.loading') + '</p>';

    var dataPath = (window.AtelierI18n && window.AtelierI18n.dataPrefix)
      ? window.AtelierI18n.dataPrefix()
      : (lang === 'en' ? 'data/en/' : 'data/');

    fetch(dataPath + 'erstheit-quiz.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load quiz data');
        return res.json();
      })
      .then(function (data) {
        quizData = data;
        renderIntro();
      })
      .catch(function (err) {
        containerEl.innerHTML = '<p class="quiz-error">' + t('quiz.error') + '</p>';
        console.error('[ErstheitsQuiz]', err);
      });
  }

  window.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('erstheit-quiz-container')) {
      init();
    }
  });
}());
