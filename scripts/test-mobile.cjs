const puppeteer = require('puppeteer');
const path = require('path');

async function testMobile() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-web-security', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
  });
  await new Promise(r => setTimeout(r, 2500));

  const result = await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    const store = window.__BOOKING_STORE__.getState();
    const seat = drill?.allSeats.find((s) => s.standId === 'p_lower' && s.row === 'C') || drill?.allSeats[0];
    if (seat) {
      store.selectStand(seat.standId);
      store.selectBlock(seat.blockId);
      store.flyToSeat({
        sectionId: seat.sectionId,
        sectionName: seat.sectionName,
        row: seat.row,
        number: seat.number,
        priceNPR: seat.priceNPR,
        tier: seat.tier,
        cameraPosition: [seat.position[0], seat.position[1] + 1.2, seat.position[2]],
        cameraTarget: [0, 0.4, 0],
        blockId: seat.blockId,
        blockLabel: seat.blockLabel,
        standId: seat.standId,
      });
      return { success: true, seat: { stand: seat.standId, row: seat.row, num: seat.number } };
    }
    return { success: false };
  });
  console.log('Fly result:', result);

  await new Promise(r => setTimeout(r, 3000));

  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  await page.screenshot({ path: path.join(artifactDir, 'tu_fix_8_seat_view_390x844.png') });
  console.log('Saved tu_fix_8_seat_view_390x844.png');

  await browser.close();
}

testMobile().catch(console.error);
