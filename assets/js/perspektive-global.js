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

  function currentLang() {
    return (window.AtelierI18n && window.AtelierI18n.lang) ? window.AtelierI18n.lang : 'de';
  }

  function _t(key, fallback) {
    if (window.AtelierI18n && window.AtelierI18n.t) return window.AtelierI18n.t(key);
    return fallback || key;
  }

  // Perspective options with DE/EN labels; stable id used as storage key only.
  var PERSPEKTIVEN = [
    { groupKey: 'persp.grp1', items: [
      { id: 'konservativ',  de: 'Konservative:r Traditionalist:in',        en: 'Conservative traditionalist' },
      { id: 'aktivist',     de: 'Linke:r Aktivist:in',                     en: 'Left-wing activist' },
      { id: 'unternehmer',  de: 'Liberale:r Unternehmer:in',               en: 'Liberal entrepreneur' },
      { id: 'realist',      de: 'Pragmatische:r Realist:in',               en: 'Pragmatic realist' },
      { id: 'skeptiker',    de: 'Zyniker:in / Skeptiker:in',               en: 'Cynic / sceptic' }
    ] },
    { groupKey: 'persp.grp2', items: [
      { id: 'kind',         de: 'Kind (10 Jahre)',                         en: 'Child (10 years old)' },
      { id: 'genz',         de: 'Jugendliche:r / Gen Z',                   en: 'Teenager / Gen Z' },
      { id: 'senior',       de: 'Ältere:r Mensch (80 Jahre)',              en: 'Older person (80 years old)' }
    ] },
    { groupKey: 'persp.grp3', items: [
      { id: 'past1925',     de: 'Mensch vor 100 Jahren (1925)',            en: 'Person 100 years ago (1925)' },
      { id: 'future2075',   de: 'Mensch in 50 Jahren (2075)',              en: 'Person 50 years from now (2075)' },
      { id: 'historiker',   de: 'Historiker:in in 200 Jahren zurückblickend', en: 'Historian looking back in 200 years' }
    ] },
    { groupKey: 'persp.grp4', items: [
      { id: 'nonnative',    de: 'Nicht-Muttersprachler:in, die Deutsch gerade lernt', en: 'Non-native speaker just learning the language' },
      { id: 'globalsouth',  de: 'Mensch aus dem globalen Süden',           en: 'Person from the Global South' },
      { id: 'offline',      de: 'Mensch ohne Internetzugang',              en: 'Person without internet access' }
    ] },
    { groupKey: 'persp.grp5', items: [
      { id: 'ai',           de: 'Die KI selbst (als Sprecher:in)',         en: 'The AI itself (as speaker)' },
      { id: 'tree',         de: 'Ein Baum / Ökosystem',                    en: 'A tree / ecosystem' },
      { id: 'futurechild',  de: 'Ein zukünftiges Kind, das diese Entscheidung erben wird', en: 'A future child who will inherit this decision' }
    ] }
  ];

  function perspLabel(item) {
    var lang = currentLang();
    return item[lang] || item.de;
  }

  function loadingHTML() {
    if (window.AtelierLoading && typeof window.AtelierLoading.html === 'function') {
      return window.AtelierLoading.html();
    }
    return '<span class="werkstatt-loading-text">' + _t('loading.0', 'Silizium denkt…') + '</span>';
  }

  function loadingLabel() {
    if (window.AtelierLoading && typeof window.AtelierLoading.pick === 'function') {
      return window.AtelierLoading.pick();
    }
    return _t('loading.0', 'Silizium denkt…');
  }

  function postRewrite(position, perspektive) {
    return fetch(API_BASE + '/api/perspektive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position: position, perspektive: perspektive, lang: currentLang() })
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
      _t('persp.button') + '</button>' +
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

    var html = '<h3>' + _t('persp.dialogTitle') + '</h3>';
    html += '<p class="perspektive-global-intro">' + _t('persp.dialogIntro') + '</p>';
    html += '<form method="dialog" class="perspektive-global-form">';
    PERSPEKTIVEN.forEach(function (grp) {
      html += '<fieldset class="perspektive-global-group"><legend>' + _t(grp.groupKey) + '</legend>';
      grp.items.forEach(function (p) {
        var label = perspLabel(p);
        html += '<button type="button" class="perspektive-global-option" data-perspektive="' + label.replace(/"/g, '&quot;') + '">' + label + '</button>';
      });
      html += '</fieldset>';
    });
    html += '<div class="perspektive-global-actions"><button type="button" class="button" id="perspektive-global-cancel">' + _t('persp.cancel') + '</button></div>';
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
    badge.textContent = _t('persp.reading') + ' ' + perspektive + ' ✕';
    badge.title = _t('persp.resetTip');
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
      setTimeout(function () { if (status) status.textContent = _t('persp.statusManifest').replace('{p}', p); }, 200);
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
  // Bildung-Essay Perspektive (zukunft-der-bildung.html)
  // ─────────────────────────────────────────────
  function initBildungPerspektive() {
    var btn = document.getElementById('bildung-perspektive-btn');
    var sel = document.getElementById('bildung-perspektive-select');
    var reset = document.getElementById('bildung-perspektive-reset');
    var status = document.getElementById('bildung-perspektive-status');
    if (!btn || !sel) return;

    btn.addEventListener('click', function () {
      var p = sel.value;
      if (!p) { resetAll(); if (reset) reset.hidden = true; if (status) status.textContent = ''; return; }
      if (status) status.innerHTML = loadingHTML();
      applyPerspektive(p);
      if (reset) reset.hidden = false;
      setTimeout(function () { if (status) status.textContent = _t('persp.statusEssay').replace('{p}', p); }, 200);
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
      '<button class="button" id="blindspot-btn" type="button">' + _t('persp.blindspotBtn') + '</button>' +
      '<div class="blindspot-result" id="blindspot-result" aria-live="polite"></div>';
    body.appendChild(box);

    document.getElementById('blindspot-btn').addEventListener('click', function () {
      var result = document.getElementById('blindspot-result');
      var text = body.textContent.replace(/\s+/g, ' ').trim().slice(0, 4000);
      result.innerHTML = loadingHTML();
      fetch(API_BASE + '/api/blindspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text, lang: currentLang() })
      }).then(function (res) { return res.json(); }).then(function (data) {
        if (!data || data.error || !data.perspektive) {
          result.textContent = _t('persp.analysisFail');
          return;
        }
        result.innerHTML =
          '<p class="blindspot-label">' + _t('persp.blindspotLabel') + '</p>' +
          '<p class="blindspot-perspektive"><strong>' + escapeText(data.perspektive) + '</strong></p>' +
          '<p class="blindspot-warum">' + escapeText(data.begruendung || '') + '</p>' +
          (data.frage ? '<p class="blindspot-frage"><em>' + escapeText(data.frage) + '</em></p>' : '');
      }).catch(function () {
        result.textContent = _t('persp.analysisFail');
      });
    });
  }

  // ─────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────
  window.addEventListener('DOMContentLoaded', function () {
    // injectHeaderSwitch(); // entfernt — Perspektivwechsel ist nur noch beim Manifest
    initManifestRemix();
    initBildungPerspektive();
    // initBlindspotDetector(); // entfernt vom Manifest
  });
}());
