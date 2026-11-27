import React, { useState, useMemo } from 'react';
import { useT } from '../i18n/useT';
import { useBookingStore } from '../store/useBookingStore';
import venuesData from '../data/venues.json';
import eventsData from '../data/events.json';
import { Venue, EventItem } from '../types';
import { Layers, ArrowLeft, Menu, X } from 'lucide-react';

export const Header: React.FC = () => {
  const { t, language, setLanguage } = useT();
  const { 
    currentView, 
    setView, 
    isLiteMode, 
    toggleLiteMode, 
    selectedVenueId, 
    selectedEventId, 
    selectedShowtime,
    bookingResult 
  } = useBookingStore();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const venues = venuesData as unknown as Venue[];
  const events = eventsData as unknown as EventItem[];

  const activeVenueId = (currentView === 'ticket' && bookingResult?.venueId)
    ? bookingResult.venueId
    : (selectedVenueId || bookingResult?.venueId || 'tu_cricket_ground');
  const activeEventId = (currentView === 'ticket' && bookingResult?.eventId)
    ? bookingResult.eventId
    : (selectedEventId || bookingResult?.eventId || (activeVenueId === 'tu_cricket_ground' ? 'event_tu_cricket_1' : 'event_qfx_movie_1'));

  const currentVenue = venues.find((v) => v.id === activeVenueId) || venues[0];
  const currentEvent = events.find((e) => e.id === activeEventId) || events.find((e) => e.venueId === currentVenue.id) || events[0];

  const isCinema = currentVenue.type === 'cinema';

  // Line 1: Full event title (medium weight, off-white, no ellipsis)
  const line1Title = useMemo(() => {
    if (isCinema) {
      // Movie title in English and Nepali (e.g. "Lalit Maya (ललित माया)")
      const titleEn = currentEvent.title?.en || '';
      const titleNe = currentEvent.title?.ne || '';
      if (!titleEn) return titleNe;
      if (!titleNe || titleEn.includes(titleNe) || titleEn.includes('(')) {
        return titleEn;
      }
      return `${titleEn} (${titleNe})`;
    }

    // Stadium / Matches: Full event title ("Nepal vs Netherlands — T20 Tri-Series Final")
    if (language === 'ne' && currentEvent.title?.ne) {
      return currentEvent.title.ne;
    }
    return currentEvent.title?.en || currentEvent.title?.[language] || 'Nepal vs Netherlands — T20 Tri-Series Final';
  }, [currentEvent, isCinema, language]);

  // Line 2: Smaller grey text with venue, date and time ("TU International Cricket Ground · Sat, 28 Nov 2026 · 1:15 PM")
  const line2VenueDateTime = useMemo(() => {
    // 1. Venue string
    let venueStr = '';
    if (isCinema) {
      const chain = currentVenue.chain || 'QFX Cinemas';
      const rawName = currentVenue.name?.en || currentVenue.name?.[language] || 'Civil Mall (Audi 1)';
      if (rawName.toLowerCase().startsWith(chain.toLowerCase())) {
        venueStr = rawName;
      } else {
        venueStr = `${chain} — ${rawName}`;
      }
    } else {
      venueStr = language === 'ne' 
        ? (currentVenue.name?.ne || currentVenue.name?.en || 'TU International Cricket Ground')
        : (currentVenue.name?.en || currentVenue.name?.[language] || 'TU International Cricket Ground');
    }

    // 2. Date string
    let dateStr = '';
    const dateISO = currentEvent.dateISO || '2026-11-28';
    if (isCinema && dateISO === '2026-11-25') {
      dateStr = language === 'ne' ? 'आज' : 'Today';
    } else {
      try {
        const [y, m, d] = dateISO.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayName = days[dateObj.getDay()] || 'Sat';
        const monthName = months[dateObj.getMonth()] || 'Nov';
        dateStr = `${dayName}, ${d} ${monthName} ${y}`;
      } catch {
        dateStr = dateISO;
      }
    }

    // 3. Time string
    let timeStr = (selectedShowtime || currentEvent.time || '1:15 PM').trim();
    if (timeStr.startsWith('0')) {
      timeStr = timeStr.substring(1);
    }

    return `${venueStr} · ${dateStr} · ${timeStr}`;
  }, [currentVenue, currentEvent, isCinema, language]);

  const scrollToSection = (id: string) => {
    setMobileNavOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full min-h-14 bg-[#0a0b10]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 transition-all select-none">
      <div className="relative min-h-14 py-1.5 flex items-center justify-between gap-2 sm:gap-4 max-w-[1400px] mx-auto">
        {/* Brand / Logo & Back Arrow (Left) */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 z-10">
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
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0a0b10] border border-white/10 flex items-center justify-center p-1 group-hover:border-white/25 transition-colors shadow-sm shrink-0">
              <img src="/brand/symbol.svg" alt="Aasan Logo" className="w-full h-full object-contain" />
            </div>
            <div className={`items-baseline gap-1.5 ${currentView !== 'landing' ? 'hidden sm:flex' : 'flex'}`}>
              <span className="font-display font-bold text-base sm:text-lg tracking-tight text-white group-hover:text-white/95 transition-colors">
                {t('app_name')}
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#dc143c] font-semibold tracking-wider">
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

        {/* Two-Line Center Block for Stadium, Cinema, Seat and Checkout pages */}
        {currentView !== 'landing' && (
          <div className="flex-1 min-w-0 max-w-[56%] sm:max-w-[62%] mx-auto flex flex-col items-center justify-center text-center px-1 sm:px-2 z-0">
            {/* Line 1: Full event title (truncated on small mobile so header height stays stable) */}
            <h1 className="text-xs sm:text-sm md:text-[15px] font-medium text-[#f1f5f9] leading-tight text-center truncate sm:break-words max-w-full">
              {line1Title}
            </h1>
            {/* Line 2: Smaller grey text with venue, date and time */}
            <p className="text-[10px] sm:text-xs text-slate-400 font-normal leading-tight text-center truncate sm:break-words max-w-full mt-0.5">
              {line2VenueDateTime}
            </p>
          </div>
        )}

        {/* Right Controls: 3D / 2D toggle & Language switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 z-10">
          {/* Lite / 3D Mode Toggle (venue and landing screens) */}
          {(currentView === 'venue' || currentView === 'landing') && (
            <button
              onClick={toggleLiteMode}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                isLiteMode
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-sm'
              }`}
              title={isLiteMode ? 'Switch to 3D View' : 'Currently in 3D View — click for 2D'}
              aria-label={isLiteMode ? 'Switch to 3D View' : 'Currently in 3D View — click for 2D'}
              aria-pressed={isLiteMode}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">
                {isLiteMode ? 'Switch to 3D' : '3D View'}
              </span>
              <span className="md:hidden font-medium text-[11px]">
                {isLiteMode ? '2D' : '3D'}
              </span>
              {!isLiteMode && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />}
            </button>
          )}

          {/* Two-option Language Toggle: EN | नेपाली */}
          <div className="flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[11px] sm:text-xs transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-white/20 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="English"
            >
              EN
            </button>
            <span className="text-white/20 select-none text-[10px] px-0.5">|</span>
            <button
              type="button"
              onClick={() => setLanguage('ne')}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[11px] sm:text-xs transition-colors cursor-pointer ${
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

      {/* Mobile Navigation Drawer for Landing */}
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

