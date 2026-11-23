import React, { useState } from 'react';
import { useT } from '../i18n/useT';
import { useBookingStore } from '../store/useBookingStore';
import venuesData from '../data/venues.json';
import eventsData from '../data/events.json';
import { Layers, Globe, ArrowLeft, Ticket, Calendar, X, Info } from 'lucide-react';

export const Header: React.FC = () => {
  const { t, language, toggleLanguage } = useT();
  const { currentView, setView, isLiteMode, toggleLiteMode, selectedSeats, selectedVenueId, selectedEventId } = useBookingStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentVenue = venuesData.find((v) => v.id === selectedVenueId) || venuesData[0];
  const currentEvent = eventsData.find((e) => e.id === selectedEventId) || eventsData[0];

  return (
    <header className="sticky top-0 z-50 w-full h-14 bg-[#060810]/90 backdrop-blur-2xl border-b border-white/10 px-3 sm:px-6 transition-all select-none">
      <div className="h-full flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {currentView !== 'landing' && (
            <button
              onClick={() => setView('landing')}
              className="p-1.5 -ml-1 sm:ml-0 rounded-full hover:bg-white/10 text-muted hover:text-white transition-colors"
              title={t('back_to_home')}
              aria-label={t('back_to_home')}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div 
            onClick={() => setView('landing')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-crimson to-nepalblue flex items-center justify-center shadow-glow-crimson group-hover:scale-105 transition-transform">
              <span className="font-display font-extrabold text-white text-sm sm:text-base">आ</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-white">
                {t('app_name')}
              </span>
              <span className="text-[10px] sm:text-xs text-crimson font-semibold tracking-wider uppercase">
                नेपाल
              </span>
            </div>
          </div>

          {currentView === 'landing' && (
            <p className="text-[11px] text-muted tracking-tight hidden lg:block border-l border-white/10 pl-3 ml-1">
              {t('app_tagline')}
            </p>
          )}
        </div>

        {/* Compact Event Line in the Middle (on venue screens, hidden on small mobile) */}
        {currentView === 'venue' && (
          <div className="hidden md:flex items-center gap-2 text-xs truncate max-w-md lg:max-w-xl px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 shadow-inner">
            <span className="font-bold text-white truncate">
              {currentEvent.title[language]}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-crimson/20 border border-crimson/40 text-crimson font-medium shrink-0">
              {currentVenue.type === 'cinema' ? 'Cinema' : 'Stadium'}
            </span>
            <span className="text-white/20">•</span>
            <span className="text-muted truncate">{currentVenue.name[language]}</span>
            <span className="text-white/20">•</span>
            <span className="text-muted shrink-0 flex items-center gap-1 text-[11px]">
              <Calendar className="w-3 h-3 text-crimson/80" />
              {currentEvent.dateISO}
            </span>
            <span className="text-muted shrink-0 text-[11px]">{currentEvent.time}</span>
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Lite / 3D Mode Toggle */}
          <button
            onClick={toggleLiteMode}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-pill text-xs font-medium border transition-all ${
              isLiteMode
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'bg-white/5 border-white/10 text-muted hover:text-white hover:bg-white/10'
            }`}
            title="Toggle WebGL 3D / 2D Lite Mode"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isLiteMode ? t('lite_mode_active') : t('standard_mode')}
            </span>
            <span className="sm:hidden font-semibold">
              {isLiteMode ? '2D' : '3D'}
            </span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-pill text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-text transition-all hover:border-white/20 active:scale-95"
            aria-label="Toggle language between English and Nepali"
          >
            <Globe className="w-3.5 h-3.5 text-crimson" />
            <span className={language === 'ne' ? 'font-bold text-crimson' : 'text-muted'}>
              नेपाली
            </span>
            <span className="text-white/20">/</span>
            <span className={language === 'en' ? 'font-bold text-white' : 'text-muted'}>
              EN
            </span>
          </button>

          {/* Cart Indicator if in venue view and has selected seats */}
          {selectedSeats.length > 0 && currentView === 'venue' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-crimson/20 border border-crimson/40 text-crimson text-xs font-semibold animate-pulse">
              <Ticket className="w-3.5 h-3.5" />
              <span>{selectedSeats.length}</span>
            </div>
          )}

          {/* Mobile Info / Menu Toggle (on venue screen) */}
          {currentView === 'venue' && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-muted hover:text-white transition-colors"
              title="Event Details"
              aria-label="Toggle Event Details"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Info className="w-4 h-4 text-crimson" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Dropdown for Event info */}
      {mobileMenuOpen && currentView === 'venue' && (
        <div className="md:hidden absolute top-14 left-0 right-0 bg-[#060810]/95 backdrop-blur-2xl border-b border-white/15 px-4 py-3 shadow-2xl animate-fadeIn z-50">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">{currentEvent.title[language]}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-crimson/20 border border-crimson/40 text-crimson font-medium">
                {currentVenue.type === 'cinema' ? 'Cinema' : 'Stadium'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>{currentVenue.name[language]}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-crimson" />
                {currentEvent.dateISO}
              </span>
              <span>•</span>
              <span>{currentEvent.time}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
