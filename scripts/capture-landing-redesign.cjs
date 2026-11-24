const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function main() {
  const artifactDir = 'C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421';
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // 1. Capture 1440px Desktop Full Page
  console.log('Capturing 1440px desktop full page...');
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000)); // wait for Three.js scene / poster to stabilize

  const desktopScreenshot = path.join(artifactDir, 'landing_redesign_1440.png');
  await page.screenshot({ path: desktopScreenshot, fullPage: true });
  console.log('Saved 1440px screenshot to:', desktopScreenshot);

  // 2. Capture 390px Mobile Full Page
  console.log('Capturing 390px mobile full page...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const mobileScreenshot = path.join(artifactDir, 'landing_redesign_390.png');
  await page.screenshot({ path: mobileScreenshot, fullPage: true });
  console.log('Saved 390px screenshot to:', mobileScreenshot);

  // 3. Test Routing: Click "Choose a match" / "Explore TU Stadium"
  console.log('Testing routing to TU Stadium...');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  
  // Click Explore TU Stadium button
  const stadiumBtn = await page.$('button:has-text("Explore TU Stadium"), button:has-text("रंगशाला सिट हेर्नुहोस्")');
  if (stadiumBtn) {
    await stadiumBtn.click();
    await new Promise(r => setTimeout(r, 3000));
    const venueViewVisible = await page.evaluate(() => {
      return document.querySelector('header')?.innerText.includes('TU International Cricket Ground') ||
             document.querySelector('canvas') !== null;
    });
    console.log('Venue view reached successfully:', venueViewVisible);
  }

  await browser.close();
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
