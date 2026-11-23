const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function capture() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching Chrome browser for TU Stadium Step 3 captures...');
  const tempProfile = path.join(__dirname, 'temp_chrome_stadium_step3_' + Date.now());
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: tempProfile,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--enable-webgl', '--ignore-gpu-blocklist'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));

  // Switch to TU Stadium
  console.log('Switching to TU Cricket Ground...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await new Promise((r) => setTimeout(r, 2500));

  // 1. Aerial 3/4 View: Steeper rake, towering outer wall, ~70% frame fill, soft fading ground
  console.log('Capturing Aerial 3/4 Overview...');
  const aerialPath = path.join(artifactDir, 'tu_stadium_step3_aerial_1440x900.png');
  await page.screenshot({ path: aerialPath });
  console.log('-> Saved:', aerialPath);

  // 2. East Stand Close-Up
  console.log('Switching to East Stand view...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes('East Stand'));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 2200));
  const eastPath = path.join(artifactDir, 'tu_stadium_step3_east_stand_1440x900.png');
  await page.screenshot({ path: eastPath });
  console.log('-> Saved:', eastPath);

  // 3. Seat Shapes Close-Up (confirm cushion, backrest & pitch facing)
  console.log('Switching to Seat Shapes Macro Close-Up...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && (b.textContent.includes('Seat Shapes') || b.textContent.includes('सिट ढाँचा')));
    if (btn) btn.click();
  });
  await new Promise((r) => setTimeout(r, 2200));
  const macroPath = path.join(artifactDir, 'tu_stadium_step3_seat_shapes_macro_1440x900.png');
  await page.screenshot({ path: macroPath });
  console.log('-> Saved:', macroPath);

  // 4. Return to Aerial and Hover a Seat to demonstrate Tooltip
  console.log('Hovering a seat for tooltip...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes('Aerial 3/4'));
    if (btn) btn.click();
    if (window.__SET_HOVERED_STADIUM_SEAT__) {
      window.__SET_HOVERED_STADIUM_SEAT__({
        instanceId: 42,
        tierType: 'lower',
        sectionId: 'tu_north_east',
        sectionName: 'East Stand',
        row: 'D',
        number: 18,
        priceNPR: 600,
        tier: 'Standard',
        position: [68.2, 2.22, 0],
        baseColor: { getHexString: () => 'facc15' },
      });
    }
  });
  await new Promise((r) => setTimeout(r, 1200));
  const hoverPath = path.join(artifactDir, 'tu_stadium_step3_hover_tooltip_1440x900.png');
  await page.screenshot({ path: hoverPath });
  console.log('-> Saved:', hoverPath);

  // 5. Click to fly into South Stand / Pavilion Seat View
  console.log('Flying into Pavilion Seat View...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    // South Stand / Pavilion seat at (0, 0.70 + 2*0.50 + 0.02, 75 + 0.4 + 2*0.8 + 0.4)
    // theta = PI/2 -> px = 0, pz = 75 + 2.4 = 77.4, y = 1.72
    store.flyToSeat({
      sectionId: 'tu_pavilion_end',
      sectionName: 'South Pavilion',
      row: 'C',
      number: 14,
      priceNPR: 1200,
      tier: 'Pavilion Club',
      cameraPosition: [0, 2.92, 77.4], // 1.2m eye height above seat
      cameraTarget: [0, 0.8, 0],
    });
  });
  await new Promise((r) => setTimeout(r, 2800));
  const pavPath = path.join(artifactDir, 'tu_stadium_step3_seatview_pavilion_1440x900.png');
  await page.screenshot({ path: pavPath });
  console.log('-> Saved:', pavPath);

  // 6. Fly into East Stand Seat View
  console.log('Flying into East Stand Seat View...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    // East Stand row D (theta = 0, px = 65 + 0.4 + 3*0.8 + 0.4 = 68.2, y = 0.70 + 3*0.50 + 0.02 = 2.22)
    store.flyToSeat({
      sectionId: 'tu_north_east',
      sectionName: 'East Stand',
      row: 'D',
      number: 22,
      priceNPR: 600,
      tier: 'Standard',
      cameraPosition: [68.2, 3.42, 0], // 1.2m eye height
      cameraTarget: [0, 0.8, 0],
    });
  });
  await new Promise((r) => setTimeout(r, 2800));
  const eastSeatPath = path.join(artifactDir, 'tu_stadium_step3_seatview_east_1440x900.png');
  await page.screenshot({ path: eastSeatPath });
  console.log('-> Saved:', eastSeatPath);

  // 7. Fly into Back-Row Seat View (Upper Tier Row P)
  console.log('Flying into Back-Row (Row P) Seat View...');
  await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    // Row P (row 8 of upper tier, j=7, y = 4.45 + 7*0.75 + 0.02 = 9.72, rOffset = 8.0 + 7*0.8 + 0.4 = 14.0)
    // At South-West Stand angle theta = 3*PI/4
    const theta = (3 * Math.PI) / 4;
    const Rx = 65.0, Rz = 75.0, rOff = 14.0;
    const px = (Rx + rOff) * Math.cos(theta);
    const pz = (Rz + rOff) * Math.sin(theta);
    store.flyToSeat({
      sectionId: 'tu_south_west',
      sectionName: 'South-West Stand',
      row: 'P',
      number: 35,
      priceNPR: 500,
      tier: 'Standard',
      cameraPosition: [px, 10.92, pz], // 1.2m eye height above row P tread
      cameraTarget: [0, 0.8, 0],
    });
  });
  await new Promise((r) => setTimeout(r, 2800));
  const backrowPath = path.join(artifactDir, 'tu_stadium_step3_seatview_backrow_1440x900.png');
  await page.screenshot({ path: backrowPath });
  console.log('-> Saved:', backrowPath);

  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (e) {}
  console.log('All Step 3 stadium screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Error during capture:', err);
  process.exit(1);
});
