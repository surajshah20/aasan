const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/suraj/.gemini/antigravity/brain/c520c57b-1089-450d-8042-12595e8b1421';

async function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

(async () => {
  console.log('Starting Batch 2 QA automation...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Check 2D Accessible Mode
  console.log('Testing 2D Accessible Mode...');
  await page.goto('http://127.0.0.1:5173/stadium/tu', { waitUntil: 'networkidle0' });
  await sleep(1000);

  // Switch to 2D Accessible view via store or header button
  await page.evaluate(() => {
    const store = window.useBookingStore ? window.useBookingStore.getState() : null;
    if (store && store.setLiteMode) {
      store.setLiteMode(true);
    } else {
      const buttons = Array.from(document.querySelectorAll('button'));
      const toggle = buttons.find(b => b.textContent && (b.textContent.includes('3D') || b.textContent.includes('2D')));
      if (toggle) toggle.click();
    }
  });
  await sleep(1000);

  // Click on a section (e.g. Grand Pavilion Lower) in 2D to open seat grid
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const secBtn = buttons.find(b => b.textContent && b.textContent.includes('Grand Pavilion — Lower'));
    if (secBtn) secBtn.click();
  });
  await sleep(1000);

  // Click "Best available (2 seats)" button
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const bestBtn = buttons.find(b => b.textContent && b.textContent.includes('Best available'));
    if (bestBtn) bestBtn.click();
  });
  await sleep(500);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'accessible_2d_view.png'),
    fullPage: false
  });
  console.log('Saved accessible_2d_view.png');

  // 2. Checkout Validation & Errors
  console.log('Navigating to checkout with holdSeconds=600...');
  await page.goto('http://127.0.0.1:5173/checkout?holdSeconds=600', { waitUntil: 'networkidle0' });
  await sleep(1000);

  // Ensure seats are in cart if cart was empty
  await page.evaluate(() => {
    const store = window.useBookingStore ? window.useBookingStore.getState() : null;
    if (store && store.selectedSeats.length === 0) {
      store.toggleSeat({
        id: 'sec_pavilion_lower_P1_A_1',
        sectionId: 'sec_pavilion_lower',
        sectionName: 'Grand Pavilion — Lower',
        row: 'A',
        number: 1,
        tier: 'VIP',
        priceNPR: 1200,
        status: 'selected'
      });
      store.toggleSeat({
        id: 'sec_pavilion_lower_P1_A_2',
        sectionId: 'sec_pavilion_lower',
        sectionName: 'Grand Pavilion — Lower',
        row: 'A',
        number: 2,
        tier: 'VIP',
        priceNPR: 1200,
        status: 'selected'
      });
      store.setView('checkout');
    }
  });
  await sleep(1000);

  // Take normal timer screenshot
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'timer_normal.png')
  });
  console.log('Saved timer_normal.png');

  // Trigger form validation error by typing 1 char name and invalid phone then blur
  const nameInput = await page.$('#buyer-fullname');
  const phoneInput = await page.$('#buyer-phone');

  if (nameInput) {
    await nameInput.click();
    await nameInput.type('A');
  }
  if (phoneInput) {
    await phoneInput.click();
    await phoneInput.type('12345');
    await page.keyboard.press('Tab');
  }
  await sleep(500);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'checkout_validation_errors.png')
  });
  console.log('Saved checkout_validation_errors.png');

  // Clear inputs and fill valid buyer details
  await page.evaluate(() => {
    const n = document.getElementById('buyer-fullname');
    const p = document.getElementById('buyer-phone');
    const e = document.getElementById('buyer-email');
    if (n) { n.value = 'Aarav Sharma'; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('blur', { bubbles: true })); }
    if (p) { p.value = '9841234567'; p.dispatchEvent(new Event('input', { bubbles: true })); p.dispatchEvent(new Event('blur', { bubbles: true })); }
    if (e) { e.value = 'aarav.sharma@example.com'; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('blur', { bubbles: true })); }
  });
  await sleep(500);

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'checkout_valid_state.png')
  });
  console.log('Saved checkout_valid_state.png');

  // 3. Test Timer Low (< 2 mins)
  console.log('Testing timer low state...');
  await page.goto('http://127.0.0.1:5173/checkout?holdSeconds=90', { waitUntil: 'networkidle0' });
  await sleep(1000);
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'timer_low.png')
  });
  console.log('Saved timer_low.png');

  // 4. Test Demo Wallets
  // Reset timer to 600
  await page.goto('http://127.0.0.1:5173/checkout?holdSeconds=600', { waitUntil: 'networkidle0' });
  await sleep(1000);

  // Fill valid details again
  await page.evaluate(() => {
    const n = document.getElementById('buyer-fullname');
    const p = document.getElementById('buyer-phone');
    if (n) { n.value = 'Aarav Sharma'; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('blur', { bubbles: true })); }
    if (p) { p.value = '9841234567'; p.dispatchEvent(new Event('input', { bubbles: true })); p.dispatchEvent(new Event('blur', { bubbles: true })); }
  });
  await sleep(500);

  // Test eSewa modal
  await page.evaluate(() => {
    // Select eSewa tab
    const btns = Array.from(document.querySelectorAll('button'));
    const esewaTab = btns.find(b => b.textContent && b.textContent.includes('eSewa'));
    if (esewaTab) esewaTab.click();
  });
  await sleep(300);
  await page.evaluate(() => {
    // Click "Pay with eSewa" button
    const btns = Array.from(document.querySelectorAll('button'));
    const payBtn = btns.find(b => b.textContent && b.textContent.includes('Pay with'));
    if (payBtn) payBtn.click();
  });
  await sleep(600);
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'wallet_esewa.png')
  });
  console.log('Saved wallet_esewa.png');

  // Close / Cancel modal
  await page.evaluate(() => {
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Cancel'));
    if (cancelBtn) cancelBtn.click();
  });
  await sleep(500);

  // Test Khalti modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const khaltiTab = btns.find(b => b.textContent && b.textContent.includes('Khalti'));
    if (khaltiTab) khaltiTab.click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const payBtn = btns.find(b => b.textContent && b.textContent.includes('Pay with'));
    if (payBtn) payBtn.click();
  });
  await sleep(600);
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'wallet_khalti.png')
  });
  console.log('Saved wallet_khalti.png');

  await page.evaluate(() => {
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Cancel'));
    if (cancelBtn) cancelBtn.click();
  });
  await sleep(500);

  // Test Fonepay modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const fonepayTab = btns.find(b => b.textContent && b.textContent.includes('Fonepay'));
    if (fonepayTab) fonepayTab.click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const payBtn = btns.find(b => b.textContent && b.textContent.includes('Pay with'));
    if (payBtn) payBtn.click();
  });
  await sleep(600);
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'wallet_fonepay.png')
  });
  console.log('Saved wallet_fonepay.png');

  await page.evaluate(() => {
    const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Cancel'));
    if (cancelBtn) cancelBtn.click();
  });
  await sleep(500);

  // Test IME Pay modal
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const imeTab = btns.find(b => b.textContent && b.textContent.includes('IME Pay'));
    if (imeTab) imeTab.click();
  });
  await sleep(300);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const payBtn = btns.find(b => b.textContent && b.textContent.includes('Pay with'));
    if (payBtn) payBtn.click();
  });
  await sleep(600);
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'wallet_imepay.png')
  });
  console.log('Saved wallet_imepay.png');

  // Complete Payment using "Simulate Success"
  console.log('Simulating payment success...');
  await page.evaluate(() => {
    const succBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Simulate Success'));
    if (succBtn) succBtn.click();
  });
  await sleep(2000);

  // Now we should be on Ticket view with Aarav Sharma printed
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'ticket_with_buyer_name.png')
  });
  console.log('Saved ticket_with_buyer_name.png');

  // 5. Test Expiry State
  console.log('Testing timer expiry state with holdSeconds=3...');
  await page.goto('http://127.0.0.1:5173/checkout?holdSeconds=3', { waitUntil: 'networkidle0' });
  await sleep(3500); // Wait for timer to hit 0:00 and expire
  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, 'timer_expired.png')
  });
  console.log('Saved timer_expired.png');

  await browser.close();
  console.log('QA Automation completed successfully!');
})();
