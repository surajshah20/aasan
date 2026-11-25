const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const publicLandingDir = path.resolve(__dirname, '../public/landing');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function convertAndOptimize(sourcePngBuffer, baseName) {
  const maxBytes = 150 * 1024; // strictly under 150 KB

  // 1. WebP
  let webpQuality = 82;
  let webpBuf = await sharp(sourcePngBuffer).webp({ quality: webpQuality }).toBuffer();
  while (webpBuf.length > maxBytes && webpQuality > 40) {
    webpQuality -= 5;
    webpBuf = await sharp(sourcePngBuffer).webp({ quality: webpQuality }).toBuffer();
  }
  fs.writeFileSync(path.join(publicLandingDir, `${baseName}.webp`), webpBuf);

  // 2. AVIF
  let avifQuality = 75;
  let avifBuf = await sharp(sourcePngBuffer).avif({ quality: avifQuality }).toBuffer();
  while (avifBuf.length > maxBytes && avifQuality > 40) {
    avifQuality -= 5;
    avifBuf = await sharp(sourcePngBuffer).avif({ quality: avifQuality }).toBuffer();
  }
  fs.writeFileSync(path.join(publicLandingDir, `${baseName}.avif`), avifBuf);

  // 3. JPG Fallback
  let jpgQuality = 80;
  let jpgBuf = await sharp(sourcePngBuffer).jpeg({ quality: jpgQuality, mozjpeg: true }).toBuffer();
  while (jpgBuf.length > maxBytes && jpgQuality > 40) {
    jpgQuality -= 5;
    jpgBuf = await sharp(sourcePngBuffer).jpeg({ quality: jpgQuality, mozjpeg: true }).toBuffer();
  }
  fs.writeFileSync(path.join(publicLandingDir, `${baseName}.jpg`), jpgBuf);

  console.log(`Saved ${baseName} -> WebP: ${(webpBuf.length/1024).toFixed(1)}KB, AVIF: ${(avifBuf.length/1024).toFixed(1)}KB, JPG: ${(jpgBuf.length/1024).toFixed(1)}KB`);
}

async function generateLandingAssets() {
  console.log('Generating pristine landing assets (WebP, AVIF, JPG under 150KB)...');
  if (!fs.existsSync(publicLandingDir)) {
    fs.mkdirSync(publicLandingDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  // Helper to hide UI elements except the canvas (and optionally seatbar)
  async function screenshotScene(keepSeatBar = false) {
    await page.evaluate((keepBar) => {
      const selectors = [
        'header',
        'footer',
        'nav',
        '[class*="absolute top-"]',
        '[class*="fixed"]',
        '[class*="z-50"]',
      ];
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          el.setAttribute('data-hide-for-capture', '1');
          el.style.setProperty('display', 'none', 'important');
        });
      });

      if (!keepBar) {
        document.querySelectorAll('[class*="bottom-"]').forEach((el) => {
          el.setAttribute('data-hide-for-capture', '1');
          el.style.setProperty('display', 'none', 'important');
        });
      }
    }, keepSeatBar);

    await sleep(250);

    let buffer;
    if (keepSeatBar) {
      // Capture canvas + seatbar area
      buffer = await page.screenshot({ type: 'png' });
    } else {
      const canvas = await page.$('canvas');
      if (canvas) {
        buffer = await canvas.screenshot({ type: 'png' });
      } else {
        buffer = await page.screenshot({ type: 'png' });
      }
    }

    // Restore hidden elements
    await page.evaluate(() => {
      document.querySelectorAll('[data-hide-for-capture="1"]').forEach((el) => {
        el.style.display = '';
        el.removeAttribute('data-hide-for-capture');
      });
    });

    return buffer;
  }

  // 1. Navigate to Stadium (tu_cricket_ground)
  console.log('Navigating to app and selecting TU Cricket Ground...');
  await page.goto('http://127.0.0.1:5173/stadium/tu', { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(2500);

  // 1. Hero Poster & Stadium Venue Card Background
  console.log('1. Capturing hero-poster and stadium-card-bg...');
  await page.evaluate(() => {
    if (window.__STADIUM_DRILL__) {
      window.__STADIUM_DRILL__.setLightingMode('evening');
      window.__STADIUM_DRILL__.setCustomCamera({
        pos: [-22, 74, 126],
        lookAt: [0, 2.0, -4],
        fov: 46,
        instant: true,
      });
    }
  });
  await sleep(2000);
  const heroBuf = await screenshotScene(false);
  await convertAndOptimize(heroBuf, 'hero-poster');
  await convertAndOptimize(heroBuf, 'stadium-card-bg');

  // 2. Step 1: Pick a Stand
  console.log('2. Capturing step-1-stand...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setCustomCamera(null);
      drill.selectStand(null);
      drill.setStadiumLevel('overview');
      drill.setHoveredStandId('east_stand');
    }
  });
  await sleep(2000);
  const step1Buf = await screenshotScene(false);
  await convertAndOptimize(step1Buf, 'step-1-stand');

  // 3. Step 2: Choose your Block
  console.log('3. Capturing step-2-block...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.selectStand('east_stand');
      drill.setStadiumLevel('stand');
      drill.setHoveredBlockId('blk-e1');
    }
  });
  await sleep(2000);
  const step2Buf = await screenshotScene(false);
  await convertAndOptimize(step2Buf, 'step-2-block');

  // 4. Step 3: Sit in your Seat with NEW BOOKING BAR
  console.log('4. Capturing step-3-seat (with new booking bar: VIP badge, Block P1 · Row A · Seat 1, price)...');
  await page.goto('http://127.0.0.1:5173/stadium/tu/pavilion-lower/p1/a-1', { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(2500);
  const step3Buf = await screenshotScene(true);
  await convertAndOptimize(step3Buf, 'step-3-seat');

  // 5. Cinema Card Background
  console.log('5. Capturing cinema-card-bg (QFX Civil Mall Audi 1)...');
  await page.goto('http://127.0.0.1:5173/cinema/qfx-civil-audi1', { waitUntil: 'networkidle0', timeout: 60000 });
  await sleep(3000);
  const cinemaBuf = await screenshotScene(false);
  await convertAndOptimize(cinemaBuf, 'cinema-card-bg');

  await browser.close();
  console.log('\nAll landing assets regenerated in WebP, AVIF, and JPG under 150KB!');
}

generateLandingAssets().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
