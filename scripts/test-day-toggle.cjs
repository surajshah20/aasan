const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:5173/');
  await new Promise((r) => setTimeout(r, 1500));

  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await new Promise((r) => setTimeout(r, 3000));

  const toggleBtn = await page.waitForSelector('button[aria-label="Toggle Lighting"]', { timeout: 5000 });
  if (toggleBtn) {
    console.log('Clicking Toggle Lighting button...');
    await toggleBtn.click();
    await new Promise((r) => setTimeout(r, 2000));
    await page.screenshot({ path: 'C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421/tu_day_mode_verification.png' });
    console.log('Saved day mode!');
  }
  await browser.close();
})();
