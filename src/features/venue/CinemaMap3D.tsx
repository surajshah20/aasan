import React, { useRef, useMemo, useState, useLayoutEffect, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Section, SelectedSeat } from '../../types';
import { useBookingStore } from '../../store/useBookingStore';
import { useT } from '../../i18n/useT';
import { formatPrice } from '../../lib/money';
import { isLowEndDevice } from '../../lib/device';
import { SeatViewHeadControls } from './SeatViewHeadControls';

interface CinemaMap3DProps {
  sections: Section[];
  onSelectSection?: (sectionId: string) => void;
}

interface CinemaSeatInstance {
  instanceId: number;
  sectionId: string;
  sectionName: string;
  row: string;
  number: number;
  priceNPR: number;
  tier: string;
  position: [number, number, number];
  baseColor: THREE.Color;
  isAccessible?: boolean;
}

// ─── Procedural Carpet Floor Texture (Dark Luxury Acoustic Weave) ───
function createCarpetTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Deep charcoal-navy base
  ctx.fillStyle = '#0a0d13';
  ctx.fillRect(0, 0, size, size);

  // Subtle acoustic cross-weave pattern
  ctx.strokeStyle = '#121622';
  ctx.lineWidth = 1.2;
  const step = 16;
  for (let i = 0; i <= size; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Interwoven subtle acoustic micro-grain
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 8 + Math.random() * 16;
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 6})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 16);
  return tex;
}

// ─── Procedural Fabric Bump Texture for Seats ───
function createFabricBumpTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 3) {
    const v = 118 + Math.random() * 20;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, size, 1);
  }

  for (let x = 0; x < size; x += 4) {
    const v = 122 + Math.random() * 16;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, 0, 1, size);
  }

  for (let i = 0; i < 3000; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const v = 110 + Math.random() * 36;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(px, py, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

// ─── Sharp, High-Contrast Dark Cinematic Still Texture (No Banding, Dithered) ───
function createCinematicScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // 1. High contrast deep space / cinematic night sky
  ctx.fillStyle = '#020408';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Cosmic nebula gradient
  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0.0, '#040714');
  grad.addColorStop(0.35, '#071626');
  grad.addColorStop(0.65, '#131e2e');
  grad.addColorStop(0.85, '#1e1b22');
  grad.addColorStop(1.0, '#0a0608');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Deep cosmic teal glow with crisp contrasts
  const nebula = ctx.createRadialGradient(
    canvas.width * 0.40, canvas.height * 0.44, 30,
    canvas.width * 0.40, canvas.height * 0.44, 700
  );
  nebula.addColorStop(0.0, 'rgba(14, 165, 233, 0.45)');
  nebula.addColorStop(0.35, 'rgba(3, 105, 161, 0.22)');
  nebula.addColorStop(0.70, 'rgba(15, 23, 42, 0.10)');
  nebula.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 4. Warm amber atmospheric star glow
  const warmGlow = ctx.createRadialGradient(
    canvas.width * 0.72, canvas.height * 0.50, 20,
    canvas.width * 0.72, canvas.height * 0.50, 560
  );
  warmGlow.addColorStop(0.0, 'rgba(245, 158, 11, 0.42)');
  warmGlow.addColorStop(0.40, 'rgba(180, 83, 9, 0.18)');
  warmGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = warmGlow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 5. Razor-sharp celestial mountain / planetary horizon ridge
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, canvas.height * 0.68);
  const points = [
    [0.15, 0.62], [0.26, 0.65], [0.38, 0.57], [0.46, 0.59],
    [0.55, 0.52], [0.63, 0.56], [0.74, 0.50], [0.85, 0.58], [1.0, 0.64]
  ];
  points.forEach(([px, py]) => {
    ctx.lineTo(canvas.width * px, canvas.height * py);
  });
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();

  // Part 5: Faint horizon glow in the lower part of the screen so it is never solid black
  const lowerGrad = ctx.createLinearGradient(0, canvas.height * 0.50, 0, canvas.height);
  lowerGrad.addColorStop(0.00, '#0f293d'); // Dusky twilight cyan-teal glow at horizon
  lowerGrad.addColorStop(0.25, '#0c2030'); // Deep atmospheric oceanic glow
  lowerGrad.addColorStop(0.60, '#0a1724'); // Muted dusk slate
  lowerGrad.addColorStop(1.00, '#070f1a'); // Soft dark slate base (not pure black)
  ctx.fillStyle = lowerGrad;
  ctx.fill();

  // Subtle warm amber atmospheric scattering glow along the lower horizon
  const horizonScattering = ctx.createRadialGradient(
    canvas.width * 0.60, canvas.height * 0.58, 30,
    canvas.width * 0.60, canvas.height * 0.58, 700
  );
  horizonScattering.addColorStop(0.0, 'rgba(217, 119, 6, 0.28)'); // Warm amber horizon glow
  horizonScattering.addColorStop(0.4, 'rgba(180, 83, 9, 0.14)');
  horizonScattering.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = horizonScattering;
  ctx.fillRect(0, canvas.height * 0.50, canvas.width, canvas.height * 0.50);

  // Crisp illuminated ridge edge (sharp edge lighting, high contrast)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#0ea5e9';
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.restore();

  // 6. Razor-sharp horizontal anamorphic lens flare line
  const flareY = canvas.height * 0.51;
  const flareGrad = ctx.createLinearGradient(0, flareY, canvas.width, flareY);
  flareGrad.addColorStop(0.0, 'rgba(56, 189, 248, 0)');
  flareGrad.addColorStop(0.35, 'rgba(56, 189, 248, 0.45)');
  flareGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.95)');
  flareGrad.addColorStop(0.70, 'rgba(251, 191, 36, 0.5)');
  flareGrad.addColorStop(1.0, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = flareGrad;
  ctx.fillRect(0, flareY - 1.2, canvas.width, 2.4);

  // Bright anamorphic core sparkle
  const coreX = canvas.width * 0.55;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(coreX, flareY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 7. Sharp pinpoint stars
  for (let i = 0; i < 450; i++) {
    const sx = Math.random() * canvas.width;
    const sy = Math.random() * (canvas.height * 0.65);
    const bright = Math.random();
    const radius = bright > 0.96 ? 2.0 : bright > 0.85 ? 1.4 : 0.8;
    ctx.fillStyle = bright > 0.9 ? '#ffffff' : bright > 0.6 ? '#93c5fd' : '#cbd5e1';
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Diffraction spikes on the brightest stars
    if (bright > 0.97) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy);
      ctx.lineTo(sx + 8, sy);
      ctx.moveTo(sx, sy - 8);
      ctx.lineTo(sx, sy + 8);
      ctx.stroke();
    }
  }

  // 8. Dithering noise to 100% eliminate banding
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 6;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// ─── Small X Cross Geometry for Sold Seats ───
function buildCrossGeometry(): THREE.BufferGeometry {
  const bar1 = new THREE.BoxGeometry(0.12, 0.024, 0.008);
  bar1.rotateZ(Math.PI / 4);
  const bar2 = new THREE.BoxGeometry(0.12, 0.024, 0.008);
  bar2.rotateZ(-Math.PI / 4);
  const cross = mergeGeometries([bar1, bar2], false);
  return cross;
}

