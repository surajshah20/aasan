const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function capture() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching Chrome browser...');
  const tempProfile = path.join(__dirname, 'temp_chrome_' + Date.now());
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: tempProfile,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage();

  // ─── 1. Desktop Viewport (1440 x 900) ───
  console.log('1. Setting viewport to Desktop (1440x900)...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));

  // Enter cinema overview
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('qfx_civil_audi1', 'event_qfx_movie_1');
  });
  await new Promise((r) => setTimeout(r, 2200));

  const desktopOverviewPath = path.join(artifactDir, 'hero_desktop_overview_1440x900.png');
  await page.screenshot({ path: desktopOverviewPath });
  console.log('-> Captured Desktop Overview:', desktopOverviewPath);

  // Fly to Seat (Row K Seat 3 - Royal Recliner)
  await page.evaluate(() => {
    const debug = window.__CINEMA_DEBUG__;
    let seat = null;
    if (debug && debug.seatsData) {
      seat = debug.seatsData.find((s) => s.row === 'K' && s.number === 3);
    }
    if (seat) {
      window.__BOOKING_STORE__.getState().flyToSeat({
        sectionId: seat.sectionId,
        sectionName: seat.sectionName,
        row: seat.row,
        number: seat.number,
        priceNPR: seat.priceNPR,
        tier: seat.tier,
        cameraPosition: [seat.position[0], seat.position[1] + 1.1, seat.position[2]],
        cameraTarget: [0, 4.3, -13.5],
      });
    } else {
      window.__BOOKING_STORE__.getState().flyToSeat({
        sectionId: 'qfx_audi1_recliner',
        sectionName: 'Royal Recliner',
        row: 'K',
        number: 3,
        priceNPR: 650,
        tier: 'Recliner',
        cameraPosition: [0.85, 4.4, 10.0],
        cameraTarget: [0, 4.3, -13.5],
      });
    }
  });
  // Wait for fly-in animation and seatview transition
  await new Promise((r) => setTimeout(r, 2500));
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().setCameraMode('seatview');
  });
  await new Promise((r) => setTimeout(r, 800));

  const desktopSeatviewPath = path.join(artifactDir, 'hero_desktop_seatview_1440x900.png');
  await page.screenshot({ path: desktopSeatviewPath });
  console.log('-> Captured Desktop Seat View:', desktopSeatviewPath);

  // ─── 2. Mobile Viewport (390 x 844) ───
  console.log('2. Setting viewport to Mobile (390x844)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  
  // Ensure venue view in overview mode
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('qfx_civil_audi1', 'event_qfx_movie_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await new Promise((r) => setTimeout(r, 2200));

  const mobileOverviewPath = path.join(artifactDir, 'hero_mobile_overview_390x844.png');
  await page.screenshot({ path: mobileOverviewPath });
  console.log('-> Captured Mobile Overview:', mobileOverviewPath);

  // Seat view on mobile (Row K Seat 3)
  await page.evaluate(() => {
    const debug = window.__CINEMA_DEBUG__;
    let seat = null;
    if (debug && debug.seatsData) {
      seat = debug.seatsData.find((s) => s.row === 'K' && s.number === 3);
    }
    if (seat) {
      window.__BOOKING_STORE__.getState().flyToSeat({
        sectionId: seat.sectionId,
        sectionName: seat.sectionName,
        row: seat.row,
        number: seat.number,
        priceNPR: seat.priceNPR,
        tier: seat.tier,
        cameraPosition: [seat.position[0], seat.position[1] + 1.1, seat.position[2]],
        cameraTarget: [0, 4.3, -13.5],
      });
    } else {
      window.__BOOKING_STORE__.getState().flyToSeat({
        sectionId: 'qfx_audi1_recliner',
        sectionName: 'Royal Recliner',
        row: 'K',
        number: 3,
        priceNPR: 650,
        tier: 'Recliner',
        cameraPosition: [0.85, 4.4, 10.0],
        cameraTarget: [0, 4.3, -13.5],
      });
    }
  });
  await new Promise((r) => setTimeout(r, 2500));
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().setCameraMode('seatview');
  });
  await new Promise((r) => setTimeout(r, 800));

  const mobileSeatviewPath = path.join(artifactDir, 'hero_mobile_seatview_390x844.png');
  await page.screenshot({ path: mobileSeatviewPath });
  console.log('-> Captured Mobile Seat View:', mobileSeatviewPath);

  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (e) {}
  console.log('All 4 hero screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
