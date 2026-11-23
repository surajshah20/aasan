const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function capture() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching Chrome browser for Sponsor Boards captures...');
  const tempProfile = path.join(__dirname, 'temp_chrome_sponsors_' + Date.now());
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: tempProfile,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1200));

  // Select TU Cricket Ground
  console.log('Selecting TU Cricket Ground venue...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await new Promise((r) => setTimeout(r, 2200));

  // 1. Aerial 3/4 View with Sponsor Boards
  console.log('Capturing: Aerial view with boundary sponsor boards...');
  await page.evaluate(() => {
    if (window.__SET_STADIUM_VIEW_PRESET__) window.__SET_STADIUM_VIEW_PRESET__('aerial');
  });
  await new Promise((r) => setTimeout(r, 2500));
  const aerialPath = path.join(artifactDir, 'tu_stadium_sponsors_aerial.png');
  await page.screenshot({ path: aerialPath });
  console.log('-> Saved:', aerialPath);

  // 2. East Stand View with Blushbook board in front
  console.log('Capturing: East Stand view...');
  await page.evaluate(() => {
    if (window.__SET_STADIUM_VIEW_PRESET__) window.__SET_STADIUM_VIEW_PRESET__('east');
  });
  await new Promise((r) => setTimeout(r, 2500));
  const eastPath = path.join(artifactDir, 'tu_stadium_sponsors_east_stand.png');
  await page.screenshot({ path: eastPath });
  console.log('-> Saved:', eastPath);

  // 3. Front-Row Seat View (Row A) where Blushbook board is in foreground below pitch
  console.log('Capturing: Front-row seat view with Blushbook board in foreground...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    // Sitting in Lower Tier Row A (East Stand center), looking across toward the pitch
    // Boundary board is right below in the foreground with Blushbook clearly visible
    store.flyToSeat({
      sectionId: 'tu_north_east',
      sectionName: 'East Stand - Lower',
      row: 'A',
      number: 16,
      priceNPR: 600,
      tier: 'Standard',
      cameraPosition: [63.6, 1.92, 0.8],
      cameraTarget: [10.0, -0.1, 0.2],
    });
  });
  await new Promise((r) => setTimeout(r, 2500));
  const frontRowPath = path.join(artifactDir, 'tu_stadium_sponsors_front_row_seat.png');
  await page.screenshot({ path: frontRowPath });
  console.log('-> Saved:', frontRowPath);

  // 4. Pavilion Front-Row Seat View (facing North toward Blushbook board at North boundary)
  console.log('Capturing: Pavilion front view looking across to Blushbook board...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.flyToSeat({
      sectionId: 'tu_pavilion_end',
      sectionName: 'South Pavilion',
      row: 'A',
      number: 10,
      priceNPR: 1200,
      tier: 'Pavilion Club',
      cameraPosition: [0, 2.1, 74.0],
      cameraTarget: [0, 0.6, -66.0],
    });
  });
  await new Promise((r) => setTimeout(r, 2500));
  const pavilionPath = path.join(artifactDir, 'tu_stadium_sponsors_pavilion_seat.png');
  await page.screenshot({ path: pavilionPath });
  console.log('-> Saved:', pavilionPath);

  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (e) {}
  console.log('All sponsor board captures complete!');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
