const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function captureTowerViews() {
  console.log('Launching browser to capture floodlight tower day/night views...');
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
  await sleep(3000);

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

  // 1. Tower close-up in day mode from the SIDE (showing head profile, yoke bracket, visor, catwalk, platform, and tapered mast)
  console.log('1. Capturing Tower Close-up from SIDE (Day Mode)...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('day');
      drill.setShowBeamAxes(false);
      // East tower at [88, 0, -10], head at [88, 47.2, -10]
      // View from south side of tower [88, 42.0, 16], looking at [88, 38.0, -10]
      drill.setCustomCamera({
        pos: [88, 44.0, 18],
        lookAt: [88, 38.0, -10],
        fov: 48,
        instant: true,
      });
    }
  });
  await sleep(3000);
  await hideChrome();
  const towerSidePath = path.join(artifactDir, 'tower_day_side_closeup.png');
  await page.screenshot({ path: towerSidePath, fullPage: false });
  console.log('Saved:', towerSidePath);
  await restoreChrome();

  // 2. Tower close-up in day mode from the FRONT (pitch-facing view looking directly at 60 pale glass micro-lenses, visor, frame, mast)
  console.log('2. Capturing Tower Close-up from FRONT (Day Mode)...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('day');
      // Look from the pitch towards East tower head
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

  // 2b. Tower Base & Maintenance Platform Detail (Day Mode)
  console.log('2b. Capturing Tower Mast & Base Detail (Day Mode)...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('day');
      drill.setCustomCamera({
        pos: [80, 18.0, 16],
        lookAt: [88, 20.0, -10],
        fov: 52,
        instant: true,
      });
    }
  });
  await sleep(2500);
  await hideChrome();
  const towerBaseDetailPath = path.join(artifactDir, 'tower_day_base_detail.png');
  await page.screenshot({ path: towerBaseDetailPath, fullPage: false });
  console.log('Saved:', towerBaseDetailPath);
  await restoreChrome();

  // 3. Day Aerial View
  console.log('3. Capturing Day Aerial View...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('day');
      drill.setCustomCamera({
        pos: [70, 56, 96],
        lookAt: [0, 6, 0],
        fov: 46,
        instant: true,
      });
    }
  });
  await sleep(2500);
  await hideChrome();
  const dayAerialPath = path.join(artifactDir, 'day_aerial_view.png');
  await page.screenshot({ path: dayAerialPath, fullPage: false });
  console.log('Saved:', dayAerialPath);
  await restoreChrome();

  // 4. Night Aerial View (confirming night mode remains unchanged: dark steel, glowing bulbs, star glare)
  console.log('4. Capturing Night Aerial View...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('evening');
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
  const nightAerialPath = path.join(artifactDir, 'night_aerial_verification.png');
  await page.screenshot({ path: nightAerialPath, fullPage: false });
  console.log('Saved:', nightAerialPath);
  await restoreChrome();

  await browser.close();
  console.log('All tower verification captures completed successfully.');
}

captureTowerViews().catch((err) => {
  console.error('Error running tower capture:', err);
  process.exit(1);
});
