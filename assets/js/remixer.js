/**
 * remixer.js — Manifest Remixer for Das Atelier der Radikalen Mitte
 * Fetches manifest fragments and combines them into fresh remixes.
 */
(function () {
  'use strict';

  var fragments = null;
  var outputEl = null;
  var btnEl = null;

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function fetchFragments() {
    var base = document.querySelector('script[src*="remixer"]');
    var prefix = base ? base.src.replace(/assets\/js\/remixer\.js.*$/, '') : '';
    return fetch(prefix + 'data/manifest-fragments.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load fragments');
        return res.json();
      })
      .then(function (data) {
        fragments = data;
        return data;
      });
  }

  function buildRemix() {
    if (!fragments) return '';

    var anfang = pick(fragments.anfaenge);

    // Pick 1-2 kernaussagen
    var kernCount = Math.random() > 0.5 ? 2 : 1;
    var usedIndices = [];
    var kerne = [];
    while (kerne.length < kernCount && kerne.length < fragments.kernaussagen.length) {
      var idx = Math.floor(Math.random() * fragments.kernaussagen.length);
      if (usedIndices.indexOf(idx) === -1) {
        usedIndices.push(idx);
        kerne.push(fragments.kernaussagen[idx]);
      }
    }

    var schluss = pick(fragments.schlusssaetze);

    return anfang + ' ' + kerne.join(' ') + ' ' + schluss;
  }

  function animateText(el, text) {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.4s ease';

    setTimeout(function () {
      el.innerHTML = '<blockquote style="' +
        'margin:0;padding:1.2rem 1.4rem;' +
        'border:2px solid #111;' +
        'box-shadow:0.4rem 0.4rem 0 rgba(17,17,17,0.9);' +
        'background:#fffaf1;' +
        'font-size:clamp(1.05rem,1.6vw,1.22rem);' +
        'line-height:1.6;' +
        'transform:rotate(-0.8deg);' +
        'font-family:Georgia,serif;' +
        '">' + escapeHtml(text) + '</blockquote>';
      el.style.opacity = '1';
    }, 400);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function remix() {
    if (!fragments || !outputEl) return;
    var text = buildRemix();
    animateText(outputEl, text);
  }

  function init() {
    outputEl = document.getElementById('remixer-output');
    btnEl = document.getElementById('remixer-btn');

    if (!outputEl || !btnEl) return;

    fetchFragments()
      .then(function () {
        remix();
        btnEl.addEventListener('click', remix);
      })
      .catch(function (err) {
        outputEl.textContent = 'Fragmente konnten nicht geladen werden.';
        console.error('[AtelierRemixer]', err);
      });
  }

  window.AtelierRemixer = {
    init: init,
    remix: remix
  };
}());
