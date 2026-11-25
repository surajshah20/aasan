const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '../public');

async function generateBrandAssets() {
  console.log('Generating favicon PNGs, apple-touch-icon, and 1200x630 og-image...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // 1. Generate Favicon 32x32
  await page.setViewport({ width: 32, height: 32, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;display:flex;align-items:center;justify-content:center;background:#0a0b10;width:32px;height:32px;border-radius:6px;overflow:hidden;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="24" height="24">
          <rect width="32" height="32" rx="7" fill="#0a0b10"/>
          <rect x="0.5" y="0.5" width="31" height="31" rx="6.5" stroke="rgba(255,255,255,0.15)" fill="none"/>
          <path d="M9 13.5C9 11.5 10.5 10 12.5 10H19.5C21.5 10 23 11.5 23 13.5V17H9V13.5Z" fill="#dc143c"/>
          <path d="M7 16C7 15.4 7.4 15 8 15H24C24.6 15 25 15.4 25 16V18C25 19.1 24.1 20 23 20H9C7.9 20 7 19.1 7 18V16Z" fill="#dc143c"/>
          <path d="M10 20V23.5M22 20V23.5" stroke="#f1f5f9" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </body>
    </html>
  `);
  await page.screenshot({ path: path.join(publicDir, 'favicon-32x32.png') });
  console.log('Saved favicon-32x32.png');

  // 2. Generate Favicon 16x16
  await page.setViewport({ width: 16, height: 16, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;display:flex;align-items:center;justify-content:center;background:#0a0b10;width:16px;height:16px;border-radius:3px;overflow:hidden;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="14" height="14">
          <rect width="32" height="32" rx="7" fill="#0a0b10"/>
          <path d="M9 13.5C9 11.5 10.5 10 12.5 10H19.5C21.5 10 23 11.5 23 13.5V17H9V13.5Z" fill="#dc143c"/>
          <path d="M7 16C7 15.4 7.4 15 8 15H24C24.6 15 25 15.4 25 16V18C25 19.1 24.1 20 23 20H9C7.9 20 7 19.1 7 18V16Z" fill="#dc143c"/>
        </svg>
      </body>
    </html>
  `);
  await page.screenshot({ path: path.join(publicDir, 'favicon-16x16.png') });
  console.log('Saved favicon-16x16.png');

  // 3. Apple Touch Icon 180x180
  await page.setViewport({ width: 180, height: 180, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:0;display:flex;align-items:center;justify-content:center;background:#0a0b10;width:180px;height:180px;border-radius:36px;overflow:hidden;">
        <div style="width:140px;height:140px;display:flex;align-items:center;justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="120" height="120">
            <rect width="32" height="32" rx="7" fill="#0e111a"/>
            <rect x="0.5" y="0.5" width="31" height="31" rx="6.5" stroke="rgba(255,255,255,0.18)" fill="none"/>
            <path d="M9 13.5C9 11.5 10.5 10 12.5 10H19.5C21.5 10 23 11.5 23 13.5V17H9V13.5Z" fill="#dc143c"/>
            <path d="M7 16C7 15.4 7.4 15 8 15H24C24.6 15 25 15.4 25 16V18C25 19.1 24.1 20 23 20H9C7.9 20 7 19.1 7 18V16Z" fill="#dc143c"/>
            <path d="M10 20V23.5M22 20V23.5" stroke="#f1f5f9" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
      </body>
    </html>
  `);
  await page.screenshot({ path: path.join(publicDir, 'apple-touch-icon.png') });
  console.log('Saved apple-touch-icon.png');

  // 4. Social Preview Image 1200x630
  // Requirement: Open Graph and Twitter card tags with a 1200x630 social preview image (night stadium with the headline "See your seat before you book")
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  
  // Use landing hero stadium night poster if available as background
  let bgDataUri = '';
  const heroPosterPath = path.join(publicDir, 'landing/hero-poster.jpg');
  if (fs.existsSync(heroPosterPath)) {
    const bgBase64 = fs.readFileSync(heroPosterPath).toString('base64');
    bgDataUri = `data:image/jpeg;base64,${bgBase64}`;
  }

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      </head>
      <body style="margin:0;padding:0;width:1200px;height:630px;background:#07090e;color:#fff;font-family:'Inter',sans-serif;position:relative;overflow:hidden;box-sizing:border-box;">
        ${bgDataUri ? `<img src="${bgDataUri}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.45;filter:brightness(0.7) contrast(1.15);" />` : ''}
        
        <!-- Vignette & Gradient Overlays -->
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 75% 30%, rgba(220,20,60,0.18) 0%, transparent 60%), linear-gradient(180deg, rgba(7,9,14,0.3) 0%, rgba(7,9,14,0.85) 65%, #07090e 100%);"></div>
        
        <div style="position:relative;z-index:10;width:100%;height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:60px 70px;box-sizing:border-box;">
          
          <!-- Top Brand Bar -->
          <div style="display:flex;align-items:center;gap:18px;">
            <div style="width:48px;height:48px;border-radius:14px;background:#0b0d14;border:1px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(0,0,0,0.5);">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="34" height="34">
                <path d="M9 13.5C9 11.5 10.5 10 12.5 10H19.5C21.5 10 23 11.5 23 13.5V17H9V13.5Z" fill="#dc143c"/>
                <path d="M7 16C7 15.4 7.4 15 8 15H24C24.6 15 25 15.4 25 16V18C25 19.1 24.1 20 23 20H9C7.9 20 7 19.1 7 18V16Z" fill="#dc143c"/>
                <path d="M10 20V23.5M22 20V23.5" stroke="#f1f5f9" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div style="display:flex;align-items:baseline;gap:8px;">
              <span style="font-family:'Outfit',sans-serif;font-weight:700;font-size:28px;letter-spacing:-0.02em;color:#ffffff;">Aasan</span>
              <span style="font-weight:600;font-size:16px;color:#dc143c;letter-spacing:1px;">(आसन)</span>
            </div>
            <div style="margin-left:auto;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;color:#facc15;backdrop-filter:blur(8px);">
              Interactive 3D Ticketing • Nepal
            </div>
          </div>

          <!-- Center Headline -->
          <div style="max-width:860px;margin-top:auto;margin-bottom:auto;">
            <div style="display:inline-block;background:rgba(220,20,60,0.2);border:1px solid rgba(220,20,60,0.4);color:#ff6b81;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;padding:5px 14px;border-radius:12px;margin-bottom:18px;">
              TU Cricket Ground • QFX Cinemas • Multiplexes
            </div>
            <h1 style="font-family:'Outfit',sans-serif;font-weight:800;font-size:58px;line-height:1.08;letter-spacing:-0.03em;margin:0 0 16px 0;color:#ffffff;text-shadow:0 4px 20px rgba(0,0,0,0.8);">
              See your seat before you book.
            </h1>
            <p style="font-size:22px;line-height:1.4;color:#cbd5e1;margin:0;font-weight:400;max-width:720px;text-shadow:0 2px 10px rgba(0,0,0,0.8);">
              Explore TU Stadium stands and luxury cinema recliners in full 3D with authentic sightlines, acoustic ambience, and instant digital tickets.
            </p>
          </div>

          <!-- Bottom Features Row -->
          <div style="display:flex;align-items:center;gap:36px;border-top:1px solid rgba(255,255,255,0.12);padding-top:24px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:10px;height:10px;border-radius:50%;background:#10b981;"></div>
              <span style="font-size:14px;font-weight:500;color:#e2e8f0;">Real Sightline Previews</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:10px;height:10px;border-radius:50%;background:#38bdf8;"></div>
              <span style="font-size:14px;font-weight:500;color:#e2e8f0;">eSewa · Khalti · Fonepay</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:10px;height:10px;border-radius:50%;background:#fbbf24;"></div>
              <span style="font-size:14px;font-weight:500;color:#e2e8f0;">2D Accessible High-Contrast Mode</span>
            </div>
            <div style="margin-left:auto;font-size:14px;font-weight:600;color:#94a3b8;">
              aasan.com.np
            </div>
          </div>

        </div>
      </body>
    </html>
  `);

  await page.screenshot({ path: path.join(publicDir, 'og-image.png') });
  console.log('Saved 1200x630 og-image.png');

  await browser.close();
  console.log('Brand asset generation complete!');
}

generateBrandAssets().catch((err) => {
  console.error(err);
  process.exit(1);
});
