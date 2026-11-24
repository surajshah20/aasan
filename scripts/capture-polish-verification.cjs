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
  await new Promise(r => setTimeout(r, 3500));

  const desktopScreenshot = path.join(artifactDir, 'landing_polish_1440.png');
  await page.screenshot({ path: desktopScreenshot, fullPage: true });
  console.log('Saved 1440px screenshot to:', desktopScreenshot);

  // 2. Capture 1024px Tablet Full Page
  console.log('Capturing 1024px tablet full page...');
  await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1.5 });
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  const tabletScreenshot = path.join(artifactDir, 'landing_polish_1024.png');
  await page.screenshot({ path: tabletScreenshot, fullPage: true });
  console.log('Saved 1024px screenshot to:', tabletScreenshot);

  // 3. Capture 390px Mobile Full Page
  console.log('Capturing 390px mobile full page...');
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));

  const mobileScreenshot = path.join(artifactDir, 'landing_polish_390.png');
  await page.screenshot({ path: mobileScreenshot, fullPage: true });
  console.log('Saved 390px screenshot to:', mobileScreenshot);

  // 4. Verify Responsiveness at 390px
  const mobileChecks = await page.evaluate(() => {
    // Check if hero buttons are stacked
    const heroButtons = Array.from(document.querySelectorAll('section button')).slice(0, 2);
    let buttonsStacked = false;
    if (heroButtons.length >= 2) {
      const rect0 = heroButtons[0].getBoundingClientRect();
      const rect1 = heroButtons[1].getBoundingClientRect();
      buttonsStacked = rect1.top >= rect0.bottom - 4;
    }

    // Check table overflow container
    const tableContainer = document.querySelector('#cinemas-table .overflow-x-auto');
    const hasScroll = tableContainer ? tableContainer.scrollWidth >= tableContainer.clientWidth : false;

    // Check closing section
    const closingText = document.body.innerText.includes('Pick your seat before you pay.') ||
                        document.body.innerText.includes('भुक्तानी गर्नुअघि');

    return {
      buttonsStacked,
      hasScroll,
      closingText
    };
  });
  console.log('Mobile 390px checks:', JSON.stringify(mobileChecks, null, 2));

  // 5. Verify Language Toggle Switch "EN | नेपाली"
  console.log('Testing language switch...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('header button'));
    const neBtn = buttons.find(b => b.textContent.trim() === 'नेपाली');
    if (neBtn) neBtn.click();
  });
  await new Promise(r => setTimeout(r, 1000));
  const neActive = await page.evaluate(() => {
    return document.body.innerText.includes('बुकिङ गर्नुअघि') &&
           document.body.innerText.includes('खेलहरू');
  });
  console.log('Nepali switch active:', neActive ? 'PASS' : 'FAIL');

  await browser.close();
  console.log('Verification complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
