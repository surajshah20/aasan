const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

(async () => {
  console.log('=== Running Automated Accessibility (Axe) Audit ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

  async function auditUrl(url, label) {
    console.log(`Auditing ${label} (${url})...`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(1000);

    // Inject axe-core
    await page.evaluate(axeSource);

    // Run axe evaluation
    const results = await page.evaluate(async () => {
      // @ts-ignore
      return await window.axe.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
        rules: {
          // Color contrast on transparent WebGL overlays can sometimes produce false flags in headless
          'color-contrast': { enabled: true },
        },
      });
    });

    const criticalViolations = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    console.log(`  Passed rules: ${results.passes.length}`);
    console.log(`  Inapplicable: ${results.inapplicable.length}`);
    console.log(`  Violations (Critical/Serious): ${criticalViolations.length}`);

    if (criticalViolations.length > 0) {
      criticalViolations.forEach((v) => {
        console.log(`    - [${v.impact.toUpperCase()}] ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
      });
    }

    return {
      label,
      url,
      passes: results.passes.length,
      violations: criticalViolations.length,
      details: criticalViolations.map((v) => ({ id: v.id, impact: v.impact, help: v.help })),
    };
  }

  const reports = [];

  // 1. Landing Page
  reports.push(await auditUrl('http://127.0.0.1:5173/', 'Landing Page'));

  // 2. Stadium Venue Page (2D Accessible View)
  await page.goto('http://127.0.0.1:5173/stadium/tu', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    if (window.useBookingStore) {
      window.useBookingStore.getState().setLiteMode(true);
    }
  });
  reports.push(await auditUrl('http://127.0.0.1:5173/stadium/tu', 'Stadium 2D Accessible Mode'));

  // 3. Checkout Page
  // Add a seat so cart isn't empty
  await page.evaluate(() => {
    if (window.useBookingStore) {
      window.useBookingStore.getState().toggleSeat({
        sectionId: 'tu_pavilion_end',
        row: 'A',
        number: 1,
        priceNPR: 1200,
        tier: 'VIP',
      });
    }
  });
  reports.push(await auditUrl('http://127.0.0.1:5173/checkout', 'Checkout Page'));

  // 4. Ticket Page
  // Complete a mock booking
  await page.evaluate(() => {
    if (window.useBookingStore) {
      window.useBookingStore.getState().completeBooking({
        id: 'ASN-882194',
        eventId: 'event_tu_cricket_1',
        venueId: 'tu_cricket_ground',
        seats: [
          {
            sectionId: 'sec_pavilion_lower',
            sectionName: 'Grand Pavilion — Lower',
            row: 'A',
            number: 1,
            priceNPR: 1200,
            tier: 'VIP',
            blockLabel: 'P1',
          },
        ],
        totalNPR: 1200,
        paymentMethod: 'esewa',
        createdAtISO: '2026-11-25T14:30:00Z',
        customerName: 'Aarav Sharma',
        customerPhone: '+977 9841234567',
      });
    }
  });
  reports.push(await auditUrl('http://127.0.0.1:5173/ticket/ASN-882194', 'Digital Ticket Page'));

  await browser.close();

  console.log('\n=== Accessibility Audit Summary ===');
  reports.forEach((r) => {
    console.log(`${r.label}: ${r.violations === 0 ? '✓ ZERO CRITICAL/SERIOUS VIOLATIONS' : `⚠ ${r.violations} issues`}`);
  });
  console.log('\nAudit complete!');
})();
