import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
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
  const yaw = useRef(0);
  const pitch = useRef(0);
  const targetYaw = useRef(0);
  const targetPitch = useRef(0);
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });

  const activeKey = seatKey || `${seatPos[0].toFixed(2)}-${seatPos[2].toFixed(2)}`;

  // Reset yaw, pitch, and target angles whenever a new seat is selected or view toggles
  useEffect(() => {
    yaw.current = 0;
    pitch.current = 0;
    targetYaw.current = 0;
    targetPitch.current = 0;
    isDragging.current = false;
  }, [activeKey, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (e: PointerEvent) => {
      // Don't drag if clicking buttons, pills, or UI elements
      if ((e.target as HTMLElement)?.closest('button, .glass-panel, .glass-panel-glow, [role="button"]')) return;
      isDragging.current = true;
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - previousMouse.current.x;
      const dy = e.clientY - previousMouse.current.y;
      previousMouse.current = { x: e.clientX, y: e.clientY };

      // Update target yaw (horizontal) and pitch (vertical)
      targetYaw.current -= dx * 0.0032;
      targetPitch.current -= dy * 0.0026;

      // Clamp yaw to +/- 60 deg (+/- 1.05 radians)
      targetYaw.current = Math.max(-1.05, Math.min(1.05, targetYaw.current));
      // Clamp pitch to +/- 30 deg (+/- 0.52 radians)
      targetPitch.current = Math.max(-0.52, Math.min(0.52, targetPitch.current));
    };

    const onPointerUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [enabled]);

  useFrame((state) => {
    if (!enabled) return;

    // Smooth lerp for head rotation
    yaw.current += (targetYaw.current - yaw.current) * 0.14;
    pitch.current += (targetPitch.current - pitch.current) * 0.14;

    // Organic breathing & subtle head sway motion
    const time = state.clock.getElapsedTime();
    const breathY = Math.sin(time * 1.2) * 0.003;
    const swayYaw = Math.cos(time * 0.7) * 0.0015;

    _seatEye.set(seatPos[0], seatPos[1] + breathY, seatPos[2]);
    _seatCenter.set(baseLookAt[0], baseLookAt[1], baseLookAt[2]);

    // Compute base direction from eye directly to pitch center
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
