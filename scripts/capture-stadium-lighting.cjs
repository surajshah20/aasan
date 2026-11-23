const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureLightingSuite() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching browser for Stadium Lighting Verification...');
  const tempProfile = path.join(__dirname, 'temp_chrome_lighting_' + Date.now());
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
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await sleep(1500);

  // Switch to TU Cricket Ground
  console.log('Navigating to TU Cricket Ground...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await sleep(2500);

  // Measure Evening FPS
  const fpsEvening = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function loop() {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(loop);
        } else {
          resolve(Math.round((frames * 1000) / (performance.now() - start)));
        }
      }
      requestAnimationFrame(loop);
    });
  });
  console.log('Evening Mode FPS (1440x900):', fpsEvening);

  // 1. Aerial 3/4 Evening View
  console.log('Capturing 1. Aerial View in Evening Mode...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('evening');
      drill.setCustomCamera(null);
    }
  });
  await sleep(2000);
  await page.screenshot({
    path: path.join(artifactDir, 'tu_lighting_aerial_evening.png'),
  });

  // 2. Aerial View in Day Mode
  console.log('Capturing 2. Aerial View in Day Mode...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('day');
      drill.setCustomCamera(null);
    }
  });
  await sleep(2000);

  const fpsDay = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function loop() {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(loop);
        } else {
          resolve(Math.round((frames * 1000) / (performance.now() - start)));
        }
      }
      requestAnimationFrame(loop);
    });
  });
  console.log('Day Mode FPS (1440x900):', fpsDay);

  await page.screenshot({
    path: path.join(artifactDir, 'tu_lighting_aerial_day.png'),
  });

  // Switch back to Evening Mode
  console.log('Switching back to Evening Mode for remaining views...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('evening');
    }
  });
  await sleep(1500);

  // 3. Top-Down View
  console.log('Capturing 3. Top-Down View showing pitch lighting & overlapping pools...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setCustomCamera({
        pos: [0, 165, 0.1],
        lookAt: [0, 0, 0],
        fov: 52,
      });
    }
  });
  await sleep(2000);
  await page.screenshot({
    path: path.join(artifactDir, 'tu_lighting_topdown.png'),
  });

  // 4. Seat View Facing Floodlights
  console.log('Capturing 4. Seat View Facing Floodlights...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    const store = window.__BOOKING_STORE__.getState();
    if (drill) {
      drill.setCustomCamera(null);
      // Find a seat in West Lower looking east toward the floodlights
      const seat = drill.allSeats.find((s) => s.standId === 'w_lower' && s.row === 'C');
      if (seat) {
        store.selectStand(seat.standId);
        store.selectBlock(seat.blockId);
        store.flyToSeat({
          sectionId: seat.sectionId,
          sectionName: seat.sectionName,
          row: seat.row,
          number: seat.number,
          priceNPR: seat.priceNPR,
          tier: seat.tier,
          cameraPosition: [seat.position[0], seat.position[1] + 1.2, seat.position[2]],
          cameraTarget: [0, 0.4, 0], // Center of pitch looking east across to the floodlight towers
          blockId: seat.blockId,
          blockLabel: seat.blockLabel,
          standId: seat.standId,
        });
      }
    }
  });
  await sleep(3000);

  // Drag mouse slightly to look up toward the floodlights and halos in the sky
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.mouse.move(720, 370, { steps: 10 }); // look up towards the towers
  await page.mouse.up();
  await sleep(1500);

  await page.screenshot({
    path: path.join(artifactDir, 'tu_lighting_seat_facing_lights.png'),
  });

  // 5. Seat View From Grand Pavilion
  console.log('Capturing 5. Seat View From the Grand Pavilion...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    const store = window.__BOOKING_STORE__.getState();
    if (drill) {
      drill.setCustomCamera(null);
      // Find a seat in Pavilion Lower (stand 'p_lower')
      const seat = drill.allSeats.find((s) => s.standId === 'p_lower' && s.row === 'C');
      if (seat) {
        store.selectStand(seat.standId);
        store.selectBlock(seat.blockId);
        store.flyToSeat({
          sectionId: seat.sectionId,
          sectionName: seat.sectionName,
          row: seat.row,
          number: seat.number,
          priceNPR: seat.priceNPR,
          tier: seat.tier,
          cameraPosition: [seat.position[0], seat.position[1] + 1.2, seat.position[2]],
          cameraTarget: [0, 0.4, 0], // Center of pitch
          blockId: seat.blockId,
          blockLabel: seat.blockLabel,
          standId: seat.standId,
        });
      }
    }
  });
  await sleep(2800);
  await page.screenshot({
    path: path.join(artifactDir, 'tu_lighting_seat_pavilion.png'),
  });

  // 6. Close-Up of Floodlight Head
  console.log('Capturing 6. Close-up of Floodlight Head...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    const store = window.__BOOKING_STORE__.getState();
    store.returnToOverview();
    if (drill) {
      // Tower NE is at [46, 0, -88], head tilted down at [46, 49.5, -87.2]
      drill.setCustomCamera({
        pos: [44.8, 49.5, -78.5],
        lookAt: [46.0, 49.5, -88.0],
        fov: 38,
      });
    }
  });
  await sleep(2000);
  await page.screenshot({
    path: path.join(artifactDir, 'tu_lighting_floodlight_head_closeup.png'),
  });

  // 7. Verify Lite Mode Performance
  console.log('Testing Lite Mode...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    const store = window.__BOOKING_STORE__.getState();
    store.returnToOverview();
    store.toggleLiteMode();
    if (drill) {
      drill.setCustomCamera(null);
    }
  });
  await sleep(2000);

  const fpsLite = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function loop() {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(loop);
        } else {
          resolve(Math.round((frames * 1000) / (performance.now() - start)));
        }
      }
      requestAnimationFrame(loop);
    });
  });
  console.log('Lite Mode FPS (1440x900):', fpsLite);

  await page.screenshot({
    path: path.join(artifactDir, 'tu_lighting_lite_mode.png'),
  });

  // Clean up
  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (err) {}

  const results = {
    fpsEvening,
    fpsDay,
    fpsLite,
    screenshots: [
      'tu_lighting_aerial_evening.png',
      'tu_lighting_aerial_day.png',
      'tu_lighting_topdown.png',
      'tu_lighting_seat_facing_lights.png',
      'tu_lighting_seat_pavilion.png',
      'tu_lighting_floodlight_head_closeup.png',
      'tu_lighting_lite_mode.png',
    ],
  };

  fs.writeFileSync(
    path.join(artifactDir, 'lighting_verification_metrics.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('Lighting verification finished successfully!', results);
}

captureLightingSuite().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
