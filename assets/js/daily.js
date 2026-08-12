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
  // Fallback pool: each entry has {titel, impuls, frage} as per-language objects.
  // Matches the server-side /data/daily-questions.json schema.
  var fallbackPool = [
    {
      titel:  { de: 'Denkprobe Archivmodus',           en: 'Thinking Challenge Archive Mode' },
      impuls: { de: 'Manchmal ist die beste Frage die, die trotz Ausfall bleibt.',
                en: 'Sometimes the best question is the one that remains despite failure.' },
      frage:  { de: 'Welche Überzeugung von dir wäre am schwersten zu verteidigen, wenn du nur drei Sätze hättest?',
                en: 'Which of your convictions would be hardest to defend if you only had three sentences?' }
    },
    {
      titel:  { de: 'Denkprobe Archivmodus',           en: 'Thinking Challenge Archive Mode' },
      impuls: { de: 'Auch ohne API kann Denken präzise und unbequem sein.',
                en: 'Even without an API, thinking can be precise and uncomfortable.' },
      frage:  { de: 'Welche Position deines Gegenübers wirkt auf dich falsch – und welche Angst könnte dahinterstehen?',
                en: 'Which position of your counterpart seems wrong to you – and what fear might lie behind it?' }
    },
    {
      titel:  { de: 'Denkprobe Archivmodus',           en: 'Thinking Challenge Archive Mode' },
      impuls: { de: 'Nicht jede Unterbrechung ist ein Stillstand.',
                en: 'Not every interruption is a standstill.' },
      frage:  { de: 'Was würdest du heute anders entscheiden, wenn du nur auf Folgen in fünf Jahren schauen dürftest?',
                en: 'What would you decide differently today if you could only consider consequences five years from now?' }
    },
    {
      titel:  { de: 'Denkprobe Archivmodus',           en: 'Thinking Challenge Archive Mode' },
      impuls: { de: 'Urteil zeigt sich selten in den lautesten Momenten, sondern in den stillen Korrekturen.',
                en: 'Judgment rarely shows itself in the loudest moments, but in quiet corrections.' },
      frage:  { de: 'Welche Meinung würdest du heute öffentlich relativieren, wenn dir Genauigkeit wichtiger als Wirkung ist?',
                en: 'Which opinion would you publicly qualify today if accuracy mattered more to you than impact?' }
    },
    {
      titel:  { de: 'Denkprobe Archivmodus',           en: 'Thinking Challenge Archive Mode' },
      impuls: { de: 'Schnelle Klarheit ist verführerisch. Sie spart Zeit, aber oft auf Kosten der Wirklichkeit.',
                en: 'Quick clarity is seductive. It saves time, but often at the expense of reality.' },
      frage:  { de: 'Welche unbequeme Nebenwirkung deiner Lieblingslösung blendest du gerade aus?',
                en: 'Which uncomfortable side-effect of your favourite solution are you currently ignoring?' }
    },
    {
      titel:  { de: 'Denkprobe Archivmodus',           en: 'Thinking Challenge Archive Mode' },
      impuls: { de: 'Widerspruch ist kein Defekt, sondern ein Hinweis auf Komplexität.',
                en: 'Contradiction is not a defect but an indicator of complexity.' },
      frage:  { de: 'An welchem Konflikt merkst du, dass beide Seiten etwas Richtiges sehen?',
                en: 'In which conflict do you notice that both sides see something right?' }
    },
    {
      titel:  { de: 'Denkprobe Archivmodus',           en: 'Thinking Challenge Archive Mode' },
      impuls: { de: 'Haltung wird erst sichtbar, wenn sie dich etwas kostet.',
                en: 'Conviction only becomes visible when it costs you something.' },
      frage:  { de: 'Wo würdest du heute konsequent bleiben, obwohl es dir kurzfristig schadet?',
                en: 'Where would you remain consistent today even though it harms you in the short term?' }
    },
    {
      titel:  { de: 'Denkprobe Archivmodus',           en: 'Thinking Challenge Archive Mode' },
      impuls: { de: 'Im digitalen Lärm gewinnt oft das Eindeutige, nicht das Wahre.',
                en: 'In the digital noise, what wins is often the unambiguous, not the true.' },
      frage:  { de: 'Welche Aussage teilst du nur, weil sie anschlussfähig ist – nicht weil sie präzise ist?',
                en: 'Which statement do you share only because it is relatable – not because it is precise?' }
    }
  ];

  function currentLangEarly() {
    return (window.AtelierI18n && window.AtelierI18n.lang) ? window.AtelierI18n.lang : 'de';
  }

  function localize(field) {
    if (typeof field === 'string') return field;
    if (field && typeof field === 'object') {
      var lang = currentLangEarly();
      return field[lang] || field.en || field.de || '';
    }
    return '';
  }

  function resolveFallbackEntry(entry) {
    return {
      titel:  localize(entry.titel),
      impuls: localize(entry.impuls),
      frage:  localize(entry.frage)
    };
  }

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
    var index = seedToIndex(seed || getDaySeed(), fallbackPool.length);
    return resolveFallbackEntry(fallbackPool[index]);
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
      // A request interrupted by a reload must not leave a spinner behind.
      if (cached.konterPending) { cached.konterPending = false; cached.konterError = true; }
      if (cached.konter2Pending) { cached.konter2Pending = false; }
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

  function persist(data) {
    try { localStorage.setItem(getStorageKey(), JSON.stringify(data)); } catch (e) { /* localStorage unavailable */ }
  }

  function konterBlock(konter, label) {
    var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
    var html = '<div class="daily-konter">';
    html += '<p class="daily-konter-label">' + escapeHtml(label) + '</p>';
    if (konter.widerspruch) {
      html += '<div class="daily-konter-part"><span class="daily-konter-part-label">' + t('daily.widerspruch') + '</span>' +
        '<p>' + escapeHtml(konter.widerspruch) + '</p></div>';
    }
    if (konter.blinde_stelle) {
      html += '<div class="daily-konter-part"><span class="daily-konter-part-label">' + t('daily.blindeStelle') + '</span>' +
        '<p>' + escapeHtml(konter.blinde_stelle) + '</p></div>';
    }
    if (konter.gegenfrage) {
      html += '<div class="daily-konter-part daily-konter-part--frage"><span class="daily-konter-part-label">' + t('daily.gegenfrage') + '</span>' +
        '<p><strong>' + escapeHtml(konter.gegenfrage) + '</strong></p></div>';
    }
    html += '</div>';
    return html;
  }

  function loadingBlock(text) {
    return '<div class="daily-konter daily-konter--loading"><div class="werkstatt-loading">' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-text">' + escapeHtml(text) + '</span></div></div>';
  }

  function renderChallenge(data, isFallback) {
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

    if (!data.antwort) {
      // Runde 1: erst du.
      html += '<div class="daily-answer-area">';
      html += '<label class="sr-only" for="daily-input">' + t('daily.answerPlaceholder') + '</label>';
      html += '<input type="text" id="daily-input" class="daily-input" placeholder="' + t('daily.answerPlaceholder') + '" maxlength="200">';
      html += '<button class="button button--accent daily-submit" id="daily-submit" type="button">' + t('daily.answerBtn') + '</button>';
      html += '</div>';
      html += '<p class="daily-then-ai">' + t('daily.thenAI') + '</p>';
    } else {
      html += '<div class="daily-saved"><span class="daily-saved-label">' +
        (data.antwort2 ? t('daily.answer1Label') : t('daily.answerLabel')) + '</span> ' +
        escapeHtml(data.antwort) + '</div>';

      if (data.konterPending) {
        html += loadingBlock(t('daily.konterLoading'));
      } else if (data.konterError) {
        html += '<p class="daily-fallback">' + t('daily.konterError') + '</p>';
      } else if (data.konter) {
        html += konterBlock(data.konter, t('daily.kiKontert'));

        if (!data.antwort2) {
          // Runde 2: schärfen.
          html += '<div class="daily-answer-area daily-answer-area--round2">';
          html += '<label class="daily-round2-label" for="daily-input-2">' + t('daily.round2Label') + '</label>';
          html += '<input type="text" id="daily-input-2" class="daily-input" placeholder="' + t('daily.round2Placeholder') + '" maxlength="200">';
          html += '<button class="button button--accent daily-submit" id="daily-submit-2" type="button">' + t('daily.round2Btn') + '</button>';
          html += '</div>';
        } else {
          html += '<div class="daily-saved daily-saved--round2"><span class="daily-saved-label">' + t('daily.answer2Label') + '</span> ' +
            escapeHtml(data.antwort2) + '</div>';

          if (data.konter2Pending) {
            html += loadingBlock(t('daily.konterLoading'));
          } else if (data.konter2) {
            html += konterBlock(data.konter2, t('daily.kiKontert2'));
            html += '<p class="daily-done">' + t('daily.done') + '</p>';
          }
        }
      }
    }

    if (window.AtelierSharecard) {
      var shareImgLabel = lang === 'en' ? 'Share question as image' : 'Frage als Bild teilen';
      html += '<div class="tool-actions"><button class="button daily-share-img" id="daily-share-img" type="button">' + shareImgLabel + '</button></div>';
    }
    html += '<p class="daily-privacy-note">' + t('daily.privacy') + '</p>';
    html += '</div>';
    container.innerHTML = html;

    var shareImgBtn = document.getElementById('daily-share-img');
    if (shareImgBtn) {
      shareImgBtn.addEventListener('click', function () {
        window.AtelierSharecard.generate(data.frage, 'denkprobe-' + getDaySeed() + '.png');
      });
    }

    wireAnswerInput(data, 'daily-submit', 'daily-input', 1);
    wireAnswerInput(data, 'daily-submit-2', 'daily-input-2', 2);
  }

  function wireAnswerInput(data, btnId, inputId, runde) {
    var submitBtn = document.getElementById(btnId);
    var inputEl = document.getElementById(inputId);
    if (!submitBtn || !inputEl) return;

    function submit() {
      var answer = inputEl.value.trim();
      if (!answer) { inputEl.focus(); return; }
      saveAnswer(data, answer, runde);
    }

    submitBtn.addEventListener('click', submit);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submit();
    });
  }

  function saveAnswer(data, answer, runde) {
    if (runde === 2) {
      data.antwort2 = answer;
      data.konter2Pending = true;
    } else {
      data.antwort = answer;
      data.konterPending = true;
      data.konterError = false;
    }
    persist(data);

    // Update Atelier-Score if available
    if (window.AtelierScore && window.AtelierScore.track) {
      window.AtelierScore.track('daily');
    }

    renderChallenge(data, false);
    requestKonter(data, answer, runde);
  }

  // "Erst du, dann die KI": wird ausschliesslich nach einer eigenen Antwort aufgerufen.
  function requestKonter(data, answer, runde) {
    var lang = currentLang();
    fetch(API_BASE + '/api/denkprobe-konter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frage: data.frage, antwort: answer, runde: runde, lang: lang })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (konter) {
        if (!konter || konter.error || (!konter.widerspruch && !konter.gegenfrage)) {
          throw new Error(konter && konter.error ? konter.error : 'Empty konter response');
        }
        if (runde === 2) {
          data.konter2 = konter;
          data.konter2Pending = false;
        } else {
          data.konter = konter;
          data.konterPending = false;
        }
        persist(data);
        renderChallenge(data, false);
      })
      .catch(function (e) {
        if (runde === 2) {
          data.konter2Pending = false;
        } else {
          data.konterPending = false;
          data.konterError = true;
        }
        persist(data);
        renderChallenge(data, false);
        reportDailyError(e && e.message ? e.message : 'Unknown /api/denkprobe-konter failure', 'warn');
      });
  }

  window.addEventListener('DOMContentLoaded', function () {
    loadDaily();
    renderArchiveLink();
  });
}());
