/**
 * Device capability and WebGL detection
 * Graceful fallback to 2D SVG map and static preview if WebGL is unavailable or device is constrained
 */

export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export function isLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 4;
  
  // Check device memory (GB) if supported
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory || 4;

  // Mid-to-low range phone or tablet
  if (cores < 4 || memory < 3) {
    return true;
  }

  return false;
}
