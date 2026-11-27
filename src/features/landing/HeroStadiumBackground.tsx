import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useBookingStore } from '../../store/useBookingStore';
import venuesData from '../../data/venues.json';
import { Venue, Section } from '../../types';

// Lazy-load StadiumMap3D for desktop high-perf users
const StadiumMap3D = lazy(() =>
  import('../venue/StadiumMap3D').then((m) => ({ default: m.StadiumMap3D }))
);

export const HeroStadiumBackground: React.FC = () => {
  const { isLiteMode } = useBookingStore();
  const [shouldLoad3D, setShouldLoad3D] = useState(false);
  const [is3DReady, setIs3DReady] = useState(false);

  const stadiumVenue = (venuesData as unknown as Venue[]).find((v) => v.type === 'stadium') || (venuesData[0] as unknown as Venue);
  const stadiumSections = stadiumVenue.sections as Section[];

  useEffect(() => {
    // Check if running on mobile screen or user prefers reduced motion
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isMobile || isLiteMode || prefersReducedMotion) {
      setShouldLoad3D(false);
      return;
    }

    let isCancelled = false;

    let rafId: number = 0;

    // 1-second FPS probe after page is interactive
    const runFpsProbe = () => {
      let frameCount = 0;
      let startTime = performance.now();

      const onFrame = (now: number) => {
        if (isCancelled) return;
        frameCount++;
        const elapsed = now - startTime;
        if (elapsed >= 1000) {
          const fps = (frameCount / elapsed) * 1000;
          if (fps >= 40) {
            setShouldLoad3D(true);
            // Allow 3D canvas a brief moment to initialize before fading in
            setTimeout(() => {
              if (!isCancelled) setIs3DReady(true);
            }, 300);
          }
        } else {
          rafId = requestAnimationFrame(onFrame);
        }
      };

      rafId = requestAnimationFrame(onFrame);
    };

    const scheduleProbe = typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? (window as any).requestIdleCallback(runFpsProbe, { timeout: 1500 })
      : setTimeout(runFpsProbe, 200);

    return () => {
      isCancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && typeof scheduleProbe === 'number') {
        (window as any).cancelIdleCallback(scheduleProbe);
      } else {
        clearTimeout(scheduleProbe);
      }
    };
  }, [isLiteMode]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {/* Pre-rendered poster: always present at first paint */}
      <img
        src="/landing/hero-poster.jpg"
        alt="TU Cricket Ground night preview"
        className="w-full h-full object-cover object-center lg:object-[68%_center] absolute inset-0"
        loading="eager"
      />

      {/* Live 3D Scene: mounts only after idle FPS probe >= 40 fps, cross-fades smoothly */}
      {shouldLoad3D && (
        <div
          className={`hero-stadium-canvas-wrap absolute inset-0 transition-opacity duration-700 ease-out w-full lg:w-[120%] h-full left-0 lg:-left-[5%] translate-x-0 lg:translate-x-[8%] ${
            is3DReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <style>{`
            .hero-stadium-canvas-wrap nav[aria-label="Breadcrumb"],
            .hero-stadium-canvas-wrap button,
            .hero-stadium-canvas-wrap .glass-panel,
            .hero-stadium-canvas-wrap .glass-panel-glow {
              display: none !important;
            }
          `}</style>
          <Suspense fallback={null}>
            <StadiumMap3D sections={stadiumSections} />
          </Suspense>
        </div>
      )}

      {/* Mobile top-to-bottom dark gradient: ensures headline and buttons are completely readable on phones */}
      <div
        className="absolute inset-0 pointer-events-none block lg:hidden"
        style={{
          background: 'linear-gradient(to bottom, rgba(10,11,16,0.92) 0%, rgba(10,11,16,0.82) 42%, rgba(10,11,16,0.35) 75%, rgba(10,11,16,0.9) 100%)'
        }}
      />
      {/* Desktop left-to-right dark gradient: crisp text readability without dimming the stadium */}
      <div
        className="absolute inset-0 pointer-events-none hidden lg:block"
        style={{
          background: 'linear-gradient(to right, #0a0b10 0%, rgba(10,11,16,0.92) 22%, rgba(10,11,16,0.55) 38%, rgba(10,11,16,0.12) 52%, transparent 62%)'
        }}
      />
      {/* Subtle bottom fade to transition seamlessly into the content */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0a0b10] via-[#0a0b10]/60 to-transparent pointer-events-none" />
      {/* Top vignette for header readability */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-[#0a0b10]/70 to-transparent pointer-events-none" />
    </div>
  );
};
