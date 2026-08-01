/**
 * denkzoll.js — "Bezahl mit einem Gedanken."
 *
 * The Atelier's currency is thinking: where other sites gate downloads
 * behind an email address or a paywall, the manifesto costs one thought.
 * Clicking a manifesto download link opens a small inline toll booth
 * asking for a single sentence. The sentence is validated only for
 * non-emptiness, then the download proceeds. It is never stored and
 * never transmitted — the point is the pause, not the data.
 *
 * Progressive enhancement: without JS, the plain download links work
 * unchanged. One paid toll covers the rest of the page view.
 */
(function () {
  'use strict';

  var paid = false;

  function lang() {
    return (window.AtelierI18n && window.AtelierI18n.lang) || 'de';
  }

  function L(de, en) {
    return lang() === 'en' ? en : de;
  }

  function buildToll(link) {
    var box = document.createElement('div');
    box.className = 'denkzoll';

    var intro = document.createElement('p');
    intro.innerHTML = '<strong>' + L('Denk-Zoll: Dieses Manifest kostet einen Gedanken.', 'Thought toll: this manifesto costs one thought.') + '</strong> ' +
      L('Schreib eine Frage auf, die dich gerade beschäftigt. Ein Satz genügt.', 'Write down a question that is on your mind. One sentence is enough.');
    box.appendChild(intro);

    var input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 200;
    input.placeholder = L('Deine Frage …', 'Your question …');
    input.setAttribute('aria-label', L('Dein Gedanke als Zoll', 'Your thought as toll'));
    box.appendChild(input);

    var btn = document.createElement('button');
    btn.className = 'button button--accent';
    btn.type = 'button';
    btn.textContent = L('Gedanke gezahlt — Download', 'Thought paid — download');
    box.appendChild(btn);

    var note = document.createElement('p');
    note.className = 'denkzoll-note';
    note.textContent = L('Wird nirgends gespeichert, nirgends hingeschickt. Der Gedanke gehört dir.', 'Stored nowhere, sent nowhere. The thought is yours.');
    box.appendChild(note);

    function pay() {
      if (!input.value.trim()) {
        input.focus();
        return;
      }
      paid = true;
      box.parentNode.removeChild(box);
      // Re-trigger the original download now that the toll is paid.
      link.click();
    }

    btn.addEventListener('click', pay);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') pay();
    });

    return box;
  }

  window.addEventListener('DOMContentLoaded', function () {
    var links = document.querySelectorAll('a[download][href*="manifest-das-atelier"]');
    for (var i = 0; i < links.length; i++) {
      (function (link) {
        link.addEventListener('click', function (e) {
          if (paid) return;
          e.preventDefault();
          // Only one toll booth per link at a time.
          var next = link.parentNode.querySelector('.denkzoll');
          if (next) {
            next.querySelector('input').focus();
            return;
          }
          var box = buildToll(link);
          link.parentNode.appendChild(box);
          box.querySelector('input').focus();
        });
      })(links[i]);
    }
  });
}());
