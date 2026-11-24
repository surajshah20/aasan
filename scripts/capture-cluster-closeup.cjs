const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0', timeout: 30000 });
  await sleep(1500);

  await page.evaluate(() => {
    if (window.__BOOKING_STORE__) {
      window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
      window.__BOOKING_STORE__.getState().returnToOverview();
    }
  });
  await sleep(2500);

  await page.evaluate(() => {
    if (window.__STADIUM_DRILL__) {
      window.__STADIUM_DRILL__.setLightingMode('evening');
      // Tower t-se is at [88, 0, 48], head at [88, 47.2, 48], pointing towards [-6, 0, 15] (inward and down)
      // To look at the front of the lamp head: stand between head and pitch: e.g. [70, 42, 38] looking at [88, 47.2, 48]
      window.__STADIUM_DRILL__.setCustomCamera({
        pos: [72, 42, 38],
        lookAt: [88, 47.2, 48],
        fov: 36,
        instant: true,
      });
    }
  });
  await sleep(2000);

  const closeupPath = path.join(ARTIFACT_DIR, 'tu_night_5_cluster_closeup.png');
  await page.screenshot({ path: closeupPath });
  console.log(`Saved: ${closeupPath}`);

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
