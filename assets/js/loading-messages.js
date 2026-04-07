/**
 * loading-messages.js — rotierende, atelierhafte Lade-Texte statt "KI denkt nach..."
 */
(function () {
  'use strict';

  var MESSAGES = [
    'Silizium denkt…',
    'Interessant…',
    'Lass mich kurz unterscheiden…',
    'Ich sortiere die Widersprüche…',
    'Ich suche das stärkste Gegenargument…',
    'Ich lege deine Annahme aufs Mikroskop…',
    'Hmm – das ist nicht trivial…',
    'Ich höre dem Problem zu…',
    'Ich tippe leise vor mich hin…',
    'Ich nehme eine andere Perspektive ein…',
    'Ich messe die Spannung…',
    'Ich prüfe, was du nicht gesagt hast…',
    'Ich tausche kurz die Brille…',
    'Ich denke gegen meinen ersten Reflex…',
    'Ich prüfe drei Mal, bevor ich rede…'
  ];

  function pick() {
    return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
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
