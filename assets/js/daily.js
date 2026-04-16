/**
 * daily.js — Tägliche Denkprobe (Daily Challenge)
 * Lädt die Denkprobe des Tages deterministisch über /api/daily
 * und nutzt einen lokalen Fallback, falls der Dienst nicht erreichbar ist.
 */
(function () {
  'use strict';

  var container = null;
  var ARCHIVE_KEY = 'atelier-daily-archive';
  var REQUEST_TIMEOUT_MS = 5000;
  var API_BASE = (typeof window !== 'undefined' && window.ATELIER_API_BASE) ? window.ATELIER_API_BASE : '';
  var DAILY_URL = API_BASE + '/api/daily';
  var fallbackQuestions_de = [
    {
      titel: 'Denkprobe Archivmodus',
      impuls: 'Manchmal ist die beste Frage die, die trotz Ausfall bleibt.',
      frage: 'Welche Überzeugung von dir wäre am schwersten zu verteidigen, wenn du nur drei Sätze hättest?'
    },
    {
      titel: 'Denkprobe Archivmodus',
      impuls: 'Auch ohne API kann Denken präzise und unbequem sein.',
      frage: 'Welche Position deines Gegenübers wirkt auf dich falsch – und welche Angst könnte dahinterstehen?'
    },
    {
      titel: 'Denkprobe Archivmodus',
      impuls: 'Nicht jede Unterbrechung ist ein Stillstand.',
      frage: 'Was würdest du heute anders entscheiden, wenn du nur auf Folgen in fünf Jahren schauen dürftest?'
    },
    {
      titel: 'Denkprobe Archivmodus',
      impuls: 'Urteil zeigt sich selten in den lautesten Momenten, sondern in den stillen Korrekturen.',
      frage: 'Welche Meinung würdest du heute öffentlich relativieren, wenn dir Genauigkeit wichtiger als Wirkung ist?'
    },
    {
      titel: 'Denkprobe Archivmodus',
      impuls: 'Schnelle Klarheit ist verführerisch. Sie spart Zeit, aber oft auf Kosten der Wirklichkeit.',
      frage: 'Welche unbequeme Nebenwirkung deiner Lieblingslösung blendest du gerade aus?'
    },
    {
      titel: 'Denkprobe Archivmodus',
      impuls: 'Widerspruch ist kein Defekt, sondern ein Hinweis auf Komplexität.',
      frage: 'An welchem Konflikt merkst du, dass beide Seiten etwas Richtiges sehen?'
    },
    {
      titel: 'Denkprobe Archivmodus',
      impuls: 'Haltung wird erst sichtbar, wenn sie dich etwas kostet.',
      frage: 'Wo würdest du heute konsequent bleiben, obwohl es dir kurzfristig schadet?'
    },
    {
      titel: 'Denkprobe Archivmodus',
      impuls: 'Im digitalen Lärm gewinnt oft das Eindeutige, nicht das Wahre.',
      frage: 'Welche Aussage teilst du nur, weil sie anschlussfähig ist – nicht weil sie präzise ist?'
    }
  ];

  var fallbackQuestions_en = [
    {
      titel: 'Thinking Challenge Archive Mode',
      impuls: 'Sometimes the best question is the one that remains despite failure.',
      frage: 'Which of your convictions would be hardest to defend if you only had three sentences?'
    },
    {
      titel: 'Thinking Challenge Archive Mode',
      impuls: 'Even without an API, thinking can be precise and uncomfortable.',
      frage: 'Which position of your counterpart seems wrong to you – and what fear might lie behind it?'
    },
    {
      titel: 'Thinking Challenge Archive Mode',
      impuls: 'Not every interruption is a standstill.',
      frage: 'What would you decide differently today if you could only consider consequences five years from now?'
    },
    {
      titel: 'Thinking Challenge Archive Mode',
      impuls: 'Judgment rarely shows itself in the loudest moments, but in quiet corrections.',
      frage: 'Which opinion would you publicly qualify today if accuracy mattered more to you than impact?'
    },
    {
      titel: 'Thinking Challenge Archive Mode',
      impuls: 'Quick clarity is seductive. It saves time, but often at the expense of reality.',
      frage: 'Which uncomfortable side-effect of your favourite solution are you currently ignoring?'
    },
    {
      titel: 'Thinking Challenge Archive Mode',
      impuls: 'Contradiction is not a defect but an indicator of complexity.',
      frage: 'In which conflict do you notice that both sides see something right?'
    },
    {
      titel: 'Thinking Challenge Archive Mode',
      impuls: 'Conviction only becomes visible when it costs you something.',
      frage: 'Where would you remain consistent today even though it harms you in the short term?'
    },
    {
      titel: 'Thinking Challenge Archive Mode',
      impuls: 'In the digital noise, what wins is often the unambiguous, not the true.',
      frage: 'Which statement do you share only because it is relatable – not because it is precise?'
    }
  ];

  var fallbackQuestions = (window.AtelierI18n && window.AtelierI18n.lang === 'en') ? fallbackQuestions_en : fallbackQuestions_de;

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getDaySeed() {
    var now = new Date();
    return now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
  }

  function getStorageKey() {
    return 'atelier-daily-' + getDaySeed();
  }

  function seedToIndex(seed, length) {
    return String(seed).split('').reduce(function (acc, char) {
      return ((acc * 31) + char.charCodeAt(0)) >>> 0;
    }, 7) % length;
  }

  function getFallbackChallenge(seed) {
    var index = seedToIndex(seed || getDaySeed(), fallbackQuestions.length);
    return fallbackQuestions[index];
  }

  function reportDailyError(message, level) {
    var payload = {
      context: 'daily',
      level: level || 'error',
      message: String(message || '').slice(0, 260)
    };

    if (!payload.message) return;

    try {
      fetch('/api/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) { /* localStorage unavailable */ }
  }

  function saveToArchive(data) {
    if (!data || !data.frage) return;
    try {
      var archive = JSON.parse(localStorage.getItem(ARCHIVE_KEY)) || [];
      var today = new Date().toISOString().slice(0, 10);
      var entry = {
        date: today,
        titel: data.titel || 'Denkprobe',
        frage: data.frage,
        source: data.source || 'unknown'
      };
      var deduped = archive.filter(function (item) {
        return item.date !== today || item.frage !== entry.frage;
      });
      deduped.unshift(entry);
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(deduped.slice(0, 30)));
    } catch (e) { /* localStorage unavailable */ }
  }

  function renderArchiveLink() {
    var archiveContainer = document.getElementById('daily-archive-container');
    if (!archiveContainer) return;
    var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
    archiveContainer.innerHTML =
      '<div class="daily-archive-actions">' +
      '<button class="button daily-archive-btn" id="daily-archive-btn" type="button">' + t('daily.archiveBtn') + '</button>' +
      '<button class="button daily-archive-clear" id="daily-archive-clear" type="button">' + t('daily.archiveClearBtn') + '</button>' +
      '</div>' +
      '<dialog class="daily-archive-modal" id="daily-archive-modal">' +
      '<h3>' + t('daily.archiveTitle') + '</h3>' +
      '<div id="daily-archive-list"></div>' +
      '<button class="button" id="daily-archive-close" type="button">' + t('daily.archiveClose') + '</button>' +
      '</dialog>';

    var openBtn = document.getElementById('daily-archive-btn');
    var closeBtn = document.getElementById('daily-archive-close');
    var clearBtn = document.getElementById('daily-archive-clear');
    var modal = document.getElementById('daily-archive-modal');

    if (openBtn && modal) {
      openBtn.addEventListener('click', function () {
        fillArchiveList();
        if (typeof modal.showModal === 'function') modal.showModal();
      });
    }

    if (closeBtn && modal) {
      closeBtn.addEventListener('click', function () {
        modal.close();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
        if (!window.confirm(t('daily.archiveConfirm'))) return;
        try {
          localStorage.removeItem(ARCHIVE_KEY);
          localStorage.removeItem(getStorageKey());
        } catch (e) { /* localStorage unavailable */ }
        fillArchiveList();
        loadDaily();
      });
    }
  }

  function fillArchiveList() {
    var list = document.getElementById('daily-archive-list');
    if (!list) return;
    try {
      var archive = JSON.parse(localStorage.getItem(ARCHIVE_KEY)) || [];
      var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
      if (!archive.length) {
        list.innerHTML = '<p>' + t('daily.archiveEmpty') + '</p>';
        return;
      }
      list.innerHTML = archive.map(function (item) {
        var sourceLabel = item.source === 'ai' ? t('daily.sourceAI') : t('daily.sourceArchive');
        return '<article class="daily-archive-item">' +
          '<p class="daily-archive-date">' + escapeHtml(item.date) + ' · ' + escapeHtml(sourceLabel) + '</p>' +
          '<p><strong>' + escapeHtml(item.titel) + ':</strong> ' + escapeHtml(item.frage) + '</p>' +
          '</article>';
      }).join('');
    } catch (e) {
      list.innerHTML = '<p>' + t('daily.archiveError') + '</p>';
    }
  }

  function currentLang() {
    return (window.AtelierI18n && window.AtelierI18n.lang) ? window.AtelierI18n.lang : 'de';
  }

  function requestDailyChallenge(seed) {
    var lang = currentLang();
    var body = JSON.stringify({ seed: seed, lang: lang });

    if (typeof AbortController === 'undefined') {
      return fetch(DAILY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body
      }).then(function (res) { return res.json(); });
    }

    var controller = new AbortController();
    var timeoutId = window.setTimeout(function () {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    return fetch(DAILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
      signal: controller.signal
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .catch(function () {
        return fetch(DAILY_URL + '?seed=' + encodeURIComponent(seed) + '&lang=' + encodeURIComponent(lang))
          .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
          });
      })
      .finally(function () {
        window.clearTimeout(timeoutId);
      });
  }

  function loadDaily() {
    container = document.getElementById('daily-container');
    if (!container) return;

    var seed = getDaySeed();

    // Check if we already have today's challenge cached
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(getStorageKey())); } catch (e) {}

    if (cached && cached.titel && cached.frage) {
      renderChallenge(cached, cached.source && cached.source.indexOf('fallback') !== -1);
      return;
    }

    if (window.AtelierLoading && typeof window.AtelierLoading.html === 'function') {
      container.innerHTML = window.AtelierLoading.html();
    } else {
      var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
      container.innerHTML = '<div class="werkstatt-loading">' +
        '<span class="werkstatt-loading-dot"></span>' +
        '<span class="werkstatt-loading-dot"></span>' +
        '<span class="werkstatt-loading-dot"></span>' +
        '<span class="werkstatt-loading-text">' + t('daily.loading') + '</span></div>';
    }

    requestDailyChallenge(seed)
      .then(function (data) {
        if (!data || data.error || data.raw || !data.titel || !data.impuls || !data.frage) {
          var fallbackFromApiError = getFallbackChallenge(seed);
          fallbackFromApiError.source = 'fallback-api';
          renderChallenge(fallbackFromApiError, true);
          saveToArchive(fallbackFromApiError);
          reportDailyError('Fallback after invalid /api/daily response', 'warn');
          return;
        }

        try { localStorage.setItem(getStorageKey(), JSON.stringify(data)); } catch (e) {}
        saveToArchive(data);
        renderChallenge(data, false);
      })
      .catch(function (err) {
        var fallback = getFallbackChallenge(seed);
        fallback.source = 'fallback-timeout';
        renderChallenge(fallback, true);
        saveToArchive(fallback);
        console.error(err);
        reportDailyError(err && err.message ? err.message : 'Unknown /api/daily failure', 'error');
      });
  }

  function renderChallenge(data, isFallback) {
    var savedAnswer = '';
    try {
      var stored = JSON.parse(localStorage.getItem(getStorageKey()));
      if (stored && stored.antwort) savedAnswer = stored.antwort;
    } catch (e) { /* localStorage unavailable */ }

    var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
    var lang = (window.AtelierI18n && window.AtelierI18n.lang) || 'de';
    var html = '<div class="daily-card">';
    if (isFallback) {
      html += '<p class="daily-fallback">' + t('daily.fallbackNotice') + '</p>';
    }
    html += '<div class="daily-header">';
    html += '<span class="daily-badge">' + t('daily.badge') + '</span>';
    html += '<span class="daily-date">' + escapeHtml(new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'de-DE', { day: 'numeric', month: 'long', year: 'numeric' })) + '</span>';
    html += '</div>';
    html += '<h3 class="daily-titel">' + escapeHtml(data.titel) + '</h3>';
    html += '<p class="daily-impuls">' + escapeHtml(data.impuls) + '</p>';
    html += '<p class="daily-frage"><strong>' + escapeHtml(data.frage) + '</strong></p>';

    if (savedAnswer) {
      html += '<div class="daily-saved"><span class="daily-saved-label">' + t('daily.answerLabel') + '</span> ' + escapeHtml(savedAnswer) + '</div>';
    } else {
      html += '<div class="daily-answer-area">';
      html += '<label class="sr-only" for="daily-input">' + t('daily.answerPlaceholder') + '</label>';
      html += '<input type="text" id="daily-input" class="daily-input" placeholder="' + t('daily.answerPlaceholder') + '" maxlength="200">';
      html += '<button class="button button--accent daily-submit" id="daily-submit" type="button">' + t('daily.answerBtn') + '</button>';
      html += '</div>';
    }

    html += '<p class="daily-privacy-note">' + t('daily.privacy') + '</p>';
    html += '</div>';
    container.innerHTML = html;

    if (!savedAnswer) {
      var submitBtn = document.getElementById('daily-submit');
      var inputEl = document.getElementById('daily-input');
      if (submitBtn && inputEl) {
        submitBtn.addEventListener('click', function () {
          var answer = inputEl.value.trim();
          if (!answer) { inputEl.focus(); return; }
          saveAnswer(data, answer);
        });
        inputEl.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            var answer = inputEl.value.trim();
            if (answer) saveAnswer(data, answer);
          }
        });
      }
    }
  }

  function saveAnswer(data, answer) {
    data.antwort = answer;
    try { localStorage.setItem(getStorageKey(), JSON.stringify(data)); } catch (e) {}

    // Update Atelier-Score if available
    if (window.AtelierScore && window.AtelierScore.track) {
      window.AtelierScore.track('daily');
    }

    renderChallenge(data, false);
  }

  window.addEventListener('DOMContentLoaded', function () {
    loadDaily();
    renderArchiveLink();
  });
}());
