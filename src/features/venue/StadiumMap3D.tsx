import React, { useRef, useMemo, useState, useEffect, useLayoutEffect } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Section, StadiumDrillLevel } from '../../types';
import { useBookingStore } from '../../store/useBookingStore';
import { SeatViewHeadControls } from './SeatViewHeadControls';
import sponsorsData from '../../data/sponsors.json';
import {
  buildStadiumDrillDownData,
  findBestAdjacentSeats,
  StadiumSeatInstance,
  STADIUM_AISLE_ANGLES,
} from './stadiumDrillDownData';
import {
  Sun,
  Moon,
  ChevronRight,
  ArrowLeft,
  Zap,
  Filter,
  Check,
  Sparkles,
} from 'lucide-react';

interface StadiumMap3DProps {
  sections: Section[];
  onSelectSection?: (sectionId: string) => void;
}

// Camera Animation Rig with smooth easing between levels (1 to 1.5s ease)
const StadiumCameraRig: React.FC<{
  targetPos: [number, number, number];
  targetLookAt: [number, number, number];
  fov: number;
  drillLevel: StadiumDrillLevel;
  instant?: boolean;
  onArrival?: () => void;
}> = ({ targetPos, targetLookAt, fov, drillLevel, instant, onArrival }) => {
  const lookAtRef = useRef(new THREE.Vector3(...targetLookAt));
  const arrivedRef = useRef(false);

  useFrame((state) => {
    const targetV = new THREE.Vector3(...targetPos);
    const targetL = new THREE.Vector3(...targetLookAt);

    if (instant) {
      state.camera.position.copy(targetV);
      lookAtRef.current.copy(targetL);
      if (state.camera instanceof THREE.PerspectiveCamera) {
        state.camera.fov = fov;
        state.camera.updateProjectionMatrix();
      }
      state.camera.up.set(0, 1, 0);
      if (drillLevel !== 'seat') {
        state.camera.lookAt(targetL);
      }
      return;
    }

    // Subtle breathing drift only in overview mode
    if (drillLevel === 'overview') {
      const t = state.clock.getElapsedTime();
      targetV.x += Math.sin(t * 0.15) * 1.5;
      targetV.z += Math.cos(t * 0.11) * 1.3;
      targetV.y += Math.sin(t * 0.08) * 0.4;
    }

    // Smooth eased lerp (approx 1.2s transition)
    state.camera.position.lerp(targetV, 0.075);
    lookAtRef.current.lerp(targetL, 0.075);

    state.camera.up.set(0, 1, 0);

    if (state.camera instanceof THREE.PerspectiveCamera && Math.abs(state.camera.fov - fov) > 0.1) {
      state.camera.fov += (fov - state.camera.fov) * 0.075;
      state.camera.updateProjectionMatrix();
    }

    if (drillLevel !== 'seat') {
      state.camera.lookAt(lookAtRef.current);
    }

    const dist = state.camera.position.distanceTo(targetV);
    if (dist < 0.4 && !arrivedRef.current) {
      arrivedRef.current = true;
      if (onArrival) onArrival();
    } else if (dist >= 0.4) {
      arrivedRef.current = false;
    }
  });

  return null;
};

