import React, { useRef, useMemo, useState, useEffect, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
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
const ProceduralDayClouds: React.FC<{ isEvening: boolean }> = ({ isEvening }) => {
  const cloudsGroupRef = useRef<THREE.Group>(null);

  // Soft Cumulus Cloud Puff Texture with natural billowy crests & shaded base
  const cloudTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Soft cumulus lobe cluster
      const puffs = [
        // Flatter, slightly shaded base
        { x: 256, y: 310, rx: 170, ry: 55, r: 120, a: 0.35, shade: 'rgba(220, 228, 238, ' },
        { x: 180, y: 300, rx: 130, ry: 50, r: 90, a: 0.32, shade: 'rgba(222, 230, 240, ' },
        { x: 330, y: 305, rx: 140, ry: 52, r: 95, a: 0.32, shade: 'rgba(222, 230, 240, ' },
        // Middle body
        { x: 256, y: 250, rx: 140, ry: 75, r: 115, a: 0.45, shade: 'rgba(242, 247, 252, ' },
        { x: 170, y: 260, rx: 110, ry: 65, r: 95, a: 0.42, shade: 'rgba(240, 245, 250, ' },
        { x: 340, y: 255, rx: 115, ry: 65, r: 98, a: 0.42, shade: 'rgba(240, 245, 250, ' },
        // Upper billowy cumulus domes (bright white)
        { x: 256, y: 180, rx: 105, ry: 80, r: 100, a: 0.65, shade: 'rgba(255, 255, 255, ' },
        { x: 195, y: 200, rx: 85, ry: 70, r: 85, a: 0.58, shade: 'rgba(255, 255, 255, ' },
        { x: 315, y: 195, rx: 90, ry: 70, r: 88, a: 0.58, shade: 'rgba(255, 255, 255, ' },
        { x: 135, y: 235, rx: 65, ry: 50, r: 65, a: 0.40, shade: 'rgba(252, 254, 255, ' },
        { x: 375, y: 230, rx: 70, ry: 50, r: 68, a: 0.40, shade: 'rgba(252, 254, 255, ' },
      ];

      puffs.forEach((p) => {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0.00, `${p.shade}${p.a})`);
        g.addColorStop(0.50, `${p.shade}${(p.a * 0.72).toFixed(2)})`);
        g.addColorStop(0.82, `${p.shade}${(p.a * 0.22).toFixed(2)})`);
        g.addColorStop(1.00, `${p.shade}0.0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    const t = new THREE.CanvasTexture(canvas);
    t.generateMipmaps = true;
    return t;
  }, []);

  const cloudMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: isEvening ? 0.0 : 0.85,
      depthWrite: false,
    });
  }, [cloudTexture, isEvening]);

  // A few soft cumulus cloud clusters drifting slowly across the sky
  const cloudPuffs = useMemo(() => {
    const arr: Array<{ pos: [number, number, number]; scale: [number, number, number]; rotZ: number }> = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Math.sin(i * 2.9) * 0.35;
      const rad = 200 + (Math.sin(i * 5.3) * 0.5 + 0.5) * 160;
      const y = 195 + (Math.cos(i * 3.7) * 0.5 + 0.5) * 45;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad;
      const s = 110 + (Math.sin(i * 4.1) * 0.5 + 0.5) * 65;
      arr.push({
        pos: [x, y, z],
        scale: [s * 1.8, s * 1.05, 1],
        rotZ: ang * 0.15 + (i * 0.2),
      });
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Drifts very slowly across the sky; strictly respects prefers-reduced-motion
    if (!prefersReducedMotion && cloudsGroupRef.current) {
      cloudsGroupRef.current.rotation.y += delta * 0.0006;
    }

    const targetOpacity = isEvening ? 0.0 : 0.85;
    cloudMaterial.opacity = THREE.MathUtils.damp(cloudMaterial.opacity, targetOpacity, 3.2, delta);
    cloudMaterial.visible = cloudMaterial.opacity > 0.01;
  });

  return (
    <group ref={cloudsGroupRef}>
      {cloudPuffs.map((c, idx) => (
        <mesh key={`cloud-${idx}`} position={c.pos} rotation={[-Math.PI / 2, 0, c.rotZ]} scale={c.scale}>
          <planeGeometry args={[1, 1]} />
          <primitive object={cloudMaterial} attach="material" />
        </mesh>
      ))}
    </group>
  );
};

const ProceduralSkyAndTerrain: React.FC<{ isEvening: boolean }> = ({ isEvening }) => {
  // 1. Night Sky Texture
  const nightSkyTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 1024);
      grad.addColorStop(0.00, '#010206');
      grad.addColorStop(0.35, '#02040a');
      grad.addColorStop(0.46, '#040712');
      grad.addColorStop(0.505, '#070c1a');
      grad.addColorStop(0.53, '#04060c');
      grad.addColorStop(1.00, '#010103');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 1024);

      for (let s = 0; s < 220; s++) {
        const sx = (Math.sin(s * 91.3 + 12.7) * 0.5 + 0.5) * 1024;
        const sy = (Math.cos(s * 73.1 + 8.4) * 0.5 + 0.5) * 700;
        const sr = 0.5 + (Math.sin(s * 33.7) * 0.5 + 0.5) * 1.1;
        const sa = 0.25 + (Math.cos(s * 51.9) * 0.5 + 0.5) * 0.65;
        ctx.fillStyle = `rgba(255, 255, 255, ${sa.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  // 2. Day Sky Texture: Clear blue at top to warm, paler tone at horizon
  const daySkyTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 1024);
      grad.addColorStop(0.00, '#1c5ac2'); // Rich clear sky blue at zenith
      grad.addColorStop(0.18, '#3288ec'); // Vibrant sky blue
      grad.addColorStop(0.34, '#6ebcf8'); // Light clear azure
      grad.addColorStop(0.44, '#bae6fd'); // Pale sky
      grad.addColorStop(0.485, '#e0f2fe'); // Pale horizon transition
      grad.addColorStop(0.50, '#fff7ed'); // Warm pale golden-white horizon line
      grad.addColorStop(0.525, '#96b8d2'); // Soft atmospheric haze at ground level
      grad.addColorStop(1.00, '#799db8'); // Lower terrain base
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 1024);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  const nightSkyMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: nightSkyTexture,
      side: THREE.BackSide,
      depthWrite: false,
      transparent: true,
      opacity: isEvening ? 1.0 : 0.0,
    });
  }, [nightSkyTexture, isEvening]);

  const daySkyMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: daySkyTexture,
      side: THREE.BackSide,
      depthWrite: false,
      transparent: true,
      opacity: isEvening ? 0.0 : 1.0,
    });
  }, [daySkyTexture, isEvening]);

  // Round soft glowing sprite texture for distant hill settlement lights in evening
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

  // Night Hills Geometry (Single ring, dark near-black tones)
  const nightHillsGeometry = useMemo(() => {
    const N = 80;
    const R = 270;
    const positions: number[] = [];
    const colors: number[] = [];

    const baseCol = [0.012, 0.015, 0.022];
    const peakCol = [0.018, 0.024, 0.035];

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
  }, []);

  // Day Hills Geometry: Layered 3D Sloped Mountain Ridges with Atmospheric Haze (lighter & bluer with distance)
  const dayHillsGeometry = useMemo(() => {
    const N = 140;
    const positions: number[] = [];
    const colors: number[] = [];

    // Ridge 1: Mid-distance rolling Himalayan foothills
    // Front foot at R=255m, Crest at R=280m (height 12-26m), Back foot at R=315m
    const r1Base = [0.24, 0.36, 0.28]; // valley greenery
    const r1Peak = [0.38, 0.52, 0.42]; // sunlit grassy crest

    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * Math.PI * 2;
      const t1 = ((i + 1) / N) * Math.PI * 2;

      const h0 = 13 + Math.sin(t0 * 3.4) * 6.2 + Math.cos(t0 * 7.1) * 3.8 + Math.sin(t0 * 11.2) * 2.2;
      const h1 = 13 + Math.sin(t1 * 3.4) * 6.2 + Math.cos(t1 * 7.1) * 3.8 + Math.sin(t1 * 11.2) * 2.2;

      const cos0 = Math.cos(t0), sin0 = Math.sin(t0);
      const cos1 = Math.cos(t1), sin1 = Math.sin(t1);

      // Front slope (facing stadium and sun)
      const xF0 = 255 * cos0, zF0 = 255 * sin0;
      const xF1 = 255 * cos1, zF1 = 255 * sin1;
      const xP0 = 280 * cos0, zP0 = 280 * sin0;
      const xP1 = 280 * cos1, zP1 = 280 * sin1;

      positions.push(
        xF0, -3, zF0,
        xF1, -3, zF1,
        xP1, h1, zP1,
        xF0, -3, zF0,
        xP1, h1, zP1,
        xP0, h0, zP0
      );
      colors.push(
        ...r1Base, ...r1Base, ...r1Peak,
        ...r1Base, ...r1Peak, ...r1Peak
      );

      // Back slope (falling away into valley)
      const xB0 = 315 * cos0, zB0 = 315 * sin0;
      const xB1 = 315 * cos1, zB1 = 315 * sin1;
      positions.push(
        xP0, h0, zP0,
        xP1, h1, zP1,
        xB1, -1, zB1,
        xP0, h0, zP0,
        xB1, -1, zB1,
        xB0, -1, zB0
      );
      colors.push(
        ...r1Peak, ...r1Peak, ...r1Base,
        ...r1Peak, ...r1Base, ...r1Base
      );
    }

    // Ridge 2: Distant mountains with atmospheric haze (lighter and bluer with distance)
    // Front foot at R=330m, Crest at R=365m (height 32-68m), Back foot at R=410m
    const r2Base = [0.46, 0.59, 0.72]; // atmospheric valley haze
    const r2Peak = [0.65, 0.78, 0.90]; // pale blue mountain peak merging into horizon sky

    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * Math.PI * 2;
      const t1 = ((i + 1) / N) * Math.PI * 2;

      const h0 = 32 + Math.sin(t0 * 2.2 + 1.2) * 16 + Math.cos(t0 * 4.8 + 0.5) * 10 + Math.sin(t0 * 9.1) * 5.0;
      const h1 = 32 + Math.sin(t1 * 2.2 + 1.2) * 16 + Math.cos(t1 * 4.8 + 0.5) * 10 + Math.sin(t1 * 9.1) * 5.0;

      const cos0 = Math.cos(t0), sin0 = Math.sin(t0);
      const cos1 = Math.cos(t1), sin1 = Math.sin(t1);

      // Front slope
      const xF0 = 330 * cos0, zF0 = 330 * sin0;
      const xF1 = 330 * cos1, zF1 = 330 * sin1;
      const xP0 = 365 * cos0, zP0 = 365 * sin0;
      const xP1 = 365 * cos1, zP1 = 365 * sin1;

      positions.push(
        xF0, -5, zF0,
        xF1, -5, zF1,
        xP1, h1, zP1,
        xF0, -5, zF0,
        xP1, h1, zP1,
        xP0, h0, zP0
      );
      colors.push(
        ...r2Base, ...r2Base, ...r2Peak,
        ...r2Base, ...r2Peak, ...r2Peak
      );

      // Back slope
      const xB0 = 410 * cos0, zB0 = 410 * sin0;
      const xB1 = 410 * cos1, zB1 = 410 * sin1;
      positions.push(
        xP0, h0, zP0,
        xP1, h1, zP1,
        xB1, -3, zB1,
        xP0, h0, zP0,
        xB1, -3, zB1,
        xB0, -3, zB0
      );
      colors.push(
        ...r2Peak, ...r2Peak, ...r2Base,
        ...r2Peak, ...r2Base, ...r2Base
      );
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    return geom;
  }, []);

  const nightHillsMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: isEvening ? 1.0 : 0.0,
    });
  }, [isEvening]);

  const dayHillsMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: isEvening ? 0.0 : 1.0,
    });
  }, [isEvening]);

  // Distant Kathmandu & Kirtipur valley city lights in evening mode
  const cityLightsData = useMemo(() => {
    const count = 65;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const R = 265;

    const palette = [
      [1.0, 0.98, 0.92],
      [1.0, 0.94, 0.82],
      [0.98, 0.78, 0.45],
      [0.95, 0.60, 0.20],
    ];

    for (let i = 0; i < count; i++) {
      const clusterAngle = ((i % 12) / 12) * Math.PI * 2 + Math.sin(i * 3.7) * 0.2;
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
  }, []);

  const cityLightsMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      map: roundDotTexture,
      size: 3.8,
      vertexColors: true,
      transparent: true,
      opacity: isEvening ? 0.88 : 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [roundDotTexture, isEvening]);

  // Smooth ~1-second cross-fade between Day and Night sky/terrain
  useFrame((_, delta) => {
    const targetDay = isEvening ? 0.0 : 1.0;
    const targetNight = isEvening ? 1.0 : 0.0;

    daySkyMaterial.opacity = THREE.MathUtils.damp(daySkyMaterial.opacity, targetDay, 3.2, delta);
    daySkyMaterial.visible = daySkyMaterial.opacity > 0.01;

    nightSkyMaterial.opacity = THREE.MathUtils.damp(nightSkyMaterial.opacity, targetNight, 3.2, delta);
    nightSkyMaterial.visible = nightSkyMaterial.opacity > 0.01;

    dayHillsMaterial.opacity = THREE.MathUtils.damp(dayHillsMaterial.opacity, targetDay, 3.2, delta);
    dayHillsMaterial.visible = dayHillsMaterial.opacity > 0.01;

    nightHillsMaterial.opacity = THREE.MathUtils.damp(nightHillsMaterial.opacity, targetNight, 3.2, delta);
    nightHillsMaterial.visible = nightHillsMaterial.opacity > 0.01;

    cityLightsMaterial.opacity = THREE.MathUtils.damp(cityLightsMaterial.opacity, isEvening ? 0.88 : 0.0, 3.2, delta);
    cityLightsMaterial.visible = cityLightsMaterial.opacity > 0.01;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Night Sky Dome */}
      <mesh position={[0, -20, 0]}>
        <sphereGeometry args={[700, 32, 16]} />
        <primitive object={nightSkyMaterial} attach="material" />
      </mesh>

      {/* Day Sky Dome */}
      <mesh position={[0, -20, 0]}>
        <sphereGeometry args={[700, 32, 16]} />
        <primitive object={daySkyMaterial} attach="material" />
      </mesh>

      {/* Soft Drifting Cumulus Clouds in Day Mode */}
      <ProceduralDayClouds isEvening={isEvening} />

      {/* Distant Terrain: Layered Ridges with Atmospheric Haze in Day, Deep Silhouette in Night */}
      <mesh geometry={nightHillsGeometry}>
        <primitive object={nightHillsMaterial} attach="material" />
      </mesh>
      <mesh geometry={dayHillsGeometry}>
        <primitive object={dayHillsMaterial} attach="material" />
      </mesh>

      {/* Kathmandu Valley Night Settlement Lights */}
      {cityLightsData && (
        <points geometry={cityLightsData}>
          <primitive object={cityLightsMaterial} attach="material" />
        </points>
      )}
    </group>
  );
};

