const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.resolve('C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--disable-dev-shm-usage',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  console.log('Navigating to app...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);

  // Switch to TU Cricket Ground
  console.log('Selecting TU Cricket Ground...');
  await page.evaluate(() => {
    if (window.__BOOKING_STORE__) {
      window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
      window.__BOOKING_STORE__.getState().returnToOverview();
    }
  });
  await sleep(3000);

  // Ensure evening lighting mode is active
  await page.evaluate(() => {
    if (window.__STADIUM_DRILL__) {
      window.__STADIUM_DRILL__.setLightingMode('evening');
    }
  });
  await sleep(1500);

  // 1. Measure FPS
  console.log('Measuring FPS in night mode...');
  const fps = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frameCount = 0;
      const startTime = performance.now();
      function loop() {
        frameCount++;
        if (performance.now() - startTime >= 1000) {
          resolve(Math.round((frameCount * 1000) / (performance.now() - startTime)));
        } else {
          requestAnimationFrame(loop);
        }
      }
      requestAnimationFrame(loop);
    });
  });
  console.log(`Measured FPS: ${fps} fps`);

  // 2. Aerial View matching reference/tu-night-real.png
  console.log('Capturing Aerial View (matching reference)...');
  await page.evaluate(() => {
    window.__STADIUM_DRILL__.setCustomCamera({
      pos: [-22, 74, 126],
      lookAt: [0, 2.0, -4],
      fov: 46,
      instant: true,
    });
  });
  await sleep(2000);
  const aerialPath = path.join(ARTIFACT_DIR, 'tu_night_1_aerial_match.png');
  await page.screenshot({ path: aerialPath });
  console.log(`Saved: ${aerialPath}`);

  // 3. Top-Down View
  console.log('Capturing Top-down View...');
  await page.evaluate(() => {
    window.__STADIUM_DRILL__.setCustomCamera({
      pos: [0, 160, 0.1],
      lookAt: [0, 0, 0],
      fov: 48,
      instant: true,
    });
  });
  await sleep(2000);
  const topDownPath = path.join(ARTIFACT_DIR, 'tu_night_2_topdown.png');
  await page.screenshot({ path: topDownPath });
  console.log(`Saved: ${topDownPath}`);

  // 4. Pavilion Seat View
  console.log('Capturing Pavilion Seat View...');
  await page.evaluate(() => {
    // South Pavilion seat looking across pitch towards North Canopy
    window.__STADIUM_DRILL__.setCustomCamera({
      pos: [0, 5.8, 62],
      lookAt: [0, 2.5, -45],
      fov: 56,
      instant: true,
    });
  });
  await sleep(2000);
  const pavilionPath = path.join(ARTIFACT_DIR, 'tu_night_3_pavilion_seat.png');
  await page.screenshot({ path: pavilionPath });
  console.log(`Saved: ${pavilionPath}`);

  // 5. Upper-Tier Seat View looking up at floodlight cluster and dark sky
  console.log('Capturing Upper-Tier Seat View looking at floodlight...');
  await page.evaluate(() => {
    window.__STADIUM_DRILL__.setCustomCamera({
      pos: [52, 14.5, 38],
      lookAt: [65, 48, 65],
      fov: 54,
      instant: true,
    });
  });
  await sleep(2000);
  const upperSkyPath = path.join(ARTIFACT_DIR, 'tu_night_4_upper_sky.png');
  await page.screenshot({ path: upperSkyPath });
  console.log(`Saved: ${upperSkyPath}`);

  // 6. Close-Up of One Floodlight Cluster
  console.log('Capturing Close-Up of Floodlight Cluster...');
  await page.evaluate(() => {
    window.__STADIUM_DRILL__.setCustomCamera({
      pos: [58, 45, 62],
      lookAt: [68, 48.2, 68],
      fov: 34,
      instant: true,
    });
  });
  await sleep(2000);
  const closeupPath = path.join(ARTIFACT_DIR, 'tu_night_5_cluster_closeup.png');
  await page.screenshot({ path: closeupPath });
  console.log(`Saved: ${closeupPath}`);

  // 7. Reset camera
  await page.evaluate(() => {
    window.__STADIUM_DRILL__.setCustomCamera(null);
  });

  // 8. Generate Side-by-Side Comparison HTML & Screenshot
  console.log('Generating Side-by-Side Comparison Screenshot...');
  const refImgData = fs.readFileSync(path.join(ARTIFACT_DIR, 'tu-night-real.png')).toString('base64');
  const aerialImgData = fs.readFileSync(aerialPath).toString('base64');

  const comparisonHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        margin: 0;
        background: #090a0f;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #f1f5f9;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px;
      }
      h1 {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin-bottom: 24px;
        color: #fff;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        max-width: 1560px;
        width: 100%;
      }
      .card {
        background: #11131a;
        border: 1px solid #232733;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .card-header {
        padding: 14px 18px;
        border-bottom: 1px solid #232733;
        font-size: 15px;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .tag {
        font-size: 11px;
        text-transform: uppercase;
        font-weight: 700;
        padding: 4px 8px;
        border-radius: 4px;
        background: #dc143c;
        color: #fff;
      }
      .tag.ref {
        background: #059669;
      }
      .img-wrap {
        width: 100%;
        aspect-ratio: 16 / 10;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .notes {
        padding: 14px 18px;
        font-size: 13px;
        line-height: 1.5;
        color: #94a3b8;
        background: #0c0e14;
      }
    </style>
  </head>
  <body>
    <h1>TU International Cricket Ground: Ground Reality vs 3D Night Lighting</h1>
    <div class="grid">
      <div class="card">
        <div class="card-header">
          <span>Real TU Ground at Night</span>
          <span class="tag ref">Reference Photo</span>
        </div>
        <div class="img-wrap">
          <img src="data:image/png;base64,${refImgData}" />
        </div>
        <div class="notes">
          • Natural clear night air: zero visible light cones or volumetric shafts.<br>
          • Inky black night surroundings beyond stadium perimeter boundary.<br>
          • Saturated yellow-green luminous turf with visible mowing stripes.<br>
          • Small bright star-burst cluster glow from elevated floodlights.
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span>Aasan 3D Stadium Lighting</span>
          <span class="tag">Real-Time Canvas</span>
        </div>
        <div class="img-wrap">
          <img src="data:image/png;base64,${aerialImgData}" />
        </div>
        <div class="notes">
          • Beams deleted: 0 volumetric cylinder cones; subtle bloom on 60 micro-LEDs.<br>
          • Pitch-black sky (#010206) with soft horizon gradient & distant city points.<br>
          • Even pitch lighting (#328b40 / #3ea34e) with gentle boundary falloff.<br>
          • Upward grass bounce illuminating stands, front rows brighter than upper rows.
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  const comparisonPage = await browser.newPage();
  await comparisonPage.setViewport({ width: 1600, height: 980, deviceScaleFactor: 1 });
  await comparisonPage.setContent(comparisonHtml, { waitUntil: 'load' });
  await sleep(1000);

  const sideBySidePath = path.join(ARTIFACT_DIR, 'tu_night_side_by_side_comparison.png');
  await comparisonPage.screenshot({ path: sideBySidePath, fullPage: true });
  console.log(`Saved side-by-side comparison: ${sideBySidePath}`);

  await browser.close();

  // Save report
  const report = {
    fps,
    screenshots: {
      aerial: aerialPath,
      topdown: topDownPath,
      pavilion: pavilionPath,
      upperSky: upperSkyPath,
      closeup: closeupPath,
      sideBySide: sideBySidePath,
    }
  };
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'night_lighting_report.json'), JSON.stringify(report, null, 2));
  console.log('Night lighting verification completed successfully!');
}

run().catch((err) => {
  console.error('Error running verification:', err);
  process.exit(1);
});
