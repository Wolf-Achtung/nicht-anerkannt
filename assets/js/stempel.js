/**
 * stempel.js — Stempel (Stamp) Generator for Das Atelier der Radikalen Mitte
 * Generates two SVG stamps with user name/location.
 */
(function () {
  'use strict';

  function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function buildSVG(variant, name, ort) {
    var w = 420;
    var h = 220;
    var cx = w / 2;
    var cy = h / 2;

    var nameText = name ? escapeXml(name) : '';
    var ortText = ort ? escapeXml(ort) : '';
    var subLine = nameText;
    if (ortText) {
      subLine += (nameText ? ' — ' : '') + ortText;
    }

    var config = {
      titleLine1: 'STAATLICH NICHT',
      titleLine2: 'ANERKANNT',
      angle: -3,
      spacing: 3
    };

    if (variant === 'extrem-mittig') {
      config.titleLine1 = 'EXTREM MITTIG';
      config.titleLine2 = '';
      config.angle = -6;
      config.spacing = 4;
    }

    var ariaLabel = 'Stempel: ' + config.titleLine1 + (config.titleLine2 ? ' ' + config.titleLine2 : '') +
      (nameText ? ' — ' + nameText : '') + (ortText ? ', ' + ortText : '');

    var svg = '';
    svg += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + ariaLabel + '">';
    svg += '<title>' + ariaLabel + '</title>';
    svg += '<g transform="rotate(' + config.angle + ', ' + cx + ', ' + cy + ')">';

    svg += '<rect x="20" y="28" width="' + (w - 40) + '" height="' + (h - 56) + '" fill="none" stroke="#be1e1e" stroke-width="4" />';

    if (variant === 'extrem-mittig') {
      svg += '<text x="' + cx + '" y="' + (cy + 8) + '" text-anchor="middle" ';
      svg += 'font-family="Arial, Helvetica, sans-serif" font-size="50" font-weight="800" ';
      svg += 'fill="#be1e1e" letter-spacing="' + config.spacing + '">';
      svg += config.titleLine1;
      svg += '</text>';
    } else {
      svg += '<rect x="28" y="36" width="' + (w - 56) + '" height="' + (h - 72) + '" fill="none" stroke="#be1e1e" stroke-width="1.6" />';

      svg += '<text x="' + cx + '" y="' + (cy - 16) + '" text-anchor="middle" ';
      svg += 'font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="800" ';
      svg += 'fill="#be1e1e" letter-spacing="' + config.spacing + '">';
      svg += config.titleLine1;
      svg += '</text>';

      svg += '<text x="' + cx + '" y="' + (cy + 24) + '" text-anchor="middle" ';
      svg += 'font-family="Arial, Helvetica, sans-serif" font-size="32" font-weight="800" ';
      svg += 'fill="#be1e1e" letter-spacing="' + config.spacing + '">';
      svg += config.titleLine2;
      svg += '</text>';

      svg += '<line x1="74" y1="' + (cy + 44) + '" x2="' + (w - 74) + '" y2="' + (cy + 44) + '" stroke="#be1e1e" stroke-width="1" />';
    }

    if (subLine) {
      var y = variant === 'extrem-mittig' ? h - 30 : cy + 66;
      var fontSize = subLine.length > 30 ? 12 : 15;
      svg += '<text x="' + cx + '" y="' + y + '" text-anchor="middle" ';
      svg += 'font-family="Arial, Helvetica, sans-serif" font-size="' + fontSize + '" ';
      svg += 'fill="#111111" letter-spacing="1">';
      svg += subLine;
      svg += '</text>';
    }

    svg += '</g>';
    svg += '</svg>';

    return svg;
  }

  function downloadPNG(previewEl, fileBase) {
    var svgEl = previewEl.querySelector('svg');
    if (!svgEl) return;

    var svgData = new XMLSerializer().serializeToString(svgEl);
    var canvas = document.createElement('canvas');
    var scale = 3;
    canvas.width = 420 * scale;
    canvas.height = 220 * scale;
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
      link.download = fileBase + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  }

  function copyShareText(variant, name, ort, buttonEl) {
    var headline = variant === 'extrem-mittig' ? 'EXTREM MITTIG' : 'STAATLICH NICHT ANERKANNT';
    var text = headline;

    if (name) text += ' — ' + name;
    if (ort) text += ', ' + ort;
    text += '\n\nStaatlich NICHT anerkannt. Politisch NICHT vereinnahmbar.';
    text += '\nDas Atelier der Radikalen Mitte\nNicht mehr Stoff. Mehr Urteil.';

    function acknowledge() {
      buttonEl.textContent = 'Kopiert!';
      setTimeout(function () { buttonEl.textContent = 'Teilen'; }, 1800);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(acknowledge);
      return;
    }

    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    acknowledge();
  }

  function initGenerator(root) {
    var variant = root.getAttribute('data-variant') || 'staatlich';
    var nameInput = root.querySelector('[data-stempel-name]');
    var ortInput = root.querySelector('[data-stempel-ort]');
    var preview = root.querySelector('[data-stempel-preview]');
    var downloadBtn = root.querySelector('[data-stempel-download]');
    var shareBtn = root.querySelector('[data-stempel-share]');

    if (!preview) return;

    function updatePreview() {
      var name = nameInput ? nameInput.value.trim() : '';
      var ort = ortInput ? ortInput.value.trim() : '';
      preview.innerHTML = buildSVG(variant, name, ort);
    }

    updatePreview();

    if (nameInput) nameInput.addEventListener('input', updatePreview);
    if (ortInput) ortInput.addEventListener('input', updatePreview);

    if (downloadBtn) {
      downloadBtn.addEventListener('click', function () {
        downloadPNG(preview, variant === 'extrem-mittig' ? 'stempel-extrem-mittig' : 'stempel-nicht-anerkannt');
      });
    }

    if (shareBtn) {
      shareBtn.addEventListener('click', function () {
        copyShareText(
          variant,
          nameInput ? nameInput.value.trim() : '',
          ortInput ? ortInput.value.trim() : '',
          shareBtn
        );
      });
    }
  }

  function init() {
    var generators = document.querySelectorAll('.stempel-generator');
    if (!generators.length) return;
    generators.forEach(initGenerator);
  }

  window.AtelierStempel = { init: init };
}());