// ─── 1. Field & Pitch with Saturated Warm Night Turf & Floodlight Illumination Pool ───
const ProceduralCricketField: React.FC<{ isEvening: boolean }> = ({ isEvening }) => {
  const softGroundTexture = useMemo(() => {
    if (isEvening) {
      // In evening mode: deep near-black ground (100% untouched)
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
        grad.addColorStop(0.0, '#04060b');
        grad.addColorStop(0.40, '#030408');
        grad.addColorStop(0.70, '#020205');
        grad.addColorStop(1.0, '#010103');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      }
      const tex = new THREE.CanvasTexture(canvas);
      return tex;
    }

    // In day mode: Believable natural valley surface
    // 1. Concrete apron: irregular, warmer grey surface (about #9a9a96) with access paths,
    //    simple car park area, grass and dirt creeping in at edges, subtle cracks/noise (no hard circular edge).
    // 2. Shadow under outer wall: soft, light ambient contact (25-35% opacity, wide blur, no black pool).
    // 3. Ground texture: finer tiled grass texture with color variation (lighter/darker green, dry areas),
    //    anisotropy & mipmaps to prevent stretching or smearing near screen edges.
    const size = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const cx = size / 2;
      const cy = size / 2;
      // 1 meter in 3D scene = 1024px / 340m = 3.0117px
      const m2px = 1024 / 340;

      // Base terrain: warm natural valley loam
      ctx.fillStyle = '#6c7757';
      ctx.fillRect(0, 0, size, size);

      // Deterministic PRNG for consistent organic mottling
      const rng = (s: number) => {
        const x = Math.sin(s * 93.17) * 43758.5453;
        return x - Math.floor(x);
      };

      // Layer 1: Dry clay & loam earth patches across the valley floor
      for (let i = 0; i < 650; i++) {
        const ang = rng(i * 1.7) * Math.PI * 2;
        const dist = (45 + rng(i * 3.3) * 230) * m2px;
        const px = cx + Math.cos(ang) * dist;
        const py = cy + Math.sin(ang) * dist;
        const rad = (16 + rng(i * 7.1) * 38) * m2px;
        const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0.00, 'rgba(142, 126, 100, 0.45)');
        g.addColorStop(0.60, 'rgba(132, 116, 92, 0.22)');
        g.addColorStop(1.00, 'rgba(132, 116, 92, 0.0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Layer 2: Sunlit pale yellow-green meadow patches
      for (let i = 0; i < 750; i++) {
        const ang = rng(i * 2.3 + 30) * Math.PI * 2;
        const dist = (50 + rng(i * 3.9 + 40) * 225) * m2px;
        const px = cx + Math.cos(ang) * dist;
        const py = cy + Math.sin(ang) * dist;
        const rad = (14 + rng(i * 6.3) * 35) * m2px;
        const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
        const cA = 0.30 + rng(i * 8.7) * 0.32;
        g.addColorStop(0.00, `rgba(128, 154, 102, ${cA.toFixed(2)})`);
        g.addColorStop(0.65, `rgba(118, 144, 92, ${(cA * 0.55).toFixed(2)})`);
        g.addColorStop(1.00, 'rgba(118, 144, 92, 0.0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Layer 3: Lush hardy dark green grass clusters
      for (let i = 0; i < 820; i++) {
        const ang = rng(i * 2.9 + 80) * Math.PI * 2;
        const dist = (55 + rng(i * 4.3 + 90) * 220) * m2px;
        const px = cx + Math.cos(ang) * dist;
        const py = cy + Math.sin(ang) * dist;
        const rad = (12 + rng(i * 5.7) * 30) * m2px;
        const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
        const cA = 0.32 + rng(i * 9.1) * 0.30;
        g.addColorStop(0.00, `rgba(82, 114, 68, ${cA.toFixed(2)})`);
        g.addColorStop(0.60, `rgba(94, 126, 78, ${(cA * 0.55).toFixed(2)})`);
        g.addColorStop(1.00, 'rgba(84, 116, 70, 0.0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Layer 4: Fine high-frequency stipple noise & grass blade speckles for tactile surface grain (no smearing)
      const imgData = ctx.getImageData(0, 0, size, size);
      const d = imgData.data;
      for (let p = 0; p < d.length; p += 4) {
        const n = (((p * 17) % 31) - 15) * 0.65;
        d[p] = Math.max(0, Math.min(255, d[p] + n));
        d[p + 1] = Math.max(0, Math.min(255, d[p + 1] + n));
        d[p + 2] = Math.max(0, Math.min(255, d[p + 2] + n));
      }
      ctx.putImageData(imgData, 0, 0);

      // Layer 5: Concrete Apron - Irregular, warmer grey (#9a9a96) perimeter around outer wall
      // NO hard circular edge: harmonic angular modulation creates realistic natural perimeter
      const apronPoints: [number, number][] = [];
      const steps = 128;
      for (let s = 0; s < steps; s++) {
        const theta = (s / steps) * Math.PI * 2;
        const rMod =
          Math.sin(theta * 3) * 6.5 +
          Math.cos(theta * 5) * 4.2 +
          Math.sin(theta * 8) * 3.0 +
          (rng(s * 3.1) - 0.5) * 4.0;
        const rx = (100 + rMod) * m2px;
        const rz = (112 + rMod) * m2px;
        apronPoints.push([cx + Math.cos(theta) * rx, cy + Math.sin(theta) * rz]);
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(apronPoints[0][0], apronPoints[0][1]);
      for (let s = 1; s < apronPoints.length; s++) {
        ctx.lineTo(apronPoints[s][0], apronPoints[s][1]);
      }
      ctx.closePath();
      ctx.fillStyle = '#9a9a96'; // Warmer grey concrete apron
      ctx.fill();

      // Concrete apron surface variation & subtle expansion joints
      ctx.strokeStyle = 'rgba(125, 125, 120, 0.4)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Radial expansion joint lines
      for (let j = 0; j < 48; j++) {
        const ja = (j / 48) * Math.PI * 2;
        const cosA = Math.cos(ja);
        const sinA = Math.sin(ja);
        const r0 = (81 + (j % 2) * 2) * m2px;
        const r1 = (98 + (j % 3) * 3) * m2px;
        ctx.beginPath();
        ctx.moveTo(cx + cosA * r0, cy + sinA * r0);
        ctx.lineTo(cx + cosA * r1, cy + sinA * r1);
        ctx.strokeStyle = 'rgba(110, 110, 106, 0.32)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // Hairline weathering cracks on concrete apron
      for (let c = 0; c < 24; c++) {
        const ca = rng(c * 5.7) * Math.PI * 2;
        const cr = (86 + rng(c * 2.3) * 16) * m2px;
        let cpx = cx + Math.cos(ca) * cr;
        let cpy = cy + Math.sin(ca) * cr;
        ctx.beginPath();
        ctx.moveTo(cpx, cpy);
        for (let seg = 0; seg < 4; seg++) {
          cpx += (rng(c * 11 + seg) - 0.5) * 12 * m2px;
          cpy += (rng(c * 13 + seg) - 0.5) * 12 * m2px;
          ctx.lineTo(cpx, cpy);
        }
        ctx.strokeStyle = 'rgba(92, 92, 88, 0.28)';
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }

      // Layer 5b: Access Paths extending out into the surroundings
      // South Spectator Main Road (towards highway & main entrance)
      ctx.fillStyle = '#949490';
      ctx.beginPath();
      ctx.moveTo(cx - 7 * m2px, cy + 96 * m2px);
      ctx.lineTo(cx + 7 * m2px, cy + 96 * m2px);
      ctx.lineTo(cx + 9 * m2px, cy + 225 * m2px);
      ctx.lineTo(cx - 9 * m2px, cy + 225 * m2px);
      ctx.closePath();
      ctx.fill();

      // East Service Access Lane (broadcasting / delivery)
      ctx.beginPath();
      ctx.moveTo(cx + 92 * m2px, cy - 6 * m2px);
      ctx.lineTo(cx + 92 * m2px, cy + 6 * m2px);
      ctx.lineTo(cx + 195 * m2px, cy + 12 * m2px);
      ctx.lineTo(cx + 195 * m2px, cy - 2 * m2px);
      ctx.closePath();
      ctx.fill();

      // North-West Team & Official Access Path
      ctx.beginPath();
      ctx.moveTo(cx - 78 * m2px, cy - 88 * m2px);
      ctx.lineTo(cx - 68 * m2px, cy - 94 * m2px);
      ctx.lineTo(cx - 145 * m2px, cy - 155 * m2px);
      ctx.lineTo(cx - 154 * m2px, cy - 147 * m2px);
      ctx.closePath();
      ctx.fill();

      // Layer 5c: Simple Car Park Area on South-West side (outside Pavilion & spectator concourse)
      const pkX0 = cx - 146 * m2px;
      const pkY0 = cy + 68 * m2px;
      const pkW = 54 * m2px;
      const pkH = 62 * m2px;
      ctx.fillStyle = '#92928e';
      ctx.fillRect(pkX0, pkY0, pkW, pkH);

      // Car park stall bays (2 rows with driving lane in between)
      ctx.strokeStyle = 'rgba(235, 235, 225, 0.45)';
      ctx.lineWidth = 1.4;
      for (let s = 0; s < 9; s++) {
        const sy = pkY0 + 6 * m2px + s * 5.6 * m2px;
        // West row stalls
        ctx.beginPath();
        ctx.moveTo(pkX0 + 2 * m2px, sy);
        ctx.lineTo(pkX0 + 17 * m2px, sy);
        ctx.stroke();
        // East row stalls
        ctx.beginPath();
        ctx.moveTo(pkX0 + 36 * m2px, sy);
        ctx.lineTo(pkX0 + 51 * m2px, sy);
        ctx.stroke();
      }

      // Connecting driveway from apron to car park
      ctx.beginPath();
      ctx.moveTo(cx - 86 * m2px, cy + 78 * m2px);
      ctx.lineTo(cx - 96 * m2px, cy + 96 * m2px);
      ctx.lineTo(pkX0 + pkW, pkY0 + pkH * 0.6);
      ctx.lineTo(pkX0 + pkW, pkY0 + pkH * 0.3);
      ctx.closePath();
      ctx.fill();

      // Layer 5d: Concrete pads & spur walkways under the 6 floodlight towers & scoreboard
      const towerLocations: [number, number][] = [
        [88, -48], [88, 10], [88, 72],
        [-88, -72], [-88, 48], [-88, -10],
        [48, -84], // Scoreboard base
        [0, -90.5] // VIP Canopy base
      ];
      towerLocations.forEach(([tx, tz]) => {
        const tpx = cx + tx * m2px;
        const tpy = cy + tz * m2px;
        ctx.fillStyle = '#989894';
        ctx.beginPath();
        ctx.arc(tpx, tpy, 8.5 * m2px, 0, Math.PI * 2);
        ctx.fill();
        // Spur walkway connecting pad to apron
        ctx.strokeStyle = '#949490';
        ctx.lineWidth = 4.8 * m2px;
        ctx.beginPath();
        ctx.moveTo(tpx, tpy);
        const dir = Math.hypot(tx, tz);
        ctx.lineTo(cx + (tx / dir) * 88 * m2px, cy + (tz / dir) * 98 * m2px);
        ctx.stroke();
      });

      // Layer 5e: Grass and dirt creeping in at the edges (feathers perimeter; no hard edge)
      for (let g = 0; g < 720; g++) {
        const ga = rng(g * 3.7) * Math.PI * 2;
        const gOffset = Math.sin(ga * 3) * 6.5 + Math.cos(ga * 5) * 4.2 + (rng(g * 2.1) - 0.5) * 8.0;
        const baseR = (rng(g * 5.1) > 0.4 ? 104 : 96) + gOffset;
        const gx = cx + Math.cos(ga) * (baseR * m2px);
        const gy = cy + Math.sin(ga) * (baseR * 1.12 * m2px);
        const grad = (3.5 + rng(g * 7.9) * 8.0) * m2px;
        const isDirt = rng(g * 11.3) > 0.45;
        const col = isDirt ? 'rgba(128, 115, 94, ' : 'rgba(102, 128, 82, ';
        const alpha = 0.25 + rng(g * 9.7) * 0.35;
        const gRad = ctx.createRadialGradient(gx, gy, 0, gx, gy, grad);
        gRad.addColorStop(0.00, `${col}${alpha.toFixed(2)})`);
        gRad.addColorStop(0.65, `${col}${(alpha * 0.5).toFixed(2)})`);
        gRad.addColorStop(1.00, `${col}0.0)`);
        ctx.fillStyle = gRad;
        ctx.beginPath();
        ctx.arc(gx, gy, grad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Inner cutout for the stadium bowl footprint
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 79.5 * m2px, 89.5 * m2px, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Layer 6: Soft, light contact shadow under outer wall (25-35% opacity, wide blur, NO black pool)
      ctx.save();
      const shadowGrad = ctx.createRadialGradient(cx, cy, 78.5 * m2px, cx, cy, 84.5 * m2px);
      shadowGrad.addColorStop(0.00, 'rgba(42, 40, 36, 0.28)');
      shadowGrad.addColorStop(0.50, 'rgba(42, 40, 36, 0.14)');
      shadowGrad.addColorStop(1.00, 'rgba(42, 40, 36, 0.0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 85.5 * m2px, 95.5 * m2px, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Layer 7: Gentle fade to the horizon into atmospheric haze (smooth blend, no stretching)
      const fadeGrad = ctx.createRadialGradient(cx, cy, 235 * m2px, cx, cy, 340 * m2px);
      fadeGrad.addColorStop(0.00, 'rgba(164, 194, 218, 0.0)');
      fadeGrad.addColorStop(0.65, 'rgba(164, 194, 218, 0.45)');
      fadeGrad.addColorStop(0.88, 'rgba(164, 194, 218, 0.85)');
      fadeGrad.addColorStop(1.00, 'rgba(164, 194, 218, 1.0)');
      ctx.fillStyle = fadeGrad;
      ctx.fillRect(0, 0, size, size);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    return tex;
  }, [isEvening]);

  const turfTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Saturated warm night grass base under floodlights (matching real TU ground photo)
      ctx.fillStyle = isEvening ? '#246e34' : '#22783c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const stripeH = 32;
      for (let y = 0; y < canvas.height; y += stripeH * 2) {
        ctx.fillStyle = isEvening ? '#2c7f3e' : '#2aa04e';
        ctx.fillRect(0, y, canvas.width, stripeH);
      }

      if (isEvening) {
        // Even pitch lighting with gentle natural falloff ONLY near the boundary (NO central hotspot)
        const pool = ctx.createRadialGradient(512, 512, 400, 512, 512, 512);
        pool.addColorStop(0.00, 'rgba(0, 0, 0, 0.0)');
        pool.addColorStop(0.85, 'rgba(0, 0, 0, 0.0)');
        pool.addColorStop(1.00, 'rgba(10, 35, 18, 0.32)'); // Soft natural falloff to boundary
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
        <circleGeometry args={[isEvening ? 290 : 340, 96]} />
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

    function addQuadGrad(
      p0: [number, number, number],
      p1: [number, number, number],
      p2: [number, number, number],
      p3: [number, number, number],
      n: [number, number, number],
      c0: [number, number, number],
      c1: [number, number, number],
      c2: [number, number, number],
      c3: [number, number, number]
    ) {
      positions.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
      normals.push(...n, ...n, ...n, ...n, ...n, ...n);
      colors.push(...c0, ...c1, ...c2, ...c0, ...c2, ...c3);
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

      if (isEvening) {
        // Night mode: uniform dark tone (100% untouched)
        addQuad(ow0, ow1, ow2, ow3, outNorm, wallColor);
      } else {
        // Day mode: Concrete tone with vertical panel lines, lighter at top, and soft contact shadow at base
        const isPanelSeam = (a % 3 === 0);
        const midPY = pY * 0.45;

        // Base contact shadow where wall meets the ground (soft warm precast concrete, no black pool)
        const cBase0: [number, number, number] = isPanelSeam ? [0.48, 0.49, 0.48] : [0.56, 0.57, 0.56];
        const cBase1: [number, number, number] = [0.56, 0.57, 0.56];
        const cMid0: [number, number, number] = isPanelSeam ? [0.58, 0.59, 0.58] : [0.65, 0.66, 0.65];
        const cMid1: [number, number, number] = [0.65, 0.66, 0.65];
        const cTop0: [number, number, number] = isPanelSeam ? [0.68, 0.69, 0.68] : [0.74, 0.75, 0.74];
        const cTop1: [number, number, number] = [0.74, 0.75, 0.74];

        const owM0: [number, number, number] = [(Rx + capR) * cos0, midPY, (Rz + capR) * sin0];
        const owM1: [number, number, number] = [(Rx + capR) * cos1, midPY, (Rz + capR) * sin1];

        // Lower panel quad (ground contact shadow to mid-height)
        addQuadGrad(ow0, ow1, owM1, owM0, outNorm, cBase0, cBase1, cMid1, cMid0);
        // Upper panel quad (mid-height to light sunlit parapet)
        addQuadGrad(owM0, owM1, ow2, ow3, outNorm, cMid0, cMid1, cTop1, cTop0);
      }
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

  // Stadium floodlight lamp face in Day Mode: crisp precision 10 cols x 6 rows reflector cell grid with faint sky reflections
  const lampDayFaceTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Dark reflector base
      ctx.fillStyle = '#161d24';
      ctx.fillRect(0, 0, 1024, 512);

      const cols = 10;
      const rows = 6;
      const cellW = 1024 / cols;
      const cellH = 512 / rows;

      // Draw each modular reflector cell
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x0 = c * cellW;
          const y0 = r * cellH;
          const cx = (c + 0.5) * cellW;
          const cy = (r + 0.5) * cellH;
          const radius = Math.min(cellW, cellH) * 0.44;

          // Recessed cell cup
          ctx.fillStyle = '#1e2632';
          ctx.fillRect(x0 + 2, y0 + 2, cellW - 4, cellH - 4);

          // Precision cell border ribs
          ctx.strokeStyle = '#384452';
          ctx.lineWidth = 2;
          ctx.strokeRect(x0 + 1, y0 + 1, cellW - 2, cellH - 2);

          // Parabolic reflector rim with subtle sky reflection
          const cupGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, radius);
          cupGrad.addColorStop(0.0, '#3a4654');
          cupGrad.addColorStop(0.40, '#2b3644');
          cupGrad.addColorStop(0.75, '#202934');
          cupGrad.addColorStop(1.0, '#161c24');
          ctx.fillStyle = cupGrad;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();

          // Subtle sky reflection arc inside reflector cup
          ctx.strokeStyle = 'rgba(180, 210, 240, 0.28)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.72, Math.PI * 0.8, Math.PI * 1.6);
          ctx.stroke();

          // Circular outer bezel ring around lens socket
          ctx.strokeStyle = '#475464';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cx, cy, radius * 0.88, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Outer master grid frame
      ctx.strokeStyle = '#4e5b6c';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 1020, 508);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = true;
    return tex;
  }, []);

  // Optical diffraction star flare with intense core and fine cross rays
  const starFlareTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const cx = 128;
      const cy = 128;

      // Soft circular core glow
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 54);
      grad.addColorStop(0.00, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.18, 'rgba(255, 253, 235, 0.85)');
      grad.addColorStop(0.50, 'rgba(254, 240, 138, 0.30)');
      grad.addColorStop(0.85, 'rgba(254, 240, 138, 0.05)');
      grad.addColorStop(1.00, 'rgba(255, 240, 138, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);

      // 4-point primary optical diffraction spikes
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.70)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(cx - 105, cy); ctx.lineTo(cx + 105, cy);
      ctx.moveTo(cx, cy - 105); ctx.lineTo(cx, cy + 105);
      ctx.stroke();

      // Subtle diagonal secondary spikes
      ctx.strokeStyle = 'rgba(255, 252, 220, 0.28)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(cx - 48, cy - 48); ctx.lineTo(cx + 48, cy + 48);
      ctx.moveTo(cx - 48, cy + 48); ctx.lineTo(cx + 48, cy - 48);
      ctx.stroke();
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  // Faint localized lamp head haze (3 to 5% opacity, fading out within a few meters)
  const headHazeTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0.00, 'rgba(255, 252, 235, 0.045)');
      grad.addColorStop(0.40, 'rgba(254, 240, 180, 0.025)');
      grad.addColorStop(0.80, 'rgba(254, 240, 180, 0.006)');
      grad.addColorStop(1.00, 'rgba(255, 240, 180, 0.0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  const towers = useMemo(
    () => [
      { id: 't-nw', pos: [-46, 0, -88] as [number, number, number], target: [16, 0, -22] as [number, number, number] },
      { id: 't-ne', pos: [46, 0, -88] as [number, number, number], target: [-16, 0, -22] as [number, number, number] },
      { id: 't-east', pos: [88, 0, -10] as [number, number, number], target: [-25, 0, 2] as [number, number, number] },
      { id: 't-se', pos: [88, 0, 48] as [number, number, number], target: [-16, 0, 24] as [number, number, number] },
      { id: 't-sw', pos: [-88, 0, 48] as [number, number, number], target: [16, 0, 24] as [number, number, number] },
      { id: 't-west', pos: [-88, 0, -10] as [number, number, number], target: [25, 0, 2] as [number, number, number] },
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
            <meshStandardMaterial color={isEvening ? "#334155" : "#64748b"} metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        {[-12, -6, 0, 6, 12].map((ox, i) => (
          <mesh key={`rafter-${i}`} position={[ox, 14.8, 3.8]} rotation={[0.16, 0, 0]}>
            <boxGeometry args={[0.24, 0.45, 8.2]} />
            <meshStandardMaterial color={isEvening ? "#475569" : "#64748b"} metalness={0.7} roughness={0.3} />
          </mesh>
        ))}
        <mesh position={[0, 15.2, 3.8]} rotation={[0.16, 0, 0]}>
          <boxGeometry args={[26.4, 0.18, 8.6]} />
          <meshStandardMaterial color={isEvening ? "#1e293b" : "#94a3b8"} roughness={0.65} metalness={isEvening ? 0.4 : 0.2} />
        </mesh>
      </group>

      {/* 6 Floodlight Towers with High-Density Lamp Heads, Clusters, and Star Glare */}
      {towers.map((tower) => (
        <SingleFloodlightTower
          key={tower.id}
          tower={tower}
          isEvening={isEvening}
          isLiteMode={isLiteMode}
          stadiumLevel={stadiumLevel}
          showBeamAxes={showBeamAxes}
          starFlareTexture={starFlareTexture}
          headHazeTexture={headHazeTexture}
          lampFaceTexture={lampFaceTexture}
          lampDayFaceTexture={lampDayFaceTexture}
        />
      ))}

      {/* Electronic Scoreboard (40% larger for crystal clarity from aerial & opposite seats) */}
      <group position={[48, 17.5, -84]} rotation={[0, -0.52, 0]}>
        {/* Concrete Foundation Base Footing */}
        <mesh position={[0, -16.0, 0]} castShadow receiveShadow>
          <boxGeometry args={[6.0, 3.2, 6.0]} />
          <meshStandardMaterial color={isEvening ? "#334155" : "#78828e"} roughness={0.8} />
        </mesh>
        {/* Dual Galvanized Steel Lattice Support Pylons */}
        {[-3.6, 3.6].map((px, idx) => (
          <mesh key={`pylon-${idx}`} position={[px, -8.5, 0]}>
            <cylinderGeometry args={[0.45, 0.60, 15.0, 8]} />
            <meshStandardMaterial
              color={isEvening ? "#475569" : "#9ea5ad"}
              metalness={isEvening ? 0.85 : 0.50}
              roughness={isEvening ? 0.3 : 0.45}
            />
          </mesh>
        ))}
        {/* Scoreboard Housing: 14.2 * 1.4 = 19.9, 7.4 * 1.4 = 10.4 */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[20.0, 10.4, 0.9]} />
          <meshStandardMaterial color={isEvening ? "#0b0f19" : "#343d48"} metalness={0.7} roughness={0.4} />
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
  stadiumLevel?: StadiumDrillLevel;
  showBeamAxes?: boolean;
  starFlareTexture: THREE.Texture;
  headHazeTexture: THREE.Texture;
  lampFaceTexture: THREE.Texture;
  lampDayFaceTexture: THREE.Texture;
}> = ({
  tower,
  isEvening,
  isLiteMode,
  stadiumLevel: _stadiumLevel,
  showBeamAxes,
  starFlareTexture,
  headHazeTexture,
  lampFaceTexture,
  lampDayFaceTexture,
}) => {
  const starFlareRef = useRef<THREE.Mesh>(null);
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

  // Star flare scales smoothly with camera distance, spotLight smoothly dims on transition
  useFrame(({ camera }, delta) => {
    const camPos = camera.position;
    const distToHead = camPos.distanceTo(headWorldPos);

    if (starFlareRef.current) {
      if (!isEvening) {
        starFlareRef.current.visible = false;
      } else {
        starFlareRef.current.visible = true;
        // Soft optical star glare that scales naturally with distance
        const scaleVal = Math.min(1.7, Math.max(0.65, distToHead * 0.009));
        starFlareRef.current.scale.set(scaleVal, scaleVal, 1);
      }
    }

    if (spotLightRef.current) {
      const targetIntensity = isEvening ? 135 : 0;
      spotLightRef.current.intensity = THREE.MathUtils.damp(
        spotLightRef.current.intensity,
        targetIntensity,
        3.2,
        delta
      );
    }
  });

  // Compute outward yaw angle (away from stadium center) for ladder & base cabinet orientation
  const outwardAngle = useMemo(() => {
    return Math.atan2(tower.pos[2], tower.pos[0]);
  }, [tower.pos]);

  return (
    <group position={tower.pos}>
      {/* 1. Heavy Concrete Foundation Footing - on ground */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.8, 3.2, 1.8, 16]} />
        <meshStandardMaterial color={isEvening ? "#334155" : "#78828e"} roughness={0.8} />
      </mesh>

      {/* Base Steel Flange Plate & Anchor Bolts */}
      <mesh position={[0, 1.88, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.25, 2.35, 0.16, 16]} />
        <meshStandardMaterial
          color={isEvening ? "#475569" : "#9ea5ad"}
          metalness={isEvening ? 0.85 : 0.50}
          roughness={isEvening ? 0.30 : 0.45}
        />
      </mesh>
      {/* Radial Anchor Bolt Studs with Hex Nuts */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((bi) => {
        const theta = (bi * Math.PI) / 6;
        const bx = Math.cos(theta) * 2.05;
        const bz = Math.sin(theta) * 2.05;
        return (
          <mesh key={`anchor-bolt-${bi}`} position={[bx, 2.02, bz]}>
            <cylinderGeometry args={[0.065, 0.065, 0.16, 6]} />
            <meshStandardMaterial
              color={isEvening ? "#334155" : "#7c858e"}
              metalness={0.7}
              roughness={0.4}
            />
          </mesh>
        );
      })}

      {/* 2. Main Galvanized Tapered Steel Mast Pole (1.75m at base -> 0.65m at top) */}
      <mesh position={[0, 23.48, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.65, 1.75, 43.04, 20]} />
        <meshStandardMaterial
          color={isEvening ? "#475569" : "#9ea5ad"}
          metalness={isEvening ? 0.85 : 0.50}
          roughness={isEvening ? 0.30 : 0.45}
        />
      </mesh>

      {/* 4 Horizontal Splice Joint Bands (Flange Rings) */}
      {[
        { y: 12.5, r: 1.56, h: 0.28 },
        { y: 23.0, r: 1.29, h: 0.26 },
        { y: 33.5, r: 1.02, h: 0.24 },
        { y: 42.0, r: 0.80, h: 0.22 },
      ].map((splice, idx) => (
        <mesh key={`splice-${idx}`} position={[0, splice.y, 0]}>
          <cylinderGeometry args={[splice.r, splice.r, splice.h, 20]} />
          <meshStandardMaterial
            color={isEvening ? "#3e4c5e" : "#8d949c"}
            metalness={isEvening ? 0.85 : 0.50}
            roughness={isEvening ? 0.30 : 0.45}
          />
        </mesh>
      ))}

      {/* 3. Mid-Mast Maintenance Platform (~2/3 height at y=29.5m) */}
      <group position={[0, 29.5, 0]}>
        {/* Support gusset brackets underneath */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((rot, idx) => (
          <mesh
            key={`plat-gusset-${idx}`}
            position={[Math.cos(rot) * 1.45, -0.4, Math.sin(rot) * 1.45]}
            rotation={[0, -rot, 0.45]}
          >
            <boxGeometry args={[0.08, 0.9, 0.22]} />
            <meshStandardMaterial
              color={isEvening ? "#334155" : "#8a9198"}
              metalness={isEvening ? 0.85 : 0.50}
              roughness={isEvening ? 0.30 : 0.45}
            />
          </mesh>
        ))}
        {/* Platform floor disc */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[2.1, 2.1, 0.12, 16]} />
          <meshStandardMaterial
            color={isEvening ? "#2a374a" : "#9ea5ad"}
            metalness={isEvening ? 0.85 : 0.50}
            roughness={isEvening ? 0.30 : 0.45}
          />
        </mesh>
        {/* Safety Railing Handrails */}
        <mesh position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.08, 0.035, 8, 24]} />
          <meshStandardMaterial
            color={isEvening ? "#475569" : "#a6aeb6"}
            metalness={isEvening ? 0.85 : 0.50}
            roughness={isEvening ? 0.30 : 0.45}
          />
        </mesh>
        <mesh position={[0, 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.08, 0.025, 8, 24]} />
          <meshStandardMaterial
            color={isEvening ? "#475569" : "#a6aeb6"}
            metalness={isEvening ? 0.85 : 0.50}
            roughness={isEvening ? 0.30 : 0.45}
          />
        </mesh>
        {/* Railing Vertical Stanchions */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((si) => {
          const sRad = (si * Math.PI) / 4;
          return (
            <mesh
              key={`stanchion-${si}`}
              position={[Math.cos(sRad) * 2.06, 0.5, Math.sin(sRad) * 2.06]}
            >
              <cylinderGeometry args={[0.025, 0.025, 1.0, 6]} />
              <meshStandardMaterial
                color={isEvening ? "#475569" : "#a6aeb6"}
                metalness={isEvening ? 0.85 : 0.50}
                roughness={isEvening ? 0.30 : 0.45}
              />
            </mesh>
          );
        })}
      </group>

      {/* 4. Rear Thin Access Ladder & Cable Conduit Run down the back of the mast */}
      <group rotation={[0, -outwardAngle, 0]}>
        {/* Vertical ladder stringer rails (slanted with mast taper: bottom r=1.92m, top r=0.82m) */}
        {[-0.22, 0.22].map((railZ, ridx) => {
          // Average position and slant angle for 43m run
          const dx = 0.82 - 1.92;
          const dy = 43.0;
          const slantAngle = Math.atan2(dx, dy);
          return (
            <mesh
              key={`ladder-rail-${ridx}`}
              position={[1.37, 23.5, railZ]}
              rotation={[0, 0, -slantAngle]}
            >
              <boxGeometry args={[0.045, 43.0, 0.045]} />
              <meshStandardMaterial
                color={isEvening ? "#475569" : "#9aa2aa"}
                metalness={isEvening ? 0.85 : 0.50}
                roughness={isEvening ? 0.30 : 0.45}
              />
            </mesh>
          );
        })}

        {/* Stand-off mounting brackets connecting ladder to mast every 4m */}
        {[4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44].map((by) => {
          const t = (by - 2.0) / 43.0;
          const rMast = 1.75 - t * (1.75 - 0.65);
          const rLad = 1.92 - t * (1.92 - 0.82);
          const wBracket = rLad - rMast;
          return (
            <mesh key={`bracket-${by}`} position={[rMast + wBracket / 2, by, 0]}>
              <boxGeometry args={[wBracket, 0.04, 0.48]} />
              <meshStandardMaterial
                color={isEvening ? "#3e4c5e" : "#8d949c"}
                metalness={isEvening ? 0.85 : 0.50}
                roughness={isEvening ? 0.30 : 0.45}
              />
            </mesh>
          );
        })}

        {/* Cable Tray Conduit Run running down the mast */}
        <mesh position={[1.42, 23.5, 0.38]} rotation={[0, 0, Math.atan2(1.1, 43.0)]}>
          <boxGeometry args={[0.08, 43.0, 0.06]} />
          <meshStandardMaterial
            color={isEvening ? "#334155" : "#7c848e"}
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>

        {/* Weatherproof Base Equipment / Junction Cabinet at Base Footing */}
        <group position={[1.95, 2.45, 0.85]}>
          {/* Cabinet mount pad */}
          <mesh position={[0, -0.65, 0]}>
            <boxGeometry args={[1.2, 0.12, 0.75]} />
            <meshStandardMaterial color={isEvening ? "#334155" : "#78828e"} roughness={0.8} />
          </mesh>
          {/* Steel enclosure cabinet */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[1.1, 1.45, 0.65]} />
            <meshStandardMaterial
              color={isEvening ? "#334155" : "#8a9198"}
              metalness={isEvening ? 0.85 : 0.50}
              roughness={isEvening ? 0.30 : 0.45}
            />
          </mesh>
          {/* Cabinet door recessed seam */}
          <mesh position={[0.56, 0, 0]}>
            <planeGeometry args={[0.55, 1.35]} />
            <meshStandardMaterial color={isEvening ? "#1e293b" : "#767d84"} roughness={0.5} />
          </mesh>
        </group>
      </group>

      {/* 5. Mast Top Platform Collar & Maintenance Railing */}
      <mesh position={[0, 45.2, 0]}>
        <cylinderGeometry args={[1.05, 0.72, 0.5, 16]} />
        <meshStandardMaterial
          color={isEvening ? "#334155" : "#9ea5ad"}
          metalness={isEvening ? 0.85 : 0.50}
          roughness={isEvening ? 0.30 : 0.45}
        />
      </mesh>
      <mesh position={[0, 45.5, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.15, 16]} />
        <meshStandardMaterial
          color={isEvening ? "#1e293b" : "#8e969e"}
          metalness={isEvening ? 0.85 : 0.50}
          roughness={isEvening ? 0.30 : 0.45}
        />
      </mesh>
      <mesh position={[0, 46.0, 0]}>
        <cylinderGeometry args={[1.45, 1.45, 0.9, 16, 1, true]} />
        <meshStandardMaterial
          color={isEvening ? "#475569" : "#a6aeb6"}
          metalness={isEvening ? 0.85 : 0.50}
          roughness={isEvening ? 0.30 : 0.45}
          wireframe
        />
      </mesh>

      {/* 6. Swivel Mounting Yoke & Forward Cantilevered Floodlight Head Unit at [0, 46.2, 0] */}
      <group position={[0, 46.2, 0]} quaternion={headQuaternion}>
        {/* Cantilever Bracket / Yoke (Galvanized / Mid-Grey in Day) */}
        <group>
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.65, 0.65, 0.8, 12]} />
            <meshStandardMaterial
              color={isEvening ? "#334155" : "#9ea5ad"}
              metalness={isEvening ? 0.85 : 0.50}
              roughness={isEvening ? 0.30 : 0.45}
            />
          </mesh>
          <mesh position={[-1.6, 0.5, 0.9]} rotation={[0.48, -0.12, 0]}>
            <boxGeometry args={[0.3, 0.35, 2.2]} />
            <meshStandardMaterial
              color={isEvening ? "#1e293b" : "#9ea5ad"}
              metalness={isEvening ? 0.85 : 0.50}
              roughness={isEvening ? 0.30 : 0.45}
            />
          </mesh>
          <mesh position={[1.6, 0.5, 0.9]} rotation={[0.48, 0.12, 0]}>
            <boxGeometry args={[0.3, 0.35, 2.2]} />
            <meshStandardMaterial
              color={isEvening ? "#1e293b" : "#9ea5ad"}
              metalness={isEvening ? 0.85 : 0.50}
              roughness={isEvening ? 0.30 : 0.45}
            />
          </mesh>
          <mesh position={[0, 1.0, 1.75]}>
            <boxGeometry args={[5.2, 0.4, 0.4]} />
            <meshStandardMaterial
              color={isEvening ? "#1e293b" : "#9ea5ad"}
              metalness={isEvening ? 0.85 : 0.50}
              roughness={isEvening ? 0.30 : 0.45}
            />
          </mesh>
        </group>

        {/* ─── HEAD ASSEMBLY (Forward-offset at z=2.1m, y=1.0m, facing pitch along +Z) ─── */}

        {/* Mid-Grey Metal Housing Frame (Lighter than mast) */}
        <mesh position={[0, 1.0, 2.1]} castShadow>
          <boxGeometry args={[9.6, 5.6, 0.6]} />
          <meshStandardMaterial
            color={isEvening ? "#0b0f19" : "#b0b8c0"}
            metalness={isEvening ? 0.85 : 0.52}
            roughness={isEvening ? 0.30 : 0.42}
          />
        </mesh>

        {/* Slim Anti-Glare Visor on Top */}
        <mesh position={[0, 3.82, 2.55]} rotation={[0.22, 0, 0]}>
          <boxGeometry args={[9.8, 0.12, 0.45]} />
          <meshStandardMaterial
            color={isEvening ? "#080c14" : "#8e969e"}
            metalness={isEvening ? 0.70 : 0.50}
            roughness={isEvening ? 0.40 : 0.45}
          />
        </mesh>

        {/* Side Visor Flaps */}
        {[-4.85, 4.85].map((sx, idx) => (
          <mesh key={`side-visor-${idx}`} position={[sx, 1.0, 2.45]}>
            <boxGeometry args={[0.12, 5.6, 0.35]} />
            <meshStandardMaterial
              color={isEvening ? "#080c14" : "#8e969e"}
              metalness={isEvening ? 0.70 : 0.50}
              roughness={isEvening ? 0.40 : 0.45}
            />
          </mesh>
        ))}

        {/* Rear Maintenance Catwalk & Safety Lattice */}
        <mesh position={[0, -1.4, 1.3]}>
          <boxGeometry args={[8.8, 0.2, 1.0]} />
          <meshStandardMaterial
            color={isEvening ? "#334155" : "#9ea5ad"}
            metalness={isEvening ? 0.85 : 0.50}
            roughness={isEvening ? 0.30 : 0.45}
          />
        </mesh>
        <mesh position={[0, -0.8, 0.8]}>
          <boxGeometry args={[8.8, 1.0, 0.08]} />
          <meshStandardMaterial
            color={isEvening ? "#475569" : "#a6aeb6"}
            metalness={isEvening ? 0.85 : 0.50}
            roughness={isEvening ? 0.30 : 0.45}
            wireframe
          />
        </mesh>

        {/* Dark Reflector Panel Face Behind Lenses with visible 10x6 precision grid */}
        <mesh position={[0, 1.0, 2.41]}>
          <planeGeometry args={[9.2, 5.2]} />
          <meshStandardMaterial
            color={isEvening ? "#ffffff" : "#ffffff"}
            map={isEvening ? lampFaceTexture : lampDayFaceTexture}
            emissive={isEvening ? "#fffde8" : "#000000"}
            emissiveMap={isEvening ? lampFaceTexture : undefined}
            emissiveIntensity={isEvening ? 1.5 : 0.0}
            roughness={isEvening ? 0.25 : 0.45}
            metalness={isEvening ? 0.70 : 0.55}
          />
        </mesh>

        {/* 60 Micro-Lenses: Paler glass with faint sky reflection & visible grid frame, strictly no glow in Day Mode */}
        {[-4.05, -3.15, -2.25, -1.35, -0.45, 0.45, 1.35, 2.25, 3.15, 4.05].map((bx, bi) =>
          [-2.0, -1.2, -0.4, 0.4, 1.2, 2.0].map((by, ri) => (
            <group key={`bulb-grp-${bi}-${ri}`} position={[bx, 1.0 + by, 2.43]}>
              {/* Outer lens bezel collar ring for crisp visible grid definition */}
              {!isEvening && (
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.01]}>
                  <cylinderGeometry args={[0.35, 0.38, 0.04, 12]} />
                  <meshStandardMaterial color="#2d3748" metalness={0.65} roughness={0.35} />
                </mesh>
              )}
              {/* Lens face: paler glass with faint sky reflection, zero emissive in day */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.31, 0.35, 0.07, 12]} />
                <meshStandardMaterial
                  color={isEvening ? "#ffffff" : "#f2f7fa"}
                  emissive={isEvening ? "#ffffff" : "#000000"}
                  emissiveIntensity={isEvening ? 3.2 : 0.0}
                  roughness={isEvening ? 0.08 : 0.12}
                  metalness={isEvening ? 0.20 : 0.52}
                />
              </mesh>
            </group>
          ))
        )}

        {/* Optical Star Glare Sprite centered on lamp head (scales with camera distance, no big flat halo) */}
        {isEvening && (
          <mesh ref={starFlareRef} position={[0, 1.0, 2.50]}>
            <planeGeometry args={[2.8, 2.8]} />
            <meshBasicMaterial
              map={starFlareTexture}
              color="#fffdf0"
              transparent
              opacity={0.25}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              depthTest={true}
            />
          </mesh>
        )}

        {/* Faint localized head haze (3 to 5% opacity, fading out within 2.5 meters) */}
        {isEvening && (
          <mesh position={[0, 1.0, 2.49]}>
            <planeGeometry args={[5.2, 3.2]} />
            <meshBasicMaterial
              map={headHazeTexture}
              color="#fffdf2"
              transparent
              opacity={0.03}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              depthTest={true}
            />
          </mesh>
        )}

        {/* Dedicated target object for SpotLight at exact pitch target distance */}
        <object3D ref={spotTargetRef} position={[0, 1.0, beamLength]} />

        {/* High-CRI Floodlight: wide angle (~1.08 rad), soft penumbra, even illumination across pitch */}
        <spotLight
          ref={spotLightRef}
          position={[0, 1.0, 2.48]}
          intensity={isEvening ? 135 : 0}
          color="#fffdf0"
          angle={1.08}
          penumbra={0.92}
          distance={180}
          decay={1.0}
          castShadow={!isLiteMode && isEvening && (tower.id.includes('nw') || tower.id.includes('se') || tower.id.includes('west'))}
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0003}
        />

        {/* NOTE: Solid light cone geometry has been deleted; in clear air, beams are invisible */}

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
      <meshStandardMaterial roughness={0.84} metalness={0.02} />
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

  const sunRef = useRef<THREE.DirectionalLight>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const nightCenterRef = useRef<THREE.PointLight>(null);
  const nightBouncesRef = useRef<THREE.Group>(null);
  const { scene } = useThree();

  const factorRef = useRef(isEvening ? 0.0 : 1.0);

  // Smooth ~1-second cross-fade of sky lighting, sun, and fog
  useFrame((_, delta) => {
    const target = isEvening ? 0.0 : 1.0;
    factorRef.current = THREE.MathUtils.damp(factorRef.current, target, 3.2, delta);
    const f = factorRef.current; // 0.0 = evening, 1.0 = day

    if (sunRef.current) {
      sunRef.current.intensity = THREE.MathUtils.lerp(0.0, 0.95, f);
    }
    if (fillRef.current) {
      fillRef.current.intensity = THREE.MathUtils.lerp(0.0, 0.68, f);
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = THREE.MathUtils.lerp(0.45, 1.38, f);
      hemiRef.current.color.lerpColors(
        new THREE.Color('#243248'),
        new THREE.Color('#b8daf5'),
        f
      );
      hemiRef.current.groundColor.lerpColors(
        new THREE.Color('#080a10'),
        new THREE.Color('#7a7264'),
        f
      );
    }
    if (nightCenterRef.current) {
      nightCenterRef.current.intensity = THREE.MathUtils.lerp(50.0, 0.0, f);
    }
    if (nightBouncesRef.current) {
      nightBouncesRef.current.children.forEach((c) => {
        if (c instanceof THREE.PointLight) {
          c.intensity = THREE.MathUtils.lerp(22.0, 0.0, f);
        }
      });
    }

    // Smoothly blend scene fog and background color
    if (scene.background instanceof THREE.Color) {
      scene.background.lerpColors(
        new THREE.Color('#010206'),
        new THREE.Color('#8fc0e8'),
        f
      );
    }
    if (scene.fog && scene.fog instanceof THREE.Fog) {
      scene.fog.color.lerpColors(
        new THREE.Color('#010206'),
        new THREE.Color('#a8cde8'),
        f
      );
      scene.fog.near = THREE.MathUtils.lerp(160, 140, f);
      scene.fog.far = THREE.MathUtils.lerp(680, 780, f);
    }
  });

  return (
    <>
      <primitive object={pitchTarget} />

      {/* Hemisphere fill: blends between night sky/earth and daytime azure/warm-earth */}
      <hemisphereLight
        ref={hemiRef}
        args={[isEvening ? '#243248' : '#b8daf5', isEvening ? '#080a10' : '#888072', isEvening ? 0.45 : 1.42]}
      />

      {/* Sun Directional Light: soft shadow edges (radius 14.0), 28-32% shadow opacity, single direction (no black pool) */}
      <directionalLight
        ref={sunRef}
        position={[85, 125, 60]}
        intensity={isEvening ? 0 : 0.72}
        color="#fffbf0"
        castShadow={!isLiteMode}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-radius={14.0}
        shadow-camera-left={-130}
        shadow-camera-right={130}
        shadow-camera-top={130}
        shadow-camera-bottom={-130}
        shadow-camera-far={350}
      />

      {/* Secondary Daytime Sky Fill Light (castShadow=false) */}
      <directionalLight
        ref={fillRef}
        position={[-60, 65, -45]}
        intensity={isEvening ? 0 : 0.88}
        color="#dbeafe"
      />

      {/* Evening Stand warm spill fill */}
      <pointLight
        ref={nightCenterRef}
        position={[0, 26.0, 0]}
        color="#fff8ec"
        intensity={isEvening ? 50 : 0}
        distance={115}
        decay={1.0}
      />

      {/* Evening faint perimeter bounce */}
      <group ref={nightBouncesRef}>
        <pointLight position={[38, 5, 38]} color="#dcfce7" intensity={isEvening ? 22 : 0} distance={55} decay={1.0} />
        <pointLight position={[-38, 5, 38]} color="#dcfce7" intensity={isEvening ? 22 : 0} distance={55} decay={1.0} />
        <pointLight position={[38, 5, -38]} color="#dcfce7" intensity={isEvening ? 22 : 0} distance={55} decay={1.0} />
        <pointLight position={[-38, 5, -38]} color="#dcfce7" intensity={isEvening ? 22 : 0} distance={55} decay={1.0} />
      </group>
    </>
  );
};