// ─── Small Checkmark Geometry for Selected Seats (Gold fill with check) ───
function buildCheckmarkGeometry(): THREE.BufferGeometry {
  const stem1 = new THREE.BoxGeometry(0.016, 0.045, 0.008);
  stem1.rotateZ(-Math.PI / 4);
  stem1.translate(-0.016, -0.012, 0);

  const stem2 = new THREE.BoxGeometry(0.016, 0.095, 0.008);
  stem2.rotateZ(Math.PI / 4);
  stem2.translate(0.022, 0.012, 0);

  const check = mergeGeometries([stem1, stem2], false);
  return check;
}

// ─── Small Wheelchair Icon Geometry for Accessible Seats ───
function buildWheelchairGeometry(): THREE.BufferGeometry {
  // 1. Head circle
  const head = new THREE.CylinderGeometry(0.014, 0.014, 0.008, 12);
  head.rotateX(Math.PI / 2);
  head.translate(-0.01, 0.046, 0);

  // 2. Wheel ring
  const wheel = new THREE.TorusGeometry(0.028, 0.006, 8, 16);
  wheel.translate(-0.016, -0.012, 0);

  // 3. Spine / Back
  const back = new THREE.BoxGeometry(0.007, 0.044, 0.008);
  back.translate(-0.016, 0.016, 0);

  // 4. Seat
  const seat = new THREE.BoxGeometry(0.034, 0.007, 0.008);
  seat.translate(0.001, -0.005, 0);

  // 5. Leg rest
  const leg = new THREE.BoxGeometry(0.007, 0.028, 0.008);
  leg.translate(0.018, -0.019, 0);

  const wheelchair = mergeGeometries([head, wheel, back, seat, leg], false);
  return wheelchair;
}

// ─── Seat Geometries (Rounded Merged BufferGeometry per Tier) ───
// Built natively facing -Z (screen), with backrests at +Z (back wall)

function createRoundedPart(
  width: number,
  height: number,
  depth: number,
  radius: number,
  bevelSegments: number = 2
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -depth / 2;
  const w = width;
  const h = depth;
  const r = Math.min(radius, w / 2, h / 2);

  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);

  const extrudeSettings = {
    steps: 1,
    depth: Math.max(0.01, height - r * 2),
    bevelEnabled: true,
    bevelThickness: r,
    bevelSize: r,
    bevelOffset: 0,
    bevelSegments: bevelSegments,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.rotateX(Math.PI / 2);
  geo.center();
  return geo;
}

function buildReclinerGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Base pedestal
  const base = createRoundedPart(0.74, 0.08, 0.70, 0.02, 1);
  base.translate(0, 0.04, 0);
  parts.push(base);

  // 2. Soft seat cushion (plush, facing -Z toward screen)
  const cushion = createRoundedPart(0.66, 0.16, 0.52, 0.04, 2);
  cushion.translate(0, 0.15, -0.06);
  parts.push(cushion);

  // 3. Curved backrest (tilted slightly back toward +Z)
  const back = createRoundedPart(0.62, 0.52, 0.11, 0.035, 2);
  const backM = new THREE.Matrix4().makeRotationX(0.18);
  backM.setPosition(0, 0.46, 0.20);
  back.applyMatrix4(backM);
  parts.push(back);

  // 4. Contoured headrest pillow
  const head = createRoundedPart(0.34, 0.16, 0.10, 0.04, 2);
  head.translate(0, 0.74, 0.24);
  parts.push(head);

  // 5. Rounded armrests (Left & Right)
  const armL = createRoundedPart(0.09, 0.20, 0.52, 0.03, 1);
  armL.translate(-0.35, 0.24, -0.04);
  parts.push(armL);
  const armR = createRoundedPart(0.09, 0.20, 0.52, 0.03, 1);
  armR.translate(0.35, 0.24, -0.04);
  parts.push(armR);

  // 6. Recessed cup holders on armrests
  const cupL = new THREE.CylinderGeometry(0.038, 0.038, 0.03, 12).toNonIndexed();
  cupL.translate(-0.35, 0.35, -0.18);
  parts.push(cupL);
  const cupR = new THREE.CylinderGeometry(0.038, 0.038, 0.03, 12).toNonIndexed();
  cupR.translate(0.35, 0.35, -0.18);
  parts.push(cupR);

  // 7. Extended footrest lounge section (forward toward -Z)
  const foot = createRoundedPart(0.56, 0.07, 0.28, 0.03, 2);
  foot.translate(0, 0.09, -0.42);
  parts.push(foot);

  // 8. Outer side structural panels
  const panelL = createRoundedPart(0.03, 0.40, 0.62, 0.02, 1);
  panelL.translate(-0.39, 0.26, 0.02);
  parts.push(panelL);
  const panelR = createRoundedPart(0.03, 0.40, 0.62, 0.02, 1);
  panelR.translate(0.39, 0.26, 0.02);
  parts.push(panelR);

  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

function buildPremiumGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Base pedestal
  const base = createRoundedPart(0.64, 0.07, 0.60, 0.02, 1);
  base.translate(0, 0.035, 0);
  parts.push(base);

  // 2. Thick plush cushion (forward toward -Z)
  const cushion = createRoundedPart(0.56, 0.14, 0.46, 0.035, 2);
  cushion.translate(0, 0.135, -0.04);
  parts.push(cushion);

  // 3. Curved backrest (tilted back toward +Z)
  const back = createRoundedPart(0.52, 0.50, 0.10, 0.03, 2);
  const backM = new THREE.Matrix4().makeRotationX(0.14);
  backM.setPosition(0, 0.43, 0.18);
  back.applyMatrix4(backM);
  parts.push(back);

  // 4. Integrated headrest
  const head = createRoundedPart(0.28, 0.14, 0.09, 0.035, 2);
  head.translate(0, 0.68, 0.22);
  parts.push(head);

  // 5. Rounded armrests
  const armL = createRoundedPart(0.08, 0.18, 0.46, 0.025, 1);
  armL.translate(-0.30, 0.22, -0.02);
  parts.push(armL);
  const armR = createRoundedPart(0.08, 0.18, 0.46, 0.025, 1);
  armR.translate(0.30, 0.22, -0.02);
  parts.push(armR);

  // 6. Right cup holder
  const cup = new THREE.CylinderGeometry(0.035, 0.035, 0.025, 12).toNonIndexed();
  cup.translate(0.30, 0.32, -0.15);
  parts.push(cup);

  // 7. Side panels
  const panelL = createRoundedPart(0.025, 0.36, 0.54, 0.02, 1);
  panelL.translate(-0.33, 0.24, 0.02);
  parts.push(panelL);
  const panelR = createRoundedPart(0.025, 0.36, 0.54, 0.02, 1);
  panelR.translate(0.33, 0.24, 0.02);
  parts.push(panelR);

  // 8. Thin luxury gold piping trim along the backrest top shoulder
  const goldTrim = createRoundedPart(0.53, 0.018, 0.022, 0.008, 1);
  goldTrim.translate(0, 0.65, 0.23);
  parts.push(goldTrim);

  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

function buildStandardGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // 1. Base
  const base = createRoundedPart(0.54, 0.06, 0.50, 0.02, 1);
  base.translate(0, 0.03, 0);
  parts.push(base);

  // 2. Rounded seat cushion
  const cushion = createRoundedPart(0.48, 0.11, 0.40, 0.03, 2);
  cushion.translate(0, 0.11, -0.03);
  parts.push(cushion);

  // 3. Curved backrest (tilted back toward +Z)
  const back = createRoundedPart(0.46, 0.44, 0.08, 0.025, 2);
  const backM = new THREE.Matrix4().makeRotationX(0.10);
  backM.setPosition(0, 0.38, 0.16);
  back.applyMatrix4(backM);
  parts.push(back);

  // 4. Slim rounded armrests
  const armL = createRoundedPart(0.06, 0.15, 0.40, 0.02, 1);
  armL.translate(-0.25, 0.20, -0.02);
  parts.push(armL);
  const armR = createRoundedPart(0.06, 0.15, 0.40, 0.02, 1);
  armR.translate(0.25, 0.20, -0.02);
  parts.push(armR);

  // 5. Cup holder on right armrest
  const cup = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 10).toNonIndexed();
  cup.translate(0.25, 0.28, -0.14);
  parts.push(cup);

  const merged = mergeGeometries(parts, false);
  merged.computeVertexNormals();
  return merged;
}

// ─── Luxury Multiplex Color Palette (Deep Muted Tiers + Consistent States: Hover Soft Gold, Selected Gold Fill, Sold Dimmed Grey) ───
const TIER_COLORS = {
  recliner: {
    base: new THREE.Color('#881337'),    // Visible rich burgundy leather
    hover: new THREE.Color('#f59e0b'),   // Soft gold rim glow
    selected: new THREE.Color('#fbbf24'),// Radiant gold fill (paired with checkmark)
    sold: new THREE.Color('#475569'),    // Dimmed desaturated slate grey (paired with x mark)
  },
  premium: {
    base: new THREE.Color('#334155'),    // Visible dark charcoal leather
    hover: new THREE.Color('#f59e0b'),
    selected: new THREE.Color('#fbbf24'),
    sold: new THREE.Color('#475569'),
  },
  standard: {
    base: new THREE.Color('#22344b'),    // Deeper, muted acoustic blue (not electric blue)
    hover: new THREE.Color('#f59e0b'),
    selected: new THREE.Color('#fbbf24'),
    sold: new THREE.Color('#475569'),
  },
};

function getTierKey(tier: string): 'recliner' | 'premium' | 'standard' {
  const t = tier.toLowerCase();
  if (t.includes('recliner')) return 'recliner';
  if (t.includes('premium') || t.includes('club')) return 'premium';
  return 'standard';
}

// ─── Step 4: Post-Processing Pipeline (High / Medium / Lite) ───
const CinemaPostProcessing: React.FC<{ quality: 'high' | 'medium' | 'lite' }> = ({ quality }) => {
  const { gl, scene, camera, size } = useThree();

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.1;
  }, [gl]);

  const [composer, setComposer] = useState<EffectComposer | null>(null);

  useEffect(() => {
    if (quality === 'lite') {
      setComposer(null);
      return;
    }

    const comp = new EffectComposer(gl);
    comp.setSize(size.width, size.height);

    const renderPass = new RenderPass(scene, camera);
    comp.addPass(renderPass);

    if (quality === 'high' || quality === 'medium') {
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(size.width, size.height),
        quality === 'high' ? 0.38 : 0.22, // strength
        0.55,                             // radius
        0.82                              // threshold
      );
      comp.addPass(bloomPass);
    }

    const outputPass = new OutputPass();
    comp.addPass(outputPass);

    setComposer(comp);

    return () => {
      comp.passes.forEach((pass: any) => {
        if (pass.dispose) pass.dispose();
      });
      comp.renderTarget1?.dispose();
      comp.renderTarget2?.dispose();
      comp.dispose();
    };
  }, [gl, scene, camera, size.width, size.height, quality]);

  useFrame(() => {
    if (composer && quality !== 'lite') {
      composer.render();
    }
  }, 1);

  return null;
};

// Scene-level Three.js Resource Disposer for Cinema on Unmount
const CinemaSceneDisposer: React.FC = () => {
  const { scene, gl } = useThree();
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__THREE_RENDERER__ = gl;
    }
    return () => {
      scene.traverse((obj: any) => {
        if (obj.geometry) {
          obj.geometry.dispose();
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((mat: any) => {
              for (const k in mat) {
                if (mat[k]?.isTexture) mat[k].dispose();
              }
              mat.dispose();
            });
          } else {
            for (const k in obj.material) {
              if (obj.material[k]?.isTexture) obj.material[k].dispose();
            }
            obj.material.dispose();
          }
        }
      });
      gl.renderLists?.dispose();
    };
  }, [scene, gl]);
  return null;
};

// ─── Camera Animation Rig ───
const CinemaCameraRig: React.FC<{
  targetPos: [number, number, number];
  targetLookAt: [number, number, number];
  isSeatView: boolean;
  onArrival?: () => void;
}> = ({ targetPos, targetLookAt, isSeatView, onArrival }) => {
  const lookAtRef = useRef(new THREE.Vector3(...targetLookAt));
  const arrivedRef = useRef(false);

  useFrame((state) => {
    const targetV = new THREE.Vector3(...targetPos);
    const targetL = new THREE.Vector3(...targetLookAt);

    // Smooth cubic damping
    state.camera.position.lerp(targetV, 0.05);
    lookAtRef.current.lerp(targetL, 0.05);

    if (!isSeatView) {
      state.camera.lookAt(lookAtRef.current);
    }

    const dist = state.camera.position.distanceTo(targetV);
    if (dist < 0.2 && !arrivedRef.current) {
      arrivedRef.current = true;
      if (onArrival) onArrival();
    } else if (dist >= 0.2) {
      arrivedRef.current = false;
    }
  });

  return null;
};

