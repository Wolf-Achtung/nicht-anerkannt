/**
 * sharecard.js — Social-Share-Card Generator
 * Generates 1200x630 share cards in Dada style. Wired to the manifest
 * remixer on the homepage; also exposed as window.AtelierSharecard so
 * other modules (e.g. the daily thinking challenge) can generate cards
 * from their own text.
 */
(function () {
  'use strict';

  function init() {
    var remixerOutput = document.getElementById('remixer-output');
    var remixerBtn = document.getElementById('remixer-btn');
    if (!remixerOutput || !remixerBtn) return;

    // Add share card button after remixer button
    var shareBtn = document.createElement('button');
    shareBtn.className = 'button sharecard-btn';
    shareBtn.type = 'button';
    var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
    shareBtn.textContent = t('sharecard.download');
    shareBtn.style.marginLeft = '0.6rem';
    remixerBtn.parentNode.insertBefore(shareBtn, remixerBtn.nextSibling);

    shareBtn.addEventListener('click', function () {
      var text = '';
      var bq = remixerOutput.querySelector('blockquote');
      if (bq) {
        text = bq.textContent;
      } else {
        text = remixerOutput.textContent;
      }
      text = text.trim();
      if (!text || text === 'Drücke „Remix", um einen neuen Gedanken zu erzeugen.') {
        return;
      }
      generateCard(text);
    });
  }

  // Public API for other modules (daily challenge, quizzes, ...).
  window.AtelierSharecard = {
    generate: function (text, filename) {
      if (!text) return;
      generateCard(String(text).trim(), filename);
    }
  };

  function wrapText(ctx, text, maxWidth) {
    var words = text.split(' ');
    var lines = [];
    var currentLine = '';

    for (var i = 0; i < words.length; i++) {
      var testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
      var metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  function generateCard(text, filename) {
    var W = 1200;
    var H = 630;
    var canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f3ecdf';
    ctx.fillRect(0, 0, W, H);

    // Dada-style angular border
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, W - 48, H - 48);

    // Inner accent line
    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 2;
    ctx.strokeRect(36, 36, W - 72, H - 72);

    // Diagonal accent stripe
    ctx.save();
    ctx.fillStyle = 'rgba(190, 30, 30, 0.08)';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.65);
    ctx.lineTo(W, H * 0.35);
    ctx.lineTo(W, H * 0.45);
    ctx.lineTo(0, H * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Main quote text
    ctx.font = 'italic 32px Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'left';
    var padding = 80;
    var maxTextWidth = W - padding * 2;
    var lines = wrapText(ctx, '„' + text + '"', maxTextWidth);

    // Center text vertically
    var lineHeight = 44;
    var totalTextHeight = lines.length * lineHeight;
    var startY = (H - totalTextHeight) / 2 + 10;

    // Limit to max 8 lines
    if (lines.length > 8) {
      lines = lines.slice(0, 8);
      lines[7] = lines[7].replace(/\s+\S*$/, '') + '…"';
    }

    for (var i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], padding, startY + i * lineHeight);
    }

    var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };

    // Footer: brand
    ctx.font = 'bold 16px Arial, Helvetica, sans-serif';
    ctx.fillStyle = '#5d5d5d';
    ctx.textAlign = 'left';
    ctx.fillText(t('sharecard.brand'), padding, H - 60);

    ctx.font = '13px Arial, Helvetica, sans-serif';
    ctx.fillStyle = '#888888';
    ctx.fillText(t('sharecard.tagline'), padding, H - 40);

    // Download
    canvas.toBlob(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename || 'atelier-remix-sharecard.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
    }, 'image/png');
  }

  window.addEventListener('DOMContentLoaded', init);
}());
