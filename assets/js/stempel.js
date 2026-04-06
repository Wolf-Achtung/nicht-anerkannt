/**
 * stempel.js — Stempel (Stamp) Generator for Das Atelier der Radikalen Mitte
 * Generates a "STAATLICH NICHT ANERKANNT" SVG stamp with user name/location.
 */
(function () {
  'use strict';

  var nameInput, ortInput, previewEl, downloadBtn, shareBtn;

  function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function buildSVG(name, ort) {
    var w = 380;
    var h = 200;
    var cx = w / 2;
    var cy = h / 2;

    var nameText = name ? escapeXml(name) : '';
    var ortText = ort ? escapeXml(ort) : '';

    var subLine = nameText;
    if (ortText) {
      subLine += (nameText ? ' — ' : '') + ortText;
    }

    var ariaLabel = 'Stempel: STAATLICH NICHT ANERKANNT' + (nameText ? ' — ' + nameText : '') + (ortText ? ', ' + ortText : '');
    var svg = '';
    svg += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + ariaLabel + '">';
    svg += '<title>' + ariaLabel + '</title>';
    svg += '<g transform="rotate(-3, ' + cx + ', ' + cy + ')">';

    // Outer border
    svg += '<rect x="10" y="10" width="' + (w - 20) + '" height="' + (h - 20) + '" ';
    svg += 'rx="6" ry="6" fill="none" stroke="#be1e1e" stroke-width="4" />';

    // Inner border
    svg += '<rect x="18" y="18" width="' + (w - 36) + '" height="' + (h - 36) + '" ';
    svg += 'rx="4" ry="4" fill="none" stroke="#be1e1e" stroke-width="1.5" />';

    // Main text
    svg += '<text x="' + cx + '" y="' + (cy - 12) + '" text-anchor="middle" ';
    svg += 'font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" ';
    svg += 'fill="#be1e1e" letter-spacing="3">';
    svg += 'STAATLICH NICHT';
    svg += '</text>';

    svg += '<text x="' + cx + '" y="' + (cy + 22) + '" text-anchor="middle" ';
    svg += 'font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="800" ';
    svg += 'fill="#be1e1e" letter-spacing="3">';
    svg += 'ANERKANNT';
    svg += '</text>';

    // Divider line
    svg += '<line x1="60" y1="' + (cy + 36) + '" x2="' + (w - 60) + '" y2="' + (cy + 36) + '" ';
    svg += 'stroke="#be1e1e" stroke-width="1" />';

    // Sub-line: name and location
    if (subLine) {
      var fontSize = subLine.length > 30 ? 13 : 16;
      svg += '<text x="' + cx + '" y="' + (cy + 56) + '" text-anchor="middle" ';
      svg += 'font-family="Arial, Helvetica, sans-serif" font-size="' + fontSize + '" ';
      svg += 'fill="#111111" letter-spacing="1" text-transform="uppercase">';
      svg += subLine;
      svg += '</text>';
    }

    svg += '</g>';
    svg += '</svg>';

    return svg;
  }

  function updatePreview() {
    if (!previewEl) return;
    var name = nameInput ? nameInput.value.trim() : '';
    var ort = ortInput ? ortInput.value.trim() : '';
    previewEl.innerHTML = buildSVG(name, ort);
  }

  function downloadPNG() {
    var svgEl = previewEl.querySelector('svg');
    if (!svgEl) return;

    var svgData = new XMLSerializer().serializeToString(svgEl);
    var canvas = document.createElement('canvas');
    var scale = 3; // High-res
    canvas.width = 380 * scale;
    canvas.height = 200 * scale;
    var ctx = canvas.getContext('2d');

    var img = new Image();
    var blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    var url = URL.createObjectURL(blob);

    img.onload = function () {
      ctx.fillStyle = '#fffaf1';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      var link = document.createElement('a');
      link.download = 'stempel-nicht-anerkannt.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  }

  function shareStempel() {
    var name = nameInput ? nameInput.value.trim() : '';
    var ort = ortInput ? ortInput.value.trim() : '';

    var text = 'STAATLICH NICHT ANERKANNT';
    if (name) text += ' — ' + name;
    if (ort) text += ', ' + ort;
    text += '\n\nDas Atelier der Radikalen Mitte\nNicht mehr Stoff. Mehr Urteil.';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        shareBtn.textContent = 'Kopiert!';
        setTimeout(function () {
          shareBtn.textContent = 'Teilen';
        }, 2000);
      });
    } else {
      // Fallback
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      shareBtn.textContent = 'Kopiert!';
      setTimeout(function () {
        shareBtn.textContent = 'Teilen';
      }, 2000);
    }
  }

  function init() {
    nameInput = document.getElementById('stempel-name');
    ortInput = document.getElementById('stempel-ort');
    previewEl = document.getElementById('stempel-preview');
    downloadBtn = document.getElementById('stempel-download');
    shareBtn = document.getElementById('stempel-share');

    if (!previewEl) return;

    updatePreview();

    if (nameInput) {
      nameInput.addEventListener('input', updatePreview);
    }
    if (ortInput) {
      ortInput.addEventListener('input', updatePreview);
    }
    if (downloadBtn) {
      downloadBtn.addEventListener('click', downloadPNG);
    }
    if (shareBtn) {
      shareBtn.addEventListener('click', shareStempel);
    }
  }

  window.AtelierStempel = {
    init: init
  };
}());
