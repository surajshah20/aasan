const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function captureTargetedFixes() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching browser for Targeted Fixes Verification...');
  const tempProfile = path.join(__dirname, 'temp_chrome_fixes_' + Date.now());
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

  // 1. Night Aerial View
  console.log('1. Capturing Night Aerial View...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    const store = window.__BOOKING_STORE__.getState();
    store.returnToOverview();
    if (drill) {
      drill.setLightingMode('evening');
      drill.setCustomCamera(null);
    }
  });
  await sleep(2200);
  await page.screenshot({
    path: path.join(artifactDir, 'tu_fix_1_night_aerial.png'),
  });

  // 2. Day Aerial View
  console.log('2. Capturing Day Aerial View...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('day');
      drill.setCustomCamera(null);
    }
  });
  await sleep(2200);
  await page.screenshot({
    path: path.join(artifactDir, 'tu_fix_2_day_aerial.png'),
  });

  // Switch back to evening for night seat tests
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) drill.setLightingMode('evening');
  });
  await sleep(1000);

  // 3. Night Seat View: NE Upper stand looking up at the sky
  console.log('3. Capturing NE Upper seat looking up at sky (verifying no floating cone / open ring)...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    const store = window.__BOOKING_STORE__.getState();
    drill.setCustomCamera(null);
    // Find a seat in North-East Stand Upper (ne_upper)
    const seat = drill.allSeats.find((s) => s.standId === 'ne_upper' && s.row === 'J')
      || drill.allSeats.find((s) => s.standId === 'ne_upper' && s.row === 'G')
      || drill.allSeats.find((s) => s.standId === 'ne_upper');
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
        cameraTarget: [0, 28.0, 0], // Looking up toward the sky above the field
        blockId: seat.blockId,
        blockLabel: seat.blockLabel,
        standId: seat.standId,
      });
    }
  });
  await sleep(2800);

  // Drag look slightly upward
  await page.mouse.move(720, 450);
  await page.mouse.down();
  await page.mouse.move(720, 320, { steps: 10 });
  await page.mouse.up();
  await sleep(1500);

  await page.screenshot({
    path: path.join(artifactDir, 'tu_fix_3_night_seat_ne_upper_sky.png'),
  });

  // 4. Night Seat View: Facing pitch from Upper Tier
  console.log('4. Capturing upper-tier seat facing pitch (verifying pitch brightness & warm readable seats)...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    const store = window.__BOOKING_STORE__.getState();
    drill.setCustomCamera(null);
    const seat = drill.allSeats.find((s) => s.standId === 'e_upper' && s.row === 'D')
      || drill.allSeats.find((s) => s.standId === 'e_upper');
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
        cameraTarget: [0, 0.4, 0],
        blockId: seat.blockId,
        blockLabel: seat.blockLabel,
        standId: seat.standId,
      });
    }
  });
  await sleep(2800);
  await page.screenshot({
    path: path.join(artifactDir, 'tu_fix_4_night_seat_upper_pitch.png'),
  });

  // 5. Night Seat View from Pavilion
  console.log('5. Capturing Pavilion seat view (foreground sponsor boards & field lighting)...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    const store = window.__BOOKING_STORE__.getState();
    drill.setCustomCamera(null);
    const seat = drill.allSeats.find((s) => s.standId === 'p_lower' && s.row === 'C')
      || drill.allSeats.find((s) => s.standId === 'p_lower');
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
        cameraTarget: [0, 0.4, 0],
        blockId: seat.blockId,
        blockLabel: seat.blockLabel,
        standId: seat.standId,
      });
    }
  });
  await sleep(2800);
  await page.screenshot({
    path: path.join(artifactDir, 'tu_fix_5_night_seat_pavilion.png'),
  });

  // 6. Close-Up of Floodlight Head with Beam
  console.log('6. Capturing close-up of Floodlight Head with its beam...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    const store = window.__BOOKING_STORE__.getState();
    store.returnToOverview();
    if (drill) {
      // Look from front-side of NE tower head [46, 49.5, -88] showing emissive cells + beam cone
      drill.setCustomCamera({
        pos: [28.0, 44.0, -62.0],
        lookAt: [46.0, 49.5, -88.0],
        fov: 50,
      });
    }
  });
  await sleep(2200);
  await page.screenshot({
    path: path.join(artifactDir, 'tu_fix_6_floodlight_head_beam_closeup.png'),
  });

  // 7. Top Bar in Seat View & 8-seat limit test
  console.log('7. Capturing Top Bar in Seat View (no overlaps, clean layout & 8-seat limit button)...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    const store = window.__BOOKING_STORE__.getState();
    drill.setCustomCamera(null);

    // Select 8 seats to test the seat limit button behavior
    store.clearSeats();
    for (let i = 1; i <= 8; i++) {
      store.toggleSeat({
        sectionId: 's_grand_pavilion',
        sectionName: 'Grand Pavilion',
        row: 'A',
        number: i,
        priceNPR: 1200,
        tier: 'VIP',
      });
    }

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
        cameraTarget: [0, 0.4, 0],
        blockId: seat.blockId,
        blockLabel: seat.blockLabel,
        standId: seat.standId,
      });
    }
  });
  await sleep(2500);
  await page.screenshot({
    path: path.join(artifactDir, 'tu_fix_7_top_bar_seat_view.png'),
  });

  // 8. Mobile 390x844 Seat View
  console.log('8. Capturing Mobile 390x844 Seat View...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await sleep(800);
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    const drill = window.__STADIUM_DRILL__;
    if (store.currentView !== 'venue' || store.selectedVenueId !== 'tu_cricket_ground') {
      store.selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    }
    if (drill) {
      drill.setCustomCamera(null);
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
          cameraTarget: [0, 0.4, 0],
          blockId: seat.blockId,
          blockLabel: seat.blockLabel,
          standId: seat.standId,
        });
      }
    }
  });
  await sleep(3200);
  await page.screenshot({
    path: path.join(artifactDir, 'tu_fix_8_seat_view_390x844.png'),
  });

  console.log('Finished capturing all targeted fix screenshots!');
  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (err) {}
}

captureTargetedFixes().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
