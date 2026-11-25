const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const publicLandingDir = path.resolve(__dirname, '../public/landing');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateLandingAssets() {
  console.log('Generating pristine canvas-only landing assets from updated 3D stadium...');
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
  // Standard 16:10 / 16:9 widescreen viewport for crisp cards
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  // 1. Navigate to Stadium (tu_cricket_ground)
  console.log('Navigating to app and selecting TU Cricket Ground...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1500);

  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await sleep(3000);

  // Ensure evening lighting mode
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('evening');
      drill.setShowBeamAxes(false);
      drill.setCustomCamera(null);
    }
  });
  await sleep(2500);

  // Helper: hide ALL HTML overlays completely before taking screenshot
  async function screenshotPureCanvas(filePath, quality = 82) {
    await page.evaluate(() => {
      // Hide all overlay elements on top of the canvas
      const selectors = [
        'header',
        'footer',
        'nav',
        'button',
        '.glass-panel',
        '.glass-panel-glow',
        '[class*="absolute top-"]',
        '[class*="fixed"]',
        '[class*="z-20"]',
        '[class*="z-30"]',
        '[class*="z-40"]',
        '[class*="z-50"]',
      ];
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          el.setAttribute('data-hide-for-capture', '1');
          el.style.setProperty('display', 'none', 'important');
        });
      });
    });

    await sleep(200);

    const canvas = await page.$('canvas');
    if (canvas) {
      await canvas.screenshot({ path: filePath, type: 'jpeg', quality });
    }

    // Restore hidden elements
    await page.evaluate(() => {
      document.querySelectorAll('[data-hide-for-capture="1"]').forEach((el) => {
        el.style.display = '';
        el.removeAttribute('data-hide-for-capture');
      });
    });
  }

  // 1. Hero Poster (<200KB) & Stadium Venue Card Background
  console.log('1. Capturing hero-poster.jpg & stadium-card-bg.jpg (pure canvas overview)...');
  await page.evaluate(() => {
    window.__STADIUM_DRILL__.setCustomCamera({
      pos: [-22, 74, 126],
      lookAt: [0, 2.0, -4],
      fov: 46,
      instant: true,
    });
  });
  await sleep(2000);
  const heroPosterPath = path.join(publicLandingDir, 'hero-poster.jpg');
  await screenshotPureCanvas(heroPosterPath, 76);

  const stadiumBgPath = path.join(publicLandingDir, 'stadium-card-bg.jpg');
  await screenshotPureCanvas(stadiumBgPath, 82);
  console.log('Saved hero-poster.jpg and stadium-card-bg.jpg');

  // 2. Step 1: Pick a Stand
  console.log('2. Capturing Step 1: Pick a stand (overview with stand highlight)...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    drill.setCustomCamera(null);
    drill.selectStand(null);
    drill.setStadiumLevel('overview');
    // Hover on East Stand to show the stand selection state
    drill.setHoveredStandId('east_stand');
  });
  await sleep(2200);
  const step1Path = path.join(publicLandingDir, 'step-1-stand.jpg');
  await screenshotPureCanvas(step1Path, 82);
  console.log('Saved step-1-stand.jpg');

  // 3. Step 2: Choose your Block
  console.log('3. Capturing Step 2: Choose your block (drilling into stand & blocks)...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    drill.selectStand('east_stand');
    drill.setStadiumLevel('stand');
    drill.setHoveredBlockId('blk-e1');
  });
  await sleep(2500);
  const step2Path = path.join(publicLandingDir, 'step-2-block.jpg');
  await screenshotPureCanvas(step2Path, 82);
  console.log('Saved step-2-block.jpg');

  // 4. Step 3: Sit in your Seat
  console.log('4. Capturing Step 3: Sit in your seat (seat perspective with pitch & stands)...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    drill.setCustomCamera({
      pos: [54, 8.2, 8],
      lookAt: [0, 2.0, 0],
      fov: 56,
      instant: true,
    });
  });
  await sleep(1800);
  const step3Path = path.join(publicLandingDir, 'step-3-seat.jpg');
  await screenshotPureCanvas(step3Path, 82);
  console.log('Saved step-3-seat.jpg');

  // 5. Cinema Card Background (qfx_civil_audi1)
  console.log('5. Capturing cinema-card-bg.jpg (QFX Civil Mall Audi 1)...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('qfx_civil_audi1', 'event_qfx_movie_1');
  });
  await sleep(3500);
  const cinemaBgPath = path.join(publicLandingDir, 'cinema-card-bg.jpg');
  await screenshotPureCanvas(cinemaBgPath, 82);
  console.log('Saved cinema-card-bg.jpg');

  // Check file sizes
  const files = [
    'hero-poster.jpg',
    'stadium-card-bg.jpg',
    'cinema-card-bg.jpg',
    'step-1-stand.jpg',
    'step-2-block.jpg',
    'step-3-seat.jpg',
  ];
  console.log('\n--- Regenerated Asset File Sizes ---');
  for (const f of files) {
    const fPath = path.join(publicLandingDir, f);
    if (fs.existsSync(fPath)) {
      const stats = fs.statSync(fPath);
      const kb = (stats.size / 1024).toFixed(1);
      console.log(`${f}: ${kb} KB ${stats.size < 200 * 1024 ? '(PASS: <200KB)' : ''}`);
    }
  }

  await browser.close();
  console.log('\nAll landing assets successfully regenerated!');
}

generateLandingAssets().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
