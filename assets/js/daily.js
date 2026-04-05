/**
 * daily.js — Tägliche Denkprobe (Daily Challenge)
 * Generates a daily thinking probe, allows one-sentence responses.
 */
(function () {
  'use strict';

  var container = null;
  var loaded = false;

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

  function loadDaily() {
    container = document.getElementById('daily-container');
    if (!container) return;

    // Check if we already have today's challenge cached
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(getStorageKey())); } catch (e) {}

    if (cached && cached.titel) {
      renderChallenge(cached);
      return;
    }

    container.innerHTML = '<div class="werkstatt-loading">' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span style="margin-left:0.5rem;font-family:Arial,sans-serif;font-size:0.82rem;' +
      'text-transform:uppercase;letter-spacing:0.08em;color:#5d5d5d;">Denkprobe wird geladen...</span></div>';

    fetch('/api/daily', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed: getDaySeed() })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error || data.raw) {
          container.innerHTML = '<p class="daily-fallback">Die heutige Denkprobe konnte nicht geladen werden.</p>';
          return;
        }
        try { localStorage.setItem(getStorageKey(), JSON.stringify(data)); } catch (e) {}
        renderChallenge(data);
      })
      .catch(function () {
        container.innerHTML = '<p class="daily-fallback">Verbindungsfehler – die Denkprobe ist gerade nicht verfügbar.</p>';
      });
  }

  function renderChallenge(data) {
    var savedAnswer = '';
    try {
      var stored = JSON.parse(localStorage.getItem(getStorageKey()));
      if (stored && stored.antwort) savedAnswer = stored.antwort;
    } catch (e) {}

    var html = '<div class="daily-card">';
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

    renderChallenge(data);
  }

  window.addEventListener('DOMContentLoaded', loadDaily);
}());
