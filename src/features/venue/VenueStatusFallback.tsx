import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { useT } from '../../i18n/useT';
import { AlertTriangle, WifiOff, RefreshCw, Layers, ArrowLeft } from 'lucide-react';

interface Branded3DLoaderProps {
  onSwitchTo2D: () => void;
}

export const Branded3DLoader: React.FC<Branded3DLoaderProps> = ({ onSwitchTo2D }) => {
  const { language } = useT();
  const [progress, setProgress] = useState(25);
  const [takingLong, setTakingLong] = useState(false);

  useEffect(() => {
    // Track real Three.js asset loading progress
    THREE.DefaultLoadingManager.onProgress = (_url, itemsLoaded, itemsTotal) => {
      if (itemsTotal > 0) {
        const pct = Math.min(98, Math.round((itemsLoaded / itemsTotal) * 100));
        setProgress(pct);
      }
    };

    THREE.DefaultLoadingManager.onLoad = () => {
      setProgress(100);
    };

    // 8-second fallback timeout
    const timer = setTimeout(() => {
      setTakingLong(true);
    }, 8000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#080911] text-white select-none">
      <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
        {/* Outer glowing pulsing ring */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-crimson/30 to-amber-500/30 blur-xl animate-pulse" />
        <div className="relative w-16 h-16 rounded-2xl bg-[#0e111a] border border-white/20 p-2.5 flex items-center justify-center shadow-2xl">
          <img src="/brand/symbol.svg" alt="Aasan Logo" className="w-full h-full object-contain" />
        </div>
      </div>

      <h3 className="font-display font-semibold text-sm tracking-wide mb-1 text-slate-100">
        {language === 'ne' ? '३D दृश्य तयार हुँदैछ...' : 'Loading 3D Venue View...'}
      </h3>
      <p className="text-xs text-slate-400 mb-4 font-mono">
        {progress}%
      </p>

      {/* Real Progress Bar */}
      <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-crimson to-amber-500 transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 8-second Fallback Option (Offer 2D mode) */}
      {takingLong && (
        <div className="max-w-xs text-center animate-fadeIn p-3.5 rounded-xl bg-white/5 border border-amber-500/30 text-xs">
          <p className="text-slate-300 mb-3 leading-relaxed text-[11px]">
            {language === 'ne'
              ? '३D दृश्य लोड हुन समय लागिरहेको छ। के तपाईं छिटो २D पहुँचयोग्य मोड प्रयोग गर्न चाहनुहुन्छ?'
              : 'Loading is taking longer than expected. Would you like to use the lightweight 2D mode?'}
          </p>
          <button
            onClick={onSwitchTo2D}
            className="w-full py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer text-xs"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{language === 'ne' ? '२D मोडमा जानुहोस्' : 'Switch to 2D Mode'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

// ─── WebGL Context Lost Screen ───
export const WebGLContextLostFallback: React.FC<{
  onReload: () => void;
  onSwitchTo2D: () => void;
}> = ({ onReload, onSwitchTo2D }) => {
  const { language } = useT();

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#080911] text-white select-none text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <h3 className="text-base font-bold text-slate-100 mb-2">
        {language === 'ne' ? '३D ग्राफिक्स रोकियो' : '3D Graphics Context Interrupted'}
      </h3>
      <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
        {language === 'ne'
          ? 'तपाईंको ब्राउजर वा यन्त्रले ३D WebGL मेमोरी खाली गर्‍यो। तपाईं पुनः लोड गर्न वा २D मोड प्रयोग गर्न सक्नुहुन्छ।'
          : 'Your graphics hardware or browser temporarily reset the WebGL surface. You can restore the 3D scene or continue in 2D.'}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
        <button
          onClick={onReload}
          className="w-full py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{language === 'ne' ? '३D पुनः लोड गर्नुहोस्' : 'Reload 3D'}</span>
        </button>
        <button
          onClick={onSwitchTo2D}
          className="w-full py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{language === 'ne' ? '२D मोड प्रयोग गर्नुहोस्' : 'Use 2D Mode'}</span>
        </button>
      </div>
    </div>
  );
};

// ─── Friendly 404 / Invalid Link State ───
export const NotFoundState: React.FC<{
  title?: string;
  message?: string;
  onBackToVenues: () => void;
}> = ({ title, message, onBackToVenues }) => {
  const { language } = useT();

  return (
    <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center p-6 bg-[#080911] text-white select-none text-center">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-4 shadow-xl">
        <span className="font-display font-extrabold text-2xl text-amber-400">404</span>
      </div>

      <h3 className="text-lg font-bold text-slate-100 mb-2">
        {title || (language === 'ne' ? 'स्थल वा सिट फेला परेन' : 'Venue or Seat Not Found')}
      </h3>
      <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
        {message || (language === 'ne'
          ? 'तपाईंले खोज्नुभएको लिङ्क पुरानो, अवैध वा सिट पहिल्यै बुक भइसकेको हुन सक्छ।'
          : 'The link you followed might be expired, invalid, or the seat has already been booked.')}
      </p>

      <button
        onClick={onBackToVenues}
        className="py-2.5 px-6 rounded-full bg-crimson hover:bg-crimson-dark text-white font-bold text-xs transition-all shadow-glow-crimson flex items-center gap-2 cursor-pointer active:scale-95"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{language === 'ne' ? 'सबै स्थलहरू हेर्नुहोस्' : 'Browse All Venues'}</span>
      </button>
    </div>
  );
};

// ─── Offline Banner ───
export const OfflineBanner: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const { language } = useT();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md animate-fadeIn">
      <div className="p-3 rounded-xl bg-[#141724]/95 border border-red-500/40 text-white shadow-2xl flex items-center justify-between gap-3 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-slate-200 truncate">
            {language === 'ne' ? 'इन्टरनेट विच्छेद भयो।' : 'You appear to be offline.'}
          </p>
        </div>
        <button
          onClick={onRetry}
          className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-semibold shrink-0 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>{language === 'ne' ? 'पुनः प्रयास' : 'Retry'}</span>
        </button>
      </div>
    </div>
  );
};