// ─── 6c. Photorealistic Night Stadium Bloom & Tone Mapping ───
const StadiumPostProcessing: React.FC<{ isEvening: boolean; isLiteMode: boolean }> = ({ isEvening, isLiteMode }) => {
  const { gl, scene, camera, size } = useThree();

  const composer = useMemo(() => {
    if (isLiteMode || !isEvening) return null;

    // Use WebGLRenderTarget with 4x MSAA hardware multisampling to eliminate moiré and edge aliasing
    const renderTarget = new THREE.WebGLRenderTarget(size.width, size.height, {
      type: THREE.HalfFloatType,
      samples: 4,
    });

    const comp = new EffectComposer(gl, renderTarget);
    const renderPass = new RenderPass(scene, camera);
    comp.addPass(renderPass);

    // UnrealBloomPass: threshold 0.98 ensures bloom applies strictly to floodlight bulbs, scoreboard, and sponsor boards (0 pitch bloom)
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      0.28, // bloom strength
      0.10, // bloom radius
      0.98  // bloom threshold
    );
    comp.addPass(bloomPass);

    const outputPass = new OutputPass();
    comp.addPass(outputPass);

    return comp;
  }, [gl, scene, camera, size.width, size.height, isEvening, isLiteMode]);

  useEffect(() => {
    if (composer) {
      composer.setSize(size.width, size.height);
    }
  }, [composer, size.width, size.height]);

  useFrame((state) => {
    if (composer && isEvening && !isLiteMode) {
      composer.render();
    } else {
      state.gl.render(state.scene, state.camera);
    }
  }, 1);

  return null;
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

  // Seat Geometry: Clean streamlined profile (cushion + backrest) without sub-pixel stanchions to eliminate moiré at distance
  const seatGeometry = useMemo(() => {
    const cushion = new THREE.BoxGeometry(0.44, 0.08, 0.36);
    cushion.translate(0, 0.04, 0.06);

    const backrest = new THREE.BoxGeometry(0.44, 0.38, 0.06);
    backrest.rotateX(0.08);
    backrest.translate(0, 0.23, -0.10);

    return mergeGeometries([cushion, backrest]);
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
          toneMappingExposure: isEvening ? 1.02 : 1.05,
        }}
        shadows={!isLiteMode}
      >
        <color attach="background" args={[isEvening ? '#010206' : '#8fc0e8']} />
        {!isLiteMode && (
          <fog attach="fog" args={[isEvening ? '#010206' : '#a8cde8', isEvening ? 160 : 140, isEvening ? 680 : 780]} />
        )}

        {/* Photorealistic Night Stadium Bloom & Post-processing */}
        <StadiumPostProcessing isEvening={isEvening} isLiteMode={isLiteMode} />

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