// ─── Step 3: Pure Clean Movie Screen with Sharp Bezel & Cinematic Art ───
const CleanCinematicScreen: React.FC = () => {
  const curveGeometry = useMemo(() => {
    const width = 18.2;
    const height = 7.6;
    const segments = 32;
    const radius = 24;
    const geo = new THREE.PlaneGeometry(width, height, segments, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = -(x * x) / (2 * radius);
      pos.setZ(i, z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const screenTexture = useMemo(() => createCinematicScreenTexture(), []);

  return (
    <group position={[0, 4.3, -13.5]} rotation={[-0.08, 0, 0]}>
      {/* 1. Outer Backing Plate / Shadow Housing */}
      <mesh geometry={curveGeometry} position={[0, 0, -0.06]} scale={[1.02, 1.03, 1]}>
        <meshStandardMaterial color="#040508" roughness={0.9} metalness={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* 2. Thin Dark Architectural Bezel Frame (Sharp, High-Contrast Perimeter) */}
      {/* Top Bezel Bar */}
      <mesh position={[0, 3.83, -0.01]}>
        <boxGeometry args={[18.35, 0.06, 0.08]} />
        <meshStandardMaterial color="#07080c" roughness={0.38} metalness={0.82} />
      </mesh>
      {/* Bottom Bezel Bar */}
      <mesh position={[0, -3.83, -0.01]}>
        <boxGeometry args={[18.35, 0.06, 0.08]} />
        <meshStandardMaterial color="#07080c" roughness={0.38} metalness={0.82} />
      </mesh>
      {/* Left Bezel Pillar */}
      <mesh position={[-9.14, 0, -1.74]}>
        <boxGeometry args={[0.07, 7.72, 0.08]} />
        <meshStandardMaterial color="#07080c" roughness={0.38} metalness={0.82} />
      </mesh>
      {/* Right Bezel Pillar */}
      <mesh position={[9.14, 0, -1.74]}>
        <boxGeometry args={[0.07, 7.72, 0.08]} />
        <meshStandardMaterial color="#07080c" roughness={0.38} metalness={0.82} />
      </mesh>

      {/* 3. Screen Canvas Surface (Sharp, Dark Cinematic Still) */}
      <mesh geometry={curveGeometry}>
        <meshBasicMaterial map={screenTexture} side={THREE.DoubleSide} />
      </mesh>

      {/* Screen Light Wash (Teal & Amber) reaching walls, floor, and front seat tops */}
      {/* Forward wash onto audience and front rows */}
      <spotLight
        position={[0, 4.3, -12.5]}
        target-position={[0, 1.0, -3.0]}
        angle={1.15}
        penumbra={0.75}
        intensity={4.8}
        color="#2dd4bf"
      />
      <spotLight
        position={[0, 2.5, -12.0]}
        target-position={[0, 0.4, -4.0]}
        angle={1.25}
        penumbra={0.8}
        intensity={3.4}
        color="#d97706"
      />

      {/* Side wall wash: Strong near screen, fading toward the back */}
      {/* Left Wall Teal Wash */}
      <pointLight position={[-10.5, 3.8, -9.0]} intensity={3.5} distance={14} color="#14b8a6" />
      <pointLight position={[-11.2, 4.0, -3.0]} intensity={1.8} distance={10} color="#0d9488" />
      <pointLight position={[-11.6, 4.2, 3.0]} intensity={0.8} distance={8} color="#0f766e" />

      {/* Right Wall Amber Wash */}
      <pointLight position={[10.5, 3.8, -9.0]} intensity={3.2} distance={14} color="#f59e0b" />
      <pointLight position={[11.2, 4.0, -3.0]} intensity={1.6} distance={10} color="#d97706" />
      <pointLight position={[11.6, 4.2, 3.0]} intensity={0.8} distance={8} color="#b45309" />

      {/* Floor wash near screen and stage */}
      <pointLight position={[0, 0.4, -9.0]} intensity={3.8} distance={14} color="#14b8a6" />
      <pointLight position={[0, 0.2, -11.0]} intensity={2.6} distance={10} color="#f59e0b" />
    </group>
  );
};

// ─── Step 2: Modern Multiplex Hall Architecture ───
// Sloped carpet floor, 11 tiered risers, vertical wood acoustic slats, warm sconces, cove ceiling
const ModernMultiplexHall: React.FC<{ carpetTexture: THREE.CanvasTexture; isSeatView: boolean }> = ({ carpetTexture, isSeatView }) => {
  // Part E: 11 dedicated row riser heights & Z positions matching rows A through K smoothly
  const rowRisers = useMemo(() => {
    return Array.from({ length: 11 }).map((_, idx) => {
      const rowLetter = String.fromCharCode('A'.charCodeAt(0) + idx);
      const z = -4.50 + idx * 1.45;
      const y = 0.38 + idx * 0.30;
      return { row: rowLetter, y, z };
    });
  }, []);

  const wallSconceZ = [-11, -7, -3, 1, 5, 9, 13];

  return (
    <group>
      {/* 1. Main Carpeted Auditorium Subfloor */}
      <mesh position={[0, -0.3, 0]} receiveShadow>
        <boxGeometry args={[26, 0.6, 32]} />
        <meshStandardMaterial map={carpetTexture} roughness={0.88} color="#10131c" />
      </mesh>

      {/* Continuous Center Aisle Runner along Subfloor */}
      <mesh position={[0, 0.005, 3.5]}>
        <boxGeometry args={[1.7, 0.01, 26]} />
        <meshStandardMaterial color="#07080d" roughness={0.96} />
      </mesh>

      {/* 2. Step 2 & Part 5: 11 Stepped Tier Risers with Darker Aisle Runners & Step Lights */}
      {rowRisers.map((riser, idx) => (
        <group key={`riser-${idx}`}>
          {/* Concrete / acoustic riser block with carpet texture */}
          <mesh position={[0, riser.y / 2, riser.z]}>
            <boxGeometry args={[21.5, riser.y, 1.45]} />
            <meshStandardMaterial map={carpetTexture} roughness={0.88} color="#10131c" />
          </mesh>

          {/* Darker Plush Aisle Runner along Center Aisle */}
          <mesh position={[0, riser.y + 0.003, riser.z]}>
            <boxGeometry args={[1.7, 0.006, 1.45]} />
            <meshStandardMaterial color="#06070b" roughness={0.96} />
          </mesh>

          {/* Subtle satin bronze border inlays for center runner */}
          <mesh position={[-0.85, riser.y + 0.004, riser.z]}>
            <boxGeometry args={[0.02, 0.008, 1.45]} />
            <meshStandardMaterial color="#2c2824" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0.85, riser.y + 0.004, riser.z]}>
            <boxGeometry args={[0.02, 0.008, 1.45]} />
            <meshStandardMaterial color="#2c2824" metalness={0.7} roughness={0.4} />
          </mesh>

          {/* Darker Plush Aisle Runner along Left Aisle */}
          <mesh position={[-8.8, riser.y + 0.002, riser.z]}>
            <boxGeometry args={[1.5, 0.005, 1.45]} />
            <meshStandardMaterial color="#08090e" roughness={0.94} />
          </mesh>

          {/* Darker Plush Aisle Runner along Right Aisle */}
          <mesh position={[8.8, riser.y + 0.002, riser.z]}>
            <boxGeometry args={[1.5, 0.005, 1.45]} />
            <meshStandardMaterial color="#08090e" roughness={0.94} />
          </mesh>

          {/* Front riser nose runner strip */}
          <mesh position={[0, riser.y, riser.z - 0.72]}>
            <boxGeometry args={[21.5, 0.035, 0.035]} />
            <meshStandardMaterial color="#1a1f2c" roughness={0.6} />
          </mesh>

          {/* Part 5: Amber LED Aisle Step Guide Lights & Micro Downward Glow */}
          <mesh position={[-8.8, riser.y + 0.02, riser.z]}>
            <boxGeometry args={[0.08, 0.04, 0.16]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
          <mesh position={[8.8, riser.y + 0.02, riser.z]}>
            <boxGeometry args={[0.08, 0.04, 0.16]} />
            <meshBasicMaterial color="#f59e0b" />
          </mesh>
          {idx % 2 === 0 && (
            <>
              <pointLight position={[-8.8, riser.y + 0.08, riser.z]} intensity={0.4} distance={2.0} color="#f59e0b" />
              <pointLight position={[8.8, riser.y + 0.08, riser.z]} intensity={0.4} distance={2.0} color="#f59e0b" />
            </>
          )}

          {/* Row Letter Marker Plate on Wall Risers */}
          <mesh position={[-10.4, riser.y + 0.12, riser.z]}>
            <boxGeometry args={[0.02, 0.16, 0.22]} />
            <meshBasicMaterial color="#fef3c7" opacity={0.65} transparent />
          </mesh>
          <mesh position={[10.4, riser.y + 0.12, riser.z]}>
            <boxGeometry args={[0.02, 0.16, 0.22]} />
            <meshBasicMaterial color="#fef3c7" opacity={0.65} transparent />
          </mesh>
        </group>
      ))}

      {/* 3. Side Walls: Refined Acoustic Charcoal Felt Panels */}
      <mesh position={[-12.8, 5.5, 0]}>
        <boxGeometry args={[0.5, 12, 32]} />
        <meshStandardMaterial color="#11141c" roughness={0.92} />
      </mesh>
      <mesh position={[12.8, 5.5, 0]}>
        <boxGeometry args={[0.5, 12, 32]} />
        <meshStandardMaterial color="#11141c" roughness={0.92} />
      </mesh>

      {/* 4. Vertical Wood Acoustic Slats (Slimmer, Darker Smoked Walnut with Subtle Satin Sheen) */}
      {Array.from({ length: 36 }).map((_, i) => {
        const z = -13.2 + i * 0.76;
        return (
          <group key={`slat-pair-${i}`}>
            {/* Left Wall Slats */}
            <mesh position={[-12.45, 5.5, z]}>
              <boxGeometry args={[0.07, 10.5, 0.14]} />
              <meshStandardMaterial color="#211b17" roughness={0.34} metalness={0.16} />
            </mesh>
            {/* Right Wall Slats */}
            <mesh position={[12.45, 5.5, z]}>
              <boxGeometry args={[0.07, 10.5, 0.14]} />
              <meshStandardMaterial color="#211b17" roughness={0.34} metalness={0.16} />
            </mesh>
          </group>
        );
      })}

      {/* 5. Recessed Warm Wall Sconces with Up/Down Indirect Light Fans */}
      {wallSconceZ.map((z, idx) => (
        <group key={`sconce-group-${idx}`}>
          {/* Left Sconce Housing */}
          <group position={[-12.35, 4.8, z]}>
            <mesh>
              <cylinderGeometry args={[0.12, 0.14, 0.45, 16]} />
              <meshStandardMaterial color="#1a1c23" metalness={0.8} roughness={0.3} />
            </mesh>
            {/* Warm Emitter Core */}
            <mesh position={[0.05, 0, 0]}>
              <boxGeometry args={[0.05, 0.32, 0.12]} />
              <meshBasicMaterial color="#fef3c7" />
            </mesh>
            <pointLight position={[0.4, 0, 0]} intensity={1.5} distance={7} color="#ffedd5" />
          </group>

          {/* Right Sconce Housing */}
          <group position={[12.35, 4.8, z]}>
            <mesh>
              <cylinderGeometry args={[0.12, 0.14, 0.45, 16]} />
              <meshStandardMaterial color="#1a1c23" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[-0.05, 0, 0]}>
              <boxGeometry args={[0.05, 0.32, 0.12]} />
              <meshBasicMaterial color="#fef3c7" />
            </mesh>
            <pointLight position={[-0.4, 0, 0]} intensity={1.5} distance={7} color="#ffedd5" />
          </group>
        </group>
      ))}

      {/* Part 1: Suspended Acoustic Ceiling with Hidden Architectural Cove Lighting & Downlights (Shown in seat view) */}
      {isSeatView && (
        <group position={[0, 10.5, 0]}>
          {/* Main Dark Acoustic Ceiling Cloud Plane */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[23.5, 0.35, 29]} />
            <meshStandardMaterial color="#07090e" roughness={0.94} />
          </mesh>

          {/* 1. Left Side Wall Cove Lighting (Hidden trough washing down the acoustic wall) */}
          <group position={[-12.1, -0.15, 0]}>
            {/* Concealing baffle / pelmet lip so viewer NEVER sees raw glowing strip */}
            <mesh position={[0.25, -0.06, 0]}>
              <boxGeometry args={[0.08, 0.14, 28]} />
              <meshStandardMaterial color="#0b0e14" roughness={0.9} />
            </mesh>
            {/* Recessed warm emitter tucked inside cove */}
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[0.16, 0.02, 27.5]} />
              <meshBasicMaterial color="#fed7aa" />
            </mesh>
            {/* Gentle indirect warm wash along top of left wall */}
            {[-9, -3, 3, 9].map((pz, idx) => (
              <pointLight
                key={`left-cove-light-${idx}`}
                position={[-0.4, -0.25, pz]}
                intensity={0.95}
                distance={6.5}
                color="#fed7aa"
              />
            ))}
          </group>

          {/* 2. Right Side Wall Cove Lighting (Hidden trough washing down the acoustic wall) */}
          <group position={[12.1, -0.15, 0]}>
            {/* Concealing baffle / pelmet lip */}
            <mesh position={[-0.25, -0.06, 0]}>
              <boxGeometry args={[0.08, 0.14, 28]} />
              <meshStandardMaterial color="#0b0e14" roughness={0.9} />
            </mesh>
            {/* Recessed warm emitter tucked inside cove */}
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[0.16, 0.02, 27.5]} />
              <meshBasicMaterial color="#fed7aa" />
            </mesh>
            {/* Gentle indirect warm wash along top of right wall */}
            {[-9, -3, 3, 9].map((pz, idx) => (
              <pointLight
                key={`right-cove-light-${idx}`}
                position={[0.4, -0.25, pz]}
                intensity={0.95}
                distance={6.5}
                color="#fed7aa"
              />
            ))}
          </group>

          {/* 3. Front Cove Lighting above Screen (running along the ceiling above the screen) */}
          <group position={[0, -0.15, -13.2]}>
            {/* Concealing baffle lip toward viewer */}
            <mesh position={[0, -0.06, 0.25]}>
              <boxGeometry args={[21.0, 0.14, 0.08]} />
              <meshStandardMaterial color="#0b0e14" roughness={0.9} />
            </mesh>
            {/* Recessed warm emitter strip tucked behind lip */}
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[20.5, 0.02, 0.16]} />
              <meshBasicMaterial color="#fed7aa" />
            </mesh>
            {/* Soft downward warm proscenium wash */}
            {[-7, 0, 7].map((px, idx) => (
              <pointLight
                key={`front-cove-light-${idx}`}
                position={[px, -0.3, -0.3]}
                intensity={0.9}
                distance={7.0}
                color="#fed7aa"
              />
            ))}
          </group>

          {/* 4. 8 Architectural Recessed Downlights in 2 clean rows above the aisles */}
          {[-7, -2, 3, 8].map((pz, idx) => (
            <group key={`downlight-row-${idx}`}>
              {/* Left Aisle Downlight */}
              <group position={[-8.8, -0.18, pz]}>
                {/* Matte slate outer trim ring */}
                <mesh>
                  <cylinderGeometry args={[0.20, 0.20, 0.035, 16]} />
                  <meshStandardMaterial color="#131620" roughness={0.5} metalness={0.6} />
                </mesh>
                {/* Warm frosted lens */}
                <mesh position={[0, -0.015, 0]}>
                  <cylinderGeometry args={[0.11, 0.11, 0.015, 16]} />
                  <meshBasicMaterial color="#fef3c7" />
                </mesh>
                <pointLight position={[0, -0.15, 0]} intensity={0.65} distance={7.5} color="#fef3c7" />
              </group>

              {/* Right Aisle Downlight */}
              <group position={[8.8, -0.18, pz]}>
                {/* Matte slate outer trim ring */}
                <mesh>
                  <cylinderGeometry args={[0.20, 0.20, 0.035, 16]} />
                  <meshStandardMaterial color="#131620" roughness={0.5} metalness={0.6} />
                </mesh>
                {/* Warm frosted lens */}
                <mesh position={[0, -0.015, 0]}>
                  <cylinderGeometry args={[0.11, 0.11, 0.015, 16]} />
                  <meshBasicMaterial color="#fef3c7" />
                </mesh>
                <pointLight position={[0, -0.15, 0]} intensity={0.65} distance={7.5} color="#fef3c7" />
              </group>
            </group>
          ))}
        </group>
      )}

      {/* 7. Low Front Stage Platform */}
      <mesh position={[0, 0.15, -13.0]}>
        <boxGeometry args={[20, 0.3, 2.5]} />
        <meshStandardMaterial color="#0c0e16" roughness={0.8} />
      </mesh>
    </group>
  );
};

