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
  var fallbackQuestions = [
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
    } catch (e) {}
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
    } catch (e) {}
  }

  function renderArchiveLink() {
    var archiveContainer = document.getElementById('daily-archive-container');
    if (!archiveContainer) return;
    archiveContainer.innerHTML =
      '<div class="daily-archive-actions">' +
      '<button class="button daily-archive-btn" id="daily-archive-btn" type="button">Frühere Denkproben</button>' +
      '<button class="button daily-archive-clear" id="daily-archive-clear" type="button">Denkprobe-Archiv löschen</button>' +
      '</div>' +
      '<dialog class="daily-archive-modal" id="daily-archive-modal">' +
      '<h3>Frühere Denkproben</h3>' +
      '<div id="daily-archive-list"></div>' +
      '<button class="button" id="daily-archive-close" type="button">Schließen</button>' +
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
        if (!window.confirm('Willst du alle lokal gespeicherten Denkproben wirklich löschen?')) return;
        try {
          localStorage.removeItem(ARCHIVE_KEY);
          localStorage.removeItem(getStorageKey());
        } catch (e) {}
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
      if (!archive.length) {
        list.innerHTML = '<p>Noch keine archivierten Denkproben.</p>';
        return;
      }
      list.innerHTML = archive.map(function (item) {
        var sourceLabel = item.source === 'ai' ? 'KI-gestützt' : 'Archivfrage';
        return '<article class="daily-archive-item">' +
          '<p class="daily-archive-date">' + escapeHtml(item.date) + ' · ' + escapeHtml(sourceLabel) + '</p>' +
          '<p><strong>' + escapeHtml(item.titel) + ':</strong> ' + escapeHtml(item.frage) + '</p>' +
          '</article>';
      }).join('');
    } catch (e) {
      list.innerHTML = '<p>Archiv konnte nicht geladen werden.</p>';
    }
  }

  function requestDailyChallenge(seed) {
    if (typeof AbortController === 'undefined') {
      return fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: seed })
      }).then(function (res) { return res.json(); });
    }

    var controller = new AbortController();
    var timeoutId = window.setTimeout(function () {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    return fetch('/api/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed: seed }),
      signal: controller.signal
    })
      .then(function (res) { return res.json(); })
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

    container.innerHTML = '<div class="werkstatt-loading">' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span style="margin-left:0.5rem;font-family:Arial,sans-serif;font-size:0.82rem;' +
      'text-transform:uppercase;letter-spacing:0.08em;color:#5d5d5d;">Denkprobe wird geladen...</span></div>';

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
    } catch (e) {}

    var html = '<div class="daily-card">';
    if (isFallback) {
      html += '<p class="daily-fallback">Unser Tagesserver ist gerade nicht erreichbar. Hier ist stattdessen eine Ersatzfrage aus unserem Archiv.</p>';
    }
    html += '<div class="daily-header">';
    html += '<span class="daily-badge">Denkprobe des Tages</span>';
    html += '<span class="daily-date">' + escapeHtml(new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })) + '</span>';
    html += '</div>';
    html += '<h3 class="daily-titel">' + escapeHtml(data.titel) + '</h3>';
    html += '<p class="daily-impuls">' + escapeHtml(data.impuls) + '</p>';
    html += '<p class="daily-frage"><strong>' + escapeHtml(data.frage) + '</strong></p>';

    if (savedAnswer) {
      html += '<div class="daily-saved"><span class="daily-saved-label">Deine Antwort:</span> ' + escapeHtml(savedAnswer) + '</div>';
    } else {
      html += '<div class="daily-answer-area">';
      html += '<label class="sr-only" for="daily-input">Deine Antwort in einem Satz</label>';
      html += '<input type="text" id="daily-input" class="daily-input" placeholder="Deine Antwort in einem Satz..." maxlength="200">';
      html += '<button class="button button--accent daily-submit" id="daily-submit" type="button">Antworten</button>';
      html += '</div>';
    }

    html += '<p class="daily-privacy-note">Deine Antwort bleibt lokal in deinem Browser gespeichert und wird nicht an den Server übertragen.</p>';
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
