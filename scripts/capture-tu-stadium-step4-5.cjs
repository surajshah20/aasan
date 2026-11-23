const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function capture() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching Chrome browser for TU Stadium Step 4 & 5 captures...');
  const tempProfile = path.join(__dirname, 'temp_chrome_stadium_step4_5_' + Date.now());
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: tempProfile,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));

  // Select TU Cricket Ground
  console.log('Selecting TU Cricket Ground...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await new Promise((r) => setTimeout(r, 2500));

  // 1. Step 4 Aerial Evening Overview with Floodlights, Canopy, Pavilion, Scoreboard
  console.log('Capturing Step 4 Aerial Evening Overview...');
  const aerialPath = path.join(artifactDir, 'tu_stadium_step4_aerial_evening_1440x900.png');
  await page.screenshot({ path: aerialPath });
  console.log('-> Saved:', aerialPath);

  // 2. North VIP Canopy Close-Up
  console.log('Capturing North VIP Canopy Close-Up...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    // Position camera facing North VIP Stand looking up at the canopy & #HAMROSHAAN fascia
    store.flyToSeat({
      sectionId: 'tu_north_canopy',
      sectionName: 'North VIP Canopy',
      row: 'B',
      number: 12,
      priceNPR: 1500,
      tier: 'VIP Canopy',
      cameraPosition: [0, 6.0, -42],
      cameraTarget: [0, 12.0, -84],
    });
  });
  await new Promise((r) => setTimeout(r, 2500));
  const canopyPath = path.join(artifactDir, 'tu_stadium_step4_north_canopy_close_1440x900.png');
  await page.screenshot({ path: canopyPath });
  console.log('-> Saved:', canopyPath);

  // 3. South Pavilion Building Close-Up
  console.log('Capturing South Pavilion Building Close-Up...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.flyToSeat({
      sectionId: 'tu_pavilion_end',
      sectionName: 'South Pavilion',
      row: 'A',
      number: 8,
      priceNPR: 1200,
      tier: 'Pavilion Club',
      cameraPosition: [0, 4.0, 48],
      cameraTarget: [0, 10.0, 92],
    });
  });
  await new Promise((r) => setTimeout(r, 2500));
  const pavilionPath = path.join(artifactDir, 'tu_stadium_step4_pavilion_close_1440x900.png');
  await page.screenshot({ path: pavilionPath });
  console.log('-> Saved:', pavilionPath);

  // 4. Pitch-side Floodlights, Sight Screens & Scoreboard View
  console.log('Capturing Pitch-Side Floodlights & Sight Screens...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.flyToSeat({
      sectionId: 'tu_west_stand',
      sectionName: 'West Stand',
      row: 'C',
      number: 16,
      priceNPR: 600,
      tier: 'Standard',
      cameraPosition: [-45, 3.5, 0],
      cameraTarget: [50, 12.0, -20],
    });
  });
  await new Promise((r) => setTimeout(r, 2500));
  const pitchLightsPath = path.join(artifactDir, 'tu_stadium_step4_floodlights_and_pitch_1440x900.png');
  await page.screenshot({ path: pitchLightsPath });
  console.log('-> Saved:', pitchLightsPath);

  // 5. Step 5: 2D SVG Fallback Map
  console.log('Switching to 2D Fallback Map...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.returnToOverview();
    store.setLiteMode(true);
  });
  await new Promise((r) => setTimeout(r, 1500));
  const map2dPath = path.join(artifactDir, 'tu_stadium_step5_2d_fallback_1440x900.png');
  await page.screenshot({ path: map2dPath });
  console.log('-> Saved:', map2dPath);

  // Switch back to 3D mode for Mobile tests
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.setLiteMode(false);
  });
  await new Promise((r) => setTimeout(r, 1000));

  // 6. Step 5: Mobile Viewport 390x844 (Overview)
  console.log('Setting mobile viewport (390x844) for Overview...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 2000));
  const mobileOverviewPath = path.join(artifactDir, 'tu_stadium_step5_mobile_overview_390x844.png');
  await page.screenshot({ path: mobileOverviewPath });
  console.log('-> Saved:', mobileOverviewPath);

  // 7. Step 5: Mobile Viewport 390x844 (Seat View with Responsive Bottom Bar)
  console.log('Capturing Mobile Seat View with Bottom Bar...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.flyToSeat({
      sectionId: 'tu_pavilion_end',
      sectionName: 'South Pavilion',
      row: 'C',
      number: 14,
      priceNPR: 1200,
      tier: 'Pavilion Club',
      cameraPosition: [9.5, 2.92, 77.0],
      cameraTarget: [0, 0.8, 0],
    });
  });
  await new Promise((r) => setTimeout(r, 2500));
  const mobileSeatPath = path.join(artifactDir, 'tu_stadium_step5_mobile_seatview_390x844.png');
  await page.screenshot({ path: mobileSeatPath });
  console.log('-> Saved:', mobileSeatPath);

  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (e) {}
  console.log('All Step 4 & 5 screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
