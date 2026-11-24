const fs = require('fs');
const path = require('path');
const https = require('https');
const opentype = require('opentype.js');

const optionsDir = path.resolve('public/brand/options');
if (!fs.existsSync(optionsDir)) {
  fs.mkdirSync(optionsDir, { recursive: true });
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      const bufs = [];
      res.on('data', d => bufs.push(d));
      res.on('end', () => resolve(Buffer.concat(bufs)));
    }).on('error', reject);
  });
}

function getWordPath(font, text, fontSize, startX, baselineY) {
  let x = startX;
  const p = new opentype.Path();
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    const gp = glyph.getPath(x, baselineY, fontSize);
    p.commands.push(...gp.commands);
    x += (glyph.advanceWidth || 1000) * (fontSize / font.unitsPerEm);
  }
  return { path: p, width: x - startX, pathData: p.toPathData(2) };
}

async function main() {
  console.log('Fetching Google Fonts for wordmark outlines...');
  const outfitBuf = await download('https://fonts.gstatic.com/s/outfit/v15/QGYyz_MVcBeNP4NjuGObqx1XmO1I4deyC4E.ttf');
  const notoBuf = await download('https://fonts.gstatic.com/s/notosansdevanagari/v33/TuGoUUFzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_SNmI0b8QQCQmHn6B2OHjbL_08Alaoiy-A.ttf');

  const outfitFont = opentype.parse(outfitBuf.buffer.slice(outfitBuf.byteOffset, outfitBuf.byteOffset + outfitBuf.byteLength));
  const notoFont = opentype.parse(notoBuf.buffer.slice(notoBuf.byteOffset, notoBuf.byteOffset + notoBuf.byteLength));

  // Wordmark: "Aasan" (Outfit Bold, fontSize 40, baseline 45) + "आसन" (Noto Sans SemiBold, fontSize 22, baseline 45)
  const aasanOut = getWordPath(outfitFont, 'Aasan', 40, 84, 46);
  const devOut = getWordPath(notoFont, 'आसन', 22, 84 + aasanOut.width + 12, 45);

  console.log('Aasan text width:', aasanOut.width, 'Devanagari width:', devOut.width);

  // ---------------------------------------------------------------------------
  // SYMBOLS (100x100 viewBox)
  // ---------------------------------------------------------------------------

  // Option A: Perspective Seat
  // Front-facing seat with a viewpoint line and focal dot
  const symbols = {
    a: {
      name: 'Option A — The Perspective Seat',
      concept: 'Front-facing seat with a viewpoint line and dot',
      // Dark mode: crimson + white
      dark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <!-- Seat Backrest -->
  <rect x="25" y="38" width="50" height="34" rx="8" fill="#dc143c"/>
  <!-- Armrests -->
  <rect x="18" y="50" width="6" height="24" rx="3" fill="#ffffff" fill-opacity="0.9"/>
  <rect x="76" y="50" width="6" height="24" rx="3" fill="#ffffff" fill-opacity="0.9"/>
  <!-- Seat Cushion Base -->
  <rect x="20" y="74" width="60" height="8" rx="4" fill="#ffffff"/>
  <!-- Sightline Ray -->
  <line x1="50" y1="36" x2="50" y2="23" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="1 5"/>
  <!-- Vantage Viewpoint Dot -->
  <circle cx="50" cy="16" r="7" fill="#dc143c"/>
  <circle cx="50" cy="16" r="3" fill="#ffffff"/>
</svg>`,
      // Light mode: crimson + near-black (#0a0b10)
      light: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <!-- Seat Backrest -->
  <rect x="25" y="38" width="50" height="34" rx="8" fill="#dc143c"/>
  <!-- Armrests -->
  <rect x="18" y="50" width="6" height="24" rx="3" fill="#0a0b10" fill-opacity="0.85"/>
  <rect x="76" y="50" width="6" height="24" rx="3" fill="#0a0b10" fill-opacity="0.85"/>
  <!-- Seat Cushion Base -->
  <rect x="20" y="74" width="60" height="8" rx="4" fill="#0a0b10"/>
  <!-- Sightline Ray -->
  <line x1="50" y1="36" x2="50" y2="23" stroke="#0a0b10" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="1 5"/>
  <!-- Vantage Viewpoint Dot -->
  <circle cx="50" cy="16" r="7" fill="#dc143c"/>
  <circle cx="50" cy="16" r="3" fill="#ffffff"/>
</svg>`,
      // Mono mode: solid crimson #dc143c
      mono: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect x="25" y="38" width="50" height="34" rx="8" fill="#dc143c"/>
  <rect x="18" y="50" width="6" height="24" rx="3" fill="#dc143c"/>
  <rect x="76" y="50" width="6" height="24" rx="3" fill="#dc143c"/>
  <rect x="20" y="74" width="60" height="8" rx="4" fill="#dc143c"/>
  <line x1="50" y1="36" x2="50" y2="23" stroke="#dc143c" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="50" cy="16" r="7" fill="#dc143c"/>
</svg>`
    },

    // Option B: Sightline Seat
    // Eye inside a seat outline
    b: {
      name: 'Option B — The Sightline Seat',
      concept: 'An eye inside a stadium seat outline',
      dark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <!-- Seat Outer Shell -->
  <path d="M 22 34 C 22 22 32 18 50 18 C 68 18 78 22 78 34 L 78 68 C 78 76 72 82 64 82 L 36 82 C 28 82 22 76 22 68 Z" fill="#dc143c"/>
  <!-- Eye Opening in Backrest (White Negative/Cutout) -->
  <path d="M 30 48 C 38 34 62 34 70 48 C 62 62 38 62 30 48 Z" fill="#0a0b10" stroke="#ffffff" stroke-width="4" stroke-linejoin="round"/>
  <!-- Iris / Pupil Dot (Crimson) -->
  <circle cx="50" cy="48" r="6.5" fill="#dc143c"/>
  <circle cx="52" cy="46" r="2" fill="#ffffff"/>
  <!-- Base Seat Lip Line -->
  <rect x="30" y="72" width="40" height="4" rx="2" fill="#ffffff" fill-opacity="0.9"/>
</svg>`,
      light: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <!-- Seat Outer Shell -->
  <path d="M 22 34 C 22 22 32 18 50 18 C 68 18 78 22 78 34 L 78 68 C 78 76 72 82 64 82 L 36 82 C 28 82 22 76 22 68 Z" fill="#dc143c"/>
  <!-- Eye Opening in Backrest -->
  <path d="M 30 48 C 38 34 62 34 70 48 C 62 62 38 62 30 48 Z" fill="#ffffff" stroke="#0a0b10" stroke-width="4" stroke-linejoin="round"/>
  <!-- Iris / Pupil Dot -->
  <circle cx="50" cy="48" r="6.5" fill="#dc143c"/>
  <circle cx="52" cy="46" r="2" fill="#ffffff"/>
  <!-- Base Seat Lip Line -->
  <rect x="30" y="72" width="40" height="4" rx="2" fill="#0a0b10"/>
</svg>`,
      mono: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <!-- Seat Outer Shell -->
  <path d="M 22 34 C 22 22 32 18 50 18 C 68 18 78 22 78 34 L 78 68 C 78 76 72 82 64 82 L 36 82 C 28 82 22 76 22 68 Z" fill="#dc143c"/>
  <!-- Eye Cutout -->
  <path d="M 30 48 C 38 34 62 34 70 48 C 62 62 38 62 30 48 Z" fill="#ffffff"/>
  <!-- Pupil -->
  <circle cx="50" cy="48" r="6.5" fill="#dc143c"/>
  <rect x="30" y="72" width="40" height="4" rx="2" fill="#ffffff"/>
</svg>`
    },

    // Option C: Stadium Arc + You-Are-Here Dot
    // Concentric stadium bowl tiers with an active vantage dot
    c: {
      name: 'Option C — The Stadium Vantage',
      concept: 'A stadium arc with a "you are here" dot',
      dark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <!-- Central Pitch / Focal Anchor -->
  <rect x="42" y="16" width="16" height="8" rx="4" fill="#ffffff" fill-opacity="0.8"/>
  <!-- Tier 1 Arc (Inner) -->
  <path d="M 30 42 A 26 26 0 0 0 70 42" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
  <!-- Tier 2 Arc (Middle) -->
  <path d="M 20 58 A 38 38 0 0 0 80 58" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
  <!-- Tier 3 Arc (Outer Grandstand) -->
  <path d="M 14 74 A 50 50 0 0 0 86 74" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
  <!-- Active "You Are Here" Seat Node with Radar Glow -->
  <circle cx="68" cy="46" r="9" fill="#dc143c"/>
  <circle cx="68" cy="46" r="4" fill="#ffffff"/>
  <!-- Sightline Vector from Seat to Pitch -->
  <line x1="68" y1="46" x2="52" y2="24" stroke="#dc143c" stroke-width="2.5" stroke-dasharray="2 3"/>
</svg>`,
      light: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <!-- Central Pitch -->
  <rect x="42" y="16" width="16" height="8" rx="4" fill="#0a0b10" fill-opacity="0.8"/>
  <!-- Tier 1 Arc -->
  <path d="M 30 42 A 26 26 0 0 0 70 42" stroke="#0a0b10" stroke-width="5" stroke-linecap="round"/>
  <!-- Tier 2 Arc -->
  <path d="M 20 58 A 38 38 0 0 0 80 58" stroke="#0a0b10" stroke-width="6" stroke-linecap="round"/>
  <!-- Tier 3 Arc -->
  <path d="M 14 74 A 50 50 0 0 0 86 74" stroke="#0a0b10" stroke-width="7" stroke-linecap="round"/>
  <!-- Active Seat Node -->
  <circle cx="68" cy="46" r="9" fill="#dc143c"/>
  <circle cx="68" cy="46" r="4" fill="#ffffff"/>
  <!-- Sightline Vector -->
  <line x1="68" y1="46" x2="52" y2="24" stroke="#dc143c" stroke-width="2.5" stroke-dasharray="2 3"/>
</svg>`,
      mono: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect x="42" y="16" width="16" height="8" rx="4" fill="#dc143c"/>
  <path d="M 30 42 A 26 26 0 0 0 70 42" stroke="#dc143c" stroke-width="5" stroke-linecap="round"/>
  <path d="M 20 58 A 38 38 0 0 0 80 58" stroke="#dc143c" stroke-width="6" stroke-linecap="round"/>
  <path d="M 14 74 A 50 50 0 0 0 86 74" stroke="#dc143c" stroke-width="7" stroke-linecap="round"/>
  <circle cx="68" cy="46" r="9" fill="#dc143c"/>
  <circle cx="68" cy="46" r="4" fill="#ffffff"/>
  <line x1="68" y1="46" x2="52" y2="24" stroke="#dc143c" stroke-width="2.5"/>
</svg>`
    },

    // Option D: Geometric Devanagari "आ" Hinting at a Seat
    // Custom-drawn geometric strokes where the letter "आ" also forms a chair profile
    d: {
      name: 'Option D — The Devanagari Seat (आ)',
      concept: 'Custom geometric "आ" built from strokes shaped like a seat',
      dark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <!-- Top Shirorekha Bar -->
  <rect x="18" y="18" width="64" height="7" rx="3.5" fill="#ffffff"/>
  <!-- Left Numeral '3' Curved Strokes (forming the chair back curve) -->
  <path d="M 24 28 C 38 28 44 34 44 42 C 44 48 38 52 32 52" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
  <path d="M 32 52 C 42 52 46 58 46 66 C 46 75 36 82 22 82" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/>
  <!-- Horizontal Seat Connector (Connecting bar that forms the seat cushion) -->
  <rect x="34" y="48.5" width="28" height="7" rx="3.5" fill="#dc143c"/>
  <!-- First Vertical Stem (Chair Backrest & Spine) -->
  <rect x="56" y="18" width="7" height="64" rx="3.5" fill="#ffffff"/>
  <!-- Second Vertical Stem ('aa' matra, forming the parallel stadium chair frame) -->
  <rect x="73" y="18" width="7" height="64" rx="3.5" fill="#dc143c"/>
  <!-- Small Seat Dot Highlight -->
  <circle cx="48" cy="38" r="3.5" fill="#dc143c"/>
</svg>`,
      light: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <!-- Top Shirorekha Bar -->
  <rect x="18" y="18" width="64" height="7" rx="3.5" fill="#0a0b10"/>
  <!-- Left Numeral '3' Curved Strokes -->
  <path d="M 24 28 C 38 28 44 34 44 42 C 44 48 38 52 32 52" stroke="#0a0b10" stroke-width="7" stroke-linecap="round"/>
  <path d="M 32 52 C 42 52 46 58 46 66 C 46 75 36 82 22 82" stroke="#0a0b10" stroke-width="7" stroke-linecap="round"/>
  <!-- Horizontal Seat Connector -->
  <rect x="34" y="48.5" width="28" height="7" rx="3.5" fill="#dc143c"/>
  <!-- First Vertical Stem -->
  <rect x="56" y="18" width="7" height="64" rx="3.5" fill="#0a0b10"/>
  <!-- Second Vertical Stem -->
  <rect x="73" y="18" width="7" height="64" rx="3.5" fill="#dc143c"/>
  <!-- Seat Dot Highlight -->
  <circle cx="48" cy="38" r="3.5" fill="#dc143c"/>
</svg>`,
      mono: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
  <rect x="18" y="18" width="64" height="7" rx="3.5" fill="#dc143c"/>
  <path d="M 24 28 C 38 28 44 34 44 42 C 44 48 38 52 32 52" stroke="#dc143c" stroke-width="7" stroke-linecap="round"/>
  <path d="M 32 52 C 42 52 46 58 46 66 C 46 75 36 82 22 82" stroke="#dc143c" stroke-width="7" stroke-linecap="round"/>
  <rect x="34" y="48.5" width="28" height="7" rx="3.5" fill="#dc143c"/>
  <rect x="56" y="18" width="7" height="64" rx="3.5" fill="#dc143c"/>
  <rect x="73" y="18" width="7" height="64" rx="3.5" fill="#dc143c"/>
</svg>`
    }
  };

  // Helper to build horizontal lockups (viewBox 0 0 300 72)
  // Left: 56x56 symbol at (8, 8). Right: Outlined Wordmark "Aasan" + "आसन"
  function buildLockup(symbolSvgInner, theme) {
    const textColor = theme === 'dark' ? '#ffffff' : (theme === 'light' ? '#0a0b10' : '#dc143c');
    const devanagariColor = theme === 'dark' ? '#dc143c' : (theme === 'light' ? '#dc143c' : '#dc143c');
    const subtextColor = theme === 'dark' ? '#94a3b8' : (theme === 'light' ? '#64748b' : '#dc143c');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 72" fill="none">
  <!-- Symbol scaled to 56x56 at x=8, y=8 -->
  <g transform="translate(8, 8) scale(0.56)">
    ${symbolSvgInner}
  </g>

  <!-- Outlined "Aasan" Wordmark (Outfit Bold) -->
  <path d="${aasanOut.pathData}" fill="${textColor}"/>

  <!-- Outlined "आसन" Subtitle (Noto Sans Devanagari) -->
  <path d="${devOut.pathData}" fill="${devanagariColor}"/>
</svg>`;
  }

  // Extract inner SVG content (strip outer <svg> and </svg>)
  function extractInner(svgStr) {
    return svgStr.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  }

  // Generate and save all 24 SVG files
  for (const [key, data] of Object.entries(symbols)) {
    // 1. Symbol Dark
    fs.writeFileSync(path.join(optionsDir, `option-${key}-symbol.svg`), data.dark.trim());
    // 2. Symbol Light
    fs.writeFileSync(path.join(optionsDir, `option-${key}-symbol-light.svg`), data.light.trim());
    // 3. Symbol Mono
    fs.writeFileSync(path.join(optionsDir, `option-${key}-symbol-mono.svg`), data.mono.trim());

    // 4. Lockup Dark
    const lockupDark = buildLockup(extractInner(data.dark), 'dark');
    fs.writeFileSync(path.join(optionsDir, `option-${key}-lockup-dark.svg`), lockupDark.trim());

    // 5. Lockup Light
    const lockupLight = buildLockup(extractInner(data.light), 'light');
    fs.writeFileSync(path.join(optionsDir, `option-${key}-lockup-light.svg`), lockupLight.trim());

    // 6. Lockup Mono
    const lockupMono = buildLockup(extractInner(data.mono), 'mono');
    fs.writeFileSync(path.join(optionsDir, `option-${key}-lockup-mono.svg`), lockupMono.trim());

    console.log(`Generated all SVGs for Option ${key.toUpperCase()}`);
  }

  // Generate HTML Preview Page (/public/brand-preview.html)
  console.log('Generating /public/brand-preview.html...');
  const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aasan (आसन) — Brand Identity & Logo Options</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&family=Noto+Sans+Devanagari:wght@600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0a0b10;
      --card-dark: #12141c;
      --border-dark: rgba(255, 255, 255, 0.1);
      --crimson: #dc143c;
      --text-white: #f1f5f9;
      --text-muted: #94a3b8;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-dark);
      color: var(--text-white);
      font-family: 'Inter', system-ui, sans-serif;
      padding: 40px 24px 80px;
      line-height: 1.5;
    }

    .container {
      max-width: 1240px;
      margin: 0 auto;
    }

    header {
      margin-bottom: 48px;
      padding-bottom: 28px;
      border-bottom: 1px solid var(--border-dark);
    }

    .badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--crimson);
      background: rgba(220, 20, 60, 0.12);
      border: 1px solid rgba(220, 20, 60, 0.3);
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 12px;
    }

    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 36px;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }

    .subtitle {
      color: var(--text-muted);
      font-size: 15px;
      max-width: 720px;
    }

    .options-grid {
      display: flex;
      flex-direction: column;
      gap: 56px;
    }

    .option-card {
      background: var(--card-dark);
      border: 1px solid var(--border-dark);
      border-radius: 16px;
      padding: 32px;
    }

    .option-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      padding-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .option-title {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .option-concept {
      font-size: 13px;
      color: var(--text-muted);
    }

    /* Comparison Row (Lockups on Dark, White, Mono) */
    .section-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 12px;
    }

    .lockup-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .preview-box {
      border-radius: 12px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 120px;
      position: relative;
    }

    .preview-box.dark {
      background: #0a0b10;
      border: 1px solid var(--border-dark);
    }

    .preview-box.light {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      color: #0a0b10;
    }

    .preview-box.mono {
      background: #0a0b10;
      border: 1px solid var(--border-dark);
    }

    .box-tag {
      position: absolute;
      top: 8px;
      left: 10px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.6;
    }

    .preview-box img {
      max-width: 100%;
      height: auto;
    }

    /* Scale Row: 256px, 64px, 16px */
    .scale-row {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 16px;
      margin-bottom: 28px;
    }

    @media (max-width: 768px) {
      .scale-row {
        grid-template-columns: 1fr;
      }
    }

    .scale-box {
      background: #07080c;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .scale-label {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--text-muted);
    }

    .size-256 { width: 140px; height: 140px; }
    .size-64 { width: 64px; height: 64px; }
    .size-16-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.03);
      padding: 10px 16px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .size-16 { width: 16px; height: 16px; }

    /* Analysis: Strengths & Weaknesses */
    .analysis-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 20px;
    }

    @media (max-width: 640px) {
      .analysis-grid {
        grid-template-columns: 1fr;
      }
    }

    .analysis-col h4 {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .analysis-col.strengths h4 { color: #10b981; }
    .analysis-col.weaknesses h4 { color: #f59e0b; }

    .analysis-col ul {
      list-style: none;
      font-size: 13px;
      color: var(--text-muted);
    }

    .analysis-col ul li {
      position: relative;
      padding-left: 16px;
      margin-bottom: 6px;
    }

    .analysis-col.strengths ul li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: bold;
    }

    .analysis-col.weaknesses ul li::before {
      content: "•";
      position: absolute;
      left: 2px;
      color: #f59e0b;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge">Brand Identity Design</div>
      <h1>Aasan (आसन) — Logo Exploration</h1>
      <p class="subtitle">
        Four distinct flat, geometric brand identity options for Nepal’s 3D seat-selection and ticketing product.
        Every symbol is optimized for pixel-clarity at 16 px (favicon), 64 px (app headers), and 256 px. All wordmark text is converted to vector path outlines.
      </p>
    </header>

    <div class="options-grid">
      <!-- OPTION A -->
      <div class="option-card" id="option-a">
        <div class="option-header">
          <div class="option-title">
            <span style="color: var(--crimson);">A.</span> The Perspective Seat
          </div>
          <div class="option-concept">Front-facing seat with a viewpoint line and dot</div>
        </div>

        <div class="section-label">Horizontal Lockup (Dark, Light, Monochrome)</div>
        <div class="lockup-row">
          <div class="preview-box dark">
            <span class="box-tag">Dark (#0a0b10)</span>
            <img src="/brand/options/option-a-lockup-dark.svg" alt="Option A Lockup Dark" style="width: 260px;">
          </div>
          <div class="preview-box light">
            <span class="box-tag">Light (White)</span>
            <img src="/brand/options/option-a-lockup-light.svg" alt="Option A Lockup Light" style="width: 260px;">
          </div>
          <div class="preview-box mono">
            <span class="box-tag">Monochrome (#dc143c)</span>
            <img src="/brand/options/option-a-lockup-mono.svg" alt="Option A Lockup Mono" style="width: 260px;">
          </div>
        </div>

        <div class="section-label">Symbol at Multiple Scales (256px, 64px, 16px Favicon)</div>
        <div class="scale-row">
          <div class="scale-box">
            <div class="size-256">
              <img src="/brand/options/option-a-symbol.svg" alt="Option A 256px" style="width: 100%; height: 100%;">
            </div>
            <span class="scale-label">256 × 256 px Display</span>
          </div>
          <div class="scale-box">
            <div class="size-64">
              <img src="/brand/options/option-a-symbol.svg" alt="Option A 64px" style="width: 100%; height: 100%;">
            </div>
            <span class="scale-label">64 × 64 px Header / App</span>
          </div>
          <div class="scale-box">
            <div class="size-16-wrapper">
              <img src="/brand/options/option-a-symbol.svg" alt="Option A 16px" class="size-16">
              <span class="scale-label">16 × 16 px (Favicon)</span>
            </div>
            <span class="scale-label">Tested at true 16px tab icon</span>
          </div>
        </div>

        <div class="analysis-grid">
          <div class="analysis-col strengths">
            <h4>Strengths</h4>
            <ul>
              <li>Directly communicates "Seat" (आसन) through unmistakable geometric backrest and armrests.</li>
              <li>The radiating viewpoint dot introduces the 3D perspective / sightline concept without clutter.</li>
              <li>Strong symmetrical geometry anchors nicely in square app icons and navbars.</li>
            </ul>
          </div>
          <div class="analysis-col weaknesses">
            <h4>Weaknesses</h4>
            <ul>
              <li>The subtle dotted line fades at 16 px, though the seat silhouette and vantage dot remain bold.</li>
              <li>A direct chair representation is more literal than abstract.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- OPTION B -->
      <div class="option-card" id="option-b">
        <div class="option-header">
          <div class="option-title">
            <span style="color: var(--crimson);">B.</span> The Sightline Seat
          </div>
          <div class="option-concept">An eye aperture inside a stadium seat silhouette</div>
        </div>

        <div class="section-label">Horizontal Lockup (Dark, Light, Monochrome)</div>
        <div class="lockup-row">
          <div class="preview-box dark">
            <span class="box-tag">Dark (#0a0b10)</span>
            <img src="/brand/options/option-b-lockup-dark.svg" alt="Option B Lockup Dark" style="width: 260px;">
          </div>
          <div class="preview-box light">
            <span class="box-tag">Light (White)</span>
            <img src="/brand/options/option-b-lockup-light.svg" alt="Option B Lockup Light" style="width: 260px;">
          </div>
          <div class="preview-box mono">
            <span class="box-tag">Monochrome (#dc143c)</span>
            <img src="/brand/options/option-b-lockup-mono.svg" alt="Option B Lockup Mono" style="width: 260px;">
          </div>
        </div>

        <div class="section-label">Symbol at Multiple Scales (256px, 64px, 16px Favicon)</div>
        <div class="scale-row">
          <div class="scale-box">
            <div class="size-256">
              <img src="/brand/options/option-b-symbol.svg" alt="Option B 256px" style="width: 100%; height: 100%;">
            </div>
            <span class="scale-label">256 × 256 px Display</span>
          </div>
          <div class="scale-box">
            <div class="size-64">
              <img src="/brand/options/option-b-symbol.svg" alt="Option B 64px" style="width: 100%; height: 100%;">
            </div>
            <span class="scale-label">64 × 64 px Header / App</span>
          </div>
          <div class="scale-box">
            <div class="size-16-wrapper">
              <img src="/brand/options/option-b-symbol.svg" alt="Option B 16px" class="size-16">
              <span class="scale-label">16 × 16 px (Favicon)</span>
            </div>
            <span class="scale-label">Tested at true 16px tab icon</span>
          </div>
        </div>

        <div class="analysis-grid">
          <div class="analysis-col strengths">
            <h4>Strengths</h4>
            <ul>
              <li>Clever conceptual synthesis of "Vision / 3D Seat View" + "Physical Seat".</li>
              <li>High negative-space contrast inside the bucket seat reads with high punch at 16 px.</li>
              <li>Modern tech-forward vibe that feels innovative and unique in ticketing.</li>
            </ul>
          </div>
          <div class="analysis-col weaknesses">
            <h4>Weaknesses</h4>
            <ul>
              <li>Needs careful line weighting so the eye motif doesn’t feel surveillance-like.</li>
              <li>Slightly more complex cognitive load than a pure seat icon.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- OPTION C -->
      <div class="option-card" id="option-c">
        <div class="option-header">
          <div class="option-title">
            <span style="color: var(--crimson);">C.</span> The Stadium Vantage
          </div>
          <div class="option-concept">Stadium tiers with a "you are here" seat locator dot</div>
        </div>

        <div class="section-label">Horizontal Lockup (Dark, Light, Monochrome)</div>
        <div class="lockup-row">
          <div class="preview-box dark">
            <span class="box-tag">Dark (#0a0b10)</span>
            <img src="/brand/options/option-c-lockup-dark.svg" alt="Option C Lockup Dark" style="width: 260px;">
          </div>
          <div class="preview-box light">
            <span class="box-tag">Light (White)</span>
            <img src="/brand/options/option-c-lockup-light.svg" alt="Option C Lockup Light" style="width: 260px;">
          </div>
          <div class="preview-box mono">
            <span class="box-tag">Monochrome (#dc143c)</span>
            <img src="/brand/options/option-c-lockup-mono.svg" alt="Option C Lockup Mono" style="width: 260px;">
          </div>
        </div>

        <div class="section-label">Symbol at Multiple Scales (256px, 64px, 16px Favicon)</div>
        <div class="scale-row">
          <div class="scale-box">
            <div class="size-256">
              <img src="/brand/options/option-c-symbol.svg" alt="Option C 256px" style="width: 100%; height: 100%;">
            </div>
            <span class="scale-label">256 × 256 px Display</span>
          </div>
          <div class="scale-box">
            <div class="size-64">
              <img src="/brand/options/option-c-symbol.svg" alt="Option C 64px" style="width: 100%; height: 100%;">
            </div>
            <span class="scale-label">64 × 64 px Header / App</span>
          </div>
          <div class="scale-box">
            <div class="size-16-wrapper">
              <img src="/brand/options/option-c-symbol.svg" alt="Option C 16px" class="size-16">
              <span class="scale-label">16 × 16 px (Favicon)</span>
            </div>
            <span class="scale-label">Tested at true 16px tab icon</span>
          </div>
        </div>

        <div class="analysis-grid">
          <div class="analysis-col strengths">
            <h4>Strengths</h4>
            <ul>
              <li>Instantly conveys large-scale grandstands, arena seating, and cinema curve rows.</li>
              <li>The crimson seat marker creates an intuitive "You are sitting right here" mental model.</li>
              <li>Circular arc geometry scales down with high optical distinction at 16 px.</li>
            </ul>
          </div>
          <div class="analysis-col weaknesses">
            <h4>Weaknesses</h4>
            <ul>
              <li>Emphasizes the arena / stadium map more than an individual seat chair.</li>
              <li>Slightly asymmetric due to the single highlighted seat dot.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- OPTION D -->
      <div class="option-card" id="option-d">
        <div class="option-header">
          <div class="option-title">
            <span style="color: var(--crimson);">D.</span> The Devanagari Seat (आ)
          </div>
          <div class="option-concept">Custom geometric "आ" built from strokes shaped like a seat</div>
        </div>

        <div class="section-label">Horizontal Lockup (Dark, Light, Monochrome)</div>
        <div class="lockup-row">
          <div class="preview-box dark">
            <span class="box-tag">Dark (#0a0b10)</span>
            <img src="/brand/options/option-d-lockup-dark.svg" alt="Option D Lockup Dark" style="width: 260px;">
          </div>
          <div class="preview-box light">
            <span class="box-tag">Light (White)</span>
            <img src="/brand/options/option-d-lockup-light.svg" alt="Option D Lockup Light" style="width: 260px;">
          </div>
          <div class="preview-box mono">
            <span class="box-tag">Monochrome (#dc143c)</span>
            <img src="/brand/options/option-d-lockup-mono.svg" alt="Option D Lockup Mono" style="width: 260px;">
          </div>
        </div>

        <div class="section-label">Symbol at Multiple Scales (256px, 64px, 16px Favicon)</div>
        <div class="scale-row">
          <div class="scale-box">
            <div class="size-256">
              <img src="/brand/options/option-d-symbol.svg" alt="Option D 256px" style="width: 100%; height: 100%;">
            </div>
            <span class="scale-label">256 × 256 px Display</span>
          </div>
          <div class="scale-box">
            <div class="size-64">
              <img src="/brand/options/option-d-symbol.svg" alt="Option D 64px" style="width: 100%; height: 100%;">
            </div>
            <span class="scale-label">64 × 64 px Header / App</span>
          </div>
          <div class="scale-box">
            <div class="size-16-wrapper">
              <img src="/brand/options/option-d-symbol.svg" alt="Option D 16px" class="size-16">
              <span class="scale-label">16 × 16 px (Favicon)</span>
            </div>
            <span class="scale-label">Tested at true 16px tab icon</span>
          </div>
        </div>

        <div class="analysis-grid">
          <div class="analysis-col strengths">
            <h4>Strengths</h4>
            <ul>
              <li>Deep cultural resonance for Nepal: built directly from the native letter "आ" (Aasan).</li>
              <li>Unique typographic monogram that is impossible to confuse with global booking apps.</li>
              <li>Very compact, punchy silhouette that renders razor-sharp even at 16 px.</li>
            </ul>
          </div>
          <div class="analysis-col weaknesses">
            <h4>Weaknesses</h4>
            <ul>
              <li>For non-Devanagari readers, it functions primarily as an abstract geometric glyph.</li>
              <li>Requires the wordmark beside it for immediate Latin reading.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.resolve('public/brand-preview.html'), previewHtml.trim());
  console.log('Saved /public/brand-preview.html successfully!');
}

main().catch(err => {
  console.error('Error generating brand options:', err);
  process.exit(1);
});
