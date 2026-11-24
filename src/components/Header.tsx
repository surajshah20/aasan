import React, { useState } from 'react';
import { useT } from '../i18n/useT';
import { useBookingStore } from '../store/useBookingStore';
import venuesData from '../data/venues.json';
import eventsData from '../data/events.json';
import { Layers, ArrowLeft, Calendar, Menu, X } from 'lucide-react';

export const Header: React.FC = () => {
  const { t, language, setLanguage } = useT();
  const { currentView, setView, isLiteMode, toggleLiteMode, selectedVenueId, selectedEventId } = useBookingStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const currentVenue = venuesData.find((v) => v.id === selectedVenueId) || venuesData[0];
  const currentEvent = eventsData.find((e) => e.id === selectedEventId) || eventsData[0];

  const scrollToSection = (id: string) => {
    setMobileNavOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full h-14 bg-[#0a0b10]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 transition-all select-none">
      <div className="relative h-full flex items-center justify-between gap-3 max-w-[1200px] mx-auto">
        {/* Brand / Logo (Left) */}
        <div className="flex items-center gap-3 shrink-0">
          {currentView !== 'landing' && (
            <button
              onClick={() => setView('landing')}
              className="p-1.5 -ml-1 sm:ml-0 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors"
              title={t('back_to_home')}
              aria-label={t('back_to_home')}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div 
            onClick={() => {
              if (currentView !== 'landing') {
                setView('landing');
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#0a0b10] border border-white/10 flex items-center justify-center p-1 group-hover:border-white/25 transition-colors shadow-sm">
              <img src="/brand/symbol.svg" alt="Aasan Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-bold text-lg tracking-tight text-white group-hover:text-white/95 transition-colors">
                {t('app_name')}
              </span>
              <span className="text-[11px] text-[#dc143c] font-semibold tracking-wider">
                {language === 'ne' ? 'आसन' : 'नेपाल'}
              </span>
            </div>
          </div>
        </div>

        {/* Centered Navigation Links for Landing Page (Desktop) */}
        {currentView === 'landing' && (
          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300 absolute left-1/2 -translate-x-1/2">
            <button
              onClick={() => scrollToSection('stadium-section')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {language === 'ne' ? 'खेलहरू' : 'Matches'}
            </button>
            <button
              onClick={() => scrollToSection('cinemas-section')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {language === 'ne' ? 'सिनेमा हलहरू' : 'Cinemas'}
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {language === 'ne' ? 'कसरी काम गर्छ' : 'How it works'}
            </button>
          </nav>
        )}

        {/* Compact Event Line (Only in Venue Screen) */}
        {currentView === 'venue' && (
          <div className="hidden md:flex items-center gap-2 text-xs truncate max-w-md lg:max-w-xl px-3 py-1 rounded-lg bg-white/[0.04] border border-white/10">
            <span className="font-semibold text-white truncate">
              {currentEvent.title[language]}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#dc143c]/20 border border-[#dc143c]/40 text-[#dc143c] font-medium shrink-0">
              {currentVenue.type === 'cinema' ? 'Cinema' : 'Stadium'}
            </span>
            <span className="text-white/20">•</span>
            <span className="text-muted truncate">{currentVenue.name[language]}</span>
            <span className="text-white/20">•</span>
            <span className="text-muted shrink-0 flex items-center gap-1 text-[11px]">
              <Calendar className="w-3 h-3 text-[#dc143c]" />
              {currentEvent.dateISO}
            </span>
            <span className="text-muted shrink-0 text-[11px]">{currentEvent.time}</span>
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Lite / 3D Mode Toggle */}
          <button
            onClick={toggleLiteMode}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isLiteMode
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-white/5 border-white/10 text-muted hover:text-white hover:bg-white/10'
            }`}
            title="Toggle 3D / 2D Lite Mode"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isLiteMode ? t('lite_mode_active') : '3D Mode'}
            </span>
            <span className="sm:hidden font-medium">
              {isLiteMode ? '2D' : '3D'}
            </span>
          </button>

          {/* Two-option Language Toggle: EN | नेपाली */}
          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-white/20 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="English"
            >
              EN
            </button>
            <span className="text-white/20 select-none text-[11px] px-0.5">|</span>
            <button
              type="button"
              onClick={() => setLanguage('ne')}
              className={`px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
                language === 'ne'
                  ? 'bg-white/20 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="नेपाली"
            >
              नेपाली
            </button>
          </div>

          {/* Mobile Menu Button on Landing */}
          {currentView === 'landing' && (
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-muted hover:text-white transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {currentView === 'landing' && mobileNavOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 bg-[#0a0b10] border-b border-white/10 px-4 py-4 space-y-3 z-50">
          <button
            onClick={() => scrollToSection('stadium-section')}
            className="block w-full text-left py-2 text-sm text-slate-200 hover:text-white transition-colors"
          >
            {language === 'ne' ? 'खेलहरू' : 'Matches'}
          </button>
          <button
            onClick={() => scrollToSection('cinemas-section')}
            className="block w-full text-left py-2 text-sm text-slate-200 hover:text-white transition-colors"
          >
            {language === 'ne' ? 'सिनेमा हलहरू' : 'Cinemas'}
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="block w-full text-left py-2 text-sm text-slate-200 hover:text-white transition-colors"
          >
            {language === 'ne' ? 'कसरी काम गर्छ' : 'How it works'}
          </button>
        </div>
      )}
    </header>
  );
};
