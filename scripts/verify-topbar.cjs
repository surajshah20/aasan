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

  async function captureTopBar(name, width) {
    await page.setViewport({ width, height: 750, deviceScaleFactor: 2 });
    await new Promise((r) => setTimeout(r, 500));
    
    const rect = await page.evaluate(() => {
      const el = document.querySelector('header');
      if (!el) return { x: 0, y: 0, width: window.innerWidth, height: 60 };
      const r = el.getBoundingClientRect();
      return { x: 0, y: 0, width: Math.round(r.width), height: Math.round(r.height) };
    });

    const outPath = path.join(artifactDir, `${name}.png`);
    await page.screenshot({
      path: outPath,
      clip: {
        x: 0,
        y: 0,
        width: rect.width || width,
        height: Math.max(56, rect.height || 60),
      },
    });
    console.log(`-> Saved: ${name}.png (${width}px, height: ${rect.height}px)`);
  }

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 600));

  // ==========================================
  // 1. Stadium (1440, 1024, 390)
  // ==========================================
  console.log('1. Capturing Stadium Top-Bar...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    store.setView('venue');
  });
  await captureTopBar('topbar_stadium_1440', 1440);
  await captureTopBar('topbar_stadium_1024', 1024);
  await captureTopBar('topbar_stadium_390', 390);

  // ==========================================
  // 2. Cinema (1440, 1024, 390)
  // ==========================================
  console.log('2. Capturing Cinema Top-Bar (QFX Civil Mall)...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.selectVenue('qfx_civil_audi1', 'event_qfx_movie_1');
    store.setView('venue');
  });
  await captureTopBar('topbar_cinema_1440', 1440);
  await captureTopBar('topbar_cinema_1024', 1024);
  await captureTopBar('topbar_cinema_390', 390);

  // ==========================================
  // 3. Ticket Page (1440, 1024, 390)
  // ==========================================
  console.log('3. Capturing Ticket Page Top-Bar...');
  await page.evaluate(() => {
    const stadiumSeats = [
      {
        sectionId: 'tu_pavilion_end',
        standId: 'grand_pavilion',
        standName: 'Grand Pavilion — Lower',
        blockId: 'P1',
        blockLabel: 'Block P1',
        row: 'A',
        number: 1,
        priceNPR: 1200,
        tier: 'VIP'
      }
    ];
    window.__BOOKING_STORE__.setState({
      selectedVenueId: 'tu_cricket_ground',
      selectedEventId: 'event_tu_cricket_1',
      selectedSeats: stadiumSeats,
      bookingResult: {
        id: 'ASN-931651',
        eventId: 'event_tu_cricket_1',
        venueId: 'tu_cricket_ground',
        seats: stadiumSeats,
        totalNPR: 1200,
        paymentMethod: 'esewa',
        phone: '9841234567',
        timestamp: '2026-11-28T13:15:00.000Z',
      },
      currentView: 'ticket',
    });
  });
  await new Promise((r) => setTimeout(r, 3500));
  await captureTopBar('topbar_ticket_1440', 1440);
  await captureTopBar('topbar_ticket_1024', 1024);
  await captureTopBar('topbar_ticket_390', 390);

  await browser.close();
  console.log('All topbar verification screenshots successfully captured!');
}

run().catch((err) => {
  console.error('Error running verification:', err);
  process.exit(1);
});
