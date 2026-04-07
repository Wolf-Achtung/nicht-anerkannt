/**
 * main.js — Core functionality for Das Atelier der Radikalen Mitte
 * Shuffle, Read Mode, Cut-card randomization, nav scroll, module init.
 */
(function () {
  'use strict';

  var slogans = [
    'Nicht mehr Stoff. Mehr Urteil.',
    'Keine Lager. Echte Fragen.',
    'KI ist Sparringspartner, nicht Orakel.',
    'Widerspruch ist Methode.',
    'Nicht angepasst. Handlungsfähig.'
  ];

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function shuffleStage() {
    var stage = document.querySelector('.hero-stage');
    if (!stage) return;

    var pieces = Array.from(document.querySelectorAll('[data-shuffle]'));
    var width = stage.clientWidth;
    var height = stage.clientHeight;
    var placed = [];

    function overlaps(a, b) {
      var pad = 6;
      return !(a.left + a.w + pad < b.left ||
               b.left + b.w + pad < a.left ||
               a.top + a.h + pad < b.top ||
               b.top + b.h + pad < a.top);
    }

    pieces.forEach(function (piece, index) {
      var rectW = piece.offsetWidth || 180;
      var rectH = piece.offsetHeight || 60;
      var maxLeft = Math.max(3, width - rectW - 8);
      var maxTop = Math.max(3, height - rectH - 8);

      var box = null;
      for (var tries = 0; tries < 60; tries++) {
        var candidate = {
          left: random(2, maxLeft),
          top: random(2, maxTop),
          w: rectW,
          h: rectH
        };
        var conflict = false;
        for (var i = 0; i < placed.length; i++) {
          if (overlaps(candidate, placed[i])) { conflict = true; break; }
        }
        if (!conflict) { box = candidate; break; }
      }
      // Fallback: stapeln, wenn kein freier Platz gefunden wurde
      if (!box) {
        var stackTop = placed.reduce(function (acc, p) { return Math.max(acc, p.top + p.h + 6); }, 4);
        box = { left: random(2, maxLeft), top: Math.min(stackTop, maxTop), w: rectW, h: rectH };
      }
      placed.push(box);

      var rotate = random(-10, 10).toFixed(1);
      piece.style.left = box.left + 'px';
      piece.style.top = box.top + 'px';
      piece.style.transform = 'rotate(' + rotate + 'deg)';
      piece.style.zIndex = String(2 + (index % 4));
    });

    var cards = stage.querySelectorAll('.cut-card p');
    cards.forEach(function (card) {
      card.textContent = slogans[Math.floor(random(0, slogans.length))];
    });
  }

  function setReadMode(active) {
    var btn = document.getElementById('readmode');
    document.body.classList.toggle('read-mode', active);
    if (btn) {
      btn.setAttribute('aria-pressed', String(active));
      btn.textContent = active ? 'Kompositionsmodus' : 'Lesemodus';
    }
  }

  function initReadMode() {
    var btn = document.getElementById('readmode');
    if (!btn) return;
    btn.addEventListener('click', function () {
      setReadMode(!document.body.classList.contains('read-mode'));
      pauseAutoHero(20000);
    });
  }

  function initShuffle() {
    var btn = document.getElementById('shuffle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (document.body.classList.contains('read-mode')) setReadMode(false);
      shuffleStage();
      pauseAutoHero(20000);
    });
  }

  // ─── Auto-Hero: automatischer Wechsel zwischen Komposition und Lesemodus ───
  var autoTimer = null;
  var autoPausedUntil = 0;
  var autoStepCount = 0;

  function pauseAutoHero(ms) {
    autoPausedUntil = Date.now() + (ms || 15000);
  }

  function scheduleAutoHero() {
    if (autoTimer) clearTimeout(autoTimer);
    var delay = Math.round(random(5500, 9500));
    autoTimer = setTimeout(runAutoHero, delay);
  }

  function runAutoHero() {
    var stage = document.querySelector('.hero-stage');
    if (!stage) return;

    if (Date.now() < autoPausedUntil) { scheduleAutoHero(); return; }
    if (document.hidden) { scheduleAutoHero(); return; }

    // respektiere reduced-motion
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    autoStepCount++;
    // Jeder ~4. Schritt: kurz in den Lesemodus, dann zurück
    if (autoStepCount % 4 === 0) {
      setReadMode(true);
      setTimeout(function () {
        if (Date.now() >= autoPausedUntil) {
          setReadMode(false);
          shuffleStage();
        }
        scheduleAutoHero();
      }, Math.round(random(4500, 6500)));
      return;
    }

    if (!document.body.classList.contains('read-mode')) shuffleStage();
    scheduleAutoHero();
  }

  function initAutoHero() {
    var stage = document.querySelector('.hero-stage');
    if (!stage) return;
    // Pausiere bei Nutzer-Interaktion im Hero-Bereich
    ['mouseenter', 'touchstart', 'focusin'].forEach(function (ev) {
      stage.addEventListener(ev, function () { pauseAutoHero(25000); });
    });
    var hero = document.querySelector('.hero');
    if (hero) {
      hero.addEventListener('mouseleave', function () {
        autoPausedUntil = Date.now() + 4000;
      });
    }
    scheduleAutoHero();
  }

  function initResize() {
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (!document.body.classList.contains('read-mode')) {
          shuffleStage();
        }
      }, 150);
    });
  }

  function initSmoothScroll() {
    var links = document.querySelectorAll('.header-links a[href^="#"]');
    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        var targetId = this.getAttribute('href');
        var target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Update URL without jumping
          history.pushState(null, '', targetId);
        }
      });
    });
  }

  function showShareToast(message) {
    var toast = document.getElementById('share-toast');
    if (!toast) return;
    toast.textContent = message || 'Link kopiert';
    toast.classList.add('is-visible');
    toast.setAttribute('aria-hidden', 'false');
    setTimeout(function () {
      toast.classList.remove('is-visible');
      toast.setAttribute('aria-hidden', 'true');
    }, 1800);
  }

  function initShareButtons() {
    var buttons = document.querySelectorAll('[data-share-target]');
    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetSelector = btn.getAttribute('data-share-target');
        var prefix = btn.getAttribute('data-share-prefix') || 'nicht-anerkannt.info';
        var target = targetSelector ? document.querySelector(targetSelector) : null;
        var text = target ? (target.innerText || target.textContent || '').trim() : '';
        var payload = prefix + '\n' + text.slice(0, 280) + '\n' + window.location.href;

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(payload)
            .then(function () {
              showShareToast('Link kopiert');
            })
            .catch(function () {
              showShareToast('Kopieren fehlgeschlagen');
            });
        } else {
          showShareToast('Zwischenablage nicht verfügbar');
        }
      });
    });
  }

  function initNavToggle() {
    var toggle = document.getElementById('nav-toggle');
    var nav = document.getElementById('main-nav');
    if (!toggle || !nav) return;
    toggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  function initModules() {
    // Initialize all attached modules if they exist
    if (window.AtelierRemixer && typeof window.AtelierRemixer.init === 'function') {
      window.AtelierRemixer.init();
    }
    if (window.AtelierStempel && typeof window.AtelierStempel.init === 'function') {
      window.AtelierStempel.init();
    }
    if (window.AtelierTicker && typeof window.AtelierTicker.init === 'function') {
      window.AtelierTicker.init();
    }
    if (window.AtelierChat && typeof window.AtelierChat.init === 'function') {
      window.AtelierChat.init();
    }
    if (window.AtelierQuiz && typeof window.AtelierQuiz.init === 'function') {
      window.AtelierQuiz.init();
    }
    if (window.AtelierRoadmap && typeof window.AtelierRoadmap.init === 'function') {
      window.AtelierRoadmap.init();
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    initShuffle();
    initReadMode();
    initResize();
    initAutoHero();
    initSmoothScroll();
    initShareButtons();
    initNavToggle();
    initModules();
  });
}());
