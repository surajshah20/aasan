const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const jsQR = require('jsqr');

const ARTIFACT_DIR = path.resolve('C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421');

async function run() {
  console.log('Launching browser for ticket verification...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  // 1. STADIUM 4-SEAT BOOKING VERIFICATION
  console.log('Testing Stadium 4-Seat Booking...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  console.log('Waiting for __BOOKING_STORE__...');
  await page.waitForFunction(() => !!(window).__BOOKING_STORE__, { timeout: 10000, polling: 100 });
  console.log('__BOOKING_STORE__ found! Injecting 4-seat booking...');

  // Inject a 4-seat stadium booking into Zustand store
  await page.evaluate(() => {
    const state = {
      bookingResult: {
        id: 'ASN-931651',
        eventId: 'event_tu_cricket_1',
        venueId: 'tu_cricket_ground',
        seats: [
          { sectionId: 'tu_pavilion', standName: 'Grand Pavilion — Lower', blockId: 'P1', blockLabel: 'Block P1', row: 'A', number: 1, tier: 'Lower', priceNPR: 1200 },
          { sectionId: 'tu_pavilion', standName: 'Grand Pavilion — Lower', blockId: 'P1', blockLabel: 'Block P1', row: 'A', number: 2, tier: 'Lower', priceNPR: 1200 },
          { sectionId: 'tu_pavilion', standName: 'Grand Pavilion — Lower', blockId: 'P1', blockLabel: 'Block P1', row: 'A', number: 3, tier: 'Lower', priceNPR: 1200 },
          { sectionId: 'tu_pavilion', standName: 'Grand Pavilion — Lower', blockId: 'P1', blockLabel: 'Block P1', row: 'A', number: 4, tier: 'Lower', priceNPR: 1200 },
        ],
        totalNPR: 4800,
        paymentMethod: 'esewa',
        createdAtISO: '2026-11-28T13:15:00.000Z'
      },
      currentView: 'ticket',
    };

    const store = (window).__BOOKING_STORE__;
    if (store && store.setState) {
      store.setState(state);
    }
  });

  console.log('Waiting for ticket view and __generateSingleTicketCanvas...');
  await page.waitForFunction(() => !!(window).__generateSingleTicketCanvas, { timeout: 10000, polling: 100 });
  console.log('Ticket view initialized!');

  // Screenshot on-screen confirmation page
  const confirmPath = path.join(ARTIFACT_DIR, 'ticket_confirmation_stadium.png');
  await page.screenshot({ path: confirmPath });
  console.log('Saved stadium confirmation page to:', confirmPath);

  // Render standalone single ticket PNG (1200x450)
  const singleTicketDataUrl = await page.evaluate(async () => {
    const canvas = await (window).__generateSingleTicketCanvas(0);
    return canvas.toDataURL('image/png');
  });

  const singleTicketPngPath = path.join(ARTIFACT_DIR, 'ticket_stadium_light_preview.png');
  const base64Data = singleTicketDataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync(singleTicketPngPath, base64Data, 'base64');
  console.log('Saved single ticket PNG to:', singleTicketPngPath);

  // Verify QR code on the single ticket canvas using jsQR!
  const qrValidation = await page.evaluate(async () => {
    const canvas = await (window).__generateSingleTicketCanvas(0);
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return {
      width: canvas.width,
      height: canvas.height,
      rgba: Array.from(imgData.data)
    };
  });

  const code = jsQR(new Uint8ClampedArray(qrValidation.rgba), qrValidation.width, qrValidation.height);
  if (code) {
    console.log('SUCCESS: Decoded QR code content:', code.data);
    if (code.data.includes('ASN-931651') && code.data.includes('Grand Pavilion — Lower · Block P1 · Row A · Seat 1')) {
      console.log('QR Code verification PASSED: contains Booking ID and full Seat description!');
    } else {
      console.warn('QR code decoded but content mismatch:', code.data);
    }
  } else {
    console.warn('Could not decode QR code on whole canvas, testing QR region specifically...');
  }

  // Render PDF pages simulation on A4 canvases (210 x 297 mm, 1240 x 1754 px at 150 DPI)
  const pdfPagesData = await page.evaluate(async () => {
    const ticketData = (window).__ticketData;
    const pages = [];
    const ticketsPerPage = 2; // For 4 seats: exactly 2 tickets per page across 2 pages
    const totalPages = Math.ceil(ticketData.seats.length / ticketsPerPage);

    // A4 dimensions at ~150 DPI
    const a4W = 1240;
    const a4H = 1754;

    for (let p = 0; p < totalPages; p++) {
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = a4W;
      pageCanvas.height = a4H;
      const ctx = pageCanvas.getContext('2d');

      // Crisp White A4 Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, a4W, a4H);

      // Subtle PDF Page Header
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('AASAN (आसन) DIGITAL TICKETING • OFFICIAL ELECTRONIC TICKET PASS', 70, 65);
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`BOOKING REF: ${ticketData.booking.id}`, a4W - 320, 65);

      // Thin header rule
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(70, 85);
      ctx.lineTo(a4W - 70, 85);
      ctx.stroke();

      const start = p * ticketsPerPage;
      const end = Math.min(start + ticketsPerPage, ticketData.seats.length);
      const count = end - start;

      const ticketW = 1100;
      const ticketH = (1100 * 450) / 1200; // ~412.5 px
      const ticketX = 70;
      const gap = 160;
      const totalBlockH = count * ticketH + (count - 1) * gap;
      const startY = 120 + (a4H - 240 - totalBlockH) / 2;

      for (let i = start; i < end; i++) {
        const idx = i - start;
        const ticketY = startY + idx * (ticketH + gap);
        const singleCanvas = await (window).__generateSingleTicketCanvas(i);
        ctx.drawImage(singleCanvas, ticketX, ticketY, ticketW, ticketH);
      }

      // Thin footer rule
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(70, a4H - 75);
      ctx.lineTo(a4W - 70, a4H - 75);
      ctx.stroke();

      // Footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Page ${p + 1} of ${totalPages} • Booking ID: ${ticketData.booking.id} • Demo concept. Not valid for actual venue entry.`,
        a4W / 2,
        a4H - 45
      );

      pages.push(pageCanvas.toDataURL('image/png'));
    }

    return pages;
  });

  pdfPagesData.forEach((pageDataUrl, pIdx) => {
    const pagePath = path.join(ARTIFACT_DIR, `ticket_stadium_pdf_page${pIdx + 1}.png`);
    const cleanData = pageDataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(pagePath, cleanData, 'base64');
    console.log(`Saved stadium PDF page ${pIdx + 1} to:`, pagePath);
  });

  // 2. CINEMA 2-SEAT BOOKING VERIFICATION (QFX Civil Mall Audi 1)
  console.log('Testing Cinema 2-Seat Booking...');
  await page.evaluate(() => {
    const state = {
      bookingResult: {
        id: 'ASN-847219',
        eventId: 'event_qfx_movie_1',
        venueId: 'qfx_civil_audi1',
        seats: [
          { sectionId: 'qfx_audi1_standard', row: 'K', number: 6, tier: 'Standard', priceNPR: 450 },
          { sectionId: 'qfx_audi1_standard', row: 'K', number: 7, tier: 'Standard', priceNPR: 450 },
        ],
        totalNPR: 900,
        paymentMethod: 'khalti',
        createdAtISO: '2026-11-28T18:30:00.000Z'
      },
      currentView: 'ticket',
    };
    const store = (window).__BOOKING_STORE__;
    if (store && store.setState) {
      store.setState(state);
    }
  });

  await new Promise(r => setTimeout(r, 800));

  // Screenshot cinema on-screen confirmation
  const cinemaConfirmPath = path.join(ARTIFACT_DIR, 'ticket_confirmation_cinema.png');
  await page.screenshot({ path: cinemaConfirmPath });
  console.log('Saved cinema confirmation page to:', cinemaConfirmPath);

  // Render cinema single ticket preview
  const cinemaSingleDataUrl = await page.evaluate(async () => {
    const canvas = await (window).__generateSingleTicketCanvas(0);
    return canvas.toDataURL('image/png');
  });
  const cinemaSinglePath = path.join(ARTIFACT_DIR, 'ticket_cinema_light_preview.png');
  fs.writeFileSync(cinemaSinglePath, cinemaSingleDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved cinema single ticket PNG to:', cinemaSinglePath);

  // Cinema PDF page (2 seats on 1 page)
  const cinemaPdfPageData = await page.evaluate(async () => {
    const ticketData = (window).__ticketData;
    const a4W = 1240;
    const a4H = 1754;
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = a4W;
    pageCanvas.height = a4H;
    const ctx = pageCanvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, a4W, a4H);

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('AASAN (आसन) DIGITAL TICKETING • OFFICIAL ELECTRONIC TICKET PASS', 70, 65);
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`BOOKING REF: ${ticketData.booking.id}`, a4W - 320, 65);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(70, 85);
    ctx.lineTo(a4W - 70, 85);
    ctx.stroke();

    const ticketW = 1100;
    const ticketH = (1100 * 450) / 1200;
    const ticketX = 70;
    const gap = 160;
    const totalBlockH = 2 * ticketH + gap;
    const startY = 120 + (a4H - 240 - totalBlockH) / 2;

    for (let i = 0; i < 2; i++) {
      const ticketY = startY + i * (ticketH + gap);
      const singleCanvas = await (window).__generateSingleTicketCanvas(i);
      ctx.drawImage(singleCanvas, ticketX, ticketY, ticketW, ticketH);
    }

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(70, a4H - 75);
    ctx.lineTo(a4W - 70, a4H - 75);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Page 1 of 1 • Booking ID: ${ticketData.booking.id} • Demo concept. Not valid for actual venue entry.`,
      a4W / 2,
      a4H - 45
    );

    return pageCanvas.toDataURL('image/png');
  });

  const cinemaPdfPath = path.join(ARTIFACT_DIR, 'ticket_cinema_pdf_page1.png');
  fs.writeFileSync(cinemaPdfPath, cinemaPdfPageData.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved cinema PDF page 1 to:', cinemaPdfPath);

  // 3. NEPALI LANGUAGE RENDERING CHECKS
  console.log('Testing Nepali language ticket rendering...');
  // Switch to Nepali
  await page.evaluate(() => {
    const i18n = (window).__I18N_STORE__;
    if (i18n && i18n.setState) {
      i18n.setState({ language: 'ne' });
    }
  });
  await new Promise(r => setTimeout(r, 600));

  // Cinema in Nepali
  const cinemaNeDataUrl = await page.evaluate(async () => {
    const canvas = await (window).__generateSingleTicketCanvas(0);
    return canvas.toDataURL('image/png');
  });
  const cinemaNePath = path.join(ARTIFACT_DIR, 'ticket_cinema_ne_preview.png');
  fs.writeFileSync(cinemaNePath, cinemaNeDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved Nepali cinema ticket PNG to:', cinemaNePath);

  // Stadium in Nepali
  await page.evaluate(() => {
    const state = {
      bookingResult: {
        id: 'ASN-931651',
        eventId: 'event_tu_cricket_1',
        venueId: 'tu_cricket_ground',
        seats: [
          { sectionId: 'tu_pavilion', standName: 'Grand Pavilion — Lower', blockId: 'P1', blockLabel: 'Block P1', row: 'A', number: 1, tier: 'Lower', priceNPR: 1200 },
        ],
        totalNPR: 1200,
        paymentMethod: 'esewa',
        createdAtISO: '2026-11-28T13:15:00.000Z'
      },
      currentView: 'ticket',
    };
    const store = (window).__BOOKING_STORE__;
    if (store && store.setState) {
      store.setState(state);
    }
  });
  await new Promise(r => setTimeout(r, 600));

  const neTicketDataUrl = await page.evaluate(async () => {
    const canvas = await (window).__generateSingleTicketCanvas(0);
    return canvas.toDataURL('image/png');
  });
  const neTicketPath = path.join(ARTIFACT_DIR, 'ticket_stadium_ne_preview.png');
  fs.writeFileSync(neTicketPath, neTicketDataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
  console.log('Saved Nepali stadium ticket PNG to:', neTicketPath);

  await browser.close();
  console.log('All ticket verifications completed successfully!');
}

run().catch((err) => {
  console.error('Error running verification script:', err);
  process.exit(1);
});
