const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function run() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  async function snap(url, viewWidth, setupFn, outName) {
    const page = await browser.newPage();
    await page.setViewport({ width: viewWidth, height: 750, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.evaluate(setupFn);
    await new Promise(r => setTimeout(r, 600));
    const rect = await page.evaluate(() => {
      const el = document.querySelector('header');
      if (!el) return { height: 60 };
      const r = el.getBoundingClientRect();
      return { height: Math.round(r.height) };
    });
    const outPath = path.join(artifactDir, `${outName}.png`);
    await page.screenshot({
      path: outPath,
      clip: { x: 0, y: 0, width: viewWidth, height: Math.max(56, rect.height || 60) },
    });
    console.log(`-> Saved: ${outName}.png (${viewWidth}px)`);
    await page.close();
  }

  // 1. Cinema 1024 & 390
  await snap('http://127.0.0.1:5173/', 1024, () => {
    window.__BOOKING_STORE__.getState().selectVenue('qfx_civil_audi1', 'event_qfx_movie_1');
    window.__BOOKING_STORE__.getState().setView('venue');
  }, 'topbar_cinema_1024');

  await snap('http://127.0.0.1:5173/', 390, () => {
    window.__BOOKING_STORE__.getState().selectVenue('qfx_civil_audi1', 'event_qfx_movie_1');
    window.__BOOKING_STORE__.getState().setView('venue');
  }, 'topbar_cinema_390');

  // 2. Ticket Page 1440, 1024, 390
  const ticketSetup = () => {
    const stadiumSeats = [{
      sectionId: 'tu_pavilion_end',
      standId: 'grand_pavilion',
      standName: 'Grand Pavilion — Lower',
      blockId: 'P1',
      blockLabel: 'Block P1',
      row: 'A',
      number: 1,
      priceNPR: 1200,
      tier: 'VIP'
    }];
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
  };

  await snap('http://127.0.0.1:5173/', 1440, ticketSetup, 'topbar_ticket_1440');
  await snap('http://127.0.0.1:5173/', 1024, ticketSetup, 'topbar_ticket_1024');
  await snap('http://127.0.0.1:5173/', 390, ticketSetup, 'topbar_ticket_390');

  await browser.close();
  console.log('Done capturing remaining topbars!');
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
