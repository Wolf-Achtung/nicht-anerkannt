/**
 * auslagerung-quiz.js — Selbsttest: Lagerst du dein Denken aus?
 * Standalone quiz module following the erstheit-quiz.js pattern.
 * Profiles: auslagern (offloading), sparring (AI as counterpart),
 * abstand (avoiding AI entirely).
 */
(function () {
  'use strict';

  var quizData = null;
  var containerEl = null;
  var currentQuestion = 0;
  var scores = { auslagern: 0, sparring: 0, abstand: 0 };

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
    scores = { auslagern: 0, sparring: 0, abstand: 0 };
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
    html += '<div class="quiz-content-fade" id="auslagerung-content">';
    html += '<h3 class="quiz-question-title">' + escapeHtml(q.text) + '</h3>';
    html += '<div class="quiz-options-container">';

    for (var i = 0; i < q.options.length; i++) {
      html += '<button class="quiz-option" data-index="' + i + '">' +
        escapeHtml(q.options[i].text) + '</button>';
    }

    html += '</div></div>';
    containerEl.innerHTML = html;

    var content = document.getElementById('auslagerung-content');
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

    var maxKey = 'sparring';
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
    var labelAuslagern = lang === 'en' ? 'Offloading' : 'Auslagern';
    var labelSparring = lang === 'en' ? 'Sparring' : 'Sparring';
    var labelAbstand = lang === 'en' ? 'Distance' : 'Abstand';
    var labelRestart = lang === 'en' ? 'Try Again' : 'Nochmal';
    var labelTools = lang === 'en' ? 'To the tools' : 'Zu den Werkzeugen';

    var html = '<div class="quiz-result-fade" id="auslagerung-result">';
    html += '<div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:100%"></div></div>';
    html += '<div class="quiz-result-container">';
    html += '<p class="quiz-result-label">' + labelResult + '</p>';
    html += '<h3 class="quiz-result-title">' + escapeHtml(result.title) + '</h3>';
    html += '<p class="quiz-result-description">' + escapeHtml(result.description) + '</p>';
    html += '<div class="quiz-result-motto"><span>' + escapeHtml(result.motto) + '</span></div>';

    html += '<div class="quiz-result-scores">';
    html += '<span>' + labelAuslagern + ': ' + (scores.auslagern || 0) + '</span>';
    html += '<span>' + labelSparring + ': ' + (scores.sparring || 0) + '</span>';
    html += '<span>' + labelAbstand + ': ' + (scores.abstand || 0) + '</span>';
    html += '</div>';

    html += '<a class="button button--accent" href="/' + lang + '/werkstatt">' + labelTools + '</a> ';
    html += '<button class="quiz-restart" id="auslagerung-restart">' + labelRestart + '</button>';
    html += '</div></div>';
    containerEl.innerHTML = html;

    var resultDiv = document.getElementById('auslagerung-result');
    if (resultDiv) {
      requestAnimationFrame(function () {
        resultDiv.classList.add('quiz-result-fade--visible');
      });
    }

    var restartBtn = document.getElementById('auslagerung-restart');
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
    html += '<button class="quiz-start" id="auslagerung-start">' + startLabel + '</button>';
    html += '</div>';
    containerEl.innerHTML = html;

    document.getElementById('auslagerung-start').addEventListener('click', function () {
      resetQuiz();
    });
  }

  function init() {
    containerEl = document.getElementById('auslagerung-quiz-container');
    if (!containerEl) return;

    var lang = (window.AtelierI18n && window.AtelierI18n.lang) || 'de';
    containerEl.innerHTML = '<p class="quiz-loading">' + t('quiz.loading') + '</p>';

    var dataPath = (window.AtelierI18n && window.AtelierI18n.dataPrefix)
      ? window.AtelierI18n.dataPrefix()
      : (lang === 'en' ? 'data/en/' : 'data/');

    fetch(dataPath + 'auslagerung-quiz.json')
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
        console.error('[AuslagerungsQuiz]', err);
      });
  }

  window.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('auslagerung-quiz-container')) {
      init();
    }
  });
}());
