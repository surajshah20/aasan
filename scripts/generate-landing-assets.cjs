const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const publicLandingDir = path.resolve(__dirname, '../public/landing');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateLandingAssets() {
  console.log('Generating real app screenshots for /public/landing/...');
  if (!fs.existsSync(publicLandingDir)) {
    fs.mkdirSync(publicLandingDir, { recursive: true });
  }

  const tempProfile = path.join(
    process.env.TEMP || 'C:/Users/suraj/AppData/Local/Temp',
    'puppeteer_landing_' + Date.now()
  );

  const browser = await puppeteer.launch({
    headless: 'new',
    userDataDir: tempProfile,
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

  // 1. Navigate to Stadium (tu_cricket_ground)
  console.log('Navigating to TU Cricket Ground...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);

  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await sleep(2500);

  // Set night mode
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('evening');
      drill.setShowBeamAxes(false);
      drill.setCustomCamera(null);
    }
  });
  await sleep(2000);

  // Capture Hero Poster & Stadium Card Background
  console.log('Capturing hero-poster.jpg and stadium-card-bg.jpg...');
  const heroPosterPath = path.join(publicLandingDir, 'hero-poster.jpg');
  await page.screenshot({ path: heroPosterPath, type: 'jpeg', quality: 80 });
  const stadiumBgPath = path.join(publicLandingDir, 'stadium-card-bg.jpg');
  await page.screenshot({ path: stadiumBgPath, type: 'jpeg', quality: 85 });
  console.log('Saved hero-poster.jpg and stadium-card-bg.jpg');

  // Step 1: Pick a Stand
  console.log('Capturing Step 1: Pick a stand...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.selectStand('east_stand');
    }
  });
  await sleep(2200);
  const step1Path = path.join(publicLandingDir, 'step-1-stand.jpg');
  await page.screenshot({ path: step1Path, type: 'jpeg', quality: 82 });
  console.log('Saved step-1-stand.jpg');

  // Step 2: Choose your Block
  console.log('Capturing Step 2: Choose your block...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.selectBlock('blk-e1');
    }
  });
  await sleep(2200);
  const step2Path = path.join(publicLandingDir, 'step-2-block.jpg');
  await page.screenshot({ path: step2Path, type: 'jpeg', quality: 82 });
  console.log('Saved step-2-block.jpg');

  // Step 3: Sit in your Seat
  console.log('Capturing Step 3: Sit in your seat...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    const store = window.__BOOKING_STORE__.getState();
    const seat = drill.allSeats.find((s) => s.standId === 'east_stand' && s.row === 'K' && s.number === 6) ||
                 drill.allSeats.find((s) => s.row === 'K') ||
                 drill.allSeats[15];
    if (seat) {
      store.flyToSeat({
        sectionId: seat.sectionId,
        sectionName: seat.sectionName,
        row: seat.row,
        number: seat.number,
        priceNPR: seat.priceNPR,
        tier: seat.tier,
        cameraPosition: [seat.position[0], seat.position[1] + 1.2, seat.position[2]],
        cameraTarget: [0, 2.0, 0],
        blockId: seat.blockId,
        blockLabel: seat.blockLabel,
        standId: seat.standId,
      });
    }
  });
  await sleep(2500);
  const step3Path = path.join(publicLandingDir, 'step-3-seat.jpg');
  await page.screenshot({ path: step3Path, type: 'jpeg', quality: 82 });
  console.log('Saved step-3-seat.jpg');

  // 2. Navigate to Cinema (qfx_civil_audi1) to capture cinema-card-bg.jpg
  console.log('Navigating to QFX Civil Mall Audi 1...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('qfx_civil_audi1', 'event_qfx_movie_1');
  });
  await sleep(3000);

  const cinemaBgPath = path.join(publicLandingDir, 'cinema-card-bg.jpg');
  await page.screenshot({ path: cinemaBgPath, type: 'jpeg', quality: 85 });
  console.log('Saved cinema-card-bg.jpg');

  // Verify file sizes
  const files = ['hero-poster.jpg', 'stadium-card-bg.jpg', 'cinema-card-bg.jpg', 'step-1-stand.jpg', 'step-2-block.jpg', 'step-3-seat.jpg'];
  console.log('\n--- Landing Asset Sizes ---');
  for (const f of files) {
    const fPath = path.join(publicLandingDir, f);
    if (fs.existsSync(fPath)) {
      const stats = fs.statSync(fPath);
      const kb = (stats.size / 1024).toFixed(1);
      console.log(`${f}: ${kb} KB ${stats.size < 200 * 1024 ? '(PASS: <200KB)' : ''}`);
    }
  }

  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (err) {}
}

generateLandingAssets().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
