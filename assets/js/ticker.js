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

  var fallbackMessages = [
    { type: 'update', text: 'Willkommen im Atelier der Radikalen Mitte.', date: '' },
    { type: 'zitat', text: '"Nicht mehr Stoff. Mehr Urteil."', date: '' },
    { type: 'update', text: 'Manifest online. Feedback erwuenscht.', date: '' },
    { type: 'zitat', text: '"Widerspruch ist Methode."', date: '' }
  ];

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function badgeStyle(type) {
    if (type === 'update') {
      return 'display:inline-block;padding:0.15rem 0.5rem;font-size:0.7rem;' +
        'text-transform:uppercase;letter-spacing:0.08em;margin-right:0.6rem;' +
        'background:#be1e1e;color:#fff;font-family:Arial,sans-serif;font-weight:700;';
    }
    // zitat or other
    return 'display:inline-block;padding:0.15rem 0.5rem;font-size:0.7rem;' +
      'text-transform:uppercase;letter-spacing:0.08em;margin-right:0.6rem;' +
      'background:#5d5d5d;color:#fff;font-family:Arial,sans-serif;font-weight:700;';
  }

  function renderMessage(msg) {
    var badge = '<span style="' + badgeStyle(msg.type) + '">' +
      escapeHtml(msg.type) + '</span>';
    var text = '<span style="font-size:0.95rem;">' + escapeHtml(msg.text) + '</span>';
    var date = msg.date ? '<span style="margin-left:0.6rem;font-size:0.75rem;color:#5d5d5d;' +
      'font-family:Arial,sans-serif;">' + escapeHtml(msg.date) + '</span>' : '';
    return badge + text + date;
  }

  function showMessage(index) {
    if (!tickerEl || messages.length === 0) return;

    var display = tickerEl.querySelector('.ticker-display');
    if (!display) return;

    display.style.transition = 'opacity 0.35s ease';
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
    container.style.cssText = 'display:flex;align-items:center;gap:0.6rem;' +
      'padding:0.7rem 0.8rem;min-height:2.8rem;';

    var prevBtn = document.createElement('button');
    prevBtn.textContent = '\u25C0';
    prevBtn.setAttribute('aria-label', 'Vorherige Nachricht');
    prevBtn.style.cssText = 'border:1px solid rgba(17,17,17,0.2);background:transparent;' +
      'cursor:pointer;padding:0.2rem 0.5rem;font-size:0.8rem;color:#111;box-shadow:none;' +
      'line-height:1;font-family:Arial,sans-serif;';

    var nextBtn = document.createElement('button');
    nextBtn.textContent = '\u25B6';
    nextBtn.setAttribute('aria-label', 'Naechste Nachricht');
    nextBtn.style.cssText = prevBtn.style.cssText;

    var display = document.createElement('div');
    display.className = 'ticker-display';
    display.style.cssText = 'flex:1;transition:opacity 0.35s ease;';

    prevBtn.addEventListener('click', function () {
      prev();
      resetInterval();
    });

    nextBtn.addEventListener('click', function () {
      next();
      resetInterval();
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

    var base = document.querySelector('script[src*="ticker"]');
    var prefix = base ? base.src.replace(/assets\/js\/ticker\.js.*$/, '') : '';
    fetch(prefix + 'data/ticker-messages.json')
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
