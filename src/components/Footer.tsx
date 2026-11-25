import React from 'react';
import { useT } from '../i18n/useT';
import { useBookingStore } from '../store/useBookingStore';
import { Layers } from 'lucide-react';

export const Footer: React.FC = () => {
  const { language, toggleLanguage } = useT();
  const { isLiteMode, toggleLiteMode } = useBookingStore();

  return (
    <footer className="w-full border-t border-white/10 bg-[#0a0b10] py-8 px-4 sm:px-6 text-xs text-slate-400">
      <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand & summary */}
        <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[#0a0b10] border border-white/10 flex items-center justify-center p-0.5">
              <img src="/brand/symbol.svg" alt="Aasan Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-semibold text-slate-200">Aasan (आसन)</span>
          </div>
          <span className="text-white/20 hidden sm:inline">•</span>
          <span className="text-slate-400">
            {language === 'ne'
              ? 'नेपालका लागि ३D सिट पूर्वावलोकन तथा टिकट प्रणाली'
              : 'Interactive 3D seat preview and ticketing platform for Nepal.'}
          </span>
        </div>

        {/* Right side: accessible 2D toggle, language & disclaimer */}
        <div className="flex flex-wrap items-center gap-4 justify-center sm:justify-end text-slate-500">
          <button
            onClick={toggleLiteMode}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Toggle between 3D immersive view and 2D accessible high-contrast view"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {isLiteMode 
                ? (language === 'ne' ? '३D मोडमा जानुहोस्' : 'Switch to 3D View') 
                : (language === 'ne' ? '२D पहुँचयोग्य दृश्य' : '2D Accessible View')}
            </span>
          </button>

          <span className="text-white/10">•</span>

          <button
            onClick={toggleLanguage}
            className="hover:text-slate-300 transition-colors cursor-pointer"
          >
            {language === 'ne' ? 'English' : 'नेपाली'}
          </button>

          <span className="text-white/10">•</span>

          <p className="text-[11px] text-slate-500 text-center sm:text-right">
            Demo concept. Not affiliated with any venue or cinema.
          </p>
        </div>
      </div>
    </footer>
  );
};
