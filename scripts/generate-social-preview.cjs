const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.resolve('C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421');
const PUBLIC_DIR = path.resolve(__dirname, '../public');

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });

  const logoSvg = fs.readFileSync(path.join(PUBLIC_DIR, 'brand/logo.svg'), 'utf8');
  
  // Use a screenshot of the 3D stadium
  let stadiumImgBase64 = '';
  const stadiumPath = path.join(ARTIFACT_DIR, 'tu_night_1_aerial_match.png');
  if (fs.existsSync(stadiumPath)) {
    stadiumImgBase64 = fs.readFileSync(stadiumPath).toString('base64');
  }

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Inter:wght@400;500;600&family=Noto+Sans+Devanagari:wght@500;700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        width: 1200px;
        height: 630px;
        background: #0a0b10;
        font-family: 'Inter', sans-serif;
        color: #ffffff;
        display: flex;
        position: relative;
        overflow: hidden;
      }
      .bg-glow-1 {
        position: absolute;
        width: 600px;
        height: 600px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(220, 20, 60, 0.18) 0%, rgba(220, 20, 60, 0) 70%);
        top: -150px;
        left: -150px;
        pointer-events: none;
      }
      .bg-glow-2 {
        position: absolute;
        width: 800px;
        height: 800px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(14, 165, 233, 0) 70%);
        bottom: -250px;
        right: -150px;
        pointer-events: none;
      }
      .container {
        display: flex;
        width: 100%;
        height: 100%;
        padding: 56px 64px;
        align-items: center;
        justify-content: space-between;
        position: relative;
        z-index: 10;
      }
      .left {
        width: 540px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .logo-wrap {
        width: 280px;
        margin-bottom: 28px;
      }
      .logo-wrap svg {
        width: 100%;
        height: auto;
      }
      .tagline {
        font-family: 'Outfit', sans-serif;
        font-size: 42px;
        font-weight: 700;
        line-height: 1.15;
        letter-spacing: -0.02em;
        color: #f8fafc;
        margin-bottom: 14px;
      }
      .tagline span {
        color: #dc143c;
      }
      .nepali-sub {
        font-family: 'Noto Sans Devanagari', sans-serif;
        font-size: 19px;
        font-weight: 500;
        color: #cbd5e1;
        line-height: 1.45;
        margin-bottom: 28px;
      }
      .badges {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .badge {
        padding: 7px 14px;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.14);
        font-size: 13px;
        font-weight: 600;
        color: #e2e8f0;
        backdrop-filter: blur(10px);
      }
      .badge.accent {
        background: rgba(220, 20, 60, 0.15);
        border-color: rgba(220, 20, 60, 0.4);
        color: #ff6b81;
      }
      .right {
        width: 510px;
        height: 480px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .card-visual {
        width: 100%;
        height: 420px;
        border-radius: 20px;
        background: #11131c;
        border: 1px solid rgba(255, 255, 255, 0.16);
        box-shadow: 0 30px 60px rgba(0, 0, 0, 0.7);
        overflow: hidden;
        position: relative;
        transform: rotate(2deg);
      }
      .card-header-bar {
        padding: 12px 18px;
        background: rgba(15, 18, 28, 0.9);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        color: #94a3b8;
      }
      .dots {
        display: flex;
        gap: 6px;
      }
      .dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #334155;
      }
      .dot.red { background: #ef4444; }
      .dot.yellow { background: #f59e0b; }
      .dot.green { background: #10b981; }
      .card-img-wrap {
        width: 100%;
        height: calc(100% - 40px);
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        position: relative;
      }
      .card-img-wrap img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .card-pill {
        position: absolute;
        bottom: 16px;
        left: 16px;
        padding: 6px 14px;
        background: rgba(10, 11, 16, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        color: #ffffff;
        backdrop-filter: blur(8px);
      }
    </style>
  </head>
  <body>
    <div class="bg-glow-1"></div>
    <div class="bg-glow-2"></div>
    <div class="container">
      <div class="left">
        <div class="logo-wrap">
          ${logoSvg}
        </div>
        <h1 class="tagline">See your seat <span>before</span> you book.</h1>
        <p class="nepali-sub">नेपालका लागि ३D सिट पूर्वावलोकन तथा डिजिटल टिकट प्रणाली</p>
        <div class="badges">
          <span class="badge accent">3D Perspective View</span>
          <span class="badge">TU Cricket Ground</span>
          <span class="badge">QFX Cinemas</span>
          <span class="badge">eSewa • Khalti • Fonepay</span>
        </div>
      </div>
      <div class="right">
        <div class="card-visual">
          <div class="card-header-bar">
            <div class="dots">
              <div class="dot red"></div>
              <div class="dot yellow"></div>
              <div class="dot green"></div>
            </div>
            <span>TU International Cricket Ground • 3D Night Mode</span>
          </div>
          <div class="card-img-wrap">
            ${stadiumImgBase64 ? `<img src="data:image/png;base64,${stadiumImgBase64}" />` : ''}
            <div class="card-pill">Stand A • Row K • Seat 6</div>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1000));

  const ogPath = path.join(PUBLIC_DIR, 'og-image.png');
  await page.screenshot({ path: ogPath });
  console.log(`Saved social preview image: ${ogPath}`);

  const artifactOgPath = path.join(ARTIFACT_DIR, 'social_preview_1200x630.png');
  fs.copyFileSync(ogPath, artifactOgPath);
  console.log(`Copied to artifact dir: ${artifactOgPath}`);

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
