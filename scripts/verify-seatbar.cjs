const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('Launching browser for SeatViewBar verification...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!(window).__BOOKING_STORE__, { timeout: 10000, polling: 100 });

  // Navigate to Stadium Venue
  console.log('Navigating to TU Stadium...');
  await page.evaluate(() => {
    const store = (window).__BOOKING_STORE__.getState();
    store.selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
  });

  // Wait for 3D stadium drill down data to be ready
  await page.waitForFunction(() => !!(window).__STADIUM_DRILL__ && (window).__STADIUM_DRILL__.allSeats?.length > 0, { timeout: 15000, polling: 100 });
  console.log('Stadium 3D scene initialized!');

  // Verify all stand tiers in stadiumDrillDownData
  console.log('--- STAND TIER VERIFICATION ---');
  const tiersResult = await page.evaluate(() => {
    const drill = (window).__STADIUM_DRILL__;
    const sample = (prefix, tierType = 'lower') => {
      return drill.allSeats.find(s => s.blockLabel && s.blockLabel.startsWith(prefix) && s.tierType === tierType);
    };

    return {
      pavilionLower: sample('P', 'lower'),
      pavilionUpper: sample('P', 'upper'),
      northVIP: sample('V', 'lower'),
      eastLower: sample('E', 'lower'),
      eastUpper: sample('E', 'upper'),
      westLower: sample('W', 'lower'),
      westUpper: sample('W', 'upper'),
      swHill: sample('SW', 'lower'),
    };
  });

  console.log('Grand Pavilion Lower Tier:', tiersResult.pavilionLower?.tier, '(Price: NPR', tiersResult.pavilionLower?.priceNPR, ')');
  console.log('Grand Pavilion Upper Tier:', tiersResult.pavilionUpper?.tier, '(Price: NPR', tiersResult.pavilionUpper?.priceNPR, ')');
  console.log('North VIP Canopy Tier:', tiersResult.northVIP?.tier, '(Price: NPR', tiersResult.northVIP?.priceNPR, ')');
  console.log('East Stand Lower Tier:', tiersResult.eastLower?.tier, '(Price: NPR', tiersResult.eastLower?.priceNPR, ')');
  console.log('East Stand Upper Tier:', tiersResult.eastUpper?.tier, '(Price: NPR', tiersResult.eastUpper?.priceNPR, ')');
  console.log('West Stand Lower Tier:', tiersResult.westLower?.tier, '(Price: NPR', tiersResult.westLower?.priceNPR, ')');
  console.log('West Stand Upper Tier:', tiersResult.westUpper?.tier, '(Price: NPR', tiersResult.westUpper?.priceNPR, ')');
  console.log('South-West Hill Tier:', tiersResult.swHill?.tier, '(Price: NPR', tiersResult.swHill?.priceNPR, ')');

  // 1. VIP SEAT (Grand Pavilion — Lower, Block P1, Row A, Seat 1)
  console.log('1. Testing VIP Seat (Grand Pavilion Lower)...');
  await page.evaluate(() => {
    const store = (window).__BOOKING_STORE__.getState();
    const drill = (window).__STADIUM_DRILL__;
    const seat = drill.allSeats.find(s => s.blockLabel === 'P1' && s.row === 'A' && s.number === 1) || drill.allSeats.find(s => s.blockLabel === 'P1');
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
        standName: seat.standName,
      });
    }
  });

  await sleep(1500); // Allow 3D camera to settle in seat
  const vipPath = path.join(ARTIFACT_DIR, 'seatbar_vip_1440.png');
  await page.screenshot({ path: vipPath });
  console.log('Saved VIP seat screenshot to:', vipPath);

  // 2. STANDARD SEAT (South-West Hill Stand)
  console.log('2. Testing Standard Seat (South-West Hill Stand)...');
  await page.evaluate(() => {
    const store = (window).__BOOKING_STORE__.getState();
    const drill = (window).__STADIUM_DRILL__;
    const seat = drill.allSeats.find(s => s.blockLabel.startsWith('SW') && s.row === 'A') || drill.allSeats.find(s => s.blockLabel.startsWith('SW'));
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
        standName: seat.standName,
      });
    }
  });

  await sleep(1500);
  const standardPath = path.join(ARTIFACT_DIR, 'seatbar_standard_1440.png');
  await page.screenshot({ path: standardPath });
  console.log('Saved Standard seat screenshot to:', standardPath);

  // 3. 8-SEAT LIMIT STATE
  console.log('3. Testing 8-Seat Limit State...');
  await page.evaluate(() => {
    const store = (window).__BOOKING_STORE__;
    const drill = (window).__STADIUM_DRILL__;
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
    const curState = store.getState();
    const curActive = curState.activeSeat;
    store.setState({
      selectedSeats: dummySeats,
    });
  });

  await sleep(600);
  const limitPath = path.join(ARTIFACT_DIR, 'seatbar_limit_8_1440.png');
  await page.screenshot({ path: limitPath });
  console.log('Saved 8-seat limit screenshot to:', limitPath);

  // 4. MOBILE 390 PX VIEW (Fresh page with 390x844 viewport to avoid WebGL resize hang)
  console.log('4. Testing Mobile 390 px View on fresh page...');
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844 });

  await mobilePage.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForFunction(() => !!(window).__BOOKING_STORE__, { timeout: 10000, polling: 100 });

  await mobilePage.evaluate(() => {
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

  await sleep(1000);
  const mobilePath = path.join(ARTIFACT_DIR, 'seatbar_mobile_390.png');
  await mobilePage.screenshot({ path: mobilePath });
  console.log('Saved mobile 390px screenshot to:', mobilePath);
  await mobilePage.close();

  await browser.close();
  console.log('All SeatViewBar verifications completed successfully!');
}

run().catch((err) => {
  console.error('Error running SeatViewBar verification:', err);
  process.exit(1);
});
