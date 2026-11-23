import React from 'react';
import { useBookingStore } from '../../store/useBookingStore';
import { useT } from '../../i18n/useT';
import { formatPrice } from '../../lib/money';
import { ArrowLeft, Plus, Ticket, Armchair } from 'lucide-react';

export const SeatViewBar: React.FC = () => {
  const { language } = useT();
  const { activeSeat, returnToOverview, bookCurrentSeat, addAnotherSeat, selectedSeats } = useBookingStore();

  if (!activeSeat) return null;

  const isRecliner = activeSeat.tier.toLowerCase().includes('recliner');
  const isPremium = activeSeat.tier.toLowerCase().includes('premium') || activeSeat.tier.toLowerCase().includes('club');

  const tierBadgeBg = isRecliner
    ? 'bg-rose-950/70 border-rose-500/50 text-rose-300'
    : isPremium
      ? 'bg-amber-950/70 border-amber-500/50 text-amber-300'
      : 'bg-sky-950/70 border-sky-500/50 text-sky-300';

  return (
    <div className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-3 pointer-events-auto animate-fadeIn">
      <div className="px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl sm:rounded-pill shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 border border-white/15 bg-[#060810]/60 backdrop-blur-3xl">
        {/* Seat Information Pill */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <Armchair className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-white text-xs sm:text-sm tracking-wide whitespace-nowrap">
                {activeSeat.sectionName}
              </span>
              <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 rounded-full border font-semibold uppercase tracking-wider whitespace-nowrap ${tierBadgeBg}`}>
                {activeSeat.tier}
              </span>
              {activeSeat.isRestrictedView && (
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.2 rounded-full border border-amber-500/50 bg-amber-950/80 text-amber-300 font-semibold uppercase tracking-wider whitespace-nowrap">
                  ⚠️ {language === 'ne' ? 'सीमित दृश्य' : 'Restricted view'}
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-muted flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
              <span>Row <strong className="text-white font-semibold">{activeSeat.row}</strong></span>
              <span>•</span>
              <span>Seat <strong className="text-white font-semibold">#{activeSeat.number}</strong></span>
              <span>•</span>
              <span className="text-amber-300 font-bold">
                {formatPrice(activeSeat.priceNPR, language)}
              </span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-end shrink-0">
          {/* Other Seats (Fly Back to Overview) */}
          <button
            onClick={returnToOverview}
            className="flex-1 sm:flex-none px-3 py-1.5 sm:py-2 rounded-pill bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-[11px] sm:text-xs font-semibold border border-white/15 transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap backdrop-blur-md"
            title="Return to venue overview"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{language === 'ne' ? 'अन्य सिटहरू' : 'Other seats'}</span>
          </button>

          {/* Add Another Seat */}
          {selectedSeats.length >= 8 ? (
            <button
              disabled
              className="flex-1 sm:flex-none px-3 py-1.5 sm:py-2 rounded-pill bg-white/5 text-white/40 text-[11px] sm:text-xs font-medium border border-white/10 cursor-not-allowed flex items-center justify-center gap-1.5 whitespace-nowrap"
              title="Maximum of 8 seats reached"
            >
              <span>{language === 'ne' ? 'अधिकतम सिट सीमा (८)' : 'Seat limit reached (8)'}</span>
            </button>
          ) : (
            <button
              onClick={addAnotherSeat}
              className="flex-1 sm:flex-none px-3 py-1.5 sm:py-2 rounded-pill bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white text-[11px] sm:text-xs font-semibold border border-amber-500/40 transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap backdrop-blur-md"
              title="Add this seat and pick another"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'ne' ? '+ अर्को सिट' : '+ Add seat'}</span>
            </button>
          )}

          {/* Book this seat (Proceeds to Checkout) */}
          <button
            onClick={bookCurrentSeat}
            className="flex-1 sm:flex-none px-4 sm:px-5 py-1.5 sm:py-2 rounded-pill bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-[11px] sm:text-xs font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>{language === 'ne' ? 'यो सिट बुक गर्नुहोस्' : 'Book this seat'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
