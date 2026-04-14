/**
 * loading-messages.js — rotierende, atelierhafte Lade-Texte statt "KI denkt nach..."
 */
(function () {
  'use strict';

  function getMessages() {
    var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
    var msgs = [];
    for (var i = 0; i <= 14; i++) {
      msgs.push(t('loading.' + i));
    }
    return msgs;
  }

  function pick() {
    var msgs = getMessages();
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  function html() {
    return '<div class="werkstatt-loading">' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-text">' + pick() + '</span></div>';
  }

  window.AtelierLoading = { pick: pick, html: html };
}());
