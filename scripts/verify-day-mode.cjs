const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function captureDayModeViews() {
  console.log('Launching browser to capture day mode polish views...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  console.log('Navigating to app and selecting TU Cricket Ground...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1500);

  // Select venue
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await page.waitForFunction(() => !!window.__STADIUM_DRILL__, { timeout: 30000 });
  await sleep(2000);

  // Helper to hide UI overlays before capturing
  async function hideChrome() {
    await page.evaluate(() => {
      const selectors = [
        'header',
        'footer',
        'nav',
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
          el.style.setProperty('display', 'none', 'important');
        });
      });
    });
    await sleep(200);
  }

  async function restoreChrome() {
    await page.evaluate(() => {
      document.querySelectorAll('[style*="display: none !important"]').forEach((el) => {
        el.style.display = '';
      });
    });
    await sleep(200);
  }

  // 1. Day Aerial View
  console.log('1. Capturing Day Aerial View...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('day');
      drill.setShowBeamAxes(false);
      drill.setCustomCamera({
        pos: [70, 56, 96],
        lookAt: [0, 6, 0],
        fov: 46,
        instant: true,
      });
    }
  });
  await sleep(3500);
  await hideChrome();
  const dayAerialPath = path.join(artifactDir, 'day_aerial_view.png');
  await page.screenshot({ path: dayAerialPath, fullPage: false });
  console.log('Saved:', dayAerialPath);
  await restoreChrome();

  // 2. Day Top-down View
  console.log('2. Capturing Day Top-down View...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('day');
      drill.setCustomCamera({
        pos: [0, 165, 0.01],
        lookAt: [0, 0, 0],
        fov: 52,
        instant: true,
      });
    }
  });
  await sleep(2500);
  await hideChrome();
  const dayTopdownPath = path.join(artifactDir, 'day_topdown_view.png');
  await page.screenshot({ path: dayTopdownPath, fullPage: false });
  console.log('Saved:', dayTopdownPath);
  await restoreChrome();

  // 3. Pavilion Seat View in Day Mode
  console.log('3. Capturing Pavilion Seat View in Day Mode...');
  // Pavilion is located on south side (z ~ 82, looking north across pitch)
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('day');
      drill.setCustomCamera({
        pos: [0, 4.2, 78],
        lookAt: [0, 2.0, -10],
        fov: 58,
        instant: true,
      });
    }
  });
  await sleep(2500);
  await hideChrome();
  const pavilionSeatPath = path.join(artifactDir, 'day_pavilion_seat_view.png');
  await page.screenshot({ path: pavilionSeatPath, fullPage: false });
  console.log('Saved:', pavilionSeatPath);
  await restoreChrome();

  // 4. Upper-tier Seat View in Day Mode
  console.log('4. Capturing Upper-tier Seat View in Day Mode...');
  // East Stand Upper tier (x ~ 80, looking west across field towards Pavilion and hills)
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('day');
      drill.setCustomCamera({
        pos: [78, 11.5, 4],
        lookAt: [-15, 2.2, 0],
        fov: 56,
        instant: true,
      });
    }
  });
  await sleep(2500);
  await hideChrome();
  const upperTierSeatPath = path.join(artifactDir, 'day_upper_tier_seat_view.png');
  await page.screenshot({ path: upperTierSeatPath, fullPage: false });
  console.log('Saved:', upperTierSeatPath);
  await restoreChrome();

  // 5. Night Aerial View to confirm nothing changed
  console.log('5. Capturing Night Aerial View (confirming night is untouched)...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('evening');
      drill.setShowBeamAxes(false);
      drill.setCustomCamera({
        pos: [70, 56, 96],
        lookAt: [0, 6, 0],
        fov: 46,
        instant: true,
      });
    }
  });
  await sleep(3000);
  await hideChrome();
  const nightAerialPath = path.join(artifactDir, 'night_aerial_verification.png');
  await page.screenshot({ path: nightAerialPath, fullPage: false });
  console.log('Saved:', nightAerialPath);
  await restoreChrome();

  // 6. Tower Close-up from Front (Day Mode) to verify paler glass lenses, visible grid, and sky reflection
  console.log('6. Capturing Tower Close-up from FRONT (Day Mode)...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('day');
      drill.setCustomCamera({
        pos: [60, 43.0, -7],
        lookAt: [88, 44.0, -10],
        fov: 46,
        instant: true,
      });
    }
  });
  await sleep(2500);
  await hideChrome();
  const towerFrontPath = path.join(artifactDir, 'tower_day_front_closeup.png');
  await page.screenshot({ path: towerFrontPath, fullPage: false });
  console.log('Saved:', towerFrontPath);
  await restoreChrome();

  await browser.close();
  console.log('\nAll verification views successfully captured!');
}

captureDayModeViews().catch((err) => {
  console.error('Error in captureDayModeViews:', err);
  process.exit(1);
});
