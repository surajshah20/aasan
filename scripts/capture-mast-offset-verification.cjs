const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const artifactDir = 'C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runMastOffsetVerification() {
  console.log('Launching browser for Floodlight Head Mast Construction Verification...');
  const tempProfile = path.join(
    process.env.TEMP || 'C:/Users/suraj/AppData/Local/Temp',
    'puppeteer_mast_' + Date.now()
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
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to venue overview...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);

  // Select TU Cricket Ground
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await sleep(2500);

  // 1. Side View of Tower (East Tower t-east)
  console.log('Capturing 1: Side View of Floodlight Tower...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    drill.setLightingMode('evening');
    drill.setShowBeamAxes(false);
    // Side profile looking north along +Z at t-east
    drill.setCustomCamera({
      pos: [86.5, 46.5, 4.5],
      lookAt: [86.5, 47.0, -9.8],
      fov: 42,
      instant: true,
    });
  });
  await sleep(2000);
  const sideViewPath = path.join(artifactDir, 'tu_mast_1_side.png');
  await page.screenshot({ path: sideViewPath });
  console.log('Saved tu_mast_1_side.png');

  // 2. Front View (From the pitch looking directly at the lamp face)
  console.log('Capturing 2: Front View from pitch looking at lamp face...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    // Looking back up from the pitch at the lamp face
    drill.setCustomCamera({
      pos: [68.0, 41.5, -8.3],
      lookAt: [86.1, 47.0, -9.8],
      fov: 38,
      instant: true,
    });
  });
  await sleep(2000);
  const frontViewPath = path.join(artifactDir, 'tu_mast_2_front_from_pitch.png');
  await page.screenshot({ path: frontViewPath });
  console.log('Saved tu_mast_2_front_from_pitch.png');

  // 3. Back View (From outside the stadium looking at mast & rear housing)
  console.log('Capturing 3: Back View from outside the stadium...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    // Looking from outside towards the pitch
    drill.setCustomCamera({
      pos: [106.0, 48.0, -11.5],
      lookAt: [86.1, 46.5, -9.8],
      fov: 38,
      instant: true,
    });
  });
  await sleep(2000);
  const backViewPath = path.join(artifactDir, 'tu_mast_3_back_from_outside.png');
  await page.screenshot({ path: backViewPath });
  console.log('Saved tu_mast_3_back_from_outside.png');

  // 4. Aerial View
  console.log('Capturing 4: Aerial View of Stadium...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    drill.setCustomCamera(null);
  });
  await sleep(2200);
  const aerialViewPath = path.join(artifactDir, 'tu_mast_4_aerial.png');
  await page.screenshot({ path: aerialViewPath });
  console.log('Saved tu_mast_4_aerial.png');

  console.log('All verification captures completed successfully!');
  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (err) {}
}

runMastOffsetVerification().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
