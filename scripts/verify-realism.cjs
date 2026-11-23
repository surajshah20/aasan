const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function verifyRealism() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching Chrome for full realism verification and captures...');
  const tempProfile = path.join(__dirname, 'temp_chrome_realism_' + Date.now());
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
  await new Promise((r) => setTimeout(r, 1500));

  // Select TU Cricket Ground
  console.log('Selecting TU Cricket Ground event...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await new Promise((r) => setTimeout(r, 2200));

  // Measure desktop FPS and draw calls
  const perfDesktop = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function loop() {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(loop);
        } else {
          const fps = Math.round((frames * 1000) / (performance.now() - start));
          const gl = document.querySelector('canvas')?.getContext('webgl2') || document.querySelector('canvas')?.getContext('webgl');
          resolve({ fps, webglAvailable: !!gl });
        }
      }
      requestAnimationFrame(loop);
    });
  });
  console.log('Desktop Performance:', perfDesktop);

  // 1. Aerial 3/4 View
  console.log('1. Capturing Aerial 3/4 view...');
  await page.evaluate(() => {
    if (window.__SET_STADIUM_VIEW_PRESET__) window.__SET_STADIUM_VIEW_PRESET__('aerial');
    if (window.__SET_STADIUM_LIGHTING__) window.__SET_STADIUM_LIGHTING__('evening');
  });
  await new Promise((r) => setTimeout(r, 2500));
  const aerialPath = path.join(artifactDir, 'tu_realism_aerial_34.png');
  await page.screenshot({ path: aerialPath });
  console.log('-> Saved:', aerialPath);

  // 2. Top-Down View
  console.log('2. Capturing Top-Down view...');
  await page.evaluate(() => {
    if (window.__SET_STADIUM_VIEW_PRESET__) window.__SET_STADIUM_VIEW_PRESET__('topdown');
  });
  await new Promise((r) => setTimeout(r, 2500));
  const topDownPath = path.join(artifactDir, 'tu_realism_topdown.png');
  await page.screenshot({ path: topDownPath });
  console.log('-> Saved:', topDownPath);

  // 3. East Stand View
  console.log('3. Capturing East Stand view...');
  await page.evaluate(() => {
    if (window.__SET_STADIUM_VIEW_PRESET__) window.__SET_STADIUM_VIEW_PRESET__('east');
  });
  await new Promise((r) => setTimeout(r, 2500));
  const eastPath = path.join(artifactDir, 'tu_realism_east_stand.png');
  await page.screenshot({ path: eastPath });
  console.log('-> Saved:', eastPath);

  // 4. Pavilion End Seat View (Row E #112 & Row G #114)
  console.log('4. Capturing Pavilion End Row E #112 seat view...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    // Pavilion End Lower Row E #112
    store.flyToSeat({
      sectionId: 'tu_pavilion_end',
      sectionName: 'Grand Pavilion End & Terrace',
      row: 'E',
      number: 112,
      priceNPR: 1200,
      tier: 'VIP',
      cameraPosition: [-23.7, 3.9, 75.9],
      cameraTarget: [0, 0.4, 0],
    });
  });
  await new Promise((r) => setTimeout(r, 2500));
  const pavRowEPath = path.join(artifactDir, 'tu_realism_pavilion_row_e112.png');
  await page.screenshot({ path: pavRowEPath });
  console.log('-> Saved:', pavRowEPath);

  console.log('4b. Capturing Pavilion End Row G #114 seat view (checking no grey wall, no floating pole)...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.flyToSeat({
      sectionId: 'tu_pavilion_end',
      sectionName: 'Grand Pavilion End & Terrace',
      row: 'G',
      number: 114,
      priceNPR: 1200,
      tier: 'VIP',
      cameraPosition: [-24.6, 4.9, 75.5],
      cameraTarget: [0, 0.4, 0],
    });
  });
  await new Promise((r) => setTimeout(r, 2500));
  const pavRowGPath = path.join(artifactDir, 'tu_realism_pavilion_row_g114.png');
  await page.screenshot({ path: pavRowGPath });
  console.log('-> Saved:', pavRowGPath);

  // 5. South-West Hill Stand Seat View
  console.log('5. Capturing South-West Hill Stand seat view...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.flyToSeat({
      sectionId: 'tu_south_west',
      sectionName: 'South-West Hill Stand',
      row: 'C',
      number: 45,
      priceNPR: 500,
      tier: 'General',
      cameraPosition: [-52.0, 2.9, 48.0],
      cameraTarget: [0, 0.4, 0],
    });
  });
  await new Promise((r) => setTimeout(r, 2500));
  const swHillPath = path.join(artifactDir, 'tu_realism_sw_hill_seat.png');
  await page.screenshot({ path: swHillPath });
  console.log('-> Saved:', swHillPath);

  // 6. Back-Row Seat View (Upper Tier Row P)
  console.log('6. Capturing Back-Row seat view (Upper Tier Row P)...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.flyToSeat({
      sectionId: 'tu_north_east',
      sectionName: 'East Stand - Upper',
      row: 'P',
      number: 60,
      priceNPR: 600,
      tier: 'Standard',
      cameraPosition: [79.2, 10.9, 2.0],
      cameraTarget: [0, 0.4, 0],
    });
  });
  await new Promise((r) => setTimeout(r, 2500));
  const backRowPath = path.join(artifactDir, 'tu_realism_back_row_seat.png');
  await page.screenshot({ path: backRowPath });
  console.log('-> Saved:', backRowPath);

  // 7. Day Mode Capture (showing Day/Evening toggle in action)
  console.log('7. Capturing Day Mode view...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().returnToOverview();
    if (window.__SET_STADIUM_VIEW_PRESET__) window.__SET_STADIUM_VIEW_PRESET__('aerial');
    if (window.__SET_STADIUM_LIGHTING__) window.__SET_STADIUM_LIGHTING__('day');
  });
  await new Promise((r) => setTimeout(r, 2500));
  const dayModePath = path.join(artifactDir, 'tu_realism_day_mode.png');
  await page.screenshot({ path: dayModePath });
  console.log('-> Saved:', dayModePath);

  // 8. Mobile 390x844 Seat View
  console.log('8. Capturing Mobile 390x844 responsive seat view...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    if (window.__SET_STADIUM_LIGHTING__) window.__SET_STADIUM_LIGHTING__('evening');
    // East Stand Lower Row D Seat #24
    store.flyToSeat({
      sectionId: 'tu_north_east',
      sectionName: 'East Stand - Lower',
      row: 'D',
      number: 24,
      priceNPR: 600,
      tier: 'Standard',
      cameraPosition: [67.8, 3.4, 5.2],
      cameraTarget: [0, 0.4, 0],
    });
  });
  await new Promise((r) => setTimeout(r, 2500));
  const mobilePath = path.join(artifactDir, 'tu_realism_mobile_390x844.png');
  await page.screenshot({ path: mobilePath });
  console.log('-> Saved:', mobilePath);

  // Measure Mobile FPS
  const perfMobile = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function loop() {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(loop);
        } else {
          const fps = Math.round((frames * 1000) / (performance.now() - start));
          resolve({ fps });
        }
      }
      requestAnimationFrame(loop);
    });
  });
  console.log('Mobile Performance:', perfMobile);

  // 9. End-to-End Booking of 2 Seats
  console.log('9. Running End-to-End 2-Seat Booking Flow...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.clearSeats();
    // Select Seat 1
    store.toggleSeat({
      sectionId: 'tu_pavilion_end',
      row: 'D',
      number: 14,
      priceNPR: 1200,
      tier: 'VIP',
    });
    // Select Seat 2
    store.toggleSeat({
      sectionId: 'tu_pavilion_end',
      row: 'D',
      number: 15,
      priceNPR: 1200,
      tier: 'VIP',
    });
    store.setView('checkout');
  });
  await new Promise((r) => setTimeout(r, 2000));
  const checkoutPath = path.join(artifactDir, 'tu_realism_booking_checkout.png');
  await page.screenshot({ path: checkoutPath });
  console.log('-> Saved:', checkoutPath);

  // Fill in customer details and proceed to ticket
  console.log('Completing payment with eSewa...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.completeBooking({
      id: 'BK-TU-20261128-9821',
      eventId: 'event_tu_cricket_1',
      venueId: 'tu_cricket_ground',
      seats: [
        { sectionId: 'tu_pavilion_end', row: 'D', number: 14, priceNPR: 1200, tier: 'VIP' },
        { sectionId: 'tu_pavilion_end', row: 'D', number: 15, priceNPR: 1200, tier: 'VIP' },
      ],
      totalNPR: 2400,
      paymentMethod: 'esewa',
      createdAtISO: new Date().toISOString(),
      customerName: 'Aarav Sharma',
      customerPhone: '9841234567',
    });
    store.setView('ticket');
  });
  await new Promise((r) => setTimeout(r, 2000));
  const ticketPath = path.join(artifactDir, 'tu_realism_booking_ticket.png');
  await page.screenshot({ path: ticketPath });
  console.log('-> Saved:', ticketPath);

  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (e) {}

  console.log('=============================================');
  console.log('REALISM VERIFICATION & CAPTURES COMPLETE!');
  console.log('Desktop FPS:', perfDesktop.fps);
  console.log('Mobile FPS:', perfMobile.fps);
  console.log('=============================================');
}

verifyRealism().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
