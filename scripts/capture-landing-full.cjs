const puppeteer = require('puppeteer');
const path = require('path');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

(async () => {
  console.log('=== Capturing Full Page Landing Screenshots ===');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const artifactDir = path.resolve('C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421');

  // 1. Desktop 1440px
  console.log('1. Capturing Desktop (1440px)...');
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1440, height: 900 });
  await desktopPage.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  const out1440 = path.join(artifactDir, 'landing_full_1440.png');
  await desktopPage.screenshot({ path: out1440, fullPage: true });
  console.log(`Saved: ${out1440}`);
  await desktopPage.close();

  // 2. Mobile 390px
  console.log('2. Capturing Mobile (390px)...');
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mobilePage.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await sleep(1500);
  const out390 = path.join(artifactDir, 'landing_full_390.png');
  await mobilePage.screenshot({ path: out390, fullPage: true });
  console.log(`Saved: ${out390}`);
  await mobilePage.close();

  await browser.close();
  console.log('All landing screenshots captured successfully!');
})();
