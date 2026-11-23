const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function capture() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching Chrome browser for PART A captures...');
  const tempProfile = path.join(__dirname, 'temp_chrome_stadium_partA_' + Date.now());
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
  await new Promise((r) => setTimeout(r, 2000));

  // 1. Aerial 3/4 View
  console.log('Capturing Part A: Aerial 3/4 view...');
  await page.evaluate(() => {
    if (window.__SET_STADIUM_VIEW_PRESET__) window.__SET_STADIUM_VIEW_PRESET__('aerial');
  });
  await new Promise((r) => setTimeout(r, 2000));
  const aerialPath = path.join(artifactDir, 'tu_stadium_partA_aerial_34.png');
  await page.screenshot({ path: aerialPath });
  console.log('-> Saved:', aerialPath);

  // 2. Top-down View
  console.log('Capturing Part A: Top-Down view...');
  await page.evaluate(() => {
    if (window.__SET_STADIUM_VIEW_PRESET__) window.__SET_STADIUM_VIEW_PRESET__('topdown');
  });
  await new Promise((r) => setTimeout(r, 2000));
  const topdownPath = path.join(artifactDir, 'tu_stadium_partA_topdown.png');
  await page.screenshot({ path: topdownPath });
  console.log('-> Saved:', topdownPath);

  // 3. East Stand View
  console.log('Capturing Part A: East Stand view...');
  await page.evaluate(() => {
    if (window.__SET_STADIUM_VIEW_PRESET__) window.__SET_STADIUM_VIEW_PRESET__('east');
  });
  await new Promise((r) => setTimeout(r, 2000));
  const eastPath = path.join(artifactDir, 'tu_stadium_partA_east_stand.png');
  await page.screenshot({ path: eastPath });
  console.log('-> Saved:', eastPath);

  // 4. West Stand View
  console.log('Capturing Part A: West Stand view...');
  await page.evaluate(() => {
    if (window.__SET_STADIUM_VIEW_PRESET__) window.__SET_STADIUM_VIEW_PRESET__('west');
  });
  await new Promise((r) => setTimeout(r, 2000));
  const westPath = path.join(artifactDir, 'tu_stadium_partA_west_stand.png');
  await page.screenshot({ path: westPath });
  console.log('-> Saved:', westPath);

  // 5. Seat Close-up View
  console.log('Capturing Part A: Seat Close-Up view...');
  await page.evaluate(() => {
    if (window.__SET_STADIUM_VIEW_PRESET__) window.__SET_STADIUM_VIEW_PRESET__('close_seats');
  });
  await new Promise((r) => setTimeout(r, 2000));
  const closeupPath = path.join(artifactDir, 'tu_stadium_partA_seat_closeup.png');
  await page.screenshot({ path: closeupPath });
  console.log('-> Saved:', closeupPath);

  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (e) {}
  console.log('All Part A captures complete!');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
