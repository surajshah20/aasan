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

  const stadiumVenue = (venuesData as unknown as Venue[]).find((v) => v.type === 'stadium') || (venuesData[0] as unknown as Venue);
  const stadiumSections = stadiumVenue.sections as Section[];

  useEffect(() => {
    // Check if running on mobile screen or user prefers reduced motion
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isMobile && !isLiteMode && !prefersReducedMotion) {
      setShouldLoad3D(true);
    } else {
      setShouldLoad3D(false);
    }
  }, [isLiteMode]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {shouldLoad3D ? (
        <div className="hero-stadium-canvas-wrap w-full h-full lg:translate-x-[10%] scale-[1.02]">
          <style>{`
            .hero-stadium-canvas-wrap nav[aria-label="Breadcrumb"],
            .hero-stadium-canvas-wrap button,
            .hero-stadium-canvas-wrap .glass-panel,
            .hero-stadium-canvas-wrap .glass-panel-glow {
              display: none !important;
            }
          `}</style>
          <Suspense
            fallback={
              <img
                src="/landing/hero-poster.jpg"
                alt="TU Cricket Ground night preview"
                className="w-full h-full object-cover object-[68%_center]"
                loading="eager"
              />
            }
          >
            <StadiumMap3D sections={stadiumSections} />
          </Suspense>
        </div>
      ) : (
        <img
          src="/landing/hero-poster.jpg"
          alt="TU Cricket Ground night preview"
          className="w-full h-full object-cover object-[68%_center]"
          loading="eager"
        />
      )}

      {/* Left-to-right dark gradient: high contrast behind left-aligned headline, fading to transparent on the right half so the stadium pitch and stands are bright and clearly visible */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b10] via-[#0a0b10]/85 via-42% to-transparent pointer-events-none" />
      {/* Subtle bottom fade to transition seamlessly into the content */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0b10] to-transparent pointer-events-none" />
    </div>
  );
};