// ─── Per-tier Instanced Mesh component ───
interface TierSeatsMeshProps {
  seatsData: CinemaSeatInstance[];
  tierKey: 'recliner' | 'premium' | 'standard';
  geometry: THREE.BufferGeometry;
  bumpMap: THREE.Texture;
  soldKeys: string[];
  selectedSeats: SelectedSeat[];
  hoveredInstanceId: number | null;
  onHoverSeat: (seat: CinemaSeatInstance | null) => void;
  onSeatClick: (seat: CinemaSeatInstance) => void;
}

const TierSeatsMesh: React.FC<TierSeatsMeshProps> = ({
  seatsData,
  tierKey,
  geometry,
  bumpMap,
  soldKeys,
  selectedSeats,
  hoveredInstanceId,
  onHoverSeat,
  onSeatClick,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const colors = TIER_COLORS[tierKey];

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || seatsData.length === 0) return;

    const dummy = new THREE.Object3D();

    seatsData.forEach((seat, idx) => {
      dummy.position.set(...seat.position);
      dummy.rotation.set(0, 0, 0); // Native orientation: backrests at +Z, cushions/footrests facing -Z toward screen
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);

      const seatKey = `${seat.row}-${seat.number}`;
      const isSold = soldKeys.includes(seatKey);
      const isSelected = selectedSeats.some(
        (s) => s.sectionId === seat.sectionId && `${s.row}-${s.number}` === seatKey
      );
      const isHovered = seat.instanceId === hoveredInstanceId;

      if (isSelected) {
        mesh.setColorAt(idx, colors.selected);
      } else if (isHovered) {
        mesh.setColorAt(idx, colors.hover);
      } else if (isSold) {
        mesh.setColorAt(idx, colors.sold);
      } else {
        mesh.setColorAt(idx, colors.base);
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [seatsData, selectedSeats, soldKeys, hoveredInstanceId, colors]);

  if (seatsData.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, seatsData.length]}
      count={seatsData.length}
      frustumCulled={false}
      onPointerMove={(e) => {
        e.stopPropagation();
        if (e.instanceId !== undefined && e.instanceId < seatsData.length) {
          onHoverSeat(seatsData[e.instanceId]);
        }
      }}
      onPointerOut={() => {
        onHoverSeat(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.instanceId !== undefined && e.instanceId < seatsData.length) {
          onSeatClick(seatsData[e.instanceId]);
        }
      }}
    >
      <meshStandardMaterial
        roughness={tierKey === 'recliner' ? 0.62 : tierKey === 'premium' ? 0.68 : 0.85}
        metalness={tierKey === 'recliner' ? 0.08 : tierKey === 'premium' ? 0.12 : 0.02}
        bumpMap={bumpMap}
        bumpScale={tierKey === 'standard' ? 0.024 : 0.014}
      />
    </instancedMesh>
  );
};

