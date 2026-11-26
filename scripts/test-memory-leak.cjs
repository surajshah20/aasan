// scripts/test-memory-leak.cjs
// Runs 10 in-app venue switches without page reload to prove heap stays flat
'use strict';

const puppeteer = require('puppeteer');

const BASE = 'http://127.0.0.1:4173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-precise-memory-info', '--js-flags=--expose-gc'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('Navigating to initial venue (Stadium)...');
  await page.goto(`${BASE}/stadium/tu`, { waitUntil: 'networkidle0' });
  await sleep(2000);

  // Trigger GC if available
  await page.evaluate(() => { if (window.gc) window.gc(); });
  await sleep(500);

  const initialHeap = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0);
  console.log(`Initial baseline heap: ${(initialHeap / 1024 / 1024).toFixed(2)} MB`);

  const heapHistory = [];

  for (let i = 1; i <= 10; i++) {
    // Switch to Cinema
    await page.evaluate(() => {
      // Use in-app history push to switch route without full page reload
      window.history.pushState({}, '', '/cinema/qfx-civil-audi1');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await sleep(1500);

    // Switch to Stadium
    await page.evaluate(() => {
      window.history.pushState({}, '', '/stadium/tu');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await sleep(1500);

    await page.evaluate(() => { if (window.gc) window.gc(); });
    const currentHeap = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0);
    const mb = Number((currentHeap / 1024 / 1024).toFixed(2));
    heapHistory.push(mb);
    console.log(`Switch ${i}/10 — Heap: ${mb} MB (Delta: ${(mb - initialHeap / 1024 / 1024).toFixed(2)} MB)`);
  }

  const finalHeap = heapHistory[heapHistory.length - 1];
  const delta = (finalHeap - initialHeap / 1024 / 1024).toFixed(2);
  console.log(`\nFinal Heap after 10 full venue switches: ${finalHeap} MB (Net change: ${delta} MB)`);

  await browser.close();
})();
