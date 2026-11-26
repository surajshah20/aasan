// src/lib/performanceManager.ts
import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * Controller hook for demand-driven rendering.
 * - Keeps rendering active during continuous animations (e.g. overview camera drift, cloud drift).
 * - Switches to idle in stand, block, and static seat views once camera settles.
 * - Wakes up / invalidates on user interactions (hover, click, resize).
 * - Automatically pauses everything when document is hidden (tab switch) or offscreen.
 */
export function useDemandRenderManager(options: {
  isContinuousAnimationActive: boolean;
  domElementRef?: React.RefObject<HTMLElement | null>;
}) {
  const { invalidate } = useThree();
  const { isContinuousAnimationActive } = options;
  const isTabVisibleRef = useRef<boolean>(typeof document !== 'undefined' ? !document.hidden : true);
  const isIntersectingRef = useRef<boolean>(true);

  // 1. Tab visibility listener
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      isTabVisibleRef.current = !document.hidden;
      if (!document.hidden && isIntersectingRef.current) {
        invalidate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [invalidate]);

  // 2. IntersectionObserver to pause rendering when canvas is scrolled out of viewport
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const target = options.domElementRef?.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isIntersectingRef.current = entry.isIntersecting;
          if (entry.isIntersecting && isTabVisibleRef.current) {
            invalidate();
          }
        }
      },
      { threshold: 0.05 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [options.domElementRef, invalidate]);

  // 3. Continuous invalidate loop when animations are active and page is visible
  useEffect(() => {
    if (!isContinuousAnimationActive) return;

    let animId: number;
    const loop = () => {
      if (isTabVisibleRef.current && isIntersectingRef.current) {
        invalidate();
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isContinuousAnimationActive, invalidate]);

  return {
    invalidateIfVisible: () => {
      if (isTabVisibleRef.current && isIntersectingRef.current) {
        invalidate();
      }
    },
  };
}
