const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runFloodlightVerification() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching browser for Floodlight Orientation Verification...');
  const tempProfile = path.join(__dirname, 'temp_chrome_floodlight_' + Date.now());
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: tempProfile,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5173/?debug=1', { waitUntil: 'networkidle2' });
  await sleep(1500);

  // Navigate to TU Cricket Ground
  console.log('Selecting TU Cricket Ground with ?debug=1...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await sleep(2500);

  // 1. Fetch Angle Log
  console.log('Fetching Floodlight Angle Log...');
  const angleLog = await page.evaluate(() => {
    return window.__FLOODLIGHT_ANGLES__ || {};
  });
  console.log('Angle Log Output:', JSON.stringify(angleLog, null, 2));

  fs.writeFileSync(
    path.join(artifactDir, 'floodlight_angle_verification.json'),
    JSON.stringify(angleLog, null, 2),
    'utf-8'
  );

  // 2. Capture Debug View with All Axes Ending on the Pitch
  console.log('Capturing Debug View with All Axes Ending on the Pitch...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    drill.setShowBeamAxes(true);
    drill.setCustomCamera(null);
  });
  await sleep(2200);
  const debugPath = path.join(artifactDir, 'tu_floodlight_3_debug_axes.png');
  await page.screenshot({ path: debugPath });
  console.log('Saved tu_floodlight_3_debug_axes.png');

  // 3. Capture Night Aerial (normal view without debug axes)
  console.log('Capturing Night Aerial View...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    drill.setShowBeamAxes(false);
    drill.setLightingMode('evening');
    drill.setCustomCamera(null);
  });
  await sleep(2200);
  const nightAerialPath = path.join(artifactDir, 'tu_floodlight_2_night_aerial.png');
  await page.screenshot({ path: nightAerialPath });
  console.log('Saved tu_floodlight_2_night_aerial.png');

  // 4. Capture Close-Up of One Floodlight Head from the Side showing it tilted down
  console.log('Capturing Close-Up of Floodlight Head from the Side showing tilt down...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    // Tower t-east head is at [88, 49.5, -10], facing toward pitch [-6, 0, -2] (mostly -X).
    // Camera placed 14m south along Z gives a direct side profile:
    // Mast is vertical, swivel bracket is clearly visible, head and beam tilt down by 27.7 degrees toward the pitch.
    drill.setShowBeamAxes(true);
    drill.setCustomCamera({
      pos: [88.0, 48.0, 4.0],
      lookAt: [88.0, 48.8, -10.0],
      fov: 44,
      instant: true,
    });
  });
  await sleep(1500);
  const sideCloseupPath = path.join(artifactDir, 'tu_floodlight_1_head_closeup_side.png');
  await page.screenshot({ path: sideCloseupPath });
  console.log('Saved tu_floodlight_1_head_closeup_side.png');

  // 5. Capture Top-Down View verifying all towers face the pitch
  console.log('Capturing Top-Down View...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    drill.setShowBeamAxes(true);
    drill.setCustomCamera({
      pos: [0, 175, 0],
      lookAt: [0, 0, 0],
      fov: 52,
      instant: true,
    });
  });
  await sleep(1500);
  const topdownPath = path.join(artifactDir, 'tu_floodlight_4_topdown.png');
  await page.screenshot({ path: topdownPath });
  console.log('Saved tu_floodlight_4_topdown.png');

  // 6. Capture Seat View Looking toward a Tower
  console.log('Capturing Seat View looking toward a Tower...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    drill.setShowBeamAxes(false);
    // Find a seat in the south stand (z > 50)
    const seat = drill.allSeats.find((s) => s.position[2] > 55 && s.position[0] < -10) || drill.allSeats[0];
    if (seat) {
      const eyePos = [seat.position[0], seat.position[1] + 1.2, seat.position[2]];
      window.__BOOKING_STORE__.getState().flyToSeat({
        sectionId: seat.sectionId,
        sectionName: seat.sectionName,
        row: seat.row,
        number: seat.number,
        priceNPR: seat.priceNPR,
        tier: seat.tier,
        cameraPosition: eyePos,
        cameraTarget: [46.0, 49.5, -88.0], // Looking toward North-East Tower
        blockId: seat.blockId,
        blockLabel: seat.blockLabel,
        standId: seat.standId,
      });
      drill.setCustomCamera({
        pos: eyePos,
        lookAt: [46.0, 49.5, -88.0],
        fov: 54,
        instant: true,
      });
    }
  });
  await sleep(1500);
  const seatViewPath = path.join(artifactDir, 'tu_floodlight_5_seat_view_facing_tower.png');
  await page.screenshot({ path: seatViewPath });
  console.log('Saved tu_floodlight_5_seat_view_facing_tower.png');

  console.log('Finished floodlight capture successfully!');
  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (err) {}
}

runFloodlightVerification().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
