/**
 * ticker.js — Live Ticker for Das Atelier der Radikalen Mitte
 * Fetches ticker messages and rotates them with fade transitions.
 */
(function () {
  'use strict';

  var messages = [];
  var currentIndex = 0;
  var tickerEl = null;
  var intervalId = null;
  var INTERVAL = 5000;

  var fallbackMessages_de = [
    { type: 'update', text: 'Willkommen im Atelier der Radikalen Mitte.', date: '' },
    { type: 'zitat', text: '"Nicht mehr Stoff. Mehr Urteil."', date: '' },
    { type: 'update', text: 'Manifest online. Feedback erwuenscht.', date: '' },
    { type: 'zitat', text: '"Widerspruch ist Methode."', date: '' }
  ];
  var fallbackMessages_en = [
    { type: 'update', text: 'Welcome to the Atelier of the Radical Middle.', date: '' },
    { type: 'zitat', text: '"Not more material. More judgment."', date: '' },
    { type: 'update', text: 'Manifesto online. Feedback welcome.', date: '' },
    { type: 'zitat', text: '"Contradiction is method."', date: '' }
  ];
  var fallbackMessages = (window.AtelierI18n && window.AtelierI18n.lang === 'en') ? fallbackMessages_en : fallbackMessages_de;

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function badgeClass(type) {
    if (type === 'update') return 'ticker-badge ticker-badge--update';
    return 'ticker-badge ticker-badge--zitat';
  }

  function renderMessage(msg) {
    var badge = '<span class="' + badgeClass(msg.type) + '">' +
      escapeHtml(msg.type) + '</span>';
    var text = '<span class="ticker-text">' + escapeHtml(msg.text) + '</span>';
    var date = msg.date ? '<span class="ticker-date">' + escapeHtml(msg.date) + '</span>' : '';
    return badge + text + date;
  }

  function showMessage(index) {
    if (!tickerEl || messages.length === 0) return;

    var display = tickerEl.querySelector('.ticker-display');
    if (!display) return;

    display.style.opacity = '0';

    setTimeout(function () {
      display.innerHTML = renderMessage(messages[index]);
      display.style.opacity = '1';
    }, 350);
  }

  function next() {
    currentIndex = (currentIndex + 1) % messages.length;
    showMessage(currentIndex);
  }

  function prev() {
    currentIndex = (currentIndex - 1 + messages.length) % messages.length;
    showMessage(currentIndex);
  }

  function resetInterval() {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(next, INTERVAL);
  }

  function buildUI() {
    // Build the ticker container contents
    tickerEl.innerHTML = '';

    var container = document.createElement('div');
    container.className = 'ticker-container';

    var prevBtn = document.createElement('button');
    prevBtn.textContent = '\u25C0';
    var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
    prevBtn.setAttribute('aria-label', t('ticker.prev'));
    prevBtn.className = 'ticker-nav-btn';

    var nextBtn = document.createElement('button');
    nextBtn.textContent = '\u25B6';
    nextBtn.setAttribute('aria-label', t('ticker.next'));
    nextBtn.className = 'ticker-nav-btn';

    var display = document.createElement('div');
    display.className = 'ticker-display';
    display.setAttribute('aria-live', 'polite');

    prevBtn.addEventListener('click', function () {
      prev();
      resetInterval();
    });
    prevBtn.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        prev();
        resetInterval();
      }
    });

    nextBtn.addEventListener('click', function () {
      next();
      resetInterval();
    });
    nextBtn.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        next();
        resetInterval();
      }
    });

    container.appendChild(prevBtn);
    container.appendChild(display);
    container.appendChild(nextBtn);
    tickerEl.appendChild(container);
  }

  function init() {
    tickerEl = document.getElementById('live-ticker-container');
    if (!tickerEl) return;

    buildUI();

    var dataPath = (window.AtelierI18n && window.AtelierI18n.dataPrefix) ? window.AtelierI18n.dataPrefix() : 'data/';
    fetch(dataPath + 'ticker-messages.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load ticker data');
        return res.json();
      })
      .then(function (data) {
        messages = data.messages || [];
        if (messages.length === 0) messages = fallbackMessages;
        showMessage(0);
        resetInterval();
      })
      .catch(function () {
        messages = fallbackMessages;
        showMessage(0);
        resetInterval();
      });
  }

  window.AtelierTicker = {
    init: init
  };
}());
