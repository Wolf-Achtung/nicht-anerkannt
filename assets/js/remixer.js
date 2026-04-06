/**
 * remixer.js — Manifest Remixer for Das Atelier der Radikalen Mitte
 * Fetches manifest fragments and combines them into fresh remixes.
 */
(function () {
  'use strict';

  var remixLines = null;
  var outputEl = null;
  var btnEl = null;

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function fetchFragments() {
    var base = document.querySelector('script[src*="remixer"]');
    var prefix = base ? base.src.replace(/assets\/js\/remixer\.js.*$/, '') : '';
    return fetch(prefix + 'data/remix-lines.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load fragments');
        return res.json();
      })
      .then(function (data) {
        remixLines = data && data.lines ? data.lines : [];
        return data;
      });
  }

  function buildRemix() {
    if (!remixLines || remixLines.length === 0) return [];
    var clusters = {};
    remixLines.forEach(function (line) {
      if (!line || !line.cluster || !line.text) return;
      if (!clusters[line.cluster]) clusters[line.cluster] = [];
      clusters[line.cluster].push(line.text);
    });
    var clusterNames = Object.keys(clusters).filter(function (key) {
      return clusters[key].length > 1;
    });
    if (!clusterNames.length) return [];
    var activeCluster = pick(clusterNames);
    var candidates = clusters[activeCluster].slice();
    var sentenceCount = Math.min(candidates.length, Math.random() > 0.5 ? 3 : 2);
    var result = [];
    while (result.length < sentenceCount && candidates.length) {
      var idx = Math.floor(Math.random() * candidates.length);
      result.push(candidates.splice(idx, 1)[0]);
    }
    return result;
  }

  function animateText(el, lines) {
    el.classList.remove('is-visible');

    setTimeout(function () {
      var remixedHtml = lines.map(function (line) {
        return '<span class="remix-line">' + escapeHtml(line) + '</span>';
      }).join('<span class="remix-separator" aria-hidden="true">•</span>');
      el.innerHTML = '<blockquote class="remix-blockquote">' + remixedHtml + '</blockquote>';
      el.classList.add('is-visible');
    }, 400);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function remix() {
    if (!remixLines || !outputEl) return;
    var lines = buildRemix();
    if (!lines.length) {
      outputEl.innerHTML = '<p class="remix-error">Keine Remix-Linien verfügbar. Bitte später erneut versuchen.</p>';
      return;
    }
    animateText(outputEl, lines);
  }

  function init() {
    outputEl = document.getElementById('remixer-output');
    btnEl = document.getElementById('remixer-btn');

    if (!outputEl || !btnEl) return;

    outputEl.classList.add('remix-fade');

    fetchFragments()
      .then(function () {
        remix();
        btnEl.addEventListener('click', remix);
      })
      .catch(function (err) {
        outputEl.innerHTML = '<p class="remix-error">Remix-Daten konnten nicht geladen werden. Bitte Seite neu laden.</p>';
        console.error('[AtelierRemixer]', err);
      });
  }

  window.AtelierRemixer = {
    init: init,
    remix: remix
  };
}());
