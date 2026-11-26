import React, { useEffect, useState } from 'react';

export const PerfOverlay: React.FC = () => {
  const [metrics, setMetrics] = useState<{
    fps: number;
    frameTime: number;
    drawCalls: number;
    triangles: number;
    geometries: number;
    textures: number;
    heapMB: number;
  }>({
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    heapMB: 0,
  });

  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('perf') === '1') {
      setEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let lastFrameTime = performance.now();
    let currentFps = 60;
    let worstDelta = 16.6;
    let animId: number;

    const tick = (now: number) => {
      frameCount++;
      const delta = now - lastFrameTime;
      lastFrameTime = now;
      if (delta > worstDelta) {
        worstDelta = delta;
      }

      if (now - lastTime >= 500) {
        currentFps = Math.round((frameCount * 1000) / (now - lastTime));
        frameCount = 0;
        lastTime = now;

        const rend = (window as any).__THREE_RENDERER__;
        const snap = (window as any).__PRE_COMPOSER_SNAPSHOT__;
        
        let calls = 0;
        let tris = 0;
        let geoms = 0;
        let tex = 0;

        if (snap && snap.calls > 1) {
          calls = snap.calls;
          tris = snap.tris;
        } else if (rend?.info) {
          calls = rend.info.render.calls;
          tris = rend.info.render.triangles;
        }

        if (rend?.info?.memory) {
          geoms = rend.info.memory.geometries;
          tex = rend.info.memory.textures;
        }

        const mem = (performance as any).memory;
        const heap = mem ? Math.round((mem.usedJSHeapSize / (1024 * 1024)) * 10) / 10 : 0;

        setMetrics({
          fps: currentFps,
          frameTime: Math.round(worstDelta * 10) / 10,
          drawCalls: calls,
          triangles: tris,
          geometries: geoms,
          textures: tex,
          heapMB: heap,
        });

        worstDelta = 0;
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        left: 12,
        zIndex: 999999,
        background: 'rgba(8, 10, 16, 0.88)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        borderRadius: 8,
        padding: '8px 12px',
        color: '#f8fafc',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
        lineHeight: 1.4,
        pointerEvents: 'none',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ color: '#38bdf8', fontWeight: 'bold', marginBottom: 2 }}>⚡ Aasan Perf Monitor (?perf=1)</div>
      <div>FPS: <span style={{ color: metrics.fps < 30 ? '#ef4444' : metrics.fps < 50 ? '#f59e0b' : '#22c55e', fontWeight: 'bold' }}>{metrics.fps}</span> ({metrics.frameTime}ms)</div>
      <div>Draw Calls: <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>{metrics.drawCalls}</span> | Tris: <span style={{ color: '#e2e8f0' }}>{metrics.triangles.toLocaleString()}</span></div>
      <div>Geom: {metrics.geometries} | Tex: {metrics.textures}</div>
      <div>Heap: <span style={{ color: '#cbd5e1' }}>{metrics.heapMB} MB</span></div>
    </div>
  );
};
