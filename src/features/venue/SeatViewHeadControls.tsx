import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface SeatViewHeadControlsProps {
  enabled: boolean;
  baseLookAt: [number, number, number];
  seatPos: [number, number, number];
  seatKey?: string;
}

const _seatEye = new THREE.Vector3();
const _seatCenter = new THREE.Vector3();
const _seatBaseDir = new THREE.Vector3();
const _seatRight = new THREE.Vector3();
const _seatFinalLook = new THREE.Vector3();
const _axisY = new THREE.Vector3(0, 1, 0);

export const SeatViewHeadControls: React.FC<SeatViewHeadControlsProps> = ({
  enabled,
  baseLookAt,
  seatPos,
  seatKey,
}) => {
  const { invalidate } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const targetYaw = useRef(0);
  const targetPitch = useRef(0);
  const hoverYaw = useRef(0);
  const hoverPitch = useRef(0);
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });

  const activeKey = seatKey || `${seatPos[0].toFixed(2)}-${seatPos[2].toFixed(2)}`;

  // Reset yaw, pitch, and target angles whenever a new seat is selected or view toggles
  useEffect(() => {
    yaw.current = 0;
    pitch.current = 0;
    targetYaw.current = 0;
    targetPitch.current = 0;
    hoverYaw.current = 0;
    hoverPitch.current = 0;
    isDragging.current = false;
    invalidate();
  }, [activeKey, enabled, invalidate]);

  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (e: PointerEvent) => {
      // Don't drag if clicking buttons, links, or input controls
      if ((e.target as HTMLElement)?.closest('button, a, input, select, textarea, [role="button"]')) return;
      isDragging.current = true;
      previousMouse.current = { x: e.clientX, y: e.clientY };
      invalidate();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) {
        // Natural cursor tracking: moving cursor toward screen edges smoothly turns the head
        const normX = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
        const normY = (e.clientY / window.innerHeight - 0.5) * 2; // -1 to 1
        hoverYaw.current = -normX * 0.75; // Glance +/- 43 degrees naturally to sides
        hoverPitch.current = -normY * 0.40; // Glance +/- 23 degrees naturally up/down
        invalidate();
        return;
      }

      // Click-and-drag for full panoramic head rotation
      const dx = e.clientX - previousMouse.current.x;
      const dy = e.clientY - previousMouse.current.y;
      previousMouse.current = { x: e.clientX, y: e.clientY };

      targetYaw.current -= dx * 0.0055;
      targetPitch.current -= dy * 0.0045;

      // Generous clamp: +/- 100 deg yaw, +/- 55 deg pitch
      targetYaw.current = Math.max(-1.75, Math.min(1.75, targetYaw.current));
      targetPitch.current = Math.max(-0.95, Math.min(0.95, targetPitch.current));

      invalidate();
    };

    const onPointerUp = () => {
      isDragging.current = false;
      invalidate();
    };

    const onDblClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest('button, a, input, select, textarea, [role="button"]')) return;
      // Double click recenters head orientation
      targetYaw.current = 0;
      targetPitch.current = 0;
      hoverYaw.current = 0;
      hoverPitch.current = 0;
      invalidate();
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('dblclick', onDblClick);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('dblclick', onDblClick);
    };
  }, [enabled, invalidate]);

  useFrame((state) => {
    if (!enabled) return;

    const totalTargetYaw = targetYaw.current + hoverYaw.current;
    const totalTargetPitch = targetPitch.current + hoverPitch.current;

    // Smooth lerp for head rotation
    yaw.current += (totalTargetYaw - yaw.current) * 0.18;
    pitch.current += (totalTargetPitch - pitch.current) * 0.18;

    // Keep demand render loop active while damping toward target or dragging
    const diff = Math.abs(totalTargetYaw - yaw.current) + Math.abs(totalTargetPitch - pitch.current);
    if (diff > 0.0003 || isDragging.current) {
      state.invalidate();
    }

    // Organic breathing & subtle head sway motion
    const time = state.clock.getElapsedTime();
    const breathY = Math.sin(time * 1.2) * 0.003;
    const swayYaw = Math.cos(time * 0.7) * 0.0015;

    _seatEye.set(seatPos[0], seatPos[1] + breathY, seatPos[2]);
    _seatCenter.set(baseLookAt[0], baseLookAt[1], baseLookAt[2]);

    // Compute base direction from eye directly to pitch/screen center
    _seatBaseDir.subVectors(_seatCenter, _seatEye).normalize();

    // Rotate horizontally around global Y (yaw + sway)
    _seatBaseDir.applyAxisAngle(_axisY, yaw.current + swayYaw);

    // Rotate vertically around camera's local right axis (pitch)
    _seatRight.crossVectors(_seatBaseDir, _axisY).normalize();
    _seatBaseDir.applyAxisAngle(_seatRight, pitch.current);

    _seatFinalLook.copy(_seatEye).addScaledVector(_seatBaseDir, 25);
    state.camera.position.copy(_seatEye);
    state.camera.up.set(0, 1, 0); // Strict zero roll & level horizon
    state.camera.lookAt(_seatFinalLook);
  });

  return null;
};
