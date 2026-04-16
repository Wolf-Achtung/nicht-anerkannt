/**
 * werkstatt.js — KI-Werkstatt Tools for Das Atelier der Radikalen Mitte
 * Widerspruchssalon, Denkproben-Generator, Urteilstraining,
 * Wicked-Problem-Werkstatt, Text-Stresstest, Manifest-Übersetzer
 */
(function () {
  'use strict';

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  var _t = function (k) { return (window.AtelierI18n && window.AtelierI18n.t) ? window.AtelierI18n.t(k) : k; };

  function showLoading(el) {
    if (window.AtelierLoading && typeof window.AtelierLoading.html === 'function') {
      el.innerHTML = window.AtelierLoading.html();
      return;
    }
    el.innerHTML = '<div class="werkstatt-loading">' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-dot"></span>' +
      '<span class="werkstatt-loading-text">' + _t('ws.loading') + '</span></div>';
  }

  function showError(el, msg) {
    el.innerHTML = '<div class="werkstatt-error">' + escapeHtml(msg) + '</div>';
  }

  function postJSON(url, data) {
    var base = (typeof window !== 'undefined' && window.ATELIER_API_BASE) ? window.ATELIER_API_BASE : '';
    var lang = (window.AtelierI18n && window.AtelierI18n.lang) ? window.AtelierI18n.lang : 'de';
    var body = Object.assign({ lang: lang }, data || {});
    return fetch(base + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) { return res.json(); });
  }

  // ═══════════════════════════════════════════════════════════
  // 1. WIDERSPRUCHSSALON
  // ═══════════════════════════════════════════════════════════
  function initWiderspruch() {
    var btn = document.getElementById('ws-btn');
    var input = document.getElementById('ws-these');
    var output = document.getElementById('ws-output');
    if (!btn || !input || !output) return;

    btn.addEventListener('click', function () {
      var these = input.value.trim();
      if (!these) { input.focus(); return; }

      btn.disabled = true;
      showLoading(output);

      postJSON('/api/widerspruch', { these: these })
        .then(function (data) {
          if (data.error) { showError(output, data.error); return; }

          var html = '<h3 class="werkstatt-result-title">' + _t('ws.resultTitle') + '</h3>' +
            '<p class="werkstatt-these">' + escapeHtml(data.these) + '</p>';

          if (data.gegenpositionen && data.gegenpositionen.length) {
            data.gegenpositionen.forEach(function (g, i) {
              html += '<div class="werkstatt-card">' +
                '<div class="werkstatt-card-label">' + escapeHtml(g.perspektive) + '</div>' +
                '<p>' + escapeHtml(g.argument) + '</p></div>';
            });
          } else if (data.raw) {
            html += '<p>' + escapeHtml(data.raw) + '</p>';
          }

          output.innerHTML = html;

          if (window.AtelierScore && window.AtelierScore.track) {
            window.AtelierScore.track('widerspruch');
          }
        })
        .catch(function () { showError(output, _t('ws.connectionError')); })
        .finally(function () { btn.disabled = false; });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 2. DENKPROBEN-GENERATOR
  // ═══════════════════════════════════════════════════════════
  function initDenkprobe() {
    var btn = document.getElementById('dp-btn');
    var input = document.getElementById('dp-thema');
    var output = document.getElementById('dp-output');
    if (!btn || !input || !output) return;

    btn.addEventListener('click', function () {
      var thema = input.value.trim();
      if (!thema) { input.focus(); return; }

      btn.disabled = true;
      showLoading(output);

      postJSON('/api/denkprobe', { thema: thema })
        .then(function (data) {
          if (data.error) { showError(output, data.error); return; }
          if (data.raw) { output.innerHTML = '<p>' + escapeHtml(data.raw) + '</p>'; return; }

          var html = '<div class="werkstatt-denkprobe">';
          html += '<h3 class="werkstatt-result-title">' + escapeHtml(data.thema || thema) + '</h3>';

          html += '<div class="werkstatt-card"><div class="werkstatt-card-label">' + _t('ws.problemstellung') + '</div>' +
            '<p>' + escapeHtml(data.problemstellung) + '</p></div>';

          if (data.falsche_alternative) {
            html += '<div class="werkstatt-card werkstatt-card--dual">' +
              '<div class="werkstatt-card-label">' + _t('ws.falscheAlt') + '</div>' +
              '<div class="werkstatt-dual">' +
              '<div class="werkstatt-dual-side"><strong>' + _t('ws.positionA') + '</strong> ' + escapeHtml(data.falsche_alternative.position_a) + '</div>' +
              '<div class="werkstatt-dual-vs">vs.</div>' +
              '<div class="werkstatt-dual-side"><strong>' + _t('ws.positionB') + '</strong> ' + escapeHtml(data.falsche_alternative.position_b) + '</div>' +
              '</div></div>';
          }

          html += '<div class="werkstatt-card werkstatt-card--accent"><div class="werkstatt-card-label">' + _t('ws.radikaleMitte') + '</div>' +
            '<p>' + escapeHtml(data.radikale_mitte) + '</p></div>';

          if (data.offene_fragen && data.offene_fragen.length) {
            html += '<div class="werkstatt-card"><div class="werkstatt-card-label">' + _t('ws.offeneFragen') + '</div><ul>';
            data.offene_fragen.forEach(function (f) {
              html += '<li>' + escapeHtml(f) + '</li>';
            });
            html += '</ul></div>';
          }

          html += '</div>';
          output.innerHTML = html;

          if (window.AtelierScore && window.AtelierScore.track) {
            window.AtelierScore.track('denkprobe');
          }
        })
        .catch(function () { showError(output, _t('ws.connectionError')); })
        .finally(function () { btn.disabled = false; });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 3. URTEILSTRAINING
  // ═══════════════════════════════════════════════════════════
  function initUrteil() {
    var newBtn = document.getElementById('ut-new');
    var judgeBtn = document.getElementById('ut-judge');
    var dilemmaEl = document.getElementById('ut-dilemma');
    var answerArea = document.getElementById('ut-answer-area');
    var urteilInput = document.getElementById('ut-urteil');
    var output = document.getElementById('ut-output');
    if (!newBtn || !dilemmaEl) return;

    var currentDilemma = '';

    function loadDilemma() {
      newBtn.disabled = true;
      answerArea.style.display = 'none';
      output.innerHTML = '';
      showLoading(dilemmaEl);

      postJSON('/api/urteil', { action: 'new' })
        .then(function (data) {
          if (data.error || data.raw) {
            dilemmaEl.innerHTML = '<p>' + escapeHtml(data.error || data.raw) + '</p>';
            return;
          }

          currentDilemma = data.situation + ' ' + data.frage;

          dilemmaEl.innerHTML = '<div class="werkstatt-card werkstatt-card--dilemma">' +
            '<div class="werkstatt-card-label">' + escapeHtml(data.titel) + '</div>' +
            '<p>' + escapeHtml(data.situation) + '</p>' +
            '<p class="werkstatt-frage"><strong>' + escapeHtml(data.frage) + '</strong></p></div>';

          answerArea.style.display = 'block';
          if (urteilInput) { urteilInput.value = ''; urteilInput.focus(); }
        })
        .catch(function () { showError(dilemmaEl, _t('ws.dilemmaError')); })
        .finally(function () { newBtn.disabled = false; });
    }

    newBtn.addEventListener('click', loadDilemma);

    if (judgeBtn) {
      judgeBtn.addEventListener('click', function () {
        var urteil = urteilInput.value.trim();
        if (!urteil) { urteilInput.focus(); return; }

        judgeBtn.disabled = true;
        showLoading(output);

        postJSON('/api/urteil', { action: 'judge', dilemma: currentDilemma, urteil: urteil })
          .then(function (data) {
            if (data.error || data.raw) {
              output.innerHTML = '<p>' + escapeHtml(data.error || data.raw) + '</p>';
              return;
            }

            var html = '<div class="werkstatt-feedback">';
            html += '<div class="werkstatt-card"><div class="werkstatt-card-label">' + _t('ws.blindeStelle') + '</div>' +
              '<p>' + escapeHtml(data.blinde_stelle) + '</p></div>';
            html += '<div class="werkstatt-card werkstatt-card--accent"><div class="werkstatt-card-label">' + _t('ws.staerke') + '</div>' +
              '<p>' + escapeHtml(data.staerke) + '</p></div>';
            html += '<div class="werkstatt-card"><div class="werkstatt-card-label">' + _t('ws.vertiefung') + '</div>' +
              '<p class="werkstatt-frage"><strong>' + escapeHtml(data.vertiefung) + '</strong></p></div>';
            html += '</div>';
            output.innerHTML = html;

            if (window.AtelierScore && window.AtelierScore.track) {
              window.AtelierScore.track('urteil');
            }
          })
          .catch(function () { showError(output, _t('ws.connectionShort')); })
          .finally(function () { judgeBtn.disabled = false; });
      });
    }

    // Load first dilemma automatically
    loadDilemma();
  }

  // ═══════════════════════════════════════════════════════════
  // 4. WICKED-PROBLEM-WERKSTATT
  // ═══════════════════════════════════════════════════════════
  function initWicked() {
    var btn = document.getElementById('wp-btn');
    var input = document.getElementById('wp-problem');
    var stepsEl = document.getElementById('wp-steps');
    var progressEl = document.getElementById('wp-progress');
    var output = document.getElementById('wp-output');
    if (!btn || !input || !stepsEl) return;

    var stepNames = [_t('ws.stepDisziplinen'), _t('ws.stepStakeholder'), _t('ws.stepWidersprueche'), _t('ws.stepHandlung'), _t('ws.stepUrteil')];
    var results = [];
    var currentStep = 0;
    var problem = '';

    function renderProgress() {
      var html = '<div class="werkstatt-progress-steps">';
      for (var i = 0; i < stepNames.length; i++) {
        var state = i < currentStep ? 'done' : (i === currentStep ? 'active' : '');
        html += '<div class="werkstatt-step ' + state + '">' +
          '<span class="werkstatt-step-num">' + (i + 1) + '</span> ' + stepNames[i] + '</div>';
      }
      html += '</div>';
      progressEl.innerHTML = html;
    }

    function runStep(step) {
      currentStep = step - 1;
      renderProgress();
      showLoading(output);

      var prev = results.length > 0 ? JSON.stringify(results) : '';
      postJSON('/api/wicked', { problem: problem, step: step, previousAnswers: prev })
        .then(function (data) {
          if (data.error) { showError(output, data.error); return; }
          results.push(data);

          var html = renderStepResult(data, step);

          if (step < 5) {
            html += '<button class="button button--accent werkstatt-next-step" type="button">' + _t('ws.nextStep') + ' ' +
              stepNames[step] + ' →</button>';
          } else {
            html += '<div class="werkstatt-card werkstatt-card--accent" style="margin-top:1rem;">' +
              '<div class="werkstatt-card-label">' + _t('ws.workshopDone') + '</div>' +
              '<p>' + _t('ws.workshopDoneText') + '</p></div>';
          }

          output.innerHTML = html;
          currentStep = step;
          renderProgress();

          var nextBtn = output.querySelector('.werkstatt-next-step');
          if (nextBtn) {
            nextBtn.addEventListener('click', function () {
              runStep(step + 1);
            });
          }
        })
        .catch(function () { showError(output, _t('ws.connectionShort')); });
    }

    function renderStepResult(data, step) {
      var html = '';

      if (data.disziplinen) {
        data.disziplinen.forEach(function (d) {
          html += '<div class="werkstatt-card"><div class="werkstatt-card-label">' +
            escapeHtml(d.name) + '</div><p>' + escapeHtml(d.perspektive) + '</p></div>';
        });
      }

      if (data.stakeholder) {
        data.stakeholder.forEach(function (s) {
          html += '<div class="werkstatt-card"><div class="werkstatt-card-label">' +
            escapeHtml(s.name) + '</div><p><strong>' + escapeHtml(s.position) +
            '</strong><br>' + escapeHtml(s.anliegen) + '</p></div>';
        });
      }

      if (data.widersprueche) {
        data.widersprueche.forEach(function (w) {
          html += '<div class="werkstatt-card"><div class="werkstatt-card-label">' + _t('ws.spannung') + '</div>' +
            '<p><strong>' + escapeHtml(w.spannung) + '</strong><br>' +
            escapeHtml(w.warum_unlösbar || w.warum_unloesbar || '') + '</p></div>';
        });
      }

      if (data.optionen) {
        data.optionen.forEach(function (o) {
          html += '<div class="werkstatt-card"><div class="werkstatt-card-label">' +
            escapeHtml(o.titel) + '</div><p>' + escapeHtml(o.beschreibung) +
            '</p><p class="werkstatt-tradeoff"><em>' + _t('ws.tradeoff') + ' ' +
            escapeHtml(o.tradeoff) + '</em></p></div>';
        });
      }

      if (data.zusammenfassung) {
        html += '<div class="werkstatt-card"><div class="werkstatt-card-label">' + _t('ws.zusammenfassung') + '</div>' +
          '<p>' + escapeHtml(data.zusammenfassung) + '</p></div>';
        html += '<div class="werkstatt-card werkstatt-card--accent"><div class="werkstatt-card-label">' + _t('ws.deineUrteilsfrage') + '</div>' +
          '<p class="werkstatt-frage"><strong>' + escapeHtml(data.urteilsfrage) + '</strong></p></div>';
      }

      if (data.raw) {
        html += '<p>' + escapeHtml(data.raw) + '</p>';
      }

      return html;
    }

    btn.addEventListener('click', function () {
      problem = input.value.trim();
      if (!problem) { input.focus(); return; }
      results = [];
      currentStep = 0;
      btn.disabled = true;
      runStep(1);
      setTimeout(function () { btn.disabled = false; }, 2000);
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 5. TEXT-STRESSTEST
  // ═══════════════════════════════════════════════════════════
  function initStresstest() {
    var btn = document.getElementById('st-btn');
    var input = document.getElementById('st-text');
    var counter = document.getElementById('st-count');
    var output = document.getElementById('st-output');
    if (!btn || !input || !output) return;

    if (counter) {
      input.addEventListener('input', function () {
        counter.textContent = input.value.length;
      });
    }

    btn.addEventListener('click', function () {
      var text = input.value.trim();
      if (!text) { input.focus(); return; }

      btn.disabled = true;
      showLoading(output);

      postJSON('/api/stresstest', { text: text })
        .then(function (data) {
          if (data.error || data.raw) {
            output.innerHTML = '<p>' + escapeHtml(data.error || data.raw) + '</p>';
            return;
          }

          var html = '<div class="werkstatt-stresstest">';

          if (data.staerken && data.staerken.length) {
            html += '<div class="werkstatt-card werkstatt-card--accent"><div class="werkstatt-card-label">' + _t('ws.staerken') + '</div><ul>';
            data.staerken.forEach(function (s) { html += '<li>' + escapeHtml(s) + '</li>'; });
            html += '</ul></div>';
          }

          if (data.behauptungen && data.behauptungen.length) {
            html += '<div class="werkstatt-card"><div class="werkstatt-card-label">' + _t('ws.behauptungen') + '</div><ul>';
            data.behauptungen.forEach(function (b) { html += '<li>' + escapeHtml(b) + '</li>'; });
            html += '</ul></div>';
          }

          if (data.fehlender_widerspruch && data.fehlender_widerspruch.length) {
            html += '<div class="werkstatt-card"><div class="werkstatt-card-label">' + _t('ws.fehlenderWid') + '</div><ul>';
            data.fehlender_widerspruch.forEach(function (f) { html += '<li>' + escapeHtml(f) + '</li>'; });
            html += '</ul></div>';
          }

          if (data.meinung_als_urteil && data.meinung_als_urteil.length) {
            html += '<div class="werkstatt-card"><div class="werkstatt-card-label">' + _t('ws.meinungAlsUrteil') + '</div><ul>';
            data.meinung_als_urteil.forEach(function (m) { html += '<li>' + escapeHtml(m) + '</li>'; });
            html += '</ul></div>';
          }

          if (data.fehlende_frage) {
            html += '<div class="werkstatt-card werkstatt-card--accent"><div class="werkstatt-card-label">' + _t('ws.fehlendeFrage') + '</div>' +
              '<p class="werkstatt-frage"><strong>' + escapeHtml(data.fehlende_frage) + '</strong></p></div>';
          }

          html += '</div>';
          output.innerHTML = html;

          if (window.AtelierScore && window.AtelierScore.track) {
            window.AtelierScore.track('stresstest');
          }
        })
        .catch(function () { showError(output, _t('ws.connectionShort')); })
        .finally(function () { btn.disabled = false; });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 6. MANIFEST-ÜBERSETZER
  // ═══════════════════════════════════════════════════════════
  function initTranslate() {
    var btn = document.getElementById('tr-btn');
    var textInput = document.getElementById('tr-text');
    var langInput = document.getElementById('tr-lang');
    var output = document.getElementById('tr-output');
    if (!btn || !textInput || !langInput || !output) return;

    btn.addEventListener('click', function () {
      var text = textInput.value.trim();
      var language = langInput.value;
      if (!text) { textInput.focus(); return; }

      btn.disabled = true;
      showLoading(output);

      postJSON('/api/translate', { text: text, language: language })
        .then(function (data) {
          if (data.error) { showError(output, data.error); return; }

          var html = '<div class="werkstatt-translation">';
          html += '<div class="werkstatt-card werkstatt-card--accent">' +
            '<div class="werkstatt-card-label">' + escapeHtml(language || '') + '</div>' +
            '<p class="werkstatt-translation">' + escapeHtml(data.translation) + '</p></div>';

          if (data.notes) {
            html += '<div class="werkstatt-card"><div class="werkstatt-card-label">' + _t('ws.kulturAnmerkung') + '</div>' +
              '<p class="werkstatt-note">' + escapeHtml(data.notes) + '</p></div>';
          }

          html += '</div>';
          output.innerHTML = html;

          if (window.AtelierScore && window.AtelierScore.track) {
            window.AtelierScore.track('translate');
          }
        })
        .catch(function () { showError(output, _t('ws.connectionShort')); })
        .finally(function () { btn.disabled = false; });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 7. PERSPEKTIVENWECHSEL-MASCHINE
  // ═══════════════════════════════════════════════════════════
  function initPerspektive() {
    var btn = document.getElementById('pw-btn');
    var posInput = document.getElementById('pw-position');
    var perspSelect = document.getElementById('pw-perspektive');
    var output = document.getElementById('pw-output');
    if (!btn || !posInput || !perspSelect || !output) return;

    btn.addEventListener('click', function () {
      var position = posInput.value.trim();
      if (!position) { posInput.focus(); return; }

      btn.disabled = true;
      showLoading(output);

      postJSON('/api/perspektive', { position: position, perspektive: perspSelect.value })
        .then(function (data) {
          if (data.error || data.raw) {
            showError(output, data.error || data.raw);
            return;
          }

          var html = '<div class="werkstatt-perspektive">';
          html += '<div class="werkstatt-card werkstatt-card--accent">' +
            '<div class="werkstatt-card-label">' + _t('ws.ausSicht') + ' ' + escapeHtml(data.perspektive) + '</div>' +
            '<p>' + escapeHtml(data.reformulierung) + '</p></div>';

          if (data.ueberraschung) {
            html += '<div class="werkstatt-card">' +
              '<div class="werkstatt-card-label">' + _t('ws.uebersehen') + '</div>' +
              '<p>' + escapeHtml(data.ueberraschung) + '</p></div>';
          }

          if (data.bruecke) {
            html += '<div class="werkstatt-card">' +
              '<div class="werkstatt-card-label">' + _t('ws.bruecke') + '</div>' +
              '<p>' + escapeHtml(data.bruecke) + '</p></div>';
          }

          html += '</div>';
          output.innerHTML = html;

          if (window.AtelierScore && window.AtelierScore.track) {
            window.AtelierScore.track('perspektive');
          }
        })
        .catch(function () { showError(output, _t('ws.connectionError')); })
        .finally(function () { btn.disabled = false; });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 8. KI-GEGENREDE
  // ═══════════════════════════════════════════════════════════
  function initGegenrede() {
    var btn = document.getElementById('gr-btn');
    var input = document.getElementById('gr-text');
    var counter = document.getElementById('gr-count');
    var output = document.getElementById('gr-output');
    if (!btn || !input || !output) return;

    if (counter) {
      input.addEventListener('input', function () {
        counter.textContent = input.value.length;
      });
    }

    btn.addEventListener('click', function () {
      var text = input.value.trim();
      if (!text) { input.focus(); return; }

      btn.disabled = true;
      showLoading(output);

      postJSON('/api/gegenrede', { text: text })
        .then(function (data) {
          if (data.error || data.raw) {
            showError(output, data.error || data.raw);
            return;
          }

          var html = '<div class="werkstatt-gegenrede">';

          html += '<div class="werkstatt-card werkstatt-card--accent">' +
            '<div class="werkstatt-card-label">' + _t('ws.gegenposition') + '</div>' +
            '<p>' + escapeHtml(data.gegenposition) + '</p></div>';

          html += '<div class="werkstatt-card">' +
            '<div class="werkstatt-card-label">' + _t('ws.ungestellteFrage') + '</div>' +
            '<p class="werkstatt-frage"><strong>' + escapeHtml(data.ungestellte_frage) + '</strong></p></div>';

          if (data.annahmen && data.annahmen.length) {
            html += '<div class="werkstatt-card">' +
              '<div class="werkstatt-card-label">' + _t('ws.ungesagteAnnahmen') + '</div><ul>';
            data.annahmen.forEach(function (a) {
              html += '<li>' + escapeHtml(a) + '</li>';
            });
            html += '</ul></div>';
          }

          html += '<div class="werkstatt-card">' +
            '<div class="werkstatt-card-label">' + _t('ws.fehlendeStimme') + '</div>' +
            '<p>' + escapeHtml(data.fehlende_stimme) + '</p></div>';

          html += '</div>';
          output.innerHTML = html;

          if (window.AtelierScore && window.AtelierScore.track) {
            window.AtelierScore.track('gegenrede');
          }
        })
        .catch(function () { showError(output, _t('ws.connectionError')); })
        .finally(function () { btn.disabled = false; });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 9. ARGUMENTKARTE
  // ═══════════════════════════════════════════════════════════
  function initArgumentkarte() {
    var btn = document.getElementById('ak-btn');
    var input = document.getElementById('ak-these');
    var output = document.getElementById('ak-output');
    if (!btn || !input || !output) return;

    btn.addEventListener('click', function () {
      var these = input.value.trim();
      if (!these) { input.focus(); return; }

      btn.disabled = true;
      showLoading(output);

      postJSON('/api/argumentkarte', { these: these })
        .then(function (data) {
          if (data.error || data.raw) {
            showError(output, data.error || data.raw);
            return;
          }

          var html = '<div class="argmap">';

          // Central thesis
          html += '<div class="argmap-these">' +
            '<div class="werkstatt-card-label">' + _t('ws.these') + '</div>' +
            '<p><strong>' + escapeHtml(data.these) + '</strong></p></div>';

          // Pro/Contra columns
          html += '<div class="argmap-columns">';

          // Pro column
          html += '<div class="argmap-col argmap-col--pro">';
          html += '<h4 class="argmap-col-title argmap-col-title--pro">' + _t('ws.pro') + '</h4>';
          if (data.pro && data.pro.length) {
            data.pro.forEach(function (p) {
              html += '<div class="werkstatt-card argmap-node argmap-node--pro">' +
                '<div class="werkstatt-card-label">' + escapeHtml(p.argument) + '</div>' +
                '<p>' + escapeHtml(p.begruendung) + '</p>' +
                '<p class="argmap-einwand"><em>' + _t('ws.einwand') + ' ' + escapeHtml(p.einwand) + '</em></p></div>';
            });
          }
          html += '</div>';

          // Contra column
          html += '<div class="argmap-col argmap-col--contra">';
          html += '<h4 class="argmap-col-title argmap-col-title--contra">' + _t('ws.contra') + '</h4>';
          if (data.contra && data.contra.length) {
            data.contra.forEach(function (c) {
              html += '<div class="werkstatt-card argmap-node argmap-node--contra">' +
                '<div class="werkstatt-card-label">' + escapeHtml(c.argument) + '</div>' +
                '<p>' + escapeHtml(c.begruendung) + '</p>' +
                '<p class="argmap-einwand"><em>' + _t('ws.einwand') + ' ' + escapeHtml(c.einwand) + '</em></p></div>';
            });
          }
          html += '</div>';
          html += '</div>';

          // Synthese
          if (data.synthese) {
            html += '<div class="werkstatt-card werkstatt-card--accent argmap-synthese">' +
              '<div class="werkstatt-card-label">' + _t('ws.synthese') + '</div>' +
              '<p>' + escapeHtml(data.synthese) + '</p></div>';
          }

          html += '</div>';
          output.innerHTML = html;

          if (window.AtelierScore && window.AtelierScore.track) {
            window.AtelierScore.track('argumentkarte');
          }
        })
        .catch(function () { showError(output, _t('ws.connectionError')); })
        .finally(function () { btn.disabled = false; });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 10. STILLE-MODUS (sokratischer Chat)
  // ═══════════════════════════════════════════════════════════
  function initStille() {
    var btn = document.getElementById('stille-btn');
    var input = document.getElementById('stille-input');
    var messagesEl = document.getElementById('stille-messages');
    if (!btn || !input || !messagesEl) return;

    var history = [];

    function addMessage(sender, text) {
      var div = document.createElement('div');
      div.className = 'stille-msg stille-msg--' + sender;
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function send() {
      var text = input.value.trim();
      if (!text) { input.focus(); return; }

      addMessage('user', text);
      history.push({ sender: 'user', text: text });
      input.value = '';
      btn.disabled = true;

      // Show typing indicator
      var typing = document.createElement('div');
      typing.className = 'stille-msg stille-msg--ki stille-typing';
      typing.innerHTML = '<span class="werkstatt-loading-dot"></span>' +
        '<span class="werkstatt-loading-dot"></span>' +
        '<span class="werkstatt-loading-dot"></span>';
      messagesEl.appendChild(typing);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      postJSON('/api/chat', { message: text, history: history, stille: true })
        .then(function (data) {
          if (typing.parentNode) typing.parentNode.removeChild(typing);
          var reply = data.reply || data.error || _t('ws.noReply');
          addMessage('ki', reply);
          history.push({ sender: 'ki', text: reply });

          if (window.AtelierScore && window.AtelierScore.track) {
            window.AtelierScore.track('stille');
          }
        })
        .catch(function () {
          if (typing.parentNode) typing.parentNode.removeChild(typing);
          addMessage('ki', _t('ws.connectionError'));
        })
        .finally(function () { btn.disabled = false; input.focus(); });
    }

    btn.addEventListener('click', send);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') send();
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 10. ERSTHEITS-LABOR
  // ═══════════════════════════════════════════════════════════
  function initErstheitLabor() {
    var btn = document.getElementById('el-btn');
    var input = document.getElementById('el-these');
    var modus = document.getElementById('el-modus');
    var output = document.getElementById('el-output');
    if (!btn || !input || !output) return;

    btn.addEventListener('click', function () {
      var these = input.value.trim();
      if (!these) { input.focus(); return; }

      var modusVal = modus ? modus.value : 'paradox';
      btn.disabled = true;
      showLoading(output);

      postJSON('/api/erstheit-labor', { these: these, modus: modusVal })
        .then(function (data) {
          if (data.error) { showError(output, data.error); return; }

          var html = '<h3 class="werkstatt-result-title">' + _t('ws.erstheitTitle') + '</h3>';

          if (data.aufgabe) {
            html += '<div class="werkstatt-card">' +
              '<div class="werkstatt-card-label">' + _t('ws.erstheitAufgabe') + '</div>' +
              '<p>' + escapeHtml(data.aufgabe) + '</p></div>';
          }
          if (data.irritation) {
            html += '<div class="werkstatt-card">' +
              '<div class="werkstatt-card-label">' + _t('ws.erstheitIrritation') + '</div>' +
              '<p>' + escapeHtml(data.irritation) + '</p></div>';
          }
          if (data.frage) {
            html += '<div class="werkstatt-card">' +
              '<div class="werkstatt-card-label">' + _t('ws.erstheitFrage') + '</div>' +
              '<p>' + escapeHtml(data.frage) + '</p></div>';
          }
          if (data.raw) {
            html += '<p>' + escapeHtml(data.raw) + '</p>';
          }

          output.innerHTML = html;

          if (window.AtelierScore && window.AtelierScore.track) {
            window.AtelierScore.track('erstheit');
          }
        })
        .catch(function () { showError(output, _t('ws.connectionError')); })
        .finally(function () { btn.disabled = false; });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════
  window.addEventListener('DOMContentLoaded', function () {
    initWiderspruch();
    initDenkprobe();
    initUrteil();
    initWicked();
    initStresstest();
    initTranslate();
    initPerspektive();
    initGegenrede();
    initArgumentkarte();
    initErstheitLabor();
    initStille();
  });
}());
