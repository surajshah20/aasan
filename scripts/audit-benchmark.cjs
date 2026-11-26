// audit-benchmark.cjs  — production perf audit (read-only)
// Usage: node scripts/audit-benchmark.cjs
'use strict';

const puppeteer = require('puppeteer');
const fs        = require('fs');
const path      = require('path');

const BASE = 'http://127.0.0.1:4173';
const ARTIFACT_DIR = path.join(__dirname, '..', 'C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421');

// Try to use the right artifact dir
const OUTDIR = fs.existsSync('C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421')
  ? 'C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421'
  : path.join(__dirname, '..');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Inject a frame-time sampler that reads renderer.info through __THREE_RENDERER__
const INJECT_SAMPLER = `
window.__frameSamples = [];
window.__heapSamples  = [];
window.__lastRaf      = null;

function sampleFrame(ts) {
  if (window.__lastRaf !== null) {
    window.__frameSamples.push(ts - window.__lastRaf);
  }
  window.__lastRaf = ts;
  window.__heapSamples.push(
    performance.memory ? performance.memory.usedJSHeapSize : 0
  );
  if (window.__sampling) requestAnimationFrame(sampleFrame);
}

window.__sampling = true;
requestAnimationFrame(sampleFrame);
`;

const STOP_SAMPLER = `
window.__sampling = false;
const frames   = window.__frameSamples;
const heap     = window.__heapSamples;
const fps_avg  = frames.length > 0 ? Math.round(1000 / (frames.reduce((a,b)=>a+b,0)/frames.length)) : 0;
const ft_worst = frames.length > 0 ? Math.round(Math.max(...frames)) : 0;
const ft_avg   = frames.length > 0 ? Math.round(frames.reduce((a,b)=>a+b,0)/frames.length) : 0;
const heap_mb  = heap.length > 0  ? Math.round(heap[heap.length-1]/1024/1024*10)/10 : 0;

// Try to read Three.js renderer info
let info = { calls:0, tris:0, geom:0, tex:0 };
const rend = window.__THREE_RENDERER__;
if (rend && rend.info) {
  info.calls = rend.info.render.calls;
  info.tris  = rend.info.render.triangles;
  info.geom  = rend.info.memory.geometries;
  info.tex   = rend.info.memory.textures;
}

({ fps_avg, ft_worst, ft_avg, heap_mb, ...info });
`;

async function measureView(page, label, url, setupFn, waitMs) {
  console.log(`\n▶ ${label}`);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  if (setupFn) await setupFn(page);
  await sleep(800);

  // start sampling
  await page.evaluate(INJECT_SAMPLER);
  await sleep(waitMs);
  const result = await page.evaluate(STOP_SAMPLER);

  console.log(`  FPS avg: ${result.fps_avg}  FrameTime worst: ${result.ft_worst}ms  avg: ${result.ft_avg}ms`);
  console.log(`  Calls: ${result.calls}  Triangles: ${result.tris}  Geoms: ${result.geom}  Tex: ${result.tex}  Heap: ${result.heap_mb}MB`);

  return { label, ...result };
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-precise-memory-info'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  const setStore = (overrides) => page.evaluate((o) => {
    if (window.__BOOKING_STORE__) window.__BOOKING_STORE__.setState(o);
  }, overrides);

  const rows = [];

  // 1. Landing page
  rows.push(await measureView(page, '1. Landing Page', `${BASE}/`, null, 3000));

  // 2. Stadium aerial — night
  rows.push(await measureView(page, '2. Stadium Aerial Night', `${BASE}/stadium/tu?mode=night`, async (p) => {
    await setStore({ currentView: 'venue', lightingMode: 'evening' });
    await sleep(3000);
  }, 4000));

  // 3. Stadium aerial — day
  rows.push(await measureView(page, '3. Stadium Aerial Day', `${BASE}/stadium/tu?mode=day`, async (p) => {
    await setStore({ currentView: 'venue', lightingMode: 'day' });
    await sleep(3000);
  }, 4000));

  // 4. Stand view
  rows.push(await measureView(page, '4. Stand View (Pavilion Lower)', `${BASE}/stadium/tu/pavilion-lower`, async () => {
    await sleep(3000);
  }, 4000));

  // 5. Block view
  rows.push(await measureView(page, '5. Block View (P1)', `${BASE}/stadium/tu/pavilion-lower/p1`, async () => {
    await sleep(3000);
  }, 4000));

  // 6. Seat view
  rows.push(await measureView(page, '6. Seat View (A-1)', `${BASE}/stadium/tu/pavilion-lower/p1/a-1`, async () => {
    await sleep(3000);
  }, 4000));

  // 7. Cinema hall
  rows.push(await measureView(page, '7. Cinema Hall (QFX Civil)', `${BASE}/cinema/qfx-civil-audi1`, async () => {
    await sleep(3000);
  }, 4000));

  // Memory growth check: switch venues 5x
  console.log('\n▶ Memory Growth Check (5 venue switches)');
  const memStart = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0);
  for (let i = 0; i < 5; i++) {
    await page.goto(`${BASE}/stadium/tu`, { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(1000);
    await page.goto(`${BASE}/cinema/qfx-civil-audi1`, { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(1000);
  }
  const memEnd = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : 0);
  const growthMB = Math.round((memEnd - memStart) / 1024 / 1024 * 10) / 10;
  console.log(`  Heap start: ${Math.round(memStart/1024/1024*10)/10}MB  Heap end: ${Math.round(memEnd/1024/1024*10)/10}MB  Growth: ${growthMB}MB`);

  await browser.close();

  // Print summary table
  console.log('\n\n══════════════════════════════════════════════════════════════════════════════════');
  console.log('  PERF AUDIT RESULTS — production build (1440×900 @2× DPR, headless Chromium)');
  console.log('══════════════════════════════════════════════════════════════════════════════════');
  console.log('  View                        | FPS avg | FT worst | Calls | Triangles | Geoms | Tex | Heap');
  console.log('  ----------------------------|---------|----------|-------|-----------|-------|-----|-----');
  for (const r of rows) {
    console.log(`  ${r.label.padEnd(28)}| ${String(r.fps_avg).padEnd(7)} | ${String(r.ft_worst+'ms').padEnd(8)} | ${String(r.calls).padEnd(5)} | ${String(r.tris).padEnd(9)} | ${String(r.geom).padEnd(5)} | ${String(r.tex).padEnd(3)} | ${r.heap_mb}MB`);
  }
  console.log(`\n  Memory growth after 5 venue switches: ${growthMB > 0 ? '+' : ''}${growthMB}MB`);
  console.log('══════════════════════════════════════════════════════════════════════════════════');

  // Save JSON
  const outPath = path.join(OUTDIR, 'perf-audit-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ rows, memGrowthMB: growthMB }, null, 2));
  console.log(`\nJSON saved to: ${outPath}`);
})();
