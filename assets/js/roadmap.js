/**
 * roadmap.js — Interactive Timeline for Das Atelier der Radikalen Mitte
 * Fetches roadmap-events.json and renders an expandable vertical timeline.
 */
(function () {
  'use strict';

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function statusClass(status) {
    if (status === 'completed') return 'roadmap-item--completed';
    if (status === 'active') return 'roadmap-item--active';
    return 'roadmap-item--upcoming';
  }

  function statusLabel(status) {
    if (status === 'completed') return 'Abgeschlossen';
    if (status === 'active') return 'In Arbeit';
    return 'Geplant';
  }

  function buildTimeline(container, data) {
    container.innerHTML = '';
    var milestones = data.milestones || [];

    milestones.forEach(function (m) {
      var item = document.createElement('div');
      item.className = 'roadmap-item ' + statusClass(m.status);

      var dot = document.createElement('div');
      dot.className = 'roadmap-dot';

      var content = document.createElement('div');
      content.className = 'roadmap-content';

      var dateEl = document.createElement('span');
      dateEl.className = 'roadmap-date';
      dateEl.textContent = m.date;

      var title = document.createElement('h3');
      title.className = 'roadmap-title';
      title.textContent = m.title;

      var badge = document.createElement('span');
      badge.className = 'roadmap-badge';
      badge.textContent = statusLabel(m.status);

      var desc = document.createElement('p');
      desc.className = 'roadmap-desc';
      desc.textContent = m.description;
      desc.style.display = 'none';

      content.appendChild(dateEl);
      content.appendChild(title);
      content.appendChild(badge);
      content.appendChild(desc);

      item.appendChild(dot);
      item.appendChild(content);

      // Toggle description on click
      item.style.cursor = 'pointer';
      item.addEventListener('click', function () {
        var isOpen = desc.style.display !== 'none';
        desc.style.display = isOpen ? 'none' : 'block';
      });

      container.appendChild(item);
    });
  }

  function init() {
    var container = document.getElementById('roadmap-container');
    if (!container) return;

    var base = document.querySelector('script[src*="roadmap"]');
    var prefix = base ? base.src.replace(/assets\/js\/roadmap\.js.*$/, '') : '';

    fetch(prefix + 'data/roadmap-events.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load roadmap');
        return res.json();
      })
      .then(function (data) {
        buildTimeline(container, data);
      })
      .catch(function (err) {
        container.innerHTML = '<p style="color:#be1e1e;">Roadmap konnte nicht geladen werden.</p>';
        console.error('[AtelierRoadmap]', err);
      });
  }

  window.AtelierRoadmap = {
    init: init
  };
}());
