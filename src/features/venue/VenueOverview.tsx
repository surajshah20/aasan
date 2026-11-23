import React, { Suspense, lazy, useState, useEffect } from 'react';
import { useBookingStore } from '../../store/useBookingStore';
import { useT } from '../../i18n/useT';
import venuesData from '../../data/venues.json';
import { VenueMap2D } from './VenueMap2D';
import { SeatPicker } from '../seats/SeatPicker';
import { SeatViewBar } from './SeatViewBar';
import { formatPrice } from '../../lib/money';
import { Venue } from '../../types';
import { 
  ArrowLeft, 
  Eye, 
  Sparkles, 
  Loader2, 
  Ticket, 
  ArrowRight, 
  X, 
  ShieldCheck,
  Info
} from 'lucide-react';

const CinemaMap3D = lazy(() => import('./CinemaMap3D').then((m) => ({ default: m.CinemaMap3D })));
const StadiumMap3D = lazy(() => import('./StadiumMap3D').then((m) => ({ default: m.StadiumMap3D })));

export const VenueOverview: React.FC = () => {
  const { t, language } = useT();
  const {
    selectedVenueId,
    activeSectionId,
    activeSeat,
    cameraMode,
    isLiteMode,
    selectSection,
    backToOverview,
    setView,
    selectedSeats,
    toggleSeat,
  } = useBookingStore();

  const [hintVisible, setHintVisible] = useState(true);
  const [showInfoPopover, setShowInfoPopover] = useState(false);

  const venues = venuesData as unknown as Venue[];
  const currentVenue = venues.find((v) => v.id === selectedVenueId) || venues[0];

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

  return (
    <div 
      className="relative w-full h-full bg-bg overflow-hidden select-none"
      onPointerDown={() => {
        setHintVisible(false);
        setShowInfoPopover(false);
      }}
    >
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
          <span className="font-bold text-xs truncate max-w-[85px] sm:max-w-none">{activeSeat.sectionName}</span>
          <span className="text-white/30">•</span>
          <span className="text-white/80 text-xs whitespace-nowrap">
            <span className="hidden sm:inline">Row </span>{activeSeat.row} · #{activeSeat.number}
          </span>
          <span className="text-white/30">•</span>
          <span className="text-amber-400 font-bold text-xs shrink-0">
            {formatPrice(activeSeat.priceNPR, language)}
          </span>
        </div>
      )}

      {/* Floating Centered Hint Pill (Auto-fades after a few seconds or on interaction) */}
      {(isInSeatView || currentVenue.type === 'cinema') && (
        <div 
          className={`absolute top-14 sm:top-3.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none transition-all duration-700 ${
            hintVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95'
          }`}
        >
          <div className="px-3.5 py-1.5 rounded-full bg-[#060810]/75 backdrop-blur-xl border border-white/15 text-xs text-white/90 shadow-2xl flex items-center gap-2">
            {isInSeatView ? (
              <>
                <Eye className="w-3.5 h-3.5 text-crimson animate-pulse" />
                <span className="font-medium">{t('view_from_seat')}</span>
                <span className="text-white/30">•</span>
                <span className="text-white/70 text-[11px] hidden sm:inline">
                  {language === 'ne' ? 'हेर्नका लागि दायाँ-बायाँ घुमाउनुहोस् (±६०°)' : 'Drag to look around (±60°)'}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-white/80 text-xs">
                  {language === 'ne' ? 'सिटमा क्लिक गरी प्रत्यक्ष दृश्य हेर्नुहोस्' : 'Click any seat to fly into its view'}
                </span>
              </>
            )}
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

      {/* Main 3D / 2D Canvas Area (100% of remaining viewport) */}
      <div className="relative w-full h-full">
        {/* 2D Fallback for Lite Mode */}
        {isLiteMode ? (
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
          /* Standard 100% 3D Viewport */
          <Suspense
            fallback={
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-[#08090f]">
                <Loader2 className="w-8 h-8 text-crimson animate-spin" />
                <p className="text-xs text-muted font-medium tracking-wide">
                  {language === 'ne' ? '३D सिट नक्सा लोड हुँदैछ...' : 'Initializing 3D Venue View...'}
                </p>
              </div>
            }
          >
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
                  <div className="flex items-center gap-1 mt-0.5">
                    {selectedSeats.map((s) => (
                      <span
                        key={`${s.row}-${s.number}`}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white flex items-center gap-1"
                      >
                        <span>{s.row}{s.number}</span>
                        <button
                          onClick={() => toggleSeat(s)}
                          className="hover:text-red-400"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
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
    </div>
  );
};
