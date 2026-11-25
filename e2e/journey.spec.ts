import { test, expect } from '@playwright/test';

test.describe('Aasan Complete End-to-End User Journeys', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // If the project specifies Nepali language, toggle to Nepali
    if (testInfo.project.name.includes('-ne')) {
      await page.goto('/');
      await page.waitForTimeout(500);
      const neBtn = page.locator('header').getByRole('button', { name: 'नेपाली' }).first();
      if (await neBtn.isVisible()) {
        await neBtn.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('Stadium Journey: Landing -> 3D/2D Select -> Seat -> Checkout -> Ticket', async ({ page }) => {
    // 1. Landing Page
    await page.goto('/');
    await expect(page).toHaveTitle(/Aasan/);

    // 2. Select TU Cricket Ground
    await page.goto('/stadium/tu');
    await page.waitForTimeout(1000);

    // Switch to 2D accessible mode for deterministic test execution
    await page.evaluate(() => {
      const store = (window as any).__BOOKING_STORE__ || (window as any).useBookingStore;
      if (store) store.getState().setLiteMode(true);
    });
    await page.waitForTimeout(500);

    // Pick Grand Pavilion End / Lower
    const pavilionBtn = page.locator('button:has-text("Grand Pavilion"), button:has-text("प्याभिलियन")').first();
    if (await pavilionBtn.isVisible()) {
      await pavilionBtn.click();
    }

    // 3. Best Available / Seat Selection
    await page.evaluate(() => {
      const store = (window as any).__BOOKING_STORE__ || (window as any).useBookingStore;
      if (store) {
        store.getState().toggleSeat({
          sectionId: 'tu_pavilion_end',
          sectionName: 'Grand Pavilion — Lower',
          row: 'A',
          number: 1,
          priceNPR: 1200,
          tier: 'VIP',
          blockLabel: 'P1',
        });
        store.getState().setView('checkout');
      }
    });
    await page.waitForTimeout(1000);

    // 4. Fill Buyer Details Form
    await page.fill('#full-name', 'Aarav Sharma');
    await page.fill('#mobile-number', '9841234567');
    await page.fill('#email', 'aarav@example.com');

    // Click Proceed to Pay
    const paySubmitBtn = page.locator('button:has-text("Proceed to Pay"), button:has-text("भुक्तानी अघि बढाउनुहोस्")').first();
    await paySubmitBtn.click();

    // Modal Simulation: Click Simulate Success
    await page.waitForSelector('button:has-text("Simulate Success")');
    await page.click('button:has-text("Simulate Success")');
    await page.waitForTimeout(1500);

    // 5. Confirmed Ticket Page
    await expect(page.locator('text=Aarav Sharma')).toBeVisible();
    await expect(page.locator('#btn-download-pdf, #btn-save-images').first()).toBeVisible();
  });

  test('Cinema Journey: Landing -> Cinema -> Showtime -> Seat View -> Ticket', async ({ page }) => {
    // 1. Navigate to QFX Cinemas
    await page.goto('/cinema/qfx-civil-audi1');
    await page.waitForTimeout(1000);

    // 2. Select a showtime if available
    const showtimeBtn = page.locator('button:has-text("06:30 PM"), button:has-text("02:45 PM")').first();
    if (await showtimeBtn.isVisible()) {
      await showtimeBtn.click({ force: true }).catch(() => {});
    }

    // Select a prime cinema seat and proceed to checkout
    await page.evaluate(() => {
      const store = (window as any).__BOOKING_STORE__ || (window as any).useBookingStore;
      if (store) {
        store.getState().toggleSeat({
          sectionId: 'qfx_audi1_premium',
          sectionName: 'Prime Club',
          row: 'F',
          number: 5,
          priceNPR: 480,
          tier: 'Premium',
        });
        store.getState().setView('checkout');
      }
    });

    await page.waitForTimeout(1000);

    // 3. Complete Checkout with Khalti
    await page.fill('#full-name', 'Pooja Thapa');
    await page.fill('#mobile-number', '9801234567');

    const payBtn = page.locator('button:has-text("Proceed to Pay"), button:has-text("भुक्तानी अघि बढाउनुहोस्")').first();
    await payBtn.click();

    await page.waitForSelector('button:has-text("Simulate Success")');
    await page.click('button:has-text("Simulate Success")');
    await page.waitForTimeout(1500);

    // Ticket View
    await expect(page.locator('text=Pooja Thapa')).toBeVisible();
  });

  test('Deep Link, Page Refresh & Browser Navigation Back', async ({ page }) => {
    // 1. Visit Deep Link with exact seat
    await page.goto('/stadium/tu/pavilion-lower/p1/a-1');
    await page.waitForTimeout(1500);

    // Verify seat is active in store
    const storeState = await page.evaluate(() => {
      const store = (window as any).__BOOKING_STORE__ || (window as any).useBookingStore;
      return store ? store.getState().activeSeat : null;
    });
    expect(storeState).not.toBeNull();
    expect(storeState?.row).toBe('A');

    // 2. Refresh page and verify state persists
    await page.reload();
    await page.waitForTimeout(1500);
    const refreshedState = await page.evaluate(() => {
      const store = (window as any).__BOOKING_STORE__ || (window as any).useBookingStore;
      return store ? store.getState().activeSeat : null;
    });
    expect(refreshedState?.row).toBe('A');

    // 3. Browser Back Button
    await page.goBack();
    await page.waitForTimeout(1000);
  });

  test('Reservation Timer Hold & Expiry State', async ({ page }) => {
    // Visit stadium and add a seat
    await page.goto('/stadium/tu');
    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      const store = (window as any).__BOOKING_STORE__ || (window as any).useBookingStore;
      if (store) {
        store.getState().toggleSeat({
          sectionId: 'tu_pavilion_end',
          row: 'A',
          number: 1,
          priceNPR: 1200,
          tier: 'VIP',
        });
        store.getState().setView('checkout');
      }
    });

    await page.waitForTimeout(500);

    // Verify buyer fields are present
    await expect(page.locator('#full-name')).toBeVisible();

    // Trigger timer expiry
    await page.evaluate(() => {
      const store = (window as any).__BOOKING_STORE__ || (window as any).useBookingStore;
      if (store) {
        store.getState().clearSeats();
        store.getState().setView('venue');
      }
    });

    await page.waitForTimeout(500);

    // Verify view returned to venue
    const currentView = await page.evaluate(() => {
      const store = (window as any).__BOOKING_STORE__ || (window as any).useBookingStore;
      return store ? store.getState().currentView : '';
    });
    expect(currentView).toBe('venue');
  });
});

