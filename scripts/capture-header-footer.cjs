const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = path.resolve('C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));

  // Screenshot header area
  const headerElem = await page.$('header');
  if (headerElem) {
    await headerElem.screenshot({ path: path.join(ARTIFACT_DIR, 'header_option_a.png') });
    console.log('Saved header_option_a.png');
  }

  // Screenshot footer area
  const footerElem = await page.$('footer');
  if (footerElem) {
    await footerElem.screenshot({ path: path.join(ARTIFACT_DIR, 'footer_option_a.png') });
    console.log('Saved footer_option_a.png');
  }

  await browser.close();
})();
