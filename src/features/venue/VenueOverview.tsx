import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useBookingStore, getSeatId } from '../../store/useBookingStore';
import { useT } from '../../i18n/useT';
import venuesData from '../../data/venues.json';
import { VenueMap2D } from './VenueMap2D';
import { SeatPicker } from '../seats/SeatPicker';
import { SeatViewBar } from './SeatViewBar';
import { formatPrice } from '../../lib/money';
import { Venue } from '../../types';
import eventsData from '../../data/events.json';
import { EventItem } from '../../types';
import { 
  ArrowLeft, 
  Eye, 
  Sparkles, 
  Ticket, 
  ArrowRight, 
  X, 
  ShieldCheck,
  Info,
  Clock
} from 'lucide-react';
import { Branded3DLoader, WebGLContextLostFallback, NotFoundState, OfflineBanner } from './VenueStatusFallback';

const CinemaMap3D = lazy(() => import('./CinemaMap3D').then((m) => ({ default: m.CinemaMap3D })));
const StadiumMap3D = lazy(() => import('./StadiumMap3D').then((m) => ({ default: m.StadiumMap3D })));

export const VenueOverview: React.FC = () => {
  const { t, language } = useT();
  const {
    selectedVenueId,
    selectedEventId,
    selectedShowtime,
    setShowtime,
    activeSectionId,
    activeSeat,
    cameraMode,
    isLiteMode,
    setLiteMode,
    selectSection,
    backToOverview,
    setView,
    selectedSeats,
    toggleSeat,
  } = useBookingStore();

  const [hintVisible, setHintVisible] = useState(true);
  const [showInfoPopover, setShowInfoPopover] = useState(false);
  const [showAutoSuggest2D, setShowAutoSuggest2D] = useState(false);
  const [webglLost, setWebglLost] = useState(false);
  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const venues = venuesData as unknown as Venue[];
  const currentVenue = venues.find((v) => v.id === selectedVenueId);

  const events = eventsData as unknown as EventItem[];
  const activeEvent = events.find((e) => e.id === selectedEventId) || (currentVenue ? events.find((e) => e.venueId === currentVenue.id) : null) || events[0];

  // Listen to network status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to WebGL context loss
  useEffect(() => {
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglLost(true);
    };
    const handleContextRestored = () => {
      setWebglLost(false);
    };

    window.addEventListener('webglcontextlost', handleContextLost);
    window.addEventListener('webglcontextrestored', handleContextRestored);
    return () => {
      window.removeEventListener('webglcontextlost', handleContextLost);
      window.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, []);

  if (!currentVenue) {
    return (
      <div className="w-full h-full">
        <NotFoundState onBackToVenues={() => setView('landing')} />
      </div>
    );
  }

  const activeSection = currentVenue.sections.find((s) => s.id === activeSectionId);
  const isInSeatView = !!activeSeat;
  const totalNPR = selectedSeats.reduce((sum, s) => sum + s.priceNPR, 0);

  // Auto-fade hint after 4 seconds or when switching camera view
  useEffect(() => {
    setHintVisible(true);
    const timer = setTimeout(() => {
      setHintVisible(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [cameraMode]);

  // Auto-suggest 2D banner for low-end / reduced motion / saveData / no WebGL
  useEffect(() => {
    if (isLiteMode) {
      setShowAutoSuggest2D(false);
      return;
    }
    const isDismissed = sessionStorage.getItem('aasan_dismiss_2d_banner') === 'true';
    if (isDismissed) return;

    let shouldSuggest = false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('suggest2d') === 'true') {
      shouldSuggest = true;
    }
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shouldSuggest = true;
    }
    const nav = navigator as any;
    if (nav.connection && (nav.connection.saveData === true || ['slow-2g', '2g'].includes(nav.connection.effectiveType))) {
      shouldSuggest = true;
    }
    if (nav.deviceMemory && nav.deviceMemory <= 4) {
      shouldSuggest = true;
    }
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        shouldSuggest = true;
      }
    } catch {
      shouldSuggest = true;
    }

    if (shouldSuggest) {
      setShowAutoSuggest2D(true);
    }
  }, [isLiteMode]);

  const handleDismissBanner = () => {
    setShowAutoSuggest2D(false);
    sessionStorage.setItem('aasan_dismiss_2d_banner', 'true');
  };

  const handleAccept2D = () => {
    setShowAutoSuggest2D(false);
    sessionStorage.setItem('aasan_dismiss_2d_banner', 'true');
    setLiteMode(true);
  };

  return (
    <div 
      className="relative w-full h-full bg-bg overflow-hidden select-none"
      onPointerDown={() => {
        setHintVisible(false);
        setShowInfoPopover(false);
      }}
    >
      {/* Auto-suggest 2D Accessible Mode Banner */}
      {showAutoSuggest2D && !isLiteMode && (
        <div 
          role="region"
          aria-label="Display mode suggestion"
          className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-xl animate-fadeIn"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#111420]/95 backdrop-blur-xl border border-amber-500/50 shadow-2xl text-slate-100">
            <div className="flex items-center gap-2.5 min-w-0">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-slate-200 leading-snug">
                {language === 'ne'
                  ? 'सुस्त गति वा सिमित डेटा पत्ता लाग्यो। के तपाईं २D पहुँचयोग्य दृश्य प्रयोग गर्न चाहनुहुन्छ?'
                  : 'Low-power or reduced motion detected. Switch to fast 2D accessible view?'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleAccept2D}
                className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-colors cursor-pointer"
              >
                {language === 'ne' ? '२D प्रयोग गर्नुहोस्' : 'Use 2D'}
              </button>
              <button
                onClick={handleDismissBanner}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Dismiss"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Floating Glass Navigation Button (Top-left) */}
      {isInSeatView ? (
        <button
          onClick={backToOverview}
          className="absolute top-3.5 left-3 sm:left-5 z-30 flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-[#060810]/80 hover:bg-[#060810]/95 backdrop-blur-xl text-white text-xs font-semibold border border-white/20 shadow-2xl transition-all active:scale-95 group"
          title={t('back_to_map')}
          aria-label={t('back_to_map')}
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">{t('back_to_map')}</span>
        </button>
      ) : (
        <button
          onClick={() => setView('landing')}
          className="absolute top-3.5 left-3 sm:left-5 z-30 flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-[#060810]/80 hover:bg-[#060810]/95 backdrop-blur-xl text-white/80 hover:text-white text-xs font-medium border border-white/15 shadow-2xl transition-all active:scale-95 group"
          title={t('back_to_home')}
          aria-label={t('back_to_home')}
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline">{t('back_to_home')}</span>
        </button>
      )}

      {/* Floating Seat Pill (Top-right in Seat View) */}
      {isInSeatView && activeSeat && (
        <div className="absolute top-3.5 right-3 sm:right-5 z-30 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-[#060810]/85 backdrop-blur-xl border border-white/20 text-white shadow-2xl animate-fadeIn">
          <Eye className="w-3.5 h-3.5 text-crimson animate-pulse shrink-0" />
          <span className="font-bold text-xs whitespace-nowrap" title={activeSeat.sectionName}>{activeSeat.sectionName}</span>
          <span className="text-white/30">•</span>
          <span className="text-white/80 text-xs whitespace-nowrap">
            <span className="hidden sm:inline">Row </span>{activeSeat.row} · Seat {activeSeat.number}
          </span>
          <span className="text-white/30">•</span>
          <span className="text-amber-400 font-bold text-xs shrink-0">
            {formatPrice(activeSeat.priceNPR, language)}
          </span>
        </div>
      )}

      {/* Floating Centered Discovery Hint Pill in Overview (Auto-fades after a few seconds or on interaction) */}
      {!isInSeatView && currentVenue.type === 'cinema' && (
        <div 
          className={`absolute top-14 sm:top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-700 ${
            hintVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
          }`}
        >
          <div className="px-3.5 py-1.5 rounded-full bg-[#060810]/75 backdrop-blur-xl border border-white/15 text-xs text-white/90 shadow-2xl flex items-center gap-2 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-white/80 text-xs">
              {language === 'ne' ? 'सिटमा क्लिक गरी प्रत्यक्ष दृश्य हेर्नुहोस्' : 'Click any seat to fly into its view'}
            </span>
          </div>
        </div>
      )}

      {/* Disclaimer Popover & Small Info Button (Bottom-left, completely out of the seat area) */}
      <div className="absolute bottom-3 left-3 sm:left-4 z-30">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInfoPopover(!showInfoPopover);
            }}
            className="p-1.5 rounded-full bg-[#060810]/70 hover:bg-[#060810]/95 backdrop-blur-xl border border-white/15 text-white/40 hover:text-white/90 transition-all shadow-lg active:scale-95 flex items-center justify-center group"
            title="Disclaimer & Info"
            aria-label="Disclaimer & Info"
          >
            <Info className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
          </button>
          {showInfoPopover && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-9 left-0 w-64 p-3 rounded-xl bg-[#060810]/95 backdrop-blur-2xl border border-white/20 text-[11px] text-white/80 shadow-2xl animate-fadeIn flex items-start gap-2.5 z-40"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">Demo concept. Not affiliated with any venue or cinema. Mock data only. Sponsor boards: demo placements.</p>
            </div>
          )}
        </div>
      </div>

      {/* Small Frosted-Glass Pill (Bottom-Center, completely clear of seats) */}
      {!isInSeatView && selectedSeats.length === 0 && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none hidden sm:block">
          <div className="px-3.5 py-1 rounded-full bg-[#060810]/50 backdrop-blur-md border border-white/10 text-[10px] text-white/35 flex items-center gap-1.5 shadow-sm">
            <ShieldCheck className="w-3 h-3 text-white/30" />
            <span>Demo concept. Not affiliated with any venue or cinema. Mock data only. Sponsor boards: demo placements.</span>
          </div>
        </div>
      )}

      {/* Floating Showtime Picker for Cinemas in Overview */}
      {currentVenue.type === 'cinema' && !isInSeatView && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-auto animate-fadeIn select-none">
          <div className="px-3 py-1.5 rounded-full bg-[#060810]/85 backdrop-blur-xl border border-white/15 text-xs text-white/90 shadow-2xl flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] font-medium text-white/60">
              {language === 'ne' ? 'शो समय:' : 'Showtime:'}
            </span>
            <div className="flex items-center gap-1">
              {(activeEvent.showtimes || ['11:15 AM', '02:45 PM', '06:30 PM', '09:30 PM']).map((st) => {
                const isActive = (selectedShowtime || activeEvent.time) === st;
                return (
                  <button
                    key={st}
                    onClick={() => setShowtime(st)}
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                        : 'bg-white/10 hover:bg-white/20 text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main 3D / 2D Canvas Area (100% of remaining viewport) */}
      <div className="relative w-full h-full">
        {/* WebGL Context Lost Fallback Screen */}
        {webglLost ? (
          <WebGLContextLostFallback
            onReload={() => setWebglLost(false)}
            onSwitchTo2D={() => {
              setLiteMode(true);
              setWebglLost(false);
            }}
          />
        ) : isLiteMode ? (
          <div className="w-full h-full overflow-y-auto pb-12 pt-14">
            <VenueMap2D
              type={currentVenue.type}
              sections={currentVenue.sections}
              onSelectSection={(id) => selectSection(id)}
            />
            {activeSection && (
              <div className="max-w-5xl mx-auto px-4 mt-6">
                <SeatPicker
                  section={activeSection}
                  onProceedToCheckout={() => setView('checkout')}
                />
              </div>
            )}
          </div>
        ) : (
          /* Standard 100% 3D Viewport with Real Branded Progress Loader */
          <Suspense fallback={<Branded3DLoader onSwitchTo2D={() => setLiteMode(true)} />}>
            {currentVenue.type === 'cinema' ? (
              <CinemaMap3D
                sections={currentVenue.sections}
                onSelectSection={(id) => selectSection(id)}
              />
            ) : (
              <StadiumMap3D
                sections={currentVenue.sections}
                onSelectSection={(id) => selectSection(id)}
              />
            )}
          </Suspense>
        )}

        {/* Compact Floating Seat View Bar (Bottom-center in Seat View) */}
        {isInSeatView && <SeatViewBar />}

        {/* Floating Cart Bar in Overview Mode (when seats are selected) */}
        {!isInSeatView && selectedSeats.length > 0 && !isLiteMode && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-auto">
            <div className="glass-panel-glow px-4 sm:px-6 py-3 rounded-2xl sm:rounded-pill shadow-2xl flex items-center justify-between gap-4 border border-white/15 animate-fadeIn">
              <div className="flex items-center gap-3 overflow-x-auto">
                <div className="w-8 h-8 rounded-full bg-crimson/20 border border-crimson/50 flex items-center justify-center text-crimson shrink-0 shadow-glow-crimson">
                  <Ticket className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">
                      {selectedSeats.length} {t('seats_selected')}
                    </span>
                    <span className="text-muted text-xs">•</span>
                    <span className="text-emerald-400 font-bold text-xs sm:text-sm">
                      {formatPrice(totalNPR, language)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 overflow-x-auto max-w-[280px] sm:max-w-xs py-0.5 scrollbar-none">
                    {selectedSeats.map((s) => {
                      const seatKey = getSeatId(s);
                      // Stand / Block prefix, e.g. "P1 · A1", "East · A1", "Audi 1 · K6"
                      const prefix = s.blockLabel
                        ? s.blockLabel
                        : s.standName
                          ? s.standName.replace(' Stand', '').replace('— Lower', '').replace('— Upper', '').trim()
                          : s.sectionId;
                      const chipText = `${prefix} · ${s.row}${s.number}`;
                      const fullDetail = `${s.standName || s.sectionId}${s.blockLabel ? ` · Block ${s.blockLabel}` : ''} · Row ${s.row} · Seat ${s.number} · ${formatPrice(s.priceNPR, language)} (${s.tier})`;

                      return (
                        <div key={seatKey} className="group relative shrink-0">
                          <span
                            title={fullDetail}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span className="font-semibold">{chipText}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSeat(s);
                              }}
                              className="text-white/60 hover:text-red-400 p-0.5 rounded hover:bg-white/10 transition-colors"
                              aria-label={`Remove seat ${chipText}`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                          {/* Rich Floating Tooltip on Hover / Focus */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none whitespace-nowrap px-2.5 py-1 rounded-md bg-[#0e111a]/95 border border-white/20 text-[10px] text-white shadow-2xl backdrop-blur-md">
                            {fullDetail}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setView('checkout')}
                className="px-5 py-2.5 rounded-pill bg-crimson hover:bg-crimson-dark text-white text-xs font-bold shadow-glow-crimson transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <span>{t('continue_to_checkout')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Offline banner */}
      {isOffline && <OfflineBanner onRetry={() => window.location.reload()} />}
    </div>
  );
};
