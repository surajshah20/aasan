const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runFinalCleanupCapture() {
  const artifactDir = 'C:\\Users\\suraj\\.gemini\\antigravity\\brain\\c520c57b-1089-450d-8042-12595e8b1421';
  if (!fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  console.log('Launching browser for Final Stadium Cleanup Verification...');
  const tempProfile = path.join(__dirname, 'temp_chrome_cleanup_' + Date.now());
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    userDataDir: tempProfile,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle2' });
  await sleep(1500);

  // Select TU Cricket Ground
  console.log('Navigating to TU Cricket Ground...');
  await page.evaluate(() => {
    window.__BOOKING_STORE__.getState().selectVenue('tu_cricket_ground', 'event_tu_cricket_1');
    window.__BOOKING_STORE__.getState().returnToOverview();
  });
  await sleep(2500);

  // 1. Capture Night Aerial
  console.log('Capturing Night Aerial View...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    const store = window.__BOOKING_STORE__.getState();
    store.returnToOverview();
    if (drill) {
      drill.setLightingMode('evening');
      drill.setCustomCamera(null);
    }
  });
  await sleep(2200);
  const nightAerialPath = path.join(artifactDir, 'tu_cleanup_night_aerial.png');
  await page.screenshot({ path: nightAerialPath });

  // 2. Capture Day Aerial
  console.log('Capturing Day Aerial View...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    if (drill) {
      drill.setLightingMode('day');
      drill.setCustomCamera(null);
    }
  });
  await sleep(2200);
  const dayAerialPath = path.join(artifactDir, 'tu_cleanup_day_aerial.png');
  await page.screenshot({ path: dayAerialPath });

  // 3. Switch back to evening and capture Night Seat View from Pavilion
  console.log('Capturing Night Seat View from Pavilion...');
  await page.evaluate(() => {
    const drill = window.__STADIUM_DRILL__;
    const store = window.__BOOKING_STORE__.getState();
    if (drill) drill.setLightingMode('evening');
    drill.setCustomCamera(null);

    const seat = drill.allSeats.find((s) => s.standId === 'p_lower' && s.row === 'C')
      || drill.allSeats.find((s) => s.standId === 'p_lower');

    if (seat) {
      store.selectStand(seat.standId);
      store.selectBlock(seat.blockId);
      store.flyToSeat({
        sectionId: seat.sectionId,
        sectionName: seat.sectionName,
        row: seat.row,
        number: seat.number,
        priceNPR: seat.priceNPR,
        tier: seat.tier,
        cameraPosition: [seat.position[0], seat.position[1] + 1.2, seat.position[2]],
        cameraTarget: [0, 0.4, 0],
        blockId: seat.blockId,
        blockLabel: seat.blockLabel,
        standId: seat.standId,
      });
    }
  });
  await sleep(3000);
  const pavilionSeatPath = path.join(artifactDir, 'tu_cleanup_night_seat_pavilion.png');
  await page.screenshot({ path: pavilionSeatPath });

  // Return to overview and dump scene graph
  console.log('Dumping scene graph meshes and lights...');
  const sceneAudit = await page.evaluate(() => {
    const store = window.__BOOKING_STORE__.getState();
    store.returnToOverview();
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'Canvas not found' };

    // Find three scene from R3F
    let scene = null;
    const r3fKey = Object.keys(canvas).find(k => k.startsWith('__r3f'));
    if (r3fKey && canvas[r3fKey] && canvas[r3fKey].root && canvas[r3fKey].root.store) {
      scene = canvas[r3fKey].root.store.getState().scene;
    }
    if (!scene) {
      // Traverse React Fiber
      const fiberKey = Object.keys(canvas).find(k => k.startsWith('__reactFiber'));
      let fiber = canvas[fiberKey];
      while (fiber) {
        if (fiber.stateNode && fiber.stateNode.scene) {
          scene = fiber.stateNode.scene;
          break;
        }
        fiber = fiber.return;
      }
    }

    const items = [];
    if (scene) {
      scene.traverse((obj) => {
        if (obj.isMesh || obj.isLight || obj.isPoints) {
          let col = 'N/A';
          let roughness = null;
          let metalness = null;
          let opacity = null;

          if (obj.material) {
            const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
            if (mat.color && typeof mat.color.getHexString === 'function') {
              col = '#' + mat.color.getHexString();
            }
            if (mat.roughness !== undefined) roughness = mat.roughness;
            if (mat.metalness !== undefined) metalness = mat.metalness;
            if (mat.opacity !== undefined) opacity = mat.opacity;
          } else if (obj.color && typeof obj.color.getHexString === 'function') {
            col = '#' + obj.color.getHexString();
          }

          const wp = { x: 0, y: 0, z: 0 };
          if (typeof obj.getWorldPosition === 'function') {
            const v = obj.getWorldPosition(new (window.THREE ? window.THREE.Vector3 : obj.position.constructor)());
            wp.x = Math.round(v.x * 10) / 10;
            wp.y = Math.round(v.y * 10) / 10;
            wp.z = Math.round(v.z * 10) / 10;
          }

          items.push({
            name: obj.name || (obj.parent ? obj.parent.name : '') || 'unnamed',
            type: obj.type,
            geometry: obj.geometry ? obj.geometry.type : 'N/A',
            color: col,
            position: [wp.x, wp.y, wp.z],
            intensity: obj.intensity !== undefined ? obj.intensity : null,
            visible: obj.visible,
          });
        }
      });
    }
    return {
      foundScene: !!scene,
      totalCount: items.length,
      items,
    };
  });

  const auditLogPath = path.join(artifactDir, 'stadium_scene_mesh_audit.json');
  fs.writeFileSync(auditLogPath, JSON.stringify(sceneAudit, null, 2), 'utf-8');
  console.log(`Saved scene audit log to ${auditLogPath} (${sceneAudit.totalCount} objects).`);

  await browser.close();
  try {
    fs.rmSync(tempProfile, { recursive: true, force: true });
  } catch (err) {}
  console.log('Capture script finished successfully!');
}

runFinalCleanupCapture().catch((err) => {
  console.error('Error during cleanup capture:', err);
  process.exit(1);
});
