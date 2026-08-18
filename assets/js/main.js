/**
 * main.js — Core functionality for Nichts geschenkt — Das Denkatelier
 * Nav scroll, share buttons, nav toggle, module init.
 */
(function () {
  'use strict';

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
    var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
    toast.textContent = message || t('main.linkCopied');
    toast.classList.add('is-visible');
    toast.setAttribute('aria-hidden', 'false');
    setTimeout(function () {
      toast.classList.remove('is-visible');
      toast.setAttribute('aria-hidden', 'true');
    }, 1800);
  }

  function initShareButtons() {
    var t = window.AtelierI18n ? window.AtelierI18n.t : function (k) { return k; };
    var buttons = document.querySelectorAll('[data-share-target]');
    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var targetSelector = btn.getAttribute('data-share-target');
        var prefix = btn.getAttribute('data-share-prefix') || 'nichts-geschenkt.de';
        var target = targetSelector ? document.querySelector(targetSelector) : null;
        var text = target ? (target.innerText || target.textContent || '').trim() : '';
        var payload = prefix + '\n' + text.slice(0, 280) + '\n' + window.location.href;

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(payload)
            .then(function () {
              showShareToast(t('main.linkCopied'));
            })
            .catch(function () {
              showShareToast(t('main.copyFailed'));
            });
        } else {
          showShareToast(t('main.clipboardNA'));
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
    initSmoothScroll();
    initShareButtons();
    initNavToggle();
    initModules();
  });
}());