// ─── 0. Sky Dome & Distant Terrain with Night Atmosphere & City Lights ───
const ProceduralSkyAndTerrain: React.FC<{ isEvening: boolean }> = ({ isEvening }) => {
  const skyTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 1024);
      if (isEvening) {
        // Deep night gradient with soft warm horizon glow behind the hills and gentle gradient to deep blue above
        grad.addColorStop(0.00, '#020617'); // Zenith deep night
        grad.addColorStop(0.20, '#050c1e'); // Twilight dark blue
        grad.addColorStop(0.36, '#0b1938'); // Deep midnight blue
        grad.addColorStop(0.44, '#17274e'); // Royal evening blue haze
        grad.addColorStop(0.48, '#322338'); // Dusky violet horizon transition
        grad.addColorStop(0.505, '#b45309'); // Soft warm amber glow at the horizon behind hills
        grad.addColorStop(0.525, '#78350f'); // Warm horizon radiance
        grad.addColorStop(0.55, '#0c1220'); // Dark terrain silhouette base
        grad.addColorStop(1.00, '#020617'); // Lower hemisphere
      } else {
        // Natural sunny daylight sky gradient
        grad.addColorStop(0.00, '#1d4ed8');
        grad.addColorStop(0.28, '#38bdf8');
        grad.addColorStop(0.46, '#7dd3fc');
        grad.addColorStop(0.50, '#bae6fd');
        grad.addColorStop(0.54, '#475569');
        grad.addColorStop(1.00, '#1e293b');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 1024);

      // Add faint twinkling stars to the upper hemisphere in evening mode
      if (isEvening) {
        for (let s = 0; s < 220; s++) {
          const sx = (Math.sin(s * 91.3 + 12.7) * 0.5 + 0.5) * 1024;
          const sy = (Math.cos(s * 73.1 + 8.4) * 0.5 + 0.5) * 700; // Upper 70% of sky
          const sr = 0.5 + (Math.sin(s * 33.7) * 0.5 + 0.5) * 1.1;
          const sa = 0.25 + (Math.cos(s * 51.9) * 0.5 + 0.5) * 0.65;
          ctx.fillStyle = `rgba(255, 255, 255, ${sa.toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, [isEvening]);

  // Round soft glowing sprite texture for distant hill settlement lights
  const roundDotTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.25, 'rgba(255, 250, 230, 0.9)');
      grad.addColorStop(0.55, 'rgba(254, 215, 170, 0.45)');
      grad.addColorStop(0.85, 'rgba(245, 158, 11, 0.12)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const t = new THREE.CanvasTexture(canvas);
    return t;
  }, []);

  const hillsGeometry = useMemo(() => {
    const N = 80;
    const R = 270;
    const positions: number[] = [];
    const colors: number[] = [];

    const baseCol = isEvening ? [0.03, 0.05, 0.10] : [0.22, 0.32, 0.38];
    const peakCol = isEvening ? [0.06, 0.10, 0.18] : [0.35, 0.45, 0.52];

    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * Math.PI * 2;
      const t1 = ((i + 1) / N) * Math.PI * 2;

      const h0 = 14 + Math.sin(t0 * 3) * 6 + Math.cos(t0 * 5) * 4 + Math.sin(t0 * 8) * 2.5;
      const h1 = 14 + Math.sin(t1 * 3) * 6 + Math.cos(t1 * 5) * 4 + Math.sin(t1 * 8) * 2.5;

      const x0 = R * Math.cos(t0), z0 = R * Math.sin(t0);
      const x1 = R * Math.cos(t1), z1 = R * Math.sin(t1);

      positions.push(
        x0, 0, z0,
        x1, 0, z1,
        x1, h1, z1,
        x0, 0, z0,
        x1, h1, z1,
        x0, h0, z0
      );

      for (let k = 0; k < 6; k++) {
        const isPeak = k === 2 || k === 4 || k === 5;
        const c = isPeak ? peakCol : baseCol;
        colors.push(...c);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    return geom;
  }, [isEvening]);

  // Distant Kathmandu & Kirtipur valley city lights: small round, soft glowing points (fewer and varied)
  const cityLightsData = useMemo(() => {
    if (!isEvening) return null;
    const count = 65; // Fewer, cleaner, softer lights
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const R = 265;

    const palette = [
      [1.0, 0.98, 0.92], // warm white
      [1.0, 0.94, 0.82], // soft ivory
      [0.98, 0.78, 0.45], // warm amber glow
      [0.95, 0.60, 0.20], // deep amber
    ];

    for (let i = 0; i < count; i++) {
      const clusterAngle = ((i % 12) / 12) * Math.PI * 2 + (Math.sin(i * 3.7) * 0.20);
      const dist = R + Math.sin(i * 5.1) * 8;
      const x = Math.cos(clusterAngle) * dist;
      const z = Math.sin(clusterAngle) * dist;
      const y = 1.0 + Math.abs(Math.sin(i * 9.3)) * 5.2;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const col = palette[i % palette.length];
      colors[i * 3] = col[0];
      colors[i * 3 + 1] = col[1];
      colors[i * 3 + 2] = col[2];
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geom;
  }, [isEvening]);

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, -20, 0]}>
        <sphereGeometry args={[700, 32, 16]} />
        <meshBasicMaterial map={skyTexture} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      <mesh geometry={hillsGeometry}>
        <meshBasicMaterial vertexColors />
      </mesh>
      {cityLightsData && (
        <points geometry={cityLightsData}>
          <pointsMaterial
            map={roundDotTexture}
            size={3.8}
            vertexColors
            transparent
            opacity={0.88}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
};

// ─── 1. Field & Pitch with Saturated Warm Night Turf & Floodlight Illumination Pool ───
const ProceduralCricketField: React.FC<{ isEvening: boolean }> = ({ isEvening }) => {
  const softGroundTexture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(
        size / 2, size / 2, 40,
        size / 2, size / 2, size / 2
      );
      if (isEvening) {
        grad.addColorStop(0.0, '#0c1322');
        grad.addColorStop(0.40, '#080d18');
        grad.addColorStop(0.70, '#050810');
        grad.addColorStop(1.0, '#020408');
      } else {
        grad.addColorStop(0.0, '#475569');
        grad.addColorStop(0.50, '#334155');
        grad.addColorStop(1.0, '#1e293b');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, [isEvening]);

  const turfTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Saturated warm night grass base under floodlights
      ctx.fillStyle = isEvening ? '#226e38' : '#22783c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const stripeH = 32;
      for (let y = 0; y < canvas.height; y += stripeH * 2) {
        ctx.fillStyle = isEvening ? '#2d8747' : '#2aa04e';
        ctx.fillRect(0, y, canvas.width, stripeH);
      }

      if (isEvening) {
        // Bright radiant floodlight pool over the pitch & 30-yard circle with natural warm spill
        const pool = ctx.createRadialGradient(512, 512, 40, 512, 512, 510);
        pool.addColorStop(0.00, 'rgba(255, 252, 230, 0.44)'); // Warm floodlight core
        pool.addColorStop(0.20, 'rgba(254, 249, 195, 0.32)');
        pool.addColorStop(0.48, 'rgba(74, 222, 128, 0.20)');  // Saturated lush highlight
        pool.addColorStop(0.80, 'rgba(34, 197, 94, 0.08)');
        pool.addColorStop(1.00, 'rgba(10, 45, 22, 0.16)');    // Soft natural falloff to boundary
        ctx.fillStyle = pool;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        const grad = ctx.createRadialGradient(512, 512, 380, 512, 512, 510);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(10,30,15,0.4)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, [isEvening]);

  const ropeCurve = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segments = 128;
    const Rx = 58;
    const Rz = 68;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(theta) * Rx, 0.08, Math.sin(theta) * Rz));
    }
    return new THREE.CatmullRomCurve3(pts, true);
  }, []);

  return (
    <group position={[0, 0, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[290, 64]} />
        <meshStandardMaterial map={softGroundTexture} roughness={0.96} />
      </mesh>

      <group scale={[65, 1, 75]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
          <circleGeometry args={[1, 128]} />
          <meshStandardMaterial map={turfTexture} roughness={0.85} />
        </mesh>
      </group>

      <group scale={[27.4, 1, 27.4]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.985, 1.0, 96]} />
          <meshBasicMaterial color="#ffffff" opacity={0.42} transparent />
        </mesh>
      </group>

      <group position={[0, 0.025, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[3.05, 20.12]} />
          <meshStandardMaterial color={isEvening ? '#cca56c' : '#c2a46c'} roughness={0.90} />
        </mesh>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -8.9]}>
          <planeGeometry args={[3.05, 0.1]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 8.9]}>
          <planeGeometry args={[3.05, 0.1]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -10.06]}>
          <planeGeometry args={[2.64, 0.08]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 10.06]}>
          <planeGeometry args={[2.64, 0.08]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {[-0.11, 0, 0.11].map((ox, idx) => (
          <React.Fragment key={`stumps-${idx}`}>
            <mesh position={[ox, 0.36, -10.06]}>
              <cylinderGeometry args={[0.02, 0.02, 0.71, 8]} />
              <meshStandardMaterial color="#e2b170" roughness={0.6} />
            </mesh>
            <mesh position={[ox, 0.36, 10.06]}>
              <cylinderGeometry args={[0.02, 0.02, 0.71, 8]} />
              <meshStandardMaterial color="#e2b170" roughness={0.6} />
            </mesh>
          </React.Fragment>
        ))}
        <mesh position={[0, 0.72, -10.06]}>
          <boxGeometry args={[0.26, 0.02, 0.02]} />
          <meshStandardMaterial color="#e2b170" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.72, 10.06]}>
          <boxGeometry args={[0.26, 0.02, 0.02]} />
          <meshStandardMaterial color="#e2b170" roughness={0.6} />
        </mesh>
      </group>

      <mesh receiveShadow>
        <tubeGeometry args={[ropeCurve, 128, 0.1, 8, true]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.35} />
      </mesh>
    </group>
  );
};

// ─── 1b. Boundary Sponsor Boards ───
const ProceduralSponsorBoards: React.FC<{ isLiteMode: boolean; isEvening: boolean }> = ({
  isLiteMode,
  isEvening,
}) => {
  const atlasTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1536;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    const slotH = 256;
    const w = 2048;

    sponsorsData.forEach((sp, idx) => {
      const y0 = idx * slotH;

      ctx.fillStyle = sp.bgColor;
      ctx.fillRect(0, y0, w, slotH);

      ctx.fillStyle = sp.id === 'blushbook' ? '#e2e8f0' : 'rgba(255,255,255,0.15)';
      ctx.fillRect(0, y0, w, 4);
      ctx.fillRect(0, y0 + slotH - 4, w, 4);

      if (sp.id === 'blushbook') {
        ctx.fillStyle = sp.textColor;
        ctx.font = 'bold 96px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('blushbook', w / 2 - 24, y0 + slotH / 2);

        ctx.fillStyle = sp.accentColor;
        ctx.beginPath();
        ctx.arc(w / 2 + 242, y0 + slotH / 2 + 12, 18, 0, Math.PI * 2);
        ctx.fill();

        if (typeof window !== 'undefined' && sp.logoPath) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = sp.logoPath;
          img.onload = () => {
            ctx.fillStyle = sp.bgColor;
            ctx.fillRect(0, y0, w, slotH);
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(0, y0, w, 4);
            ctx.fillRect(0, y0 + slotH - 4, w, 4);

            const targetH = 154;
            const targetW = targetH * (img.width / img.height);
            const px = (w - targetW) / 2;
            const py = y0 + (slotH - targetH) / 2;
            ctx.drawImage(img, px, py, targetW, targetH);
            tex.needsUpdate = true;
          };
        }
      } else {
        ctx.fillStyle = sp.textColor;
        ctx.font = 'bold 68px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sp.name.toUpperCase(), w / 2, y0 + 96);

        ctx.fillStyle = sp.accentColor;
        ctx.font = 'bold 28px monospace';
        ctx.fillText(sp.tagline.toUpperCase(), w / 2, y0 + 172);
      }
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  const { boardsGeometry, frameGeometry } = useMemo(() => {
    const Rx = 56.6;
    const Rz = 66.6;
    const N = 72;
    const H = 0.88;

    const frontPositions: number[] = [];
    const frontNormals: number[] = [];
    const frontUvs: number[] = [];
    const framePositions: number[] = [];
    const frameNormals: number[] = [];

    const regularLoop = sponsorsData.flatMap((sp, idx) =>
      Array(sp.weight || 1).fill(idx)
    );

    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * Math.PI * 2;
      const t1 = ((i + 1) / N) * Math.PI * 2;
      const tm = (t0 + t1) / 2;

      const xm = Rx * Math.cos(tm);
      const zm = Rz * Math.sin(tm);

      if (Math.abs(xm) < 5.8 && (zm > 55 || zm < -55)) continue;

      let sponsorIndex = regularLoop[i % regularLoop.length];
      if (zm < -58 && Math.abs(xm) >= 5.8 && Math.abs(xm) <= 18) sponsorIndex = 0;
      else if (xm > 52 && Math.abs(zm) <= 10) sponsorIndex = 0;
      else if (zm > 58 && Math.abs(xm) >= 5.8 && Math.abs(xm) <= 18) sponsorIndex = 0;
      else if (xm < -52 && Math.abs(zm) <= 10) sponsorIndex = 0;

      const cos0 = Math.cos(t0), sin0 = Math.sin(t0);
      const cos1 = Math.cos(t1), sin1 = Math.sin(t1);

      const p00: [number, number, number] = [Rx * cos0, 0.02, Rz * sin0];
      const p10: [number, number, number] = [Rx * cos1, 0.02, Rz * sin1];
      const p01: [number, number, number] = [(Rx + 0.18) * cos0, 0.02 + H, (Rz + 0.18) * sin0];
      const p11: [number, number, number] = [(Rx + 0.18) * cos1, 0.02 + H, (Rz + 0.18) * sin1];
      const b00: [number, number, number] = [(Rx + 0.38) * cos0, 0.02, (Rz + 0.38) * sin0];
      const b10: [number, number, number] = [(Rx + 0.38) * cos1, 0.02, (Rz + 0.38) * sin1];

      const vb = 1.0 - (sponsorIndex + 1) / 6.0;
      const vt = 1.0 - sponsorIndex / 6.0;

      const fnx = -Math.cos(tm) * 0.95;
      const fny = 0.28;
      const fnz = -Math.sin(tm) * 0.95;

      frontPositions.push(...p00, ...p10, ...p11, ...p00, ...p11, ...p01);
      for (let k = 0; k < 6; k++) frontNormals.push(fnx, fny, fnz);
      frontUvs.push(0, vb, 1, vb, 1, vt, 0, vb, 1, vt, 0, vt);

      const rnx = Math.cos(tm) * 0.85;
      const rny = 0.52;
      const rnz = Math.sin(tm) * 0.85;

      frontPositions.push(...b10, ...b00, ...p01, ...b10, ...p01, ...p11);
      for (let k = 0; k < 6; k++) frontNormals.push(rnx, rny, rnz);
      frontUvs.push(0, vb, 1, vb, 1, vt, 0, vb, 1, vt, 0, vt);

      const capNormL = [-Math.sin(t0), 0, Math.cos(t0)];
      const capNormR = [Math.sin(t1), 0, -Math.cos(t1)];
      framePositions.push(...p00, ...p01, ...b00, ...p10, ...b10, ...p11);
      frameNormals.push(...capNormL, ...capNormL, ...capNormL, ...capNormR, ...capNormR, ...capNormR);
    }

    const bGeom = new THREE.BufferGeometry();
    bGeom.setAttribute('position', new THREE.Float32BufferAttribute(frontPositions, 3));
    bGeom.setAttribute('normal', new THREE.Float32BufferAttribute(frontNormals, 3));
    bGeom.setAttribute('uv', new THREE.Float32BufferAttribute(frontUvs, 2));

    const fGeom = new THREE.BufferGeometry();
    fGeom.setAttribute('position', new THREE.Float32BufferAttribute(framePositions, 3));
    fGeom.setAttribute('normal', new THREE.Float32BufferAttribute(frameNormals, 3));

    return { boardsGeometry: bGeom, frameGeometry: fGeom };
  }, []);

  return (
    <group position={[0, 0, 0]}>
      <mesh geometry={boardsGeometry} receiveShadow>
        <meshStandardMaterial
          map={atlasTexture}
          emissiveMap={atlasTexture}
          emissive={isLiteMode || !isEvening ? '#000000' : '#ffffff'}
          emissiveIntensity={isLiteMode ? 0.0 : isEvening ? 0.46 : 0.08}
          roughness={0.34}
          metalness={0.08}
        />
      </mesh>
      <mesh geometry={frameGeometry}>
        <meshStandardMaterial color="#0f172a" roughness={0.75} metalness={0.3} />
      </mesh>
    </group>
  );
};

// ─── 2. Stadium Bowl Architecture ───
const ProceduralStadiumBowl: React.FC<{ isEvening?: boolean }> = ({ isEvening }) => {
  const { bowlGeometry, aislesGeometry, vomitoryGeometry } = useMemo(() => {
    const Rx = 65.0;
    const Rz = 75.0;
    const numAngles = 160;

    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];

    function addQuad(
      p0: [number, number, number],
      p1: [number, number, number],
      p2: [number, number, number],
      p3: [number, number, number],
      n: [number, number, number],
      c: [number, number, number]
    ) {
      positions.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
      for (let k = 0; k < 6; k++) {
        normals.push(...n);
        colors.push(...c);
      }
    }

    // Concrete bowl colors with deep riser ambient occlusion in evening mode
    const treadColor: [number, number, number] = isEvening ? [0.34, 0.37, 0.43] : [0.42, 0.46, 0.52];
    const riserColor: [number, number, number] = isEvening ? [0.17, 0.19, 0.25] : [0.28, 0.32, 0.38];
    const walkColor: [number, number, number] = isEvening ? [0.30, 0.33, 0.39] : [0.38, 0.42, 0.48];
    const wallColor: [number, number, number] = isEvening ? [0.23, 0.25, 0.31] : [0.34, 0.38, 0.44];

    const aisleHalfWidth = 0.024;
    const isAisleAngle = (theta: number) => {
      for (const a of STADIUM_AISLE_ANGLES) {
        const diff = Math.abs(Math.atan2(Math.sin(theta - a), Math.cos(theta - a)));
        if (diff < aisleHalfWidth) return true;
      }
      return false;
    };

    const aislePositions: number[] = [];
    const aisleNormals: number[] = [];
    const aisleColors: number[] = [];

    function addAisleQuad(
      p0: [number, number, number],
      p1: [number, number, number],
      p2: [number, number, number],
      p3: [number, number, number],
      n: [number, number, number],
      c: [number, number, number]
    ) {
      aislePositions.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
      for (let k = 0; k < 6; k++) {
        aisleNormals.push(...n);
        aisleColors.push(...c);
      }
    }

    for (let a = 0; a < numAngles; a++) {
      const t0 = (a / numAngles) * Math.PI * 2;
      const t1 = ((a + 1) / numAngles) * Math.PI * 2;
      const tm = (t0 + t1) / 2;

      const cos0 = Math.cos(t0), sin0 = Math.sin(t0);
      const cos1 = Math.cos(t1), sin1 = Math.sin(t1);

      const inNorm: [number, number, number] = [-Math.cos(tm), 0, -Math.sin(tm)];
      const upNorm: [number, number, number] = [0, 1, 0];
      const outNorm: [number, number, number] = [Math.cos(tm), 0, Math.sin(tm)];

      const inAisle = isAisleAngle(tm);

      // Lower Tier: 7 Steps (Rise = 0.50m, Run = 0.80m)
      let r = 0.4;
      let y = 0.2;

      for (let i = 0; i < 7; i++) {
        const nextY = y + 0.50;
        const nextR = r + 0.80;

        if (!inAisle) {
          const r0: [number, number, number] = [(Rx + r) * cos0, y, (Rz + r) * sin0];
          const r1: [number, number, number] = [(Rx + r) * cos1, y, (Rz + r) * sin1];
          const r2: [number, number, number] = [(Rx + r) * cos1, nextY, (Rz + r) * sin1];
          const r3: [number, number, number] = [(Rx + r) * cos0, nextY, (Rz + r) * sin0];
          addQuad(r0, r1, r2, r3, inNorm, riserColor);

          const t0_: [number, number, number] = [(Rx + r) * cos0, nextY, (Rz + r) * sin0];
          const t1_: [number, number, number] = [(Rx + r) * cos1, nextY, (Rz + r) * sin1];
          const t2_: [number, number, number] = [(Rx + nextR) * cos1, nextY, (Rz + nextR) * sin1];
          const t3_: [number, number, number] = [(Rx + nextR) * cos0, nextY, (Rz + nextR) * sin0];
          addQuad(t0_, t1_, t2_, t3_, upNorm, treadColor);
        } else {
          const midY = y + 0.25;
          const midR = r + 0.40;

          const ar0: [number, number, number] = [(Rx + r) * cos0, y, (Rz + r) * sin0];
          const ar1: [number, number, number] = [(Rx + r) * cos1, y, (Rz + r) * sin1];
          const ar2: [number, number, number] = [(Rx + r) * cos1, midY, (Rz + r) * sin1];
          const ar3: [number, number, number] = [(Rx + r) * cos0, midY, (Rz + r) * sin0];
          addAisleQuad(ar0, ar1, ar2, ar3, inNorm, [0.25, 0.28, 0.34]);

          const at0: [number, number, number] = [(Rx + r) * cos0, midY, (Rz + r) * sin0];
          const at1: [number, number, number] = [(Rx + r) * cos1, midY, (Rz + r) * sin1];
          const at2: [number, number, number] = [(Rx + midR) * cos1, midY, (Rz + midR) * sin1];
          const at3: [number, number, number] = [(Rx + midR) * cos0, midY, (Rz + midR) * sin0];
          addAisleQuad(at0, at1, at2, at3, upNorm, [0.95, 0.8, 0.1]);

          const br0: [number, number, number] = [(Rx + midR) * cos0, midY, (Rz + midR) * sin0];
          const br1: [number, number, number] = [(Rx + midR) * cos1, midY, (Rz + midR) * sin1];
          const br2: [number, number, number] = [(Rx + midR) * cos1, nextY, (Rz + midR) * sin1];
          const br3: [number, number, number] = [(Rx + midR) * cos0, nextY, (Rz + midR) * sin0];
          addAisleQuad(br0, br1, br2, br3, inNorm, [0.25, 0.28, 0.34]);

          const bt0: [number, number, number] = [(Rx + midR) * cos0, nextY, (Rz + midR) * sin0];
          const bt1: [number, number, number] = [(Rx + midR) * cos1, nextY, (Rz + midR) * sin1];
          const bt2: [number, number, number] = [(Rx + nextR) * cos1, nextY, (Rz + nextR) * sin1];
          const bt3: [number, number, number] = [(Rx + nextR) * cos0, nextY, (Rz + nextR) * sin0];
          addAisleQuad(bt0, bt1, bt2, bt3, upNorm, [0.38, 0.42, 0.48]);
        }

        r = nextR;
        y = nextY;
      }

      // Mid-Concourse Walkway
      const wR = r + 2.0;
      const w0: [number, number, number] = [(Rx + r) * cos0, y, (Rz + r) * sin0];
      const w1: [number, number, number] = [(Rx + r) * cos1, y, (Rz + r) * sin1];
      const w2: [number, number, number] = [(Rx + wR) * cos1, y, (Rz + wR) * sin1];
      const w3: [number, number, number] = [(Rx + wR) * cos0, y, (Rz + wR) * sin0];
      addQuad(w0, w1, w2, w3, upNorm, walkColor);
      r = wR;

      // Upper Tier: 8 Steps (Rise = 0.75m, Run = 0.80m)
      for (let j = 0; j < 8; j++) {
        const nextY = y + 0.75;
        const nextR = r + 0.80;

        if (!inAisle) {
          const r0: [number, number, number] = [(Rx + r) * cos0, y, (Rz + r) * sin0];
          const r1: [number, number, number] = [(Rx + r) * cos1, y, (Rz + r) * sin1];
          const r2: [number, number, number] = [(Rx + r) * cos1, nextY, (Rz + r) * sin1];
          const r3: [number, number, number] = [(Rx + r) * cos0, nextY, (Rz + r) * sin0];
          addQuad(r0, r1, r2, r3, inNorm, riserColor);

          const t0_: [number, number, number] = [(Rx + r) * cos0, nextY, (Rz + r) * sin0];
          const t1_: [number, number, number] = [(Rx + r) * cos1, nextY, (Rz + r) * sin1];
          const t2_: [number, number, number] = [(Rx + nextR) * cos1, nextY, (Rz + nextR) * sin1];
          const t3_: [number, number, number] = [(Rx + nextR) * cos0, nextY, (Rz + nextR) * sin0];
          addQuad(t0_, t1_, t2_, t3_, upNorm, treadColor);
        } else {
          const midY = y + 0.375;
          const midR = r + 0.40;

          const ar0: [number, number, number] = [(Rx + r) * cos0, y, (Rz + r) * sin0];
          const ar1: [number, number, number] = [(Rx + r) * cos1, y, (Rz + r) * sin1];
          const ar2: [number, number, number] = [(Rx + r) * cos1, midY, (Rz + r) * sin1];
          const ar3: [number, number, number] = [(Rx + r) * cos0, midY, (Rz + r) * sin0];
          addAisleQuad(ar0, ar1, ar2, ar3, inNorm, [0.25, 0.28, 0.34]);

          const at0: [number, number, number] = [(Rx + r) * cos0, midY, (Rz + r) * sin0];
          const at1: [number, number, number] = [(Rx + r) * cos1, midY, (Rz + r) * sin1];
          const at2: [number, number, number] = [(Rx + midR) * cos1, midY, (Rz + midR) * sin1];
          const at3: [number, number, number] = [(Rx + midR) * cos0, midY, (Rz + midR) * sin0];
          addAisleQuad(at0, at1, at2, at3, upNorm, [0.95, 0.8, 0.1]);

          const br0: [number, number, number] = [(Rx + midR) * cos0, midY, (Rz + midR) * sin0];
          const br1: [number, number, number] = [(Rx + midR) * cos1, midY, (Rz + midR) * sin1];
          const br2: [number, number, number] = [(Rx + midR) * cos1, nextY, (Rz + midR) * sin1];
          const br3: [number, number, number] = [(Rx + midR) * cos0, nextY, (Rz + midR) * sin0];
          addAisleQuad(br0, br1, br2, br3, inNorm, [0.25, 0.28, 0.34]);

          const bt0: [number, number, number] = [(Rx + midR) * cos0, nextY, (Rz + midR) * sin0];
          const bt1: [number, number, number] = [(Rx + midR) * cos1, nextY, (Rz + midR) * sin1];
          const bt2: [number, number, number] = [(Rx + nextR) * cos1, nextY, (Rz + nextR) * sin1];
          const bt3: [number, number, number] = [(Rx + nextR) * cos0, nextY, (Rz + nextR) * sin0];
          addAisleQuad(bt0, bt1, bt2, bt3, upNorm, [0.38, 0.42, 0.48]);
        }

        r = nextR;
        y = nextY;
      }

      // Top Concourse
      const topR = r + 0.60;
      const tc0: [number, number, number] = [(Rx + r) * cos0, y, (Rz + r) * sin0];
      const tc1: [number, number, number] = [(Rx + r) * cos1, y, (Rz + r) * sin1];
      const tc2: [number, number, number] = [(Rx + topR) * cos1, y, (Rz + topR) * sin1];
      const tc3: [number, number, number] = [(Rx + topR) * cos0, y, (Rz + topR) * sin0];
      addQuad(tc0, tc1, tc2, tc3, upNorm, walkColor);
      r = topR;

      // Parapet Wall
      const pY = y + 3.3;
      const pr0: [number, number, number] = [(Rx + r) * cos0, y, (Rz + r) * sin0];
      const pr1: [number, number, number] = [(Rx + r) * cos1, y, (Rz + r) * sin1];
      const pr2: [number, number, number] = [(Rx + r) * cos1, pY, (Rz + r) * sin1];
      const pr3: [number, number, number] = [(Rx + r) * cos0, pY, (Rz + r) * sin0];
      addQuad(pr0, pr1, pr2, pr3, inNorm, riserColor);

      const capR = r + 0.35;
      const pc0: [number, number, number] = [(Rx + r) * cos0, pY, (Rz + r) * sin0];
      const pc1: [number, number, number] = [(Rx + r) * cos1, pY, (Rz + r) * sin1];
      const pc2: [number, number, number] = [(Rx + capR) * cos1, pY, (Rz + capR) * sin1];
      const pc3: [number, number, number] = [(Rx + capR) * cos0, pY, (Rz + capR) * sin0];
      addQuad(pc0, pc1, pc2, pc3, upNorm, treadColor);

      // Outer Wall Exterior
      const ow0: [number, number, number] = [(Rx + capR) * cos0, 0, (Rz + capR) * sin0];
      const ow1: [number, number, number] = [(Rx + capR) * cos1, 0, (Rz + capR) * sin1];
      const ow2: [number, number, number] = [(Rx + capR) * cos1, pY, (Rz + capR) * sin1];
      const ow3: [number, number, number] = [(Rx + capR) * cos0, pY, (Rz + capR) * sin0];
      addQuad(ow0, ow1, ow2, ow3, outNorm, wallColor);
    }

    const vomPositions: number[] = [];
    const vomNormals: number[] = [];
    STADIUM_AISLE_ANGLES.forEach((theta) => {
      const rVom = 8.0;
      const px = (Rx + rVom) * Math.cos(theta);
      const pz = (Rz + rVom) * Math.sin(theta);
      const normX = -Math.cos(theta);
      const normZ = -Math.sin(theta);
      const tx = -Math.sin(theta);
      const tz = Math.cos(theta);

      const hw = 1.0;
      const h = 2.2;
      const by = 3.70;

      const p0 = [px - tx * hw, by, pz - tz * hw];
      const p1 = [px + tx * hw, by, pz + tz * hw];
      const p2 = [px + tx * hw, by + h, pz + tz * hw];
      const p3 = [px - tx * hw, by + h, pz - tz * hw];

      vomPositions.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
      for (let k = 0; k < 6; k++) vomNormals.push(normX, 0, normZ);
    });

    const bGeom = new THREE.BufferGeometry();
    bGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    bGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    bGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const aGeom = new THREE.BufferGeometry();
    aGeom.setAttribute('position', new THREE.Float32BufferAttribute(aislePositions, 3));
    aGeom.setAttribute('normal', new THREE.Float32BufferAttribute(aisleNormals, 3));
    aGeom.setAttribute('color', new THREE.Float32BufferAttribute(aisleColors, 3));

    const vGeom = new THREE.BufferGeometry();
    vGeom.setAttribute('position', new THREE.Float32BufferAttribute(vomPositions, 3));
    vGeom.setAttribute('normal', new THREE.Float32BufferAttribute(vomNormals, 3));

    return { bowlGeometry: bGeom, aislesGeometry: aGeom, vomitoryGeometry: vGeom };
  }, [isEvening]);

  return (
    <group position={[0, 0, 0]}>
      <mesh geometry={bowlGeometry} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.82} metalness={0.06} />
      </mesh>
      <mesh geometry={aislesGeometry}>
        <meshStandardMaterial vertexColors roughness={0.78} metalness={0.08} />
      </mesh>
      <mesh geometry={vomitoryGeometry}>
        <meshBasicMaterial color="#080b12" />
      </mesh>

      {STADIUM_AISLE_ANGLES.map((theta, idx) => {
        const Rx = 65.0;
        const Rz = 75.0;
        const rStart = 1.2;
        const yStart = 0.95;
        const rEnd = 14.4;
        const yEnd = 10.15;

        const x0 = (Rx + rStart) * Math.cos(theta);
        const z0 = (Rz + rStart) * Math.sin(theta);
        const x1 = (Rx + rEnd) * Math.cos(theta);
        const z1 = (Rz + rEnd) * Math.sin(theta);

        const midX = (x0 + x1) / 2;
        const midY = (yStart + yEnd) / 2;
        const midZ = (z0 + z1) / 2;
        const len = Math.hypot(x1 - x0, z1 - z0);
        const dy = yEnd - yStart;
        const railLength = Math.hypot(len, dy);

        const rotY = Math.atan2(x1 - x0, z1 - z0);
        const slopeAngle = Math.atan2(dy, len);

        return (
          <group key={`handrail-${idx}`} position={[midX, midY + 0.85, midZ]} rotation={[0, rotY, 0]}>
            {/* Top pipe following the stair rake accurately */}
            <mesh rotation={[Math.PI / 2 - slopeAngle, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, railLength, 8]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.25} />
            </mesh>
            {/* Vertical baluster posts planted on steps */}
            {[-0.4, -0.2, 0, 0.2, 0.4].map((t, bIdx) => (
              <mesh key={`baluster-${bIdx}`} position={[0, t * dy - 0.425, t * len]}>
                <cylinderGeometry args={[0.02, 0.02, 0.85, 6]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.3} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

// ─── 3. Architectural Details: VIP Canopy, Pavilion, 6 Floodlights, Scoreboard ───
const ProceduralStadiumDetails: React.FC<{
  isEvening: boolean;
  stadiumLevel: StadiumDrillLevel;
  showBeamAxes?: boolean;
  isLiteMode?: boolean;
}> = ({ isEvening, stadiumLevel, showBeamAxes, isLiteMode }) => {
  const scoreboardTex = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // High contrast deep stadium black display background
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top Header: Navy banner with yellow tournament title
      ctx.fillStyle = '#002b7f';
      ctx.fillRect(0, 0, canvas.width, 136);
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('T20 TRI-SERIES FINAL  ·  UPCOMING MATCH', 1024, 90);

      // Teams: Bold white crisp lettering
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 128px system-ui, -apple-system, sans-serif';
      ctx.fillText('NEPAL   vs   NETHERLANDS', 1024, 320);

      // Match DateTime: Vibrant cyan monospace
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 84px monospace';
      ctx.fillText('28 NOV 2026  ·  01:15 PM NPT', 1024, 460);

      // Venue Location
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
      ctx.fillText('TU INTERNATIONAL CRICKET GROUND, KIRTIPUR', 1024, 580);

      // Info pill badge for Toss & Gates
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(320, 670, 1408, 120, 24);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 52px monospace';
      ctx.fillText('TOSS: 12:45 PM  ·  GATES OPEN: 10:00 AM', 1024, 750);

      // Bottom Bar: CAN Red Banner
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 888, canvas.width, 136);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 54px system-ui, -apple-system, sans-serif';
      ctx.fillText('CRICKET ASSOCIATION OF NEPAL (CAN)', 1024, 976);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = 8;
    return tex;
  }, []);

  // High-density stadium floodlight lamp face: 60 modular reflector cells (10 cols x 6 rows)
  const lampFaceTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark graphite base plate
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, 1024, 512);

      const cols = 10;
      const rows = 6;
      const cellW = 1024 / cols;
      const cellH = 512 / rows;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const cx = (c + 0.5) * cellW;
          const cy = (r + 0.5) * cellH;
          const radius = Math.min(cellW, cellH) * 0.44;

          // Outer bezel ring
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.stroke();

          // Chrome parabolic reflector cup
          const cupGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
          cupGrad.addColorStop(0.0, '#ffffff'); // Intense hot white emitter core
          cupGrad.addColorStop(0.20, '#fffbeb'); // Warm core glow
          cupGrad.addColorStop(0.50, '#fef08a'); // Gold reflection
          cupGrad.addColorStop(0.85, '#475569'); // Metallic bezel
          cupGrad.addColorStop(1.0, '#0f172a');  // Recessed cup rim
          ctx.fillStyle = cupGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
          ctx.fill();

          // Concentric parabolic reflector ridge
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  // Strong additive glow sprite / halo texture
  const haloTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0.00, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.20, 'rgba(255, 252, 230, 0.88)');
      grad.addColorStop(0.48, 'rgba(254, 240, 138, 0.38)');
      grad.addColorStop(0.78, 'rgba(254, 240, 138, 0.09)');
      grad.addColorStop(1.00, 'rgba(255, 240, 138, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Subtle anamorphic horizontal lens flare streak texture
  const streakTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 512, 0);
      grad.addColorStop(0.00, 'rgba(255, 250, 220, 0.0)');
      grad.addColorStop(0.40, 'rgba(255, 252, 235, 0.25)');
      grad.addColorStop(0.50, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(0.60, 'rgba(255, 252, 235, 0.25)');
      grad.addColorStop(1.00, 'rgba(255, 250, 220, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 64);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Soft volumetric light beam texture with radial Gaussian falloff & length end-fades (no open rings, no hard edges)
  const beamFadeTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imgData = ctx.createImageData(256, 512);
      const data = imgData.data;

      for (let y = 0; y < 512; y++) {
        const v = y / 511; // 0 = head, 1 = pitch target

        // Length fade: 0 at head (v=0), smoothly ramps up by v=0.06, holds, then softly fades to 0 at v=1.0
        let lenAlpha = 1.0;
        if (v < 0.06) {
          lenAlpha = Math.pow(v / 0.06, 2.0); // Exactly 0.0 at v=0 (no open ring)
        } else if (v > 0.38) {
          const t = (v - 0.38) / 0.62;
          lenAlpha = Math.pow(Math.cos(t * Math.PI * 0.5), 2.2); // Soft taper toward pitch to prevent wash-out
        }

        for (let x = 0; x < 256; x++) {
          const u = x / 255;
          // Radial Gaussian falloff across width (soft edges like haze)
          const radDist = (u - 0.5) * 2.0; // -1 to 1
          const radAlpha = Math.exp(-4.2 * radDist * radDist);

          const finalAlpha = Math.min(1.0, lenAlpha * radAlpha);
          const idx = (y * 256 + x) * 4;

          // Warm floodlight beam color
          data[idx] = 255;     // R
          data[idx + 1] = 252; // G
          data[idx + 2] = 236; // B
          data[idx + 3] = Math.round(finalAlpha * 255);
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  const towers = useMemo(
    () => [
      { id: 't-nw', pos: [-46, 0, -88] as [number, number, number], target: [5, 0, -8] as [number, number, number] },
      { id: 't-ne', pos: [46, 0, -88] as [number, number, number], target: [-5, 0, -8] as [number, number, number] },
      { id: 't-east', pos: [88, 0, -10] as [number, number, number], target: [-6, 0, -2] as [number, number, number] },
      { id: 't-se', pos: [88, 0, 48] as [number, number, number], target: [-5, 0, 8] as [number, number, number] },
      { id: 't-sw', pos: [-88, 0, 48] as [number, number, number], target: [5, 0, 8] as [number, number, number] },
      { id: 't-west', pos: [-88, 0, -10] as [number, number, number], target: [6, 0, -2] as [number, number, number] },
    ],
    []
  );

  return (
    <group position={[0, 0, 0]}>
      {/* North VIP Canopy */}
      <group position={[0, 0, -90.5]}>
        {[-12, -6, 0, 6, 12].map((ox, i) => (
          <mesh key={`col-${i}`} position={[ox, 7.5, 0]}>
            <cylinderGeometry args={[0.22, 0.26, 15.0, 10]} />
            <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        {[-12, -6, 0, 6, 12].map((ox, i) => (
          <mesh key={`rafter-${i}`} position={[ox, 14.8, 3.8]} rotation={[0.16, 0, 0]}>
            <boxGeometry args={[0.24, 0.45, 8.2]} />
            <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        <mesh position={[0, 15.2, 3.8]} rotation={[0.16, 0, 0]}>
          <boxGeometry args={[26.4, 0.18, 8.6]} />
          <meshStandardMaterial color="#1e293b" roughness={0.65} metalness={0.4} />
        </mesh>
      </group>

      {/* 6 Floodlight Towers with High-Density Lamp Heads, Halos, Flares & Volumetric Beams */}
      {towers.map((tower) => (
        <SingleFloodlightTower
          key={tower.id}
          tower={tower}
          isEvening={isEvening}
          isLiteMode={isLiteMode}
          stadiumLevel={stadiumLevel}
          showBeamAxes={showBeamAxes}
          beamFadeTexture={beamFadeTexture}
          haloTexture={haloTexture}
          streakTexture={streakTexture}
          lampFaceTexture={lampFaceTexture}
        />
      ))}

      {/* Electronic Scoreboard (40% larger for crystal clarity from aerial & opposite seats) */}
      <group position={[48, 17.5, -84]} rotation={[0, -0.52, 0]}>
        {/* Concrete Foundation Base Footing */}
        <mesh position={[0, -16.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[6.0, 3.2, 6.0]} />
          <meshStandardMaterial color="#334155" roughness={0.8} />
        </mesh>
        {/* Dual Steel Lattice Support Pylons */}
        {[-3.6, 3.6].map((px, idx) => (
          <mesh key={`pylon-${idx}`} position={[px, -8.5, 0]}>
            <cylinderGeometry args={[0.45, 0.60, 15.0, 8]} />
            <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.3} />
          </mesh>
        ))}
        {/* Scoreboard Housing: 14.2 * 1.4 = 19.9, 7.4 * 1.4 = 10.4 */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[20.0, 10.4, 0.9]} />
          <meshStandardMaterial color="#0b0f19" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Electronic Display Face: 13.6 * 1.4 = 19.0, 6.8 * 1.4 = 9.5 */}
        <mesh position={[0, 0, 0.48]}>
          <planeGeometry args={[19.2, 9.6]} />
          <meshBasicMaterial map={scoreboardTex} />
        </mesh>
      </group>
    </group>
  );
};

// ─── 3b. Individual Floodlight Tower: Vertical Mast & Aimed Pitch-Facing Head ───
const SingleFloodlightTower: React.FC<{
  tower: {
    id: string;
    pos: [number, number, number];
    target: [number, number, number];
  };
  isEvening: boolean;
  isLiteMode?: boolean;
  stadiumLevel: StadiumDrillLevel;
  showBeamAxes?: boolean;
  beamFadeTexture: THREE.Texture;
  haloTexture: THREE.Texture;
  streakTexture: THREE.Texture;
  lampFaceTexture: THREE.Texture;
}> = ({
  tower,
  isEvening,
  isLiteMode,
  stadiumLevel,
  showBeamAxes,
  beamFadeTexture,
  haloTexture,
  streakTexture,
  lampFaceTexture,
}) => {
  const haloRef = useRef<THREE.Mesh>(null);
  const beamGroupRef = useRef<THREE.Group>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  const spotTargetRef = useRef<THREE.Object3D>(null);

  // Exact head world coordinates: top of mast at [tx, 47.2, tz]
  const headWorldPos = useMemo(() => {
    return new THREE.Vector3(tower.pos[0], 47.2, tower.pos[2]);
  }, [tower]);

  // Compute direction, distance, lookAt quaternion, and angle below horizontal
  const { headQuaternion, beamLength, angleDeg } = useMemo(() => {
    const localTgt = new THREE.Vector3(
      tower.target[0] - tower.pos[0],
      -46.2,
      tower.target[2] - tower.pos[2]
    );
    const len = localTgt.length();
    const D = Math.hypot(localTgt.x, localTgt.z);
    const ang = (Math.atan2(46.2, D) * 180) / Math.PI;

    // Use dummy Object3D to compute exact lookAt orientation:
    // Local +Z points toward the pitch target; panel width stays level with horizon (no roll/bank)
    const dummy = new THREE.Object3D();
    dummy.lookAt(localTgt);

    return {
      headQuaternion: dummy.quaternion.clone(),
      beamLength: len,
      angleDeg: ang,
    };
  }, [tower]);

  // Connect SpotLight to its dedicated target child object
  useLayoutEffect(() => {
    if (spotLightRef.current && spotTargetRef.current) {
      spotLightRef.current.target = spotTargetRef.current;
    }
  }, [beamLength]);

  // Angle check & logging (Angles must be strictly 20° to 40° below horizontal)
  useEffect(() => {
    const isValid = angleDeg >= 20 && angleDeg <= 40;
    console.log(
      `[Floodlight Orientation Check] Tower: ${tower.id} | Head World: [${headWorldPos.x.toFixed(1)}, 47.2, ${headWorldPos.z.toFixed(1)}] | Pitch Target: [${tower.target.join(', ')}] | Angle below horizontal: ${angleDeg.toFixed(1)}° (${isValid ? 'PASS: 20°-40°' : 'FAIL: OUT OF RANGE'})`
    );
    if (typeof window !== 'undefined') {
      if (!(window as any).__FLOODLIGHT_ANGLES__) (window as any).__FLOODLIGHT_ANGLES__ = {};
      (window as any).__FLOODLIGHT_ANGLES__[tower.id] = {
        id: tower.id,
        head: [headWorldPos.x, 47.2, headWorldPos.z],
        target: tower.target,
        distance: Number(beamLength.toFixed(1)),
        angleDeg: Number(angleDeg.toFixed(1)),
        valid: isValid,
      };
    }
  }, [tower, headWorldPos, angleDeg, beamLength]);

  // Distance fading & bowl culling for beams
  useFrame(({ camera }) => {
    const camPos = camera.position;
    const distToHead = camPos.distanceTo(headWorldPos);

    if (haloRef.current) {
      if (!isEvening) {
        haloRef.current.visible = false;
      } else {
        haloRef.current.visible = true;
        // Keep the glow small and bright in front of lamp face (never spreading into sky)
        const scaleVal = Math.min(1.4, Math.max(0.9, distToHead * 0.012));
        haloRef.current.scale.set(scaleVal, scaleVal, 1);
      }
    }

    if (beamGroupRef.current) {
      const camDistToOrigin = Math.hypot(camPos.x, camPos.z);
      const isInsideBowl = (camPos.y < 22 && camDistToOrigin < 86) || stadiumLevel === 'seat';
      beamGroupRef.current.visible = isEvening && !isInsideBowl;
    }
  });

  return (
    <group position={tower.pos}>
      {/* 1. Heavy Concrete Foundation Footing - on ground */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.8, 3.2, 1.8, 12]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>

      {/* 2. Main Steel Mast Pole - strictly vertical, terminates cleanly at y=45.0m below the head */}
      <mesh position={[0, 22.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.65, 2.1, 45.0, 12]} />
        <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* 3. Mast Top Platform Collar & Maintenance Railing - stops at y=45.6m, behind the tilted head */}
      <mesh position={[0, 45.2, 0]}>
        <cylinderGeometry args={[1.05, 0.72, 0.5, 12]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 45.5, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.15, 12]} />
        <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, 46.0, 0]}>
        <cylinderGeometry args={[1.45, 1.45, 0.9, 12, 1, true]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} wireframe />
      </mesh>

      {/* 4. Swivel Mounting Yoke & Forward Cantilevered Floodlight Head Unit at [0, 46.2, 0] */}
      <group position={[0, 46.2, 0]} quaternion={headQuaternion}>
        {/* Cantilever Bracket / Yoke: reaches forward from the mast top to the rear of the lamp housing */}
        <group>
          {/* Central Swivel Base Collar */}
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.65, 0.65, 0.8, 8]} />
            <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.3} />
          </mesh>
          {/* Dual Heavy Forward Cantilever Struts reaching to z=1.7m */}
          <mesh position={[-1.6, 0.5, 0.9]} rotation={[0.48, -0.12, 0]}>
            <boxGeometry args={[0.3, 0.35, 2.2]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
          </mesh>
          <mesh position={[1.6, 0.5, 0.9]} rotation={[0.48, 0.12, 0]}>
            <boxGeometry args={[0.3, 0.35, 2.2]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
          </mesh>
          {/* Transverse Cross-Beam on rear of housing */}
          <mesh position={[0, 1.0, 1.75]}>
            <boxGeometry args={[5.2, 0.4, 0.4]} />
            <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.3} />
          </mesh>
        </group>

        {/* ─── HEAD ASSEMBLY (Forward-offset at z=2.1m, y=1.0m, facing pitch along +Z) ─── */}

        {/* Dark Graphite Housing Frame (z from 1.8 to 2.4) */}
        <mesh position={[0, 1.0, 2.1]} castShadow>
          <boxGeometry args={[9.6, 5.6, 0.6]} />
          <meshStandardMaterial color="#0b0f19" metalness={0.85} roughness={0.3} />
        </mesh>

        {/* Top Anti-Glare Visor */}
        <mesh position={[0, 3.82, 2.55]} rotation={[0.22, 0, 0]}>
          <boxGeometry args={[9.8, 0.12, 0.45]} />
          <meshStandardMaterial color="#080c14" metalness={0.7} roughness={0.4} />
        </mesh>

        {/* Side Visor Flaps */}
        {[-4.85, 4.85].map((sx, idx) => (
          <mesh key={`side-visor-${idx}`} position={[sx, 1.0, 2.45]}>
            <boxGeometry args={[0.12, 5.6, 0.35]} />
            <meshStandardMaterial color="#080c14" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}

        {/* Rear Maintenance Catwalk & Safety Lattice (Behind housing at z=1.3m) */}
        <mesh position={[0, -1.4, 1.3]}>
          <boxGeometry args={[8.8, 0.2, 1.0]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.8, 0.8]}>
          <boxGeometry args={[8.8, 1.0, 0.08]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} wireframe />
        </mesh>

        {/* Dense Front Panel Face with 60 Emissive Lamp Cells (At z=2.41m, completely open face facing pitch) */}
        <mesh position={[0, 1.0, 2.41]}>
          <planeGeometry args={[9.2, 5.2]} />
          <meshStandardMaterial
            color="#ffffff"
            map={lampFaceTexture}
            emissive={isEvening ? '#fffde8' : '#000000'}
            emissiveMap={lampFaceTexture}
            emissiveIntensity={isEvening ? 5.8 : 0.0}
            roughness={0.15}
            metalness={0.6}
          />
        </mesh>

        {/* 3D Micro-Lens Bulbs Array (60 physical lamp elements at z=2.43m) */}
        {[-4.05, -3.15, -2.25, -1.35, -0.45, 0.45, 1.35, 2.25, 3.15, 4.05].map((bx, bi) =>
          [-2.0, -1.2, -0.4, 0.4, 1.2, 2.0].map((by, ri) => (
            <mesh
              key={`bulb-${bi}-${ri}`}
              position={[bx, 1.0 + by, 2.43]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.34, 0.38, 0.08, 10]} />
              <meshStandardMaterial
                color={isEvening ? '#ffffff' : '#334155'}
                emissive={isEvening ? '#fffdf0' : '#000000'}
                emissiveIntensity={isEvening ? 5.5 : 0.0}
                roughness={0.1}
                metalness={isEvening ? 0.3 : 0.8}
              />
            </mesh>
          ))
        )}

        {/* Halo Glow Sprite sits right in front of front face at z=2.48m (no sky spread) */}
        <mesh ref={haloRef} position={[0, 1.0, 2.48]}>
          <planeGeometry args={[10.5, 6.2]} />
          <meshBasicMaterial
            map={haloTexture}
            color="#fffdf2"
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={true}
          />
        </mesh>

        {/* Subtle Horizontal Flare Streak in front of lamp face */}
        {isEvening && (
          <mesh position={[0, 1.0, 2.50]}>
            <planeGeometry args={[16.0, 1.2]} />
            <meshBasicMaterial
              map={streakTexture}
              color="#fffbeb"
              transparent
              opacity={0.28}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              depthTest={true}
            />
          </mesh>
        )}

        {/* Dedicated target object for SpotLight at exact pitch target distance */}
        <object3D ref={spotTargetRef} position={[0, 1.0, beamLength]} />

        {/* Real SpotLight parented directly to the head at front face, targeting pitch target */}
        <spotLight
          ref={spotLightRef}
          position={[0, 1.0, 2.48]}
          intensity={isEvening ? 5.8 : 0}
          color="#fffdf4"
          angle={Math.PI / 4.2}
          penumbra={0.90}
          distance={beamLength + 25}
          decay={1.0}
          castShadow={!isLiteMode && (tower.id.includes('nw') || tower.id.includes('se'))}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
        />

        {/* Volumetric Light Beam: Starts at front face z=2.48m, travels forward away from mast toward target */}
        <group position={[0, 1.0, 2.48]}>
          <group ref={beamGroupRef}>
            <mesh position={[0, 0, (beamLength - 2.48) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.8, 18.0, beamLength - 2.48, 32, 8, true]} />
              <meshBasicMaterial
                map={beamFadeTexture}
                color="#fffcf0"
                transparent
                opacity={0.084}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
                depthWrite={false}
                depthTest={true}
              />
            </mesh>

            {/* Tri-plane cross billboards */}
            {[0, Math.PI / 3, (2 * Math.PI) / 3].map((rotAngle, idx) => (
              <mesh key={`cross-quad-${idx}`} position={[0, 0, (beamLength - 2.48) / 2]} rotation={[0, 0, rotAngle]}>
                <planeGeometry args={[16.0, beamLength - 2.48]} />
                <meshBasicMaterial
                  map={beamFadeTexture}
                  color="#fffcf0"
                  transparent
                  opacity={0.070}
                  blending={THREE.AdditiveBlending}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                  depthTest={true}
                />
              </mesh>
            ))}
          </group>
        </group>

        {/* Debug Axis Line and Target Disc on Pitch (enabled via ?debug=1 or toggle button) */}
        {showBeamAxes && (
          <group>
            {/* Axis cylinder from front face z=2.48m to pitch target */}
            <mesh position={[0, 1.0, (beamLength + 2.48) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.10, 0.10, beamLength - 2.48, 8]} />
              <meshBasicMaterial color="#38bdf8" />
            </mesh>
            {/* Target disc on pitch */}
            <mesh position={[0, 1.0, beamLength]}>
              <ringGeometry args={[0.8, 1.4, 24]} />
              <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
};

// ─── 4. Seated Spectators on Sold Seats ───
const CrowdSpectators: React.FC<{
  seatsData: StadiumSeatInstance[];
  soldKeys: string[];
}> = ({ seatsData, soldKeys }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const soldSeats = useMemo(() => {
    return seatsData.filter((s) => soldKeys.includes(`${s.row}-${s.number}`));
  }, [seatsData, soldKeys]);

  const fanGeometry = useMemo(() => {
    const torso = new THREE.BoxGeometry(0.32, 0.38, 0.24);
    torso.translate(0, 0.22, -0.04);
    const head = new THREE.BoxGeometry(0.20, 0.22, 0.20);
    head.translate(0, 0.48, -0.04);
    const cap = new THREE.BoxGeometry(0.22, 0.06, 0.26);
    cap.translate(0, 0.58, -0.01);
    return mergeGeometries([torso, head, cap]);
  }, []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || soldSeats.length === 0) return;
    const dummy = new THREE.Object3D();
    const fanColors = [
      new THREE.Color('#dc2626'),
      new THREE.Color('#002b7f'),
      new THREE.Color('#facc15'),
      new THREE.Color('#f8fafc'),
      new THREE.Color('#334155'),
      new THREE.Color('#ea580c'),
    ];

    if (!mesh.instanceColor) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(soldSeats.length * 3),
        3
      );
    }

    soldSeats.forEach((seat, idx) => {
      dummy.position.set(seat.position[0], seat.position[1] + 0.12, seat.position[2]);
      dummy.lookAt(0, seat.position[1] + 0.12, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);
      const color = fanColors[(seat.number * 7 + idx * 3) % fanColors.length];
      mesh.setColorAt(idx, color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [soldSeats]);

  if (soldSeats.length === 0) return null;

  return (
    <instancedMesh
      ref={meshRef}
      args={[fanGeometry, undefined, soldSeats.length]}
      count={soldSeats.length}
      frustumCulled={false}
      castShadow
    >
      <meshStandardMaterial roughness={0.65} metalness={0.05} />
    </instancedMesh>
  );
};

// ─── 5. Stand Hit Volumes for Level 1 (Overview) ───
const StandHitVolumes: React.FC<{
  stands: ReturnType<typeof buildStadiumDrillDownData>['stands'];
  hoveredStandId: string | null;
  onHoverStand: (standId: string | null) => void;
  onSelectStand: (standId: string) => void;
}> = ({ stands, hoveredStandId, onHoverStand, onSelectStand }) => {
  return (
    <group position={[0, 0, 0]}>
      {stands.map((stand) => {
        const thetaMid = (stand.bayIdx * Math.PI) / 4;
        const isHovered =
          hoveredStandId === stand.id ||
          hoveredStandId === stand.id.replace('_', '-');

        const isLower = stand.tierType === 'lower';
        const rMin = isLower ? 65.4 : 73.0;
        const rMax = isLower ? 71.0 : 79.5;
        const yElev = isLower ? 2.2 : 7.2;

        const cosM = Math.cos(thetaMid);
        const sinM = Math.sin(thetaMid);
        const midR = (rMin + rMax) / 2;

        return (
          <group
            key={stand.id}
            position={[midR * cosM, yElev, midR * sinM]}
            rotation={[0, -thetaMid, 0]}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverStand(stand.id);
            }}
            onPointerOut={() => onHoverStand(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectStand(stand.id);
            }}
          >
            {/* Highlight Volume when hovered */}
            {isHovered && (
              <mesh>
                <boxGeometry args={[rMax - rMin + 2.0, isLower ? 4.0 : 6.0, 24.0]} />
                <meshStandardMaterial
                  color="#38bdf8"
                  transparent
                  opacity={0.35}
                  emissive="#38bdf8"
                  emissiveIntensity={0.5}
                  depthWrite={false}
                />
              </mesh>
            )}
            {/* Hit Box always active & raycastable */}
            <mesh>
              <boxGeometry args={[rMax - rMin + 2.0, isLower ? 4.0 : 6.0, 24.0]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ─── 6. Block Hit Volumes and Floating Badges for Level 2 (Stand View) ───
const BlockHitVolumes: React.FC<{
  blocks: ReturnType<typeof buildStadiumDrillDownData>['blocks'];
  selectedStandId: string | null;
  hoveredBlockId: string | null;
  onHoverBlock: (blockId: string | null) => void;
  onSelectBlock: (blockId: string) => void;
}> = ({ blocks, selectedStandId, hoveredBlockId, onHoverBlock, onSelectBlock }) => {
  const visibleBlocks = useMemo(() => {
    if (!selectedStandId) return [];
    return blocks.filter((b) => {
      if (b.standId === selectedStandId) return true;
      if (selectedStandId.startsWith('east_') && b.standId.startsWith('e_')) return true;
      if (selectedStandId.startsWith('west_') && b.standId.startsWith('w_')) return true;
      if (selectedStandId.startsWith('pavilion_') && b.standId.startsWith('p_')) return true;
      return false;
    });
  }, [blocks, selectedStandId]);

  if (!selectedStandId || visibleBlocks.length === 0) return null;

  return (
    <group position={[0, 0, 0]}>
      {visibleBlocks.map((blk) => {
        const isHovered = hoveredBlockId === blk.id;
        const availRatio = blk.availableSeats / (blk.totalSeats || 1);
        const badgeColor =
          availRatio <= 0.1 ? '#64748b' : availRatio <= 0.4 ? '#f59e0b' : '#10b981';
        const statusText =
          availRatio <= 0.1 ? 'Sold out' : availRatio <= 0.4 ? 'Few left' : 'Plenty';

        return (
          <group
            key={blk.id}
            position={blk.centerPos}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHoverBlock(blk.id);
            }}
            onPointerOut={() => onHoverBlock(null)}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBlock(blk.id);
            }}
          >
            {/* Highlight Volume */}
            {isHovered && (
              <mesh position={[0, 0.4, 0]}>
                <boxGeometry args={[4.2, 2.6, 4.2]} />
                <meshStandardMaterial
                  color="#facc15"
                  transparent
                  opacity={0.38}
                  emissive="#facc15"
                  emissiveIntensity={0.5}
                  depthWrite={false}
                />
              </mesh>
            )}

            {/* Hit Box always raycastable */}
            <mesh position={[0, 0.4, 0]}>
              <boxGeometry args={[4.2, 2.6, 4.2]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* Floating 3D Block Badge Disc & Text Marker with Html */}
            <Html center position={[0, 2.4, 0]} pointerEvents="none">
              <div
                className={`px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-xl backdrop-blur-md flex items-center gap-1.5 border border-white/20 whitespace-nowrap transition-transform duration-200 ${
                  isHovered ? 'scale-125 ring-2 ring-white' : 'scale-100'
                }`}
                style={{ backgroundColor: `${badgeColor}ee` }}
              >
                <span>{blk.label}</span>
                <span className="text-[10px] opacity-90 font-normal">({statusText})</span>
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};

// ─── 6b. Block Row Labels for Level 3 (Block View) ───
const BlockRowLabels: React.FC<{
  currentBlock: ReturnType<typeof buildStadiumDrillDownData>['blocks'][0] | null;
  seats: StadiumSeatInstance[];
}> = ({ currentBlock, seats }) => {
  if (!currentBlock) return null;
  const blockSeats = useMemo(() => {
    return seats.filter((s) => s.blockId === currentBlock.id);
  }, [seats, currentBlock]);

  const byRow = useMemo(() => {
    const map = new Map<string, StadiumSeatInstance[]>();
    blockSeats.forEach((s) => {
      if (!map.has(s.row)) map.set(s.row, []);
      map.get(s.row)!.push(s);
    });
    return map;
  }, [blockSeats]);

  return (
    <group>
      {Array.from(byRow.entries()).map(([rowLetter, rSeats]) => {
        const firstSeat = rSeats[0];
        if (!firstSeat) return null;
        return (
          <Html
            key={`row-label-${rowLetter}`}
            position={[firstSeat.position[0], firstSeat.position[1] + 0.35, firstSeat.position[2]]}
            center
            pointerEvents="none"
          >
            <div className="px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-extrabold text-[10px] shadow-lg border border-amber-300">
              Row {rowLetter}
            </div>
          </Html>
        );
      })}
    </group>
  );
};

// ─── 6c. Instanced Seats Mesh with Dynamic Color & Transform Updates ───
const StadiumSeatsMesh: React.FC<{
  tier: 'lower' | 'upper';
  seatsData: StadiumSeatInstance[];
  seatGeometry: THREE.BufferGeometry;
  hoveredSeat: StadiumSeatInstance | null;
  selectedSeats: any[];
  soldKeys: string[];
  activeSeat: any;
  onPointerMove: (e: ThreeEvent<PointerEvent>, tier: 'lower' | 'upper') => void;
  onPointerOut: () => void;
  onClick: (e: ThreeEvent<MouseEvent>, tier: 'lower' | 'upper') => void;
}> = ({
  tier,
  seatsData,
  seatGeometry,
  hoveredSeat,
  selectedSeats,
  soldKeys,
  activeSeat,
  onPointerMove,
  onPointerOut,
  onClick,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Position and orient each seat towards the pitch center
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || seatsData.length === 0) return;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < seatsData.length; i++) {
      const s = seatsData[i];
      dummy.position.set(s.position[0], s.position[1], s.position[2]);
      dummy.lookAt(0, s.position[1], 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [seatsData]);

  // Dynamic coloring based on seat status
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || seatsData.length === 0) return;

    if (!mesh.instanceColor) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(
        new Float32Array(seatsData.length * 3),
        3
      );
    }

    const colSelected = new THREE.Color('#f59e0b');
    const colActive = new THREE.Color('#fbbf24');
    const colHover = new THREE.Color('#38bdf8');
    const colSold = new THREE.Color('#334155');

    const selectedKeys = new Set(
      selectedSeats.map((s) => `${s.row}-${s.number}`)
    );
    const soldSet = new Set(soldKeys);

    for (let i = 0; i < seatsData.length; i++) {
      const s = seatsData[i];
      const key = `${s.row}-${s.number}`;

      if (activeSeat && activeSeat.row === s.row && activeSeat.number === s.number) {
        mesh.setColorAt(i, colActive);
      } else if (selectedKeys.has(key)) {
        mesh.setColorAt(i, colSelected);
      } else if (
        hoveredSeat &&
        hoveredSeat.instanceId === s.instanceId &&
        hoveredSeat.tierType === s.tierType
      ) {
        mesh.setColorAt(i, colHover);
      } else if (soldSet.has(key)) {
        mesh.setColorAt(i, colSold);
      } else {
        mesh.setColorAt(i, s.baseColor);
      }
    }

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [seatsData, hoveredSeat, selectedSeats, soldKeys, activeSeat]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[seatGeometry, undefined, seatsData.length]}
      count={seatsData.length}
      frustumCulled={false}
      onPointerMove={(e) => onPointerMove(e, tier)}
      onPointerOut={onPointerOut}
      onClick={(e) => onClick(e, tier)}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial roughness={0.45} metalness={0.08} />
    </instancedMesh>
  );
};

// ─── 6b. Dynamic Stadium Lighting (Night Floodlights & Bright Daylight) ───
const StadiumLighting: React.FC<{ isEvening: boolean; isLiteMode: boolean }> = ({ isEvening, isLiteMode }) => {
  const pitchTarget = useMemo(() => {
    const obj = new THREE.Object3D();
    obj.position.set(0, 0, 0);
    return obj;
  }, []);

  return (
    <>
      <primitive object={pitchTarget} />
      {isEvening ? (
        <>
          {/* Warm stadium bowl ambient fill making stands & seat colors vibrant and readable */}
          <hemisphereLight
            args={['#788ea8', '#382f28', 1.22]}
          />

          {/* Central diffuse top fill */}
          <directionalLight
            position={[0, 85, 0]}
            intensity={1.25}
            color="#fff8ea"
          />

          {/* Diagonal stadium bounce fills for multi-floodlight ambient radiance */}
          <directionalLight
            position={[65, 45, 65]}
            intensity={0.55}
            color="#fed7aa"
          />
          <directionalLight
            position={[-65, 45, -65]}
            intensity={0.55}
            color="#fed7aa"
          />
          {/* Far stand warm fill: raises illumination on opposite (North/NW) stands so seats are vibrant & readable */}
          <directionalLight
            position={[10, 48, 70]}
            intensity={0.85}
            color="#ffedd5"
          />
        </>
      ) : (
        <>
          {/* Bright natural daytime illumination */}
          <hemisphereLight
            args={['#93c5fd', '#475569', 1.05]}
          />
          <directionalLight
            position={[65, 95, 45]}
            intensity={2.3}
            color="#fffbeb"
            castShadow={!isLiteMode}
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0003}
            shadow-camera-left={-120}
            shadow-camera-right={120}
            shadow-camera-top={120}
            shadow-camera-bottom={-120}
          />
          <directionalLight
            position={[-50, 60, -45]}
            intensity={0.75}
            color="#bfdbfe"
          />
        </>
      )}
    </>
  );
};

// ─── 7. Main StadiumMap3D Component ───
export const StadiumMap3D: React.FC<StadiumMap3DProps> = ({
  sections,
  onSelectSection,
}) => {
  const {
    stadiumLevel,
    setStadiumLevel,
    selectedStandId,
    selectedBlockId,
    selectStand,
    selectBlock,
    drillBack,
    activeSeat,
    flyToSeat,
    cameraMode,
    setCameraMode,
    selectedSeats,
    toggleSeat,
    getSoldSeatKeys,
    isLiteMode,
  } = useBookingStore();

  const soldKeys = useMemo(() => getSoldSeatKeys(), [getSoldSeatKeys]);

  const [hoveredStandId, setHoveredStandId] = useState<string | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [hoveredSeat, setHoveredSeat] = useState<StadiumSeatInstance | null>(null);
  const [lightingMode, setLightingMode] = useState<'evening' | 'day'>('evening');
  const isDebugUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('debug') === '1';
    }
    return false;
  }, []);

  const [showBeamAxes, setShowBeamAxes] = useState(() => isDebugUrl);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      if (p.get('debug') === '1') {
        setShowBeamAxes(true);
      }
    }
  }, []);
  const [customCamera, setCustomCamera] = useState<{
    pos: [number, number, number];
    lookAt: [number, number, number];
    fov: number;
    instant?: boolean;
  } | null>(null);

  // Filter state
  const [filterMaxPrice, setFilterMaxPrice] = useState<number | undefined>(undefined);
  const [filterCount, setFilterCount] = useState<number>(2);
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Generate 16 stands, blocks, and seats
  const {
    stands,
    blocks,
    standsMap,
    blocksMap,
    lowerSeatsData,
    upperSeatsData,
  } = useMemo(() => {
    return buildStadiumDrillDownData(sections, soldKeys);
  }, [sections, soldKeys]);

  const allSeats = useMemo(() => {
    return [...lowerSeatsData, ...upperSeatsData];
  }, [lowerSeatsData, upperSeatsData]);

  // Hook for testing & console access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__STADIUM_DRILL__ = {
        stands,
        blocks,
        allSeats,
        stadiumLevel,
        selectedStandId,
        selectedBlockId,
        selectStand,
        selectBlock,
        setStadiumLevel,
        setHoveredStandId,
        setHoveredBlockId,
        lightingMode,
        setLightingMode,
        setCustomCamera,
        showBeamAxes,
        setShowBeamAxes,
        toggleBeamAxes: () => setShowBeamAxes((prev) => !prev),
      };
    }
  }, [stands, blocks, allSeats, stadiumLevel, selectedStandId, selectedBlockId, lightingMode, showBeamAxes]);

  // Determine Camera Rig Position & Target according to 4 Drill Levels
  const { targetPos, targetLookAt, targetFov } = useMemo(() => {
    if (customCamera) {
      return {
        targetPos: customCamera.pos,
        targetLookAt: customCamera.lookAt,
        targetFov: customCamera.fov,
      };
    }

    if (stadiumLevel === 'seat' && activeSeat) {
      return {
        targetPos: activeSeat.cameraPosition,
        targetLookAt: activeSeat.cameraTarget,
        targetFov: 54,
      };
    }

    if (stadiumLevel === 'block' && selectedBlockId) {
      const blk = blocksMap.get(selectedBlockId);
      if (blk) {
        return {
          targetPos: blk.blockCameraPos,
          targetLookAt: blk.blockCameraTarget,
          targetFov: 38,
        };
      }
    }

    if (stadiumLevel === 'stand' && selectedStandId) {
      const st = standsMap.get(selectedStandId);
      if (st) {
        return {
          targetPos: st.cameraPos,
          targetLookAt: st.cameraTarget,
          targetFov: 42,
        };
      }
    }

    // Level 1: Overview Aerial 3/4 (Framing entire stadium and all 6 floodlight towers cleanly with visible bases)
    return {
      targetPos: [66, 62, 128] as [number, number, number],
      targetLookAt: [0, 2.5, 0] as [number, number, number],
      targetFov: 46,
    };
  }, [stadiumLevel, activeSeat, selectedBlockId, selectedStandId, blocksMap, standsMap, customCamera]);

  // Seat Geometry
  const seatGeometry = useMemo(() => {
    const cushion = new THREE.BoxGeometry(0.44, 0.08, 0.36);
    cushion.translate(0, 0.04, 0.06);

    const backrest = new THREE.BoxGeometry(0.44, 0.38, 0.06);
    backrest.rotateX(0.08);
    backrest.translate(0, 0.23, -0.10);

    const stanchion = new THREE.BoxGeometry(0.08, 0.14, 0.22);
    stanchion.translate(0, -0.04, -0.02);

    return mergeGeometries([cushion, backrest, stanchion]);
  }, []);

  // Raycasting on seats is only enabled in 'block' and 'seat' levels
  const isSeatInteractionActive = stadiumLevel === 'block' || stadiumLevel === 'seat';

  const handlePointerMoveSeat = (e: ThreeEvent<PointerEvent>, tier: 'lower' | 'upper') => {
    if (!isSeatInteractionActive) return;
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      const data = tier === 'lower' ? lowerSeatsData : upperSeatsData;
      if (e.instanceId < data.length) {
        const seat = data[e.instanceId];
        // Only hover if seat belongs to currently selected block
        if (stadiumLevel === 'block' && selectedBlockId && seat.blockId !== selectedBlockId) {
          return;
        }
        setHoveredSeat(seat);
      }
    }
  };

  const handlePointerOutSeat = () => {
    setHoveredSeat(null);
  };

  const handleSeatClick = (e: ThreeEvent<MouseEvent>, tier: 'lower' | 'upper') => {
    if (!isSeatInteractionActive) return;
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      const data = tier === 'lower' ? lowerSeatsData : upperSeatsData;
      if (e.instanceId < data.length) {
        const seat = data[e.instanceId];
        if (stadiumLevel === 'block' && selectedBlockId && seat.blockId !== selectedBlockId) {
          return;
        }
        const seatKey = `${seat.row}-${seat.number}`;
        if (soldKeys.includes(seatKey)) return;

        const eyePos: [number, number, number] = [
          seat.position[0],
          seat.position[1] + 1.2,
          seat.position[2],
        ];
        const targetLook: [number, number, number] = [0, 0.4, 0];

        flyToSeat({
          sectionId: seat.sectionId,
          sectionName: seat.sectionName,
          row: seat.row,
          number: seat.number,
          priceNPR: seat.priceNPR,
          tier: seat.tier,
          cameraPosition: eyePos,
          cameraTarget: targetLook,
          blockId: seat.blockId,
          blockLabel: seat.blockLabel,
          standId: seat.standId,
        });

        if (onSelectSection) onSelectSection(seat.sectionId);
      }
    }
  };

  // Best Available action
  const handleBestAvailable = () => {
    const best = findBestAdjacentSeats(
      allSeats,
      soldKeys,
      selectedSeats,
      filterCount,
      filterMaxPrice
    );
    if (!best || best.length === 0) {
      alert('No seats matching filter criteria available. Try adjusting price or quantity.');
      return;
    }

    // Add all to cart
    best.forEach((seat) => {
      toggleSeat({
        sectionId: seat.sectionId,
        row: seat.row,
        number: seat.number,
        priceNPR: seat.priceNPR,
        tier: seat.tier,
        blockId: seat.blockId,
        blockLabel: seat.blockLabel,
      });
    });

    // Fly straight into the first seat
    const firstSeat = best[0];
    selectStand(firstSeat.standId);
    selectBlock(firstSeat.blockId);
    flyToSeat({
      sectionId: firstSeat.sectionId,
      sectionName: firstSeat.sectionName,
      row: firstSeat.row,
      number: firstSeat.number,
      priceNPR: firstSeat.priceNPR,
      tier: firstSeat.tier,
      cameraPosition: [firstSeat.position[0], firstSeat.position[1] + 1.2, firstSeat.position[2]],
      cameraTarget: [0, 0.4, 0],
      blockId: firstSeat.blockId,
      blockLabel: firstSeat.blockLabel,
      standId: firstSeat.standId,
    });
  };

  // Current Stand and Block objects
  const currentStand = selectedStandId ? standsMap.get(selectedStandId) : null;
  const currentBlock = selectedBlockId ? blocksMap.get(selectedBlockId) : null;
  const hoveredStand = hoveredStandId ? standsMap.get(hoveredStandId) : null;
  const hoveredBlock = hoveredBlockId ? blocksMap.get(hoveredBlockId) : null;

  const isEvening = lightingMode === 'evening';

  return (
    <div className="w-full h-full relative select-none">
      {/* Subtle vignette overlay to draw the eye to the pitch in evening mode */}
      {isEvening && (
        <div className="pointer-events-none absolute inset-0 z-20 shadow-[inset_0_0_120px_rgba(2,6,18,0.65)]" />
      )}
      <Canvas
        camera={{ position: [70, 56, 96], fov: 46, near: 0.5, far: 2000 }}
        className="w-full h-full"
        gl={{
          antialias: true,
          alpha: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isEvening ? 1.14 : 1.05,
        }}
        shadows={!isLiteMode}
      >
        <color attach="background" args={[isEvening ? '#060913' : '#87ceeb']} />
        {!isLiteMode && (
          <fog attach="fog" args={[isEvening ? '#0d1322' : '#bae6fd', 140, 780]} />
        )}

        {/* Dynamic Stadium Lighting (Floodlights / Bright Daylight) */}
        <StadiumLighting isEvening={isEvening} isLiteMode={isLiteMode} />

        {/* Camera Rig with smooth transitions between levels */}
        <StadiumCameraRig
          targetPos={targetPos}
          targetLookAt={targetLookAt}
          fov={targetFov}
          drillLevel={customCamera ? 'stand' : stadiumLevel}
          instant={customCamera?.instant}
          onArrival={() => {
            if (stadiumLevel === 'seat' && activeSeat && cameraMode === 'flying') {
              setCameraMode('seatview');
            }
          }}
        />

        {/* Head look-around when in seat view */}
        {stadiumLevel === 'seat' && activeSeat && (
          <SeatViewHeadControls
            enabled={cameraMode === 'seatview'}
            baseLookAt={activeSeat.cameraTarget}
            seatPos={activeSeat.cameraPosition}
            seatKey={`${activeSeat.sectionId}-${activeSeat.row}-${activeSeat.number}`}
          />
        )}

        {/* 0. Sky & Terrain */}
        <ProceduralSkyAndTerrain isEvening={isEvening} />

        {/* 1. Field & Pitch */}
        <ProceduralCricketField isEvening={isEvening} />

        {/* 1b. Boundary Sponsor Boards */}
        <ProceduralSponsorBoards isLiteMode={isLiteMode} isEvening={isEvening} />

        {/* 2. Stepped Concrete Bowl */}
        <ProceduralStadiumBowl isEvening={isEvening} />

        {/* 3. Details: Canopy, Pavilion, 6 Floodlights, Scoreboard */}
        <ProceduralStadiumDetails
          isEvening={isEvening}
          stadiumLevel={stadiumLevel}
          showBeamAxes={showBeamAxes}
          isLiteMode={isLiteMode}
        />

        {/* 4. Crowd Spectators on Sold Seats */}
        {!isLiteMode && (
          <>
            <CrowdSpectators seatsData={lowerSeatsData} soldKeys={soldKeys} />
            <CrowdSpectators seatsData={upperSeatsData} soldKeys={soldKeys} />
          </>
        )}

        {/* LEVEL 1: Stand Hit Volumes (only active in 'overview' level) */}
        {stadiumLevel === 'overview' && (
          <StandHitVolumes
            stands={stands}
            hoveredStandId={hoveredStandId}
            onHoverStand={setHoveredStandId}
            onSelectStand={(standId) => {
              selectStand(standId);
            }}
          />
        )}

        {/* LEVEL 2: Block Hit Volumes & Badges (only active in 'stand' level) */}
        {stadiumLevel === 'stand' && (
          <BlockHitVolumes
            blocks={blocks}
            selectedStandId={selectedStandId}
            hoveredBlockId={hoveredBlockId}
            onHoverBlock={setHoveredBlockId}
            onSelectBlock={(blockId) => {
              selectBlock(blockId);
            }}
          />
        )}

        {/* LEVEL 3: Block Row Labels (only active in 'block' level) */}
        {stadiumLevel === 'block' && currentBlock && (
          <BlockRowLabels currentBlock={currentBlock} seats={allSeats} />
        )}

        {/* Lower Tier Seats InstancedMesh */}
        <StadiumSeatsMesh
          tier="lower"
          seatsData={lowerSeatsData}
          seatGeometry={seatGeometry}
          hoveredSeat={hoveredSeat}
          selectedSeats={selectedSeats}
          soldKeys={soldKeys}
          activeSeat={activeSeat}
          onPointerMove={handlePointerMoveSeat}
          onPointerOut={handlePointerOutSeat}
          onClick={handleSeatClick}
        />

        {/* Upper Tier Seats InstancedMesh */}
        <StadiumSeatsMesh
          tier="upper"
          seatsData={upperSeatsData}
          seatGeometry={seatGeometry}
          hoveredSeat={hoveredSeat}
          selectedSeats={selectedSeats}
          soldKeys={soldKeys}
          activeSeat={activeSeat}
          onPointerMove={handlePointerMoveSeat}
          onPointerOut={handlePointerOutSeat}
          onClick={handleSeatClick}
        />
      </Canvas>

      {/* ─── BREADCRUMB & TOP CONTROLS ─── */}
      <div className="absolute top-3 left-[56px] sm:left-[176px] right-2 sm:right-5 z-30 pointer-events-none flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Breadcrumb Navigation Pill */}
        <nav
          aria-label="Breadcrumb"
          className="pointer-events-auto glass-panel px-2.5 sm:px-3 py-1.5 rounded-full flex items-center gap-1 sm:gap-1.5 text-xs text-white/90 shadow-2xl border border-white/15 backdrop-blur-xl shrink overflow-x-auto no-scrollbar whitespace-nowrap max-w-[60%] sm:max-w-none"
        >
          {stadiumLevel !== 'overview' && (
            <button
              onClick={drillBack}
              className="p-1 -ml-0.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-all flex items-center justify-center mr-0.5 sm:mr-1"
              title="Go back one level"
              aria-label="Go back one level"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Level 1: Stadium */}
          <button
            onClick={() => {
              selectStand(null);
              setStadiumLevel('overview');
            }}
            className={`font-semibold transition-colors hover:text-white ${
              stadiumLevel === 'overview' ? 'text-primary font-bold' : 'text-white/60'
            }`}
          >
            Stadium
          </button>

          {/* Level 2: Stand */}
          {currentStand && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
              <button
                onClick={() => {
                  selectBlock(null);
                  setStadiumLevel('stand');
                }}
                className={`font-semibold transition-colors hover:text-white truncate max-w-[100px] sm:max-w-none ${
                  stadiumLevel === 'stand' ? 'text-primary font-bold' : 'text-white/60'
                }`}
              >
                {currentStand.nameEn}
              </button>
            </>
          )}

          {/* Level 3: Block */}
          {currentBlock && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
              <button
                onClick={() => {
                  setStadiumLevel('block');
                }}
                className={`font-semibold transition-colors hover:text-white ${
                  stadiumLevel === 'block' ? 'text-primary font-bold' : 'text-white/60'
                }`}
              >
                Block {currentBlock.label}
              </button>
            </>
          )}

          {/* Level 4: Seat */}
          {stadiumLevel === 'seat' && activeSeat && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
              <span className="text-amber-400 font-bold whitespace-nowrap">
                Row {activeSeat.row} #{activeSeat.number}
              </span>
            </>
          )}
        </nav>

        {/* Right Toolbar: Hidden in Seat View so top-right seat info pill is completely unobstructed */}
        {stadiumLevel !== 'seat' && (
          <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* "Best Available" Quick Pick Button */}
            <button
              onClick={handleBestAvailable}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-1 sm:gap-1.5"
              title="Automatically pick best available seats"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Best available</span>
              <span className="sm:hidden text-[11px]">Best</span>
            </button>

            {/* Filter Popover Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                className={`p-2 rounded-full border backdrop-blur-xl transition-all shadow-lg active:scale-95 flex items-center justify-center ${
                  filterMaxPrice
                    ? 'bg-primary text-white border-primary shadow-primary/30'
                    : 'bg-[#060810]/70 hover:bg-[#060810]/95 text-white/70 hover:text-white border-white/15'
                }`}
                title="Price & Quantity Filter"
                aria-label="Filter seats"
              >
                <Filter className="w-3.5 h-3.5" />
              </button>

              {showFilterPopover && (
                <div
                  className="absolute right-0 top-10 w-64 p-3.5 rounded-2xl bg-[#060810]/95 backdrop-blur-2xl border border-white/20 shadow-2xl text-xs text-white z-50 animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="font-bold mb-2 flex items-center justify-between text-white/90">
                    <span>Filter Seats</span>
                    <button
                      onClick={() => {
                        setFilterMaxPrice(undefined);
                        setFilterCount(2);
                      }}
                      className="text-[10px] text-muted hover:text-white"
                    >
                      Reset
                    </button>
                  </p>

                  {/* Seats Count */}
                  <div className="mb-3">
                    <label className="text-[11px] text-muted block mb-1">Seats Quantity</label>
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((cnt) => (
                        <button
                          key={cnt}
                          onClick={() => setFilterCount(cnt)}
                          className={`py-1 rounded-lg text-xs font-semibold border transition-all ${
                            filterCount === cnt
                              ? 'bg-primary border-primary text-white'
                              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                          }`}
                        >
                          {cnt} {cnt === 1 ? 'seat' : 'seats'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Max Price */}
                  <div>
                    <label className="text-[11px] text-muted block mb-1">Max Price (NPR)</label>
                    <div className="space-y-1">
                      {[
                        { label: 'All Prices', val: undefined },
                        { label: 'Under NPR 700', val: 700 },
                        { label: 'Under NPR 1,200', val: 1200 },
                        { label: 'Under NPR 1,500', val: 1500 },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => {
                            setFilterMaxPrice(opt.val);
                            setShowFilterPopover(false);
                          }}
                          className={`w-full py-1.5 px-2.5 rounded-lg text-left text-xs flex items-center justify-between border transition-all ${
                            filterMaxPrice === opt.val
                              ? 'bg-primary/20 border-primary text-white font-semibold'
                              : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {filterMaxPrice === opt.val && <Check className="w-3.5 h-3.5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Toggle for Floodlight Beam Axes - only visible when ?debug=1 is in URL */}
            {isDebugUrl && (
              <button
                onClick={() => setShowBeamAxes(!showBeamAxes)}
                className={`p-2 rounded-full border backdrop-blur-xl transition-all shadow-lg active:scale-95 flex items-center justify-center ${
                  showBeamAxes
                    ? 'bg-sky-500 text-white border-sky-400 shadow-sky-500/30'
                    : 'bg-[#060810]/70 hover:bg-[#060810]/95 text-white/70 hover:text-white border-white/15'
                }`}
                title="Floodlight beam guide axes (visual alignment)"
                aria-label="Floodlight beam guide axes"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Day / Evening Mode Toggle */}
            <button
              onClick={() => setLightingMode(isEvening ? 'day' : 'evening')}
              className="p-2 rounded-full bg-[#060810]/70 hover:bg-[#060810]/95 backdrop-blur-xl border border-white/15 text-white/70 hover:text-white transition-all shadow-lg active:scale-95 flex items-center justify-center"
              title="Toggle Day / Evening Lighting"
              aria-label="Toggle Lighting"
            >
              {isEvening ? <Moon className="w-3.5 h-3.5 text-amber-300" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
            </button>
          </div>
        )}
      </div>

      {/* ─── LEVEL 1 HOVER TOOLTIP (Overview Aerial: Stand info) ─── */}
      {stadiumLevel === 'overview' && hoveredStand && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-fadeIn">
          <div className="glass-panel-glow px-4 py-2.5 rounded-2xl flex items-center gap-3 text-xs shadow-2xl border border-sky-400/30">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-md border border-white/20"
              style={{ backgroundColor: hoveredStand.color }}
            />
            <div>
              <p className="font-bold text-white text-xs sm:text-sm">
                {hoveredStand.nameEn}
              </p>
              <p className="text-[11px] text-muted">
                {hoveredStand.blocks.length} Blocks • {hoveredStand.tierType.toUpperCase()} TIER
              </p>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="text-right">
              <span className="text-emerald-400 font-bold text-xs sm:text-sm">
                NPR {hoveredStand.priceNPR}
              </span>
              <p className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold">
                Click to explore stand
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── LEVEL 2 HOVER TOOLTIP (Stand View: Block info) ─── */}
      {stadiumLevel === 'stand' && hoveredBlock && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-fadeIn">
          <div className="glass-panel-glow px-4 py-2.5 rounded-2xl flex items-center gap-3 text-xs shadow-2xl border border-amber-400/40">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold text-xs">
              {hoveredBlock.label}
            </div>
            <div>
              <p className="font-bold text-white text-xs sm:text-sm">
                Block {hoveredBlock.label}
              </p>
              <p className="text-[11px] text-muted">
                Rows {hoveredBlock.rowStart}–{hoveredBlock.rowEnd} • {hoveredBlock.availableSeats} / {hoveredBlock.totalSeats} seats left
              </p>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="text-right">
              <span className="text-emerald-400 font-bold text-xs sm:text-sm">
                NPR {hoveredBlock.priceNPR}
              </span>
              <p className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold">
                Click to view seats
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── LEVEL 3 HOVER TOOLTIP (Block View: Seat info) ─── */}
      {stadiumLevel === 'block' && hoveredSeat && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-fadeIn">
          <div className="glass-panel-glow px-4 py-2.5 rounded-2xl flex items-center gap-3 text-xs shadow-2xl border border-primary/40">
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-md border border-white/20"
              style={{ backgroundColor: `#${hoveredSeat.baseColor.getHexString()}` }}
            />
            <div>
              <p className="font-bold text-white text-xs sm:text-sm">
                Row {hoveredSeat.row} · Seat #{hoveredSeat.number}
              </p>
              <p className="text-[11px] text-muted">
                Block {hoveredSeat.blockLabel} • {hoveredSeat.standName}
              </p>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="text-right">
              <span className="text-emerald-400 font-bold text-xs sm:text-sm">
                NPR {hoveredSeat.priceNPR}
              </span>
              <p className="text-[9px] text-sky-400 uppercase tracking-wider font-semibold">
                Click to view pitch perspective
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── LEVEL 3 ON-SCREEN GUIDE IN BLOCK VIEW ─── */}
      {stadiumLevel === 'block' && currentBlock && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center">
          <div className="px-3.5 py-1 rounded-full bg-[#060810]/75 backdrop-blur-md border border-white/15 text-[11px] text-white/80 shadow-md">
            Facing Block <strong className="text-amber-400">{currentBlock.label}</strong> • Click any seat to see pitch view & book
          </div>
        </div>
      )}
    </div>
  );
};
