/**
 * score.js — Atelier-Score: Denkprofil mit 5 Dimensionen
 * Tracks thinking activity across all tools via localStorage.
 *
 * Dimensions:
 * 1. Widerspruchstoleranz (tolerance of contradiction)
 * 2. Perspektivbreite (breadth of perspective)
 * 3. Urteilstiefe (depth of judgement)
 * 4. Handlungsbereitschaft (readiness to act)
 * 5. Komplexitätstoleranz (tolerance of complexity)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'atelier-score';

  // Which tools contribute to which dimensions (0-4 index)
  var TOOL_MAP = {
    // Widerspruchstoleranz: widerspruch, gegenrede, stresstest
    // Perspektivbreite: perspektive, translate, argumentkarte
    // Urteilstiefe: urteil, daily, stille
    // Handlungsbereitschaft: wicked, daily
    // Komplexitätstoleranz: denkprobe, wicked, argumentkarte
    widerspruch:   [1, 0, 0, 0, 0],
    gegenrede:     [1, 0.5, 0, 0, 0.5],
    stresstest:    [0.5, 0, 1, 0, 0],
    perspektive:   [0.5, 1, 0, 0, 0.5],
    translate:     [0, 1, 0, 0, 0],
    argumentkarte: [0.5, 0.5, 0.5, 0, 1],
    urteil:        [0, 0, 1, 0.5, 0],
    daily:         [0, 0, 0.5, 1, 0],
    stille:        [0, 0, 1, 0, 0.5],
    denkprobe:     [0, 0, 0.5, 0, 1],
    wicked:        [0, 0.5, 0, 1, 1],
    quiz:          [0.5, 0.5, 0, 0, 0],
    chat:          [0.5, 0, 0.5, 0, 0]
  };

  var DIMENSION_NAMES = [
    'Widerspruchstoleranz',
    'Perspektivbreite',
    'Urteilstiefe',
    'Handlungsbereitschaft',
    'Komplexitätstoleranz'
  ];

  var DIMENSION_LABELS = [
    'Wie gut du Widersprüche aushältst',
    'Wie viele Perspektiven du einnimmst',
    'Wie tief du Urteile durchdenkst',
    'Wie bereit du bist, zu handeln',
    'Wie viel Komplexität du verarbeitest'
  ];

  function getScore() {
    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored && stored.dimensions) return stored;
    } catch (e) {}
    return {
      dimensions: [0, 0, 0, 0, 0],
      total: 0,
      activities: []
    };
  }

  function saveScore(score) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(score)); } catch (e) {}
  }

  function track(toolName) {
    var mapping = TOOL_MAP[toolName];
    if (!mapping) return;

    var score = getScore();
    for (var i = 0; i < 5; i++) {
      score.dimensions[i] += mapping[i];
    }
    score.total += 1;
    score.activities.push({ tool: toolName, time: Date.now() });

    // Cap activities history at 200
    if (score.activities.length > 200) {
      score.activities = score.activities.slice(-200);
    }

    saveScore(score);
    renderWidget();
  }

  function renderWidget() {
    var widget = document.getElementById('atelier-score-widget');
    if (!widget) return;

    var score = getScore();
    if (score.total === 0) {
      widget.innerHTML = '<div class="score-empty">' +
        '<p class="score-empty-text">Nutze die Werkzeuge des Ateliers, um dein Denkprofil aufzubauen.</p></div>';
      return;
    }

    // Normalize dimensions to 0-100 scale (soft cap at 20 uses per dimension)
    var maxVal = 0;
    for (var i = 0; i < 5; i++) {
      if (score.dimensions[i] > maxVal) maxVal = score.dimensions[i];
    }
    var scale = maxVal > 0 ? Math.min(maxVal, 20) : 1;

    var html = '<div class="score-profile">';
    html += '<div class="score-header">';
    html += '<span class="score-total">' + score.total + ' Denkaktionen</span>';
    html += '</div>';
    html += '<div class="score-bars">';

    for (var d = 0; d < 5; d++) {
      var pct = Math.min(Math.round((score.dimensions[d] / scale) * 100), 100);
      html += '<div class="score-bar-row">';
      html += '<div class="score-bar-label" title="' + escapeHtml(DIMENSION_LABELS[d]) + '">' +
        escapeHtml(DIMENSION_NAMES[d]) + '</div>';
      html += '<div class="score-bar-track">';
      html += '<div class="score-bar-fill" style="width:' + pct + '%"></div>';
      html += '</div>';
      html += '<span class="score-bar-value">' + Math.round(score.dimensions[d] * 10) / 10 + '</span>';
      html += '</div>';
    }

    html += '</div>';

    // Dominant dimension
    var maxDim = 0;
    var maxDimVal = score.dimensions[0];
    for (var j = 1; j < 5; j++) {
      if (score.dimensions[j] > maxDimVal) {
        maxDim = j;
        maxDimVal = score.dimensions[j];
      }
    }
    html += '<div class="score-insight">Deine Stärke: <strong>' + escapeHtml(DIMENSION_NAMES[maxDim]) + '</strong></div>';
    html += '</div>';

    widget.innerHTML = html;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Public API
  window.AtelierScore = {
    track: track,
    getScore: getScore,
    render: renderWidget
  };

  window.addEventListener('DOMContentLoaded', renderWidget);
}());
