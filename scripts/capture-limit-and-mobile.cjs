const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421');

async function run() {
  console.log('Launching browser for limit & mobile screenshots...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage'
    ]
  });

  // 1. LIMIT 8 STATE AT 1440
  const page1 = await browser.newPage();
  await page1.setViewport({ width: 1440, height: 900 });
  await page1.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page1.waitForFunction(() => !!(window).__BOOKING_STORE__, { timeout: 10000, polling: 100 });

  await page1.evaluate(() => {
    const store = (window).__BOOKING_STORE__;
    const dummySeats = [];
    for (let i = 1; i <= 8; i++) {
      dummySeats.push({
        sectionId: 'tu_pavilion_end',
        row: 'A',
        number: i,
        priceNPR: 1200,
        tier: 'VIP',
        blockId: 'P1',
        blockLabel: 'Block P1'
      });
    }
    store.setState({
      currentView: 'venue',
      selectedVenueId: 'tu_cricket_ground',
      selectedEventId: 'event_tu_cricket_1',
      cameraMode: 'seatview',
      stadiumLevel: 'seat',
      selectedStandId: 'p_lower',
      selectedBlockId: 'p_lower_b1',
      selectedSeats: dummySeats,
      activeSeat: {
        sectionId: 'tu_pavilion_end',
        sectionName: 'Grand Pavilion — Lower',
        row: 'A',
        number: 9,
        priceNPR: 1200,
        tier: 'VIP',
        cameraPosition: [15.0, 4.0, 16.0],
        cameraTarget: [0, 0.5, 0],
        blockId: 'p_lower_b1',
        blockLabel: 'P1',
        standId: 'p_lower',
        standName: 'Grand Pavilion — Lower'
      }
    });
  });

  await new Promise(r => setTimeout(r, 600));
  const limitPath = path.join(ARTIFACT_DIR, 'seatbar_limit_8_1440.png');
  await page1.screenshot({ path: limitPath });
  console.log('Saved 8-seat limit screenshot to:', limitPath);
  await page1.close();

  // 2. MOBILE 390 VIEW
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 390, height: 844 });
  await page2.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page2.waitForFunction(() => !!(window).__BOOKING_STORE__, { timeout: 10000, polling: 100 });

  await page2.evaluate(() => {
    const store = (window).__BOOKING_STORE__;
    store.setState({
      currentView: 'venue',
      selectedVenueId: 'tu_cricket_ground',
      selectedEventId: 'event_tu_cricket_1',
      cameraMode: 'seatview',
      stadiumLevel: 'seat',
      selectedStandId: 'p_lower',
      selectedBlockId: 'p_lower_b1',
      selectedSeats: [
        { sectionId: 'tu_pavilion_end', row: 'A', number: 1, priceNPR: 1200, tier: 'VIP' }
      ],
      activeSeat: {
        sectionId: 'tu_pavilion_end',
        sectionName: 'Grand Pavilion — Lower',
        row: 'A',
        number: 2,
        priceNPR: 1200,
        tier: 'VIP',
        cameraPosition: [15.0, 4.0, 16.0],
        cameraTarget: [0, 0.5, 0],
        blockId: 'p_lower_b1',
        blockLabel: 'P1',
        standId: 'p_lower',
        standName: 'Grand Pavilion — Lower'
      }
    });
  });

  await new Promise(r => setTimeout(r, 600));
  const mobilePath = path.join(ARTIFACT_DIR, 'seatbar_mobile_390.png');
  await page2.screenshot({ path: mobilePath });
  console.log('Saved mobile 390px screenshot to:', mobilePath);
  await page2.close();

  await browser.close();
  console.log('Both screenshots saved successfully!');
}

run().catch((err) => {
  console.error('Error running script:', err);
  process.exit(1);
});
