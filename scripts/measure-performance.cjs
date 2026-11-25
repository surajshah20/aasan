const puppeteer = require('puppeteer');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function measureScene(page, label) {
  // Wait for scene to settle
  await sleep(1000);

  // Measure draw calls and FPS over 25 frames or 1.5 seconds max
  const perfData = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      let start = performance.now();
      let totalDrawCalls = 0;
      let maxDrawCalls = 0;
      let resolved = false;

      const finish = () => {
        if (resolved) return;
        resolved = true;
        const elapsed = Math.max(performance.now() - start, 1);
        const fps = Math.min(60, Math.round((frames / elapsed) * 1000));
        const avgCalls = frames > 0 ? Math.round(totalDrawCalls / frames) : 0;
        resolve({ fps, avgCalls, maxCalls: maxDrawCalls });
      };

      // Safety timeout after 2.5 seconds
      setTimeout(finish, 2500);

      function onFrame() {
        if (resolved) return;
        frames++;
        const gl = window.__THREE_RENDERER__;
        if (gl && gl.info && gl.info.render) {
          const calls = gl.info.render.calls;
          totalDrawCalls += calls;
          if (calls > maxDrawCalls) maxDrawCalls = calls;
        }

        if (frames < 25) {
          requestAnimationFrame(onFrame);
        } else {
          finish();
        }
      }
      requestAnimationFrame(onFrame);
    });
  });

  return perfData;
}

(async () => {
  console.log('=== Performance Benchmarking: Frame Rates & Draw Calls ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
  });

  const results = [];

  // ──────────────────────────────────────────────────────────
  // 1. DESKTOP PROFILE (1440x900, Unthrottled)
  // ──────────────────────────────────────────────────────────
  const desktopPage = await browser.newPage();
  await desktopPage.setViewport({ width: 1440, height: 900 });

  // A. Stadium Aerial Night
  console.log('1. Measuring Stadium Aerial (Night)...');
  await desktopPage.goto('http://127.0.0.1:5173/stadium/tu?mode=night', { waitUntil: 'domcontentloaded' });
  const d_stadiumNight = await measureScene(desktopPage, 'Desktop: Stadium Night');
  results.push({ scene: 'Stadium Aerial (Night)', profile: 'Desktop (1440px)', ...d_stadiumNight });

  // B. Stadium Aerial Day
  console.log('2. Measuring Stadium Aerial (Day)...');
  await desktopPage.goto('http://127.0.0.1:5173/stadium/tu?mode=day', { waitUntil: 'domcontentloaded' });
  const d_stadiumDay = await measureScene(desktopPage, 'Desktop: Stadium Day');
  results.push({ scene: 'Stadium Aerial (Day)', profile: 'Desktop (1440px)', ...d_stadiumDay });

  // C. Stadium Seat View
  console.log('3. Measuring Stadium Seat View...');
  await desktopPage.goto('http://127.0.0.1:5173/stadium/tu/pavilion-lower/p1/a-1', { waitUntil: 'domcontentloaded' });
  const d_stadiumSeat = await measureScene(desktopPage, 'Desktop: Seat View');
  results.push({ scene: 'Stadium Seat View', profile: 'Desktop (1440px)', ...d_stadiumSeat });

  // D. Cinema Hall
  console.log('4. Measuring Cinema Hall...');
  await desktopPage.goto('http://127.0.0.1:5173/cinema/qfx-civil-audi1', { waitUntil: 'domcontentloaded' });
  const d_cinema = await measureScene(desktopPage, 'Desktop: Cinema Hall');
  results.push({ scene: 'Cinema Hall (Audi 1)', profile: 'Desktop (1440px)', ...d_cinema });

  await desktopPage.close();

  // ──────────────────────────────────────────────────────────
  // 2. MOBILE PROFILE (390x844, 4x CPU Throttling)
  // ──────────────────────────────────────────────────────────
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const client = await mobilePage.target().createCDPSession();
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  console.log('\n--- Throttled Mobile Profile (4x CPU Slowdown) ---');

  // A. Stadium Aerial Night (Mobile 4x)
  console.log('5. Measuring Mobile 4x: Stadium Aerial (Night)...');
  await mobilePage.goto('http://127.0.0.1:5173/stadium/tu?mode=night', { waitUntil: 'domcontentloaded' });
  const m_stadiumNight = await measureScene(mobilePage, 'Mobile 4x: Stadium Night');
  results.push({ scene: 'Stadium Aerial (Night)', profile: 'Mobile (390px, 4x CPU)', ...m_stadiumNight });

  // B. Stadium Aerial Day (Mobile 4x)
  console.log('6. Measuring Mobile 4x: Stadium Aerial (Day)...');
  await mobilePage.goto('http://127.0.0.1:5173/stadium/tu?mode=day', { waitUntil: 'domcontentloaded' });
  const m_stadiumDay = await measureScene(mobilePage, 'Mobile 4x: Stadium Day');
  results.push({ scene: 'Stadium Aerial (Day)', profile: 'Mobile (390px, 4x CPU)', ...m_stadiumDay });

  // C. Stadium Seat View (Mobile 4x)
  console.log('7. Measuring Mobile 4x: Stadium Seat View...');
  await mobilePage.goto('http://127.0.0.1:5173/stadium/tu/pavilion-lower/p1/a-1', { waitUntil: 'domcontentloaded' });
  const m_stadiumSeat = await measureScene(mobilePage, 'Mobile 4x: Seat View');
  results.push({ scene: 'Stadium Seat View', profile: 'Mobile (390px, 4x CPU)', ...m_stadiumSeat });

  // D. Cinema Hall (Mobile 4x)
  console.log('8. Measuring Mobile 4x: Cinema Hall...');
  await mobilePage.goto('http://127.0.0.1:5173/cinema/qfx-civil-audi1', { waitUntil: 'domcontentloaded' });
  const m_cinema = await measureScene(mobilePage, 'Mobile 4x: Cinema Hall');
  results.push({ scene: 'Cinema Hall (Audi 1)', profile: 'Mobile (390px, 4x CPU)', ...m_cinema });

  await mobilePage.close();
  await browser.close();

  // Print Formatted Performance Report Table
  console.log('\n========================================================================');
  console.log('| Scene                     | Profile              | FPS | Avg Calls | Max Calls |');
  console.log('========================================================================');
  for (const r of results) {
    const s = r.scene.padEnd(25);
    const p = r.profile.padEnd(20);
    const fps = String(r.fps).padStart(3);
    const avg = String(r.avgCalls).padStart(9);
    const max = String(r.maxCalls).padStart(9);
    console.log(`| ${s} | ${p} | ${fps} | ${avg} | ${max} |`);
  }
  console.log('========================================================================\n');
})();
