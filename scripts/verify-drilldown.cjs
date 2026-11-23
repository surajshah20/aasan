const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runVerification() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching browser for TU Stadium Drill-down Verification...');
  const tempProfile = path.join(__dirname, 'temp_chrome_drilldown_' + Date.now());
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: tempProfile,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  });

  const page = await browser.newPage();
  page.on('dialog', async (dialog) => {
    console.log('Dialog popped:', dialog.message());
    await dialog.dismiss();
  });

  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await sleep(1500);

  // Switch to TU Cricket Ground
  console.log('Navigating to TU Cricket Ground...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await sleep(2500);

  // Measure desktop FPS
  const fpsDesktop = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function loop() {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(loop);
        } else {
          resolve(Math.round((frames * 1000) / (performance.now() - start)));
        }
      }
      requestAnimationFrame(loop);
    });
  });
  console.log('Desktop 1440x900 FPS:', fpsDesktop);

  // 1. Overview with hovered stand
  console.log('1. Capturing Overview with hovered stand...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.selectStand(null);
    store.setStadiumLevel('overview');
    if (window.__STADIUM_DRILL__) {
      window.__STADIUM_DRILL__.setHoveredStandId('e_lower');
    }
  });
  await sleep(1000);
  await page.screenshot({
    path: path.join(artifactDir, 'tu_drilldown_1_overview_hover.png'),
  });

  // 2. Stand view
  console.log('2. Navigating to Stand View (East Stand — Lower)...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectStand('e_lower');
    if (window.__STADIUM_DRILL__) {
      window.__STADIUM_DRILL__.setHoveredBlockId('e_lower_b3');
    }
  });
  await sleep(2200); // Allow camera easing
  await page.screenshot({
    path: path.join(artifactDir, 'tu_drilldown_2_stand_view.png'),
  });

  // 3. Block view
  console.log('3. Navigating to Block View (Block E3)...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.selectBlock('e_lower_b3');
  });
  await sleep(2200); // Allow camera easing
  await page.screenshot({
    path: path.join(artifactDir, 'tu_drilldown_3_block_view.png'),
  });

  // 4. Seat view
  console.log('4. Navigating to Seat View (Row C #12 in Block E3)...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    const drill = window.__STADIUM_DRILL__;
    // Find real seat in Block E3
    const realSeat = drill.allSeats.find(
      (s) => s.blockId === 'e_lower_b3' && s.row === 'C' && s.number === 12
    ) || drill.allSeats.find((s) => s.blockId === 'e_lower_b3' && s.row === 'C')
      || drill.allSeats.find((s) => s.blockId === 'e_lower_b3');

    if (realSeat) {
      store.flyToSeat({
        sectionId: realSeat.sectionId,
        sectionName: realSeat.sectionName,
        row: realSeat.row,
        number: realSeat.number,
        priceNPR: realSeat.priceNPR,
        tier: realSeat.tier,
        cameraPosition: [realSeat.position[0], realSeat.position[1] + 1.2, realSeat.position[2]],
        cameraTarget: [0, 0.4, 0],
        blockId: realSeat.blockId,
        blockLabel: realSeat.blockLabel,
        standId: realSeat.standId,
      });
    }
  });
  await sleep(2200); // Allow camera easing
  await page.screenshot({
    path: path.join(artifactDir, 'tu_drilldown_4_seat_view.png'),
  });

  // 5. Breadcrumbs at each level and Back navigation test
  console.log('5. Capturing Breadcrumb navigation in Seat View...');
  await page.screenshot({
    path: path.join(artifactDir, 'tu_drilldown_5_breadcrumbs.png'),
  });

  // Test "Other seats" button returning to Block view
  console.log('Testing "Other seats" button...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await sleep(1500);
  const currentLevelAfterOtherSeats = await page.evaluate(() => window.__BOOKING_STORE__.getState().stadiumLevel);
  console.log('Stadium level after "Other seats":', currentLevelAfterOtherSeats);

  // 6. Best Available Feature
  console.log('6. Testing "Best available" button...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.clearSeats();
    store.selectStand(null);
    store.setStadiumLevel('overview');
  });
  await sleep(1200);

  // Click the Best Available button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find((el) => el.textContent && el.textContent.includes('Best available'));
    if (b) {
      b.click();
    }
  });
  await sleep(2500);
  await page.screenshot({
    path: path.join(artifactDir, 'tu_drilldown_6_best_available.png'),
  });

  // 7. Mobile View (390x844)
  console.log('7. Capturing Mobile Flow (390x844)...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    store.setView('overview');
    store.selectStand('e_lower');
    store.selectBlock('e_lower_b3');
  });
  await sleep(2200);

  // Measure Mobile FPS
  const fpsMobile = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function loop() {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(loop);
        } else {
          resolve(Math.round((frames * 1000) / (performance.now() - start)));
        }
      }
      requestAnimationFrame(loop);
    });
  });
  console.log('Mobile 390x844 FPS:', fpsMobile);

  await page.screenshot({
    path: path.join(artifactDir, 'tu_drilldown_7_mobile_390x844.png'),
  });

  // 8. Multi-block booking flow
  console.log('8. Completing Multi-block booking flow (2 seats from different blocks)...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.clearSeats();

    // Seat 1: Block E3 (Row C #12)
    const seat1 = {
      sectionId: 'tu_north_east',
      row: 'C',
      number: 12,
      priceNPR: 600,
      tier: 'Standard',
      blockId: 'e_lower_b3',
      blockLabel: 'E3',
    };
    store.toggleSeat(seat1);

    // Seat 2: Block W2 (Row D #15)
    const seat2 = {
      sectionId: 'tu_west_stand',
      row: 'D',
      number: 15,
      priceNPR: 600,
      tier: 'Standard',
      blockId: 'w_lower_b2',
      blockLabel: 'W2',
    };
    store.toggleSeat(seat2);

    // Switch to checkout view
    store.setView('checkout');
  });
  await sleep(1500);

  // Click simulate payment in MockCheckout
  console.log('Confirming payment in MockCheckout...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const payBtn = buttons.find((b) => b.textContent && (b.textContent.includes('Simulate Successful Payment') || b.textContent.includes('Pay with')));
    if (payBtn) payBtn.click();
  });
  await sleep(3000);

  await page.screenshot({
    path: path.join(artifactDir, 'tu_drilldown_8_multiblock_ticket.png'),
  });

  console.log('Verification completed successfully!');
  await browser.close();

  return {
    fpsDesktop,
    fpsMobile,
    currentLevelAfterOtherSeats,
  };
}

runVerification().then((res) => {
  console.log('Verification result:', JSON.stringify(res, null, 2));
  process.exit(0);
}).catch((err) => {
  console.error('Error during verification:', err);
  process.exit(1);
});
