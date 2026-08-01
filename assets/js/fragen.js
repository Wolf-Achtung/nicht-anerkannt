/**
 * fragen.js — "Was alle googeln": vote-gated question deck.
 *
 * Progressive enhancement over plain HTML: without JS, every answer is
 * fully visible (and crawlable). With JS, the deck gets the
 * .fragen-enhanced class, answers hide, and each card asks the visitor
 * to position themselves first ("Erst du") — only their vote reveals
 * the Atelier's answer. Votes stay in the page; nothing is stored or
 * transmitted.
 */
(function () {
  'use strict';

  function lang() {
    return (window.AtelierI18n && window.AtelierI18n.lang) || 'de';
  }

  function initCard(card) {
    var voteRow = card.querySelector('.frage-vote');
    var answer = card.querySelector('.frage-antwort');
    if (!voteRow || !answer) return;

    var buttons = voteRow.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          var chip = document.createElement('span');
          chip.className = 'frage-chip';
          chip.textContent = (lang() === 'en' ? 'You: ' : 'Du: ') + btn.textContent;
          answer.insertBefore(chip, answer.firstChild);
          card.classList.add('is-open');
        });
      })(buttons[i]);
    }

    var shareBtn = card.querySelector('[data-frage-share]');
    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        if (!window.AtelierSharecard) return;
        var q = card.querySelector('.frage-q');
        var id = card.getAttribute('data-frage-id') || 'frage';
        window.AtelierSharecard.generate(q ? q.textContent.trim() : '', id + '.png');
      });
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    var deck = document.getElementById('fragen-deck');
    if (!deck) return;
    deck.classList.add('fragen-enhanced');
    var cards = deck.querySelectorAll('.frage-card');
    for (var i = 0; i < cards.length; i++) {
      initCard(cards[i]);
    }
  });
}());
