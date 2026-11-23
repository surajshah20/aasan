const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function capture() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching Chrome browser...');
  const tempProfile = path.join(__dirname, 'temp_chrome_overview_' + Date.now());
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: tempProfile,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage();

  // Desktop Viewport (1440 x 900)
  console.log('Setting viewport to Desktop (1440x900)...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1200));

  // Enter cinema overview
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('qfx_civil_audi1', 'event_qfx_movie_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await new Promise((r) => setTimeout(r, 2200));

  // Capture overview clean
  const cleanOverviewPath = path.join(artifactDir, 'cinema_overview_polished_1440x900.png');
  await page.screenshot({ path: cleanOverviewPath });
  console.log('-> Captured Clean Polished Overview:', cleanOverviewPath);

  // Select 2 seats so selected state (emerald green) is visible alongside sold (grey X), accessible (cyan ring) and tier bases
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().toggleSeat({
      sectionId: 'qfx_audi1_recliner',
      row: 'J',
      number: 5,
      priceNPR: 650,
      tier: 'Recliner',
    });
    window.__BOOKING_STORE__.getState().toggleSeat({
      sectionId: 'qfx_audi1_recliner',
      row: 'J',
      number: 6,
      priceNPR: 650,
      tier: 'Recliner',
    });
  });
  await new Promise((r) => setTimeout(r, 1000));

  const statesOverviewPath = path.join(artifactDir, 'cinema_overview_seat_states_1440x900.png');
  await page.screenshot({ path: statesOverviewPath });
  console.log('-> Captured Seat States Overview:', statesOverviewPath);

  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (e) {}
  console.log('Done!');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
