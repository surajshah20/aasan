const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching browser with Chrome...');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('1. Navigating to Landing Page...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(artifactDir, 'phase1_1_landing.png') });
  console.log('-> Captured Landing Page');

  console.log('2. Entering QFX Cinemas Civil Mall...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('qfx_civil_audi1', 'event_qfx_movie_1');
  });
  await new Promise((r) => setTimeout(r, 2000));
  await page.screenshot({ path: path.join(artifactDir, 'phase1_2_venue_overview.png') });
  console.log('-> Captured Cinema Overview');

  console.log('3. Triggering Seat View Fly-in (Royal Recliner)...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectSection('qfx_audi1_recliner');
  });
  await new Promise((r) => setTimeout(r, 2200));
  await page.screenshot({ path: path.join(artifactDir, 'phase1_3_seat_view_flyin.png') });
  console.log('-> Captured Seat View Fly-in');

  console.log('4. Selecting 2 Seats and checking Cart...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().toggleSeat({
      sectionId: 'qfx_audi1_recliner',
      row: 'A',
      number: 1,
      priceNPR: 650,
      tier: 'Recliner',
    });
    window.__BOOKING_STORE__.getState().toggleSeat({
      sectionId: 'qfx_audi1_recliner',
      row: 'A',
      number: 2,
      priceNPR: 650,
      tier: 'Recliner',
    });
  });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: path.join(artifactDir, 'phase1_4_seats_and_cart.png') });
  console.log('-> Captured Seats & Cart Bar');

  console.log('5. Navigating to Mock Checkout...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().setView('checkout');
  });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(artifactDir, 'phase1_5_checkout_esewa.png') });
  console.log('-> Captured Checkout Screen');

  console.log('6. Simulating Successful Payment...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().completeBooking({
      id: 'ASN-849201',
      eventId: 'event_qfx_movie_1',
      venueId: 'qfx_civil_audi1',
      seats: [
        { sectionId: 'qfx_audi1_recliner', row: 'A', number: 1, priceNPR: 650, tier: 'Recliner' },
        { sectionId: 'qfx_audi1_recliner', row: 'A', number: 2, priceNPR: 650, tier: 'Recliner' },
      ],
      totalNPR: 1300,
      paymentMethod: 'esewa',
      createdAtISO: new Date().toISOString(),
      customerName: 'Aasan Guest User',
      customerPhone: '+977 98XXXXXXXX',
    });
  });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(artifactDir, 'phase1_6_digital_ticket.png') });
  console.log('-> Captured Digital Ticket with QR code');

  console.log('7. Switching Language to Nepali (नेपाली)...');
  await page.evaluate(() => {
    window.__I18N_STORE__.getState().setLanguage('ne');
  });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'phase1_7_nepali_ticket.png') });
  console.log('-> Captured Nepali Ticket View');

  console.log('8. Testing Lite Mode (2D SVG Map fallback)...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('qfx_civil_audi1', 'event_qfx_movie_1');
    window.__BOOKING_STORE__.getState().setLiteMode(true);
    window.__I18N_STORE__.getState().setLanguage('en');
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(artifactDir, 'phase1_8_lite_mode_2d.png') });
  console.log('-> Captured Lite Mode 2D SVG Map');

  console.log('9. Testing Mobile Viewport (375px)...');
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().resetAll();
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(artifactDir, 'phase1_9_mobile_375px.png') });
  console.log('-> Captured Mobile Viewport (375px)');

  console.log('All verification screenshots captured successfully!');
  await browser.close();
}

run().catch((err) => {
  console.error('Error during verification:', err);
  process.exit(1);
});
