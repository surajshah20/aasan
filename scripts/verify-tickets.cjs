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

  // 1. Stadium 4-Seat Booking at 1440px
  console.log('1. Setting up 4-seat Stadium Booking (TU International Cricket Ground)...');
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 600));

  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    
    // Set 4 stadium seats in Grand Pavilion - Lower, Block P1, Row A, Seats 1-4
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
      },
      {
        sectionId: 'tu_pavilion_end',
        standId: 'grand_pavilion',
        standName: 'Grand Pavilion — Lower',
        blockId: 'P1',
        blockLabel: 'Block P1',
        row: 'A',
        number: 2,
        priceNPR: 1200,
        tier: 'VIP'
      },
      {
        sectionId: 'tu_pavilion_end',
        standId: 'grand_pavilion',
        standName: 'Grand Pavilion — Lower',
        blockId: 'P1',
        blockLabel: 'Block P1',
        row: 'A',
        number: 3,
        priceNPR: 1200,
        tier: 'VIP'
      },
      {
        sectionId: 'tu_pavilion_end',
        standId: 'grand_pavilion',
        standName: 'Grand Pavilion — Lower',
        blockId: 'P1',
        blockLabel: 'Block P1',
        row: 'A',
        number: 4,
        priceNPR: 1200,
        tier: 'VIP'
      }
    ];

    window.__BOOKING_STORE__.setState({
      selectedSeats: stadiumSeats,
      bookingResult: {
        id: 'ASN-931651',
        eventId: 'event_tu_cricket_1',
        venueId: 'tu_cricket_ground',
        seats: stadiumSeats,
        totalNPR: 4800,
        paymentMethod: 'esewa',
        phone: '9841234567',
        timestamp: '2026-11-28T13:15:00.000Z',
      },
      currentView: 'ticket',
    });
  });

  // Wait 3.5s so confetti animation completes and clears
  await new Promise((r) => setTimeout(r, 3500));
  const stadium1440Path = path.join(artifactDir, 'ticket_stadium_1440.png');
  await page.screenshot({ path: stadium1440Path, fullPage: true });
  console.log(`-> Saved 1440px Stadium Ticket: ${stadium1440Path}`);

  // 2. Stadium 4-Seat Booking at 390px (Mobile)
  console.log('2. Resizing to 390px (Mobile Stadium)...');
  await page.setViewport({ width: 390, height: 950, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 600));
  const stadium390Path = path.join(artifactDir, 'ticket_stadium_390.png');
  await page.screenshot({ path: stadium390Path, fullPage: true });
  console.log(`-> Saved 390px Stadium Ticket: ${stadium390Path}`);

  // 3. Generate & Save Ticket Image
  console.log('3. Triggering Save Ticket Image via button click...');
  await page.setViewport({ width: 1440, height: 1100, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 400));
  
  await page.evaluate(async () => {
    const btn = document.getElementById('btn-download-ticket');
    if (btn) {
      btn.click();
    } else if (window.__generateTicketDataUrl) {
      await window.__generateTicketDataUrl();
    }
  });

  await new Promise((r) => setTimeout(r, 1200));

  const savedDataUrl = await page.evaluate(() => {
    return window.__lastTicketDataUrl || null;
  });

  if (savedDataUrl && savedDataUrl.startsWith('data:image/png;base64,')) {
    const base64Data = savedDataUrl.replace(/^data:image\/png;base64,/, '');
    const savedImagePath = path.join(artifactDir, 'ticket_saved_image.png');
    fs.writeFileSync(savedImagePath, base64Data, 'base64');
    console.log(`-> Saved High-Res Ticket Image to: ${savedImagePath}`);
  } else {
    console.error('ERROR: Could not retrieve __lastTicketDataUrl from window');
  }

  // 4. Cinema 2-Seat Booking at 1440px
  console.log('4. Setting up 2-seat Cinema Booking (QFX Civil Mall Audi 1)...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.selectVenue('qfx_civil_audi1', 'event_qfx_movie_1');

    const cinemaSeats = [
      {
        sectionId: 'qfx_audi1_premium',
        row: 'K',
        number: 6,
        priceNPR: 450,
        tier: 'Premium'
      },
      {
        sectionId: 'qfx_audi1_premium',
        row: 'K',
        number: 7,
        priceNPR: 450,
        tier: 'Premium'
      }
    ];

    window.__BOOKING_STORE__.setState({
      selectedSeats: cinemaSeats,
      bookingResult: {
        id: 'ASN-884210',
        eventId: 'event_qfx_movie_1',
        venueId: 'qfx_civil_audi1',
        seats: cinemaSeats,
        totalNPR: 900,
        paymentMethod: 'khalti',
        phone: '9801234567',
        timestamp: '2026-11-28T13:15:00.000Z',
      },
      currentView: 'ticket',
    });
  });

  // Wait 3.5s so confetti animation completes and clears
  await new Promise((r) => setTimeout(r, 3500));
  const cinema1440Path = path.join(artifactDir, 'ticket_cinema_1440.png');
  await page.screenshot({ path: cinema1440Path, fullPage: true });
  console.log(`-> Saved 1440px Cinema Ticket: ${cinema1440Path}`);

  // 5. Cinema 2-Seat Booking at 390px (Mobile)
  console.log('5. Resizing to 390px (Mobile Cinema)...');
  await page.setViewport({ width: 390, height: 950, deviceScaleFactor: 2 });
  await new Promise((r) => setTimeout(r, 600));
  const cinema390Path = path.join(artifactDir, 'ticket_cinema_390.png');
  await page.screenshot({ path: cinema390Path, fullPage: true });
  console.log(`-> Saved 390px Cinema Ticket: ${cinema390Path}`);

  await browser.close();
  console.log('All verification captures completed successfully!');
}

run().catch((err) => {
  console.error('Error running verification:', err);
  process.exit(1);
});
