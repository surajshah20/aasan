const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function capture() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching Chrome browser for TU Stadium Step 1 captures...');
  const tempProfile = path.join(__dirname, 'temp_chrome_stadium_' + Date.now());
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

  // Switch to TU Stadium
  console.log('Switching to TU Cricket Ground...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await new Promise((r) => setTimeout(r, 2500));

  // 1. Aerial 3/4 View
  console.log('Capturing Aerial 3/4 View...');
  const aerialPath = path.join(artifactDir, 'tu_stadium_step1_aerial_1440x900.png');
  await page.screenshot({ path: aerialPath });
  console.log('-> Saved:', aerialPath);

  // 2. Top-Down View
  console.log('Switching to Top-Down View...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes('Top-Down'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 2200));

  const topdownPath = path.join(artifactDir, 'tu_stadium_step1_topdown_1440x900.png');
  await page.screenshot({ path: topdownPath });
  console.log('-> Saved:', topdownPath);

  // 3. Pitch-side East Stand
  console.log('Switching to East Stand View...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes('East Stand'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 2200));

  const eastPath = path.join(artifactDir, 'tu_stadium_step1_east_stand_1440x900.png');
  await page.screenshot({ path: eastPath });
  console.log('-> Saved:', eastPath);

  // 4. Pitch-side West Stand
  console.log('Switching to West Stand View...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes('West Stand'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 2200));

  const westPath = path.join(artifactDir, 'tu_stadium_step1_west_stand_1440x900.png');
  await page.screenshot({ path: westPath });
  console.log('-> Saved:', westPath);

  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (e) {}
  console.log('All 4 Step 1 stadium screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