// ─── Small X Mark Instanced Mesh for Sold Seats (Part 4) ───
const SoldSeatMarks: React.FC<{
  seatsData: CinemaSeatInstance[];
  soldKeys: string[];
}> = ({ seatsData, soldKeys }) => {
  const soldSeats = useMemo(() => {
    return seatsData.filter((s) => soldKeys.includes(`${s.row}-${s.number}`));
  }, [seatsData, soldKeys]);

  const crossGeo = useMemo(() => buildCrossGeometry(), []);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || soldSeats.length === 0) return;

    const dummy = new THREE.Object3D();
    soldSeats.forEach((seat, idx) => {
      // Centered cleanly on the headrest
      dummy.position.set(seat.position[0], seat.position[1] + 0.69, seat.position[2] + 0.22);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [soldSeats]);

  if (soldSeats.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[crossGeo, undefined, soldSeats.length]}
      count={soldSeats.length}
      frustumCulled={false}
    >
      <meshBasicMaterial color="#e2e8f0" />
    </instancedMesh>
  );
};

// ─── Small Checkmark Instanced Mesh for Selected Seats (Gold fill with check) ───
const SelectedSeatMarks: React.FC<{
  seatsData: CinemaSeatInstance[];
  selectedSeats: SelectedSeat[];
}> = ({ seatsData, selectedSeats }) => {
  const matchingSeats = useMemo(() => {
    return seatsData.filter((s) =>
      selectedSeats.some(
        (sel) => sel.sectionId === s.sectionId && `${sel.row}-${sel.number}` === `${s.row}-${s.number}`
      )
    );
  }, [seatsData, selectedSeats]);

  const checkGeo = useMemo(() => buildCheckmarkGeometry(), []);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || matchingSeats.length === 0) return;

    const dummy = new THREE.Object3D();
    matchingSeats.forEach((seat, idx) => {
      // Centered cleanly on the headrest
      dummy.position.set(seat.position[0], seat.position[1] + 0.69, seat.position[2] + 0.22);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [matchingSeats]);

  if (matchingSeats.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[checkGeo, undefined, matchingSeats.length]}
      count={matchingSeats.length}
      frustumCulled={false}
    >
      <meshBasicMaterial color="#ffffff" />
    </instancedMesh>
  );
};

