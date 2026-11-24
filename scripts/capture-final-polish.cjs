const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const artifactDir = 'C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPolishVerification() {
  console.log('Launching browser for Final Polish Verification...');
  const tempProfile = path.join(
    process.env.TEMP || 'C:/Users/suraj/AppData/Local/Temp',
    'puppeteer_polish_' + Date.now()
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

  // Navigate to TU Cricket Ground normally without ?debug=1
  console.log('Navigating to venue overview without ?debug=1...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);

  // Select TU Cricket Ground
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await sleep(2500);

  // 1. Fetch Angle Log for the right-hand towers (t-east and t-se)
  const angleLog = await page.evaluate(() => {
    return window.__FLOODLIGHT_ANGLES__ || {};
  });
  console.log('Angle Log for All Towers:', JSON.stringify(angleLog, null, 2));

  fs.writeFileSync(
    path.join(artifactDir, 'final_polish_angle_log.json'),
    JSON.stringify(angleLog, null, 2),
    'utf-8'
  );

  // 1. Night Aerial View (No ?debug=1: sparkle button hidden, softened beams, 40% larger scoreboard)
  console.log('Capturing Night Aerial View...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    drill.setLightingMode('evening');
    drill.setCustomCamera(null);
  });
  await sleep(2500);
  const nightAerialPath = path.join(artifactDir, 'tu_polish_1_night_aerial.png');
  await page.screenshot({ path: nightAerialPath });
  console.log('Saved tu_polish_1_night_aerial.png');

  // 2. Night Seat View from Pavilion (Looking across pitch toward North / Scoreboard)
  console.log('Capturing Night Seat View from Pavilion...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    // Pick seat in Grand Pavilion End
    const seat = drill.allSeats.find((s) => s.sectionId === 'tu_pavilion_end') || 
                 drill.allSeats.find((s) => s.standId.includes('pavilion')) || 
                 drill.allSeats[0];
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
        cameraTarget: [25.0, 10.0, -50.0], // Looking across pitch toward pitch & scoreboard
        blockId: seat.blockId,
        blockLabel: seat.blockLabel,
        standId: seat.standId,
      });
      drill.setCustomCamera({
        pos: eyePos,
        lookAt: [25.0, 10.0, -50.0],
        fov: 52,
        instant: true,
      });
    }
  });
  await sleep(2200);
  const pavilionSeatPath = path.join(artifactDir, 'tu_polish_2_night_seat_pavilion.png');
  await page.screenshot({ path: pavilionSeatPath });
  console.log('Saved tu_polish_2_night_seat_pavilion.png');

  // 3. Close-up of Right-Hand Tower Head
  // Tower t-east head at [88, 49.5, -10], target [-6, 0, -2] (aims down and West at 27.7 deg)
  console.log('Capturing Close-up of the Right-Hand Tower Head...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    window.__BOOKING_STORE__.getState().returnToOverview();
    // Camera positioned 14m south along Z looking north at t-east
    // Shows the strictly vertical mast, swivel bracket, and lamp face tilted 27.7 deg toward the pitch
    drill.setCustomCamera({
      pos: [88.0, 48.0, 4.0],
      lookAt: [88.0, 49.0, -10.0],
      fov: 44,
      instant: true,
    });
  });
  await sleep(2200);
  const rightTowerPath = path.join(artifactDir, 'tu_polish_3_right_tower_closeup.png');
  await page.screenshot({ path: rightTowerPath });
  console.log('Saved tu_polish_3_right_tower_closeup.png');

  console.log('Finished final polish capture successfully!');
  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (err) {}
}

runPolishVerification().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
