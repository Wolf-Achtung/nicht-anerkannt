/**
 * perspektive-global.js — Globaler Perspektiv-Switch (#1), Manifest-Remix (#3),
 * Blinder-Fleck-Detektor (#8).
 *
 * Alle Elemente mit [data-perspektive-rewrite] werden bei aktivem Perspektiv-Modus
 * durch eine KI-Umformulierung ersetzt. Original bleibt in data-original gesichert.
 */
(function () {
  'use strict';

  var API_BASE = (typeof window !== 'undefined' && window.ATELIER_API_BASE) ? window.ATELIER_API_BASE : '';
  var STATE_KEY = 'atelier-perspektive-global';

  var PERSPEKTIVEN = [
    { group: 'Politisch / Sozial', items: [
      'Konservative:r Traditionalist:in',
      'Linke:r Aktivist:in',
      'Liberale:r Unternehmer:in',
      'Pragmatische:r Realist:in',
      'Zyniker:in / Skeptiker:in'
    ] },
    { group: 'Alter / Generation', items: [
      'Kind (10 Jahre)',
      'Jugendliche:r / Gen Z',
      'Ältere:r Mensch (80 Jahre)'
    ] },
    { group: 'Zeit', items: [
      'Mensch vor 100 Jahren (1925)',
      'Mensch in 50 Jahren (2075)',
      'Historiker:in in 200 Jahren zurückblickend'
    ] },
    { group: 'Kultur / Sprache', items: [
      'Nicht-Muttersprachler:in, die Deutsch gerade lernt',
      'Mensch aus dem globalen Süden',
      'Mensch ohne Internetzugang'
    ] },
    { group: 'Radikal anders', items: [
      'Die KI selbst (als Sprecher:in)',
      'Ein Baum / Ökosystem',
      'Ein zukünftiges Kind, das diese Entscheidung erben wird'
    ] }
  ];

  function loadingHTML() {
    if (window.AtelierLoading && typeof window.AtelierLoading.html === 'function') {
      return window.AtelierLoading.html();
    }
    return '<span class="werkstatt-loading-text">Silizium denkt…</span>';
  }

  function loadingLabel() {
    if (window.AtelierLoading && typeof window.AtelierLoading.pick === 'function') {
      return window.AtelierLoading.pick();
    }
    return 'Silizium denkt…';
  }

  function postRewrite(position, perspektive) {
    return fetch(API_BASE + '/api/perspektive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position: position, perspektive: perspektive })
    }).then(function (res) { return res.json(); });
  }

  // ─────────────────────────────────────────────
  // Header-Switch
  // ─────────────────────────────────────────────
  function injectHeaderSwitch() {
    var header = document.querySelector('.site-header .inner');
    if (!header) return;
    if (document.getElementById('perspektive-global-btn')) return;

    var wrap = document.createElement('div');
    wrap.className = 'perspektive-global-wrap';
    wrap.innerHTML =
      '<button class="button perspektive-global-btn" id="perspektive-global-btn" type="button" aria-haspopup="dialog">' +
      'Perspektive wechseln</button>' +
      '<span class="perspektive-global-badge" id="perspektive-global-badge" hidden></span>';
    header.appendChild(wrap);

    document.getElementById('perspektive-global-btn').addEventListener('click', openDialog);
    document.getElementById('perspektive-global-badge').addEventListener('click', resetAll);
  }

  function openDialog() {
    var existing = document.getElementById('perspektive-global-dialog');
    if (existing) { existing.showModal(); return; }

    var dialog = document.createElement('dialog');
    dialog.className = 'perspektive-global-dialog';
    dialog.id = 'perspektive-global-dialog';

    var html = '<h3>Diese Seite mit anderen Augen lesen</h3>';
    html += '<p class="perspektive-global-intro">Wähle eine Perspektive. Die KI formuliert längere Textblöcke dieser Seite empathisch in der gewählten Sicht um. Das Original bleibt — du kannst jederzeit zurück.</p>';
    html += '<form method="dialog" class="perspektive-global-form">';
    PERSPEKTIVEN.forEach(function (grp) {
      html += '<fieldset class="perspektive-global-group"><legend>' + grp.group + '</legend>';
      grp.items.forEach(function (p) {
        html += '<button type="button" class="perspektive-global-option" data-perspektive="' + p.replace(/"/g, '&quot;') + '">' + p + '</button>';
      });
      html += '</fieldset>';
    });
    html += '<div class="perspektive-global-actions"><button type="button" class="button" id="perspektive-global-cancel">Abbrechen</button></div>';
    html += '</form>';
    dialog.innerHTML = html;
    document.body.appendChild(dialog);

    dialog.addEventListener('click', function (e) {
      var target = e.target;
      if (target && target.classList.contains('perspektive-global-option')) {
        var p = target.getAttribute('data-perspektive');
        dialog.close();
        applyPerspektive(p);
      }
      if (target && target.id === 'perspektive-global-cancel') dialog.close();
    });

    if (typeof dialog.showModal === 'function') dialog.showModal();
  }

  function updateBadge(perspektive) {
    var badge = document.getElementById('perspektive-global-badge');
    if (!badge) return;
    if (!perspektive) {
      badge.hidden = true;
      badge.textContent = '';
      return;
    }
    badge.hidden = false;
    badge.textContent = 'Du liest als: ' + perspektive + ' ✕';
    badge.title = 'Klick, um zum Original zurückzukehren';
  }

  function collectRewriteTargets() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-perspektive-rewrite]'));
  }

  function applyPerspektive(perspektive) {
    if (!perspektive) { resetAll(); return; }
    var targets = collectRewriteTargets();
    if (!targets.length) return;

    updateBadge(perspektive);
    try { sessionStorage.setItem(STATE_KEY, perspektive); } catch (e) {}

    targets.forEach(function (el) {
      if (!el.getAttribute('data-original')) {
        el.setAttribute('data-original', el.innerHTML);
      }
      var original = el.getAttribute('data-original');
      var plain = el.textContent.trim();
      if (!plain) return;

      el.innerHTML = '<em class="perspektive-loading">' + loadingLabel() + '</em>';

      postRewrite(plain, perspektive).then(function (data) {
        var text = (data && data.reformulierung) ? data.reformulierung : null;
        if (!text) { el.innerHTML = original; return; }
        el.innerHTML = escapeText(text);
        el.classList.add('perspektive-rewritten');
      }).catch(function () {
        el.innerHTML = original;
      });
    });
  }

  function escapeText(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function resetAll() {
    var targets = collectRewriteTargets();
    targets.forEach(function (el) {
      var original = el.getAttribute('data-original');
      if (original !== null) {
        el.innerHTML = original;
        el.classList.remove('perspektive-rewritten');
      }
    });
    updateBadge(null);
    try { sessionStorage.removeItem(STATE_KEY); } catch (e) {}
  }

  // ─────────────────────────────────────────────
  // Manifest-Remix (Section mit eigenem Select)
  // ─────────────────────────────────────────────
  function initManifestRemix() {
    var btn = document.getElementById('manifest-remix-btn');
    var sel = document.getElementById('manifest-remix-select');
    var reset = document.getElementById('manifest-remix-reset');
    var status = document.getElementById('manifest-remix-status');
    if (!btn || !sel) return;

    btn.addEventListener('click', function () {
      var p = sel.value;
      if (!p) { resetAll(); if (reset) reset.hidden = true; if (status) status.textContent = ''; return; }
      if (status) status.innerHTML = loadingHTML();
      applyPerspektive(p);
      if (reset) reset.hidden = false;
      setTimeout(function () { if (status) status.textContent = 'Manifest wird gerade aus Sicht "' + p + '" gelesen.'; }, 200);
    });

    if (reset) {
      reset.addEventListener('click', function () {
        resetAll();
        reset.hidden = true;
        if (status) status.textContent = '';
        sel.value = '';
      });
    }
  }

  // ─────────────────────────────────────────────
  // Blinder-Fleck-Detektor (#8)
  // ─────────────────────────────────────────────
  function initBlindspotDetector() {
    var body = document.querySelector('[data-manifest-body]');
    if (!body) return;
    if (document.getElementById('blindspot-btn')) return;

    var box = document.createElement('div');
    box.className = 'blindspot-box';
    box.innerHTML =
      '<button class="button" id="blindspot-btn" type="button">Welche Perspektive fehlt hier?</button>' +
      '<div class="blindspot-result" id="blindspot-result" aria-live="polite"></div>';
    body.appendChild(box);

    document.getElementById('blindspot-btn').addEventListener('click', function () {
      var result = document.getElementById('blindspot-result');
      var text = body.textContent.replace(/\s+/g, ' ').trim().slice(0, 4000);
      result.innerHTML = loadingHTML();
      fetch(API_BASE + '/api/blindspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
      }).then(function (res) { return res.json(); }).then(function (data) {
        if (!data || data.error || !data.perspektive) {
          result.textContent = 'Analyse gerade nicht möglich.';
          return;
        }
        result.innerHTML =
          '<p class="blindspot-label">Dieser Text spricht stark aus einer bestimmten Ecke. Eine Perspektive fehlt:</p>' +
          '<p class="blindspot-perspektive"><strong>' + escapeText(data.perspektive) + '</strong></p>' +
          '<p class="blindspot-warum">' + escapeText(data.begruendung || '') + '</p>' +
          (data.frage ? '<p class="blindspot-frage"><em>' + escapeText(data.frage) + '</em></p>' : '');
      }).catch(function () {
        result.textContent = 'Analyse gerade nicht möglich.';
      });
    });
  }

  // ─────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────
  window.addEventListener('DOMContentLoaded', function () {
    // injectHeaderSwitch(); // entfernt — Perspektivwechsel ist nur noch beim Manifest
    initManifestRemix();
    // initBlindspotDetector(); // entfernt vom Manifest
  });
}());