// ─── Small Wheelchair Icon Badge Instanced Mesh for Accessible Seats ───
const AccessibleSeatMarks: React.FC<{
  seatsData: CinemaSeatInstance[];
  soldKeys: string[];
}> = ({ seatsData, soldKeys }) => {
  const accessibleSeats = useMemo(() => {
    return seatsData.filter((s) => s.isAccessible && !soldKeys.includes(`${s.row}-${s.number}`));
  }, [seatsData, soldKeys]);

  const wheelchairGeo = useMemo(() => buildWheelchairGeometry(), []);
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || accessibleSeats.length === 0) return;

    const dummy = new THREE.Object3D();
    accessibleSeats.forEach((seat, idx) => {
      dummy.position.set(seat.position[0], seat.position[1] + 0.69, seat.position[2] + 0.22);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [accessibleSeats]);

  if (accessibleSeats.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[wheelchairGeo, undefined, accessibleSeats.length]}
      count={accessibleSeats.length}
      frustumCulled={false}
    >
      <meshBasicMaterial color="#f8fafc" />
    </instancedMesh>
  );
};

// ─── Main CinemaMap3D Component ───
export const CinemaMap3D: React.FC<CinemaMap3DProps> = ({
  sections,
  onSelectSection,
}) => {
  const {
    activeSeat,
    flyToSeat,
    cameraMode,
    setCameraMode,
    selectedSeats,
    getSoldSeatKeys,
    isLiteMode,
  } = useBookingStore();

  const { language } = useT();
  const [hoveredSeat, setHoveredSeat] = useState<CinemaSeatInstance | null>(null);

  const soldKeys = useMemo(() => getSoldSeatKeys(), [getSoldSeatKeys]);

  // Quality tier: Lite mode disables post-processing; otherwise high or medium based on hardware
  const qualityLevel = useMemo<'high' | 'medium' | 'lite'>(() => {
    if (isLiteMode) return 'lite';
    return isLowEndDevice() ? 'medium' : 'high';
  }, [isLiteMode]);

  // Geometries and procedural textures (compiled once)
  const reclinerGeo = useMemo(() => buildReclinerGeometry(), []);
  const premiumGeo = useMemo(() => buildPremiumGeometry(), []);
  const standardGeo = useMemo(() => buildStandardGeometry(), []);
  const fabricBump = useMemo(() => createFabricBumpTexture(), []);
  const carpetTexture = useMemo(() => createCarpetTexture(), []);

  useEffect(() => {
    return () => {
      reclinerGeo.dispose();
      premiumGeo.dispose();
      standardGeo.dispose();
      fabricBump.dispose();
      carpetTexture.dispose();
    };
  }, [reclinerGeo, premiumGeo, standardGeo, fabricBump, carpetTexture]);

  // Generate All Individual Cinema Seats
  const seatsData = useMemo(() => {
    const list: CinemaSeatInstance[] = [];
    let currentId = 0;

    sections.forEach((section) => {
      const tierKey = getTierKey(section.tier);

      const baseCol = TIER_COLORS[tierKey].base;
      const startLetterCode = (section.startRowLetter || 'A').charCodeAt(0);

      for (let r = 0; r < section.rows; r++) {
        const rowLetter = String.fromCharCode(startLetterCode + r);
        // Part E: Precise row placement so Standard is in front (A-E), Premium in middle (F-I), Recliner in back (J-K)
        const letterIndex = Math.max(0, rowLetter.charCodeAt(0) - 'A'.charCodeAt(0));
        const rowZ = -4.50 + letterIndex * 1.45;
        const rowY = 0.46 + letterIndex * 0.30;
        const halfSeats = Math.ceil(section.seatsPerRow / 2);

        for (let s = 0; s < section.seatsPerRow; s++) {
          const seatNum = s + 1;
          const aisleOffset = s >= halfSeats ? 0.85 : -0.85;
          const seatX = (s - section.seatsPerRow / 2 + 0.5) * 0.9 + aisleOffset;
          const isAccessible = (rowLetter === 'A' || rowLetter === 'F') && (seatNum === 1 || seatNum === section.seatsPerRow);

          list.push({
            instanceId: currentId++,
            sectionId: section.id,
            sectionName: section.name.en,
            row: rowLetter,
            number: seatNum,
            priceNPR: section.priceNPR,
            tier: section.tier,
            position: [seatX, rowY, rowZ],
            baseColor: baseCol,
            isAccessible,
          });
        }
      }
    });

    return list;
  }, [sections]);

  // Split seats by tier for instanced meshes
  const { reclinerSeats, premiumSeats, standardSeats } = useMemo(() => {
    const r: CinemaSeatInstance[] = [];
    const p: CinemaSeatInstance[] = [];
    const s: CinemaSeatInstance[] = [];

    seatsData.forEach((seat) => {
      const tk = getTierKey(seat.tier);
      if (tk === 'recliner') {
        r.push({ ...seat, instanceId: r.length });
      } else if (tk === 'premium') {
        p.push({ ...seat, instanceId: p.length });
      } else {
        s.push({ ...seat, instanceId: s.length });
      }
    });

    return { reclinerSeats: r, premiumSeats: p, standardSeats: s };
  }, [seatsData]);

  // Debug hook
  useLayoutEffect(() => {
    (window as any).__CINEMA_DEBUG__ = {
      seatsCount: seatsData.length,
      first3Positions: seatsData.slice(0, 3).map((s) => s.position),
      seatsData,
    };
  }, [seatsData]);

  // Handle Seat Click (Fly into exact eye position)
  const handleSeatClick = (seat: CinemaSeatInstance) => {
    const seatKey = `${seat.row}-${seat.number}`;
    if (soldKeys.includes(seatKey)) return;

    // Eye position: seat.x, seat.y + 1.1m, seat.z
    const eyePos: [number, number, number] = [
      seat.position[0],
      seat.position[1] + 1.1,
      seat.position[2],
    ];
    // Aim directly at screen center
    const targetLook: [number, number, number] = [0, 4.3, -13.5];

    flyToSeat({
      sectionId: seat.sectionId,
      sectionName: seat.sectionName,
      row: seat.row,
      number: seat.number,
      priceNPR: seat.priceNPR,
      tier: seat.tier,
      cameraPosition: eyePos,
      cameraTarget: targetLook,
    });

    if (onSelectSection) onSelectSection(seat.sectionId);
  };

  // Overview Camera position: Recliner row fully visible with comfortable margin at bottom
  const overviewPos: [number, number, number] = [0, 13.5, 17.5];
  const overviewTarget: [number, number, number] = [0, 2.2, -0.6];

  const targetPos = activeSeat ? activeSeat.cameraPosition : overviewPos;
  const targetLookAt = activeSeat ? activeSeat.cameraTarget : overviewTarget;
  const isSeatView = cameraMode === 'seatview';

  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        camera={{ position: overviewPos, fov: 46 }}
        className="w-full h-full"
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
      >
        <color attach="background" args={['#07080e']} />
        <fogExp2 attach="fog" args={['#07080e', 0.014]} />

        {/* Automatic Resource Disposal on Unmount */}
        <CinemaSceneDisposer />

        {/* Ambient & General Illumination (Part 4: Enhanced visibility of all tiers) */}
        <ambientLight intensity={1.28} color="#cbd5e1" />
        <directionalLight position={[0, 24, 10]} intensity={1.6} color="#f8fafc" />

        {/* Part 2 & 4: Directional Screen Rim Spill: illuminates top contours of headrests and armrests */}
        <directionalLight
          position={[0, 4.3, -13.5]}
          intensity={isSeatView ? 2.5 : 1.3}
          color="#2dd4bf"
        />
        <directionalLight
          position={[0, 1.2, -12.0]}
          intensity={isSeatView ? 1.6 : 0.8}
          color="#f59e0b"
        />

        {/* Dynamic Camera Animation Rig */}
        <CinemaCameraRig
          targetPos={targetPos}
          targetLookAt={targetLookAt}
          isSeatView={isSeatView}
          onArrival={() => {
            if (activeSeat && cameraMode === 'flying') {
              setCameraMode('seatview');
            }
          }}
        />

        {/* Step 5: Head Look-Around with organic breathing sway */}
        {activeSeat && (
          <SeatViewHeadControls
            enabled={isSeatView}
            baseLookAt={activeSeat.cameraTarget}
            seatPos={activeSeat.cameraPosition}
          />
        )}

        {/* Step 2: High-End Multiplex Hall Architecture */}
        <ModernMultiplexHall carpetTexture={carpetTexture} isSeatView={isSeatView} />

        {/* Step 3: Pure Clean Movie Screen (No text, pure film art) */}
        <CleanCinematicScreen />

        {/* Projector Booth Port on Back Wall */}
        <group position={[0, 7.8, 15.8]}>
          <mesh>
            <boxGeometry args={[1.2, 0.6, 0.1]} />
            <meshStandardMaterial color="#0f172a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0, -0.06]}>
            <boxGeometry args={[0.5, 0.25, 0.05]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
          <pointLight position={[0, 0, -0.5]} intensity={3.0} distance={28} color="#bae6fd" />
        </group>

        {/* ── STEP 1: INSTANCED SEATS ── */}
        <TierSeatsMesh
          seatsData={reclinerSeats}
          tierKey="recliner"
          geometry={reclinerGeo}
          bumpMap={fabricBump}
          soldKeys={soldKeys}
          selectedSeats={selectedSeats}
          hoveredInstanceId={hoveredSeat && getTierKey(hoveredSeat.tier) === 'recliner' ? hoveredSeat.instanceId : null}
          onHoverSeat={setHoveredSeat}
          onSeatClick={handleSeatClick}
        />

        <TierSeatsMesh
          seatsData={premiumSeats}
          tierKey="premium"
          geometry={premiumGeo}
          bumpMap={fabricBump}
          soldKeys={soldKeys}
          selectedSeats={selectedSeats}
          hoveredInstanceId={hoveredSeat && getTierKey(hoveredSeat.tier) === 'premium' ? hoveredSeat.instanceId : null}
          onHoverSeat={setHoveredSeat}
          onSeatClick={handleSeatClick}
        />

        <TierSeatsMesh
          seatsData={standardSeats}
          tierKey="standard"
          geometry={standardGeo}
          bumpMap={fabricBump}
          soldKeys={soldKeys}
          selectedSeats={selectedSeats}
          hoveredInstanceId={hoveredSeat && getTierKey(hoveredSeat.tier) === 'standard' ? hoveredSeat.instanceId : null}
          onHoverSeat={setHoveredSeat}
          onSeatClick={handleSeatClick}
        />

        {/* Part 4: Small X Mark for Sold Seats */}
        <SoldSeatMarks seatsData={seatsData} soldKeys={soldKeys} />

        {/* Selected Seats Gold Fill with Checkmark */}
        <SelectedSeatMarks seatsData={seatsData} selectedSeats={selectedSeats} />

        {/* Distinct Wheelchair Icon Badge for Accessible Seats */}
        <AccessibleSeatMarks seatsData={seatsData} soldKeys={soldKeys} />

        {/* Step 4: Post-Processing Pipeline (Bloom, ACES, Tone Mapping) */}
        <CinemaPostProcessing quality={qualityLevel} />
      </Canvas>

      {/* Step 6: Refined Floating Seat Hover Card in Overview */}
      {hoveredSeat && !activeSeat && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-fadeIn">
          <div className="px-5 py-3 rounded-2xl flex items-center gap-3.5 text-xs shadow-2xl border border-amber-500/25 bg-[#090c15]/90 backdrop-blur-2xl">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-md ring-2 ring-white/20"
              style={{
                backgroundColor: `#${hoveredSeat.baseColor.getHexString()}`,
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-white text-xs sm:text-sm tracking-wide">
                  {hoveredSeat.sectionName}
                </p>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-white/10 text-amber-300">
                  {hoveredSeat.tier}
                </span>
              </div>
              <p className="text-[11px] text-muted mt-0.5">
                Row <span className="text-white font-bold">{hoveredSeat.row}</span> • Seat #{hoveredSeat.number}
              </p>
            </div>
            <div className="h-7 w-px bg-white/10" />
            <div className="text-right">
              <span className="text-amber-400 font-bold text-xs sm:text-sm">
                {formatPrice(hoveredSeat.priceNPR, language)}
              </span>
              <p className="text-[9px] text-amber-300/80 uppercase tracking-wider font-semibold">
                Click to view sightline
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
