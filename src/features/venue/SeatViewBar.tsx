import React, { useMemo } from 'react';
import { useBookingStore } from '../../store/useBookingStore';
import { useT } from '../../i18n/useT';
import { formatPrice } from '../../lib/money';
import { ArrowLeft, Plus, Ticket, Armchair } from 'lucide-react';

export const SeatViewBar: React.FC = () => {
  const { language } = useT();
  const { activeSeat, returnToOverview, bookCurrentSeat, addAnotherSeat, selectedSeats } = useBookingStore();

  const seatLine = useMemo(() => {
    if (!activeSeat) return '';
    let blockText = '';
    const rawBlock = activeSeat.blockLabel || activeSeat.blockId || '';
    if (rawBlock) {
      if (rawBlock.toLowerCase().startsWith('block ')) {
        blockText = rawBlock;
      } else if (rawBlock.includes('_b')) {
        const parts = rawBlock.split('_b');
        const prefix = parts[0].split('_')[0].toUpperCase();
        blockText = `Block ${prefix}${parts[1]}`;
      } else {
        blockText = `Block ${rawBlock}`;
      }
    } else if (activeSeat.standName?.toLowerCase().includes('pavilion')) {
      blockText = 'Block P1';
    }

    if (blockText) {
      return `${blockText} · Row ${activeSeat.row} · Seat ${activeSeat.number}`;
    }
    return `Row ${activeSeat.row} · Seat ${activeSeat.number}`;
  }, [activeSeat]);

  if (!activeSeat) return null;

  const tier = (activeSeat.tier || 'Standard').trim();
  const tierLower = tier.toLowerCase();
  const isVIP = tierLower.includes('vip');
  const isRecliner = tierLower.includes('recliner');
  const isPremium = tierLower.includes('premium') || tierLower.includes('club');

  const tierBadgeStyle = isVIP
    ? 'bg-amber-500/20 border-amber-400/50 text-amber-300 font-bold'
    : isRecliner
      ? 'bg-rose-500/20 border-rose-400/50 text-rose-300 font-semibold'
      : isPremium
        ? 'bg-purple-500/20 border-purple-400/50 text-purple-300 font-semibold'
        : 'bg-sky-500/15 border-sky-400/35 text-sky-300 font-medium';

  // Requirement 4 & 7: Neutral outline style (white 15% border, off-white text, min 44px touch target)
  const neutralBtnClass =
    'min-h-[44px] px-2 sm:px-4 py-2 rounded-xl md:rounded-pill bg-white/[0.08] hover:bg-white/[0.14] text-white/90 hover:text-white text-[11px] sm:text-xs font-semibold border border-white/15 transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap backdrop-blur-md shadow-sm shrink-0';

  // Requirement 4 & 7: "Book this seat" as the only filled, accent-colored button
  const bookBtnClass =
    'min-h-[44px] px-2.5 sm:px-5 py-2 rounded-xl md:rounded-pill bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-[11px] sm:text-xs font-bold shadow-lg shadow-amber-500/25 transition-all active:scale-95 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0';

  const disabledLimitBtnClass =
    'min-h-[44px] px-2 sm:px-4 py-2 rounded-xl md:rounded-pill bg-white/5 text-white/40 text-[10px] sm:text-xs font-medium border border-white/10 cursor-not-allowed flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap opacity-70 shrink-0';

  return (
    <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-2 sm:px-4 pointer-events-auto animate-fadeIn select-none flex justify-center">
      {/* Container: on mobile (< md) stacks info above buttons, on desktop is single horizontal pill */}
      <div className="w-full sm:w-auto px-3 sm:px-6 py-2 sm:py-2.5 rounded-2xl md:rounded-pill shadow-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 md:gap-5 border border-white/15 bg-[#060810]/90 backdrop-blur-3xl">
        
        {/* Seat Information & Price (Requirement 3 & 5) */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 w-full md:w-auto shrink-0 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
              <Armchair className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>

            <div className="min-w-0">
              {/* Title: Seat Name + Tier Badge (Requirement 2 & 5) */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-bold text-white text-xs sm:text-sm tracking-wide truncate max-w-[170px] sm:max-w-none">
                  {activeSeat.sectionName}
                </span>
                <span className={`text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full border uppercase tracking-wider whitespace-nowrap ${tierBadgeStyle}`}>
                  {tier}
                </span>
                {activeSeat.isRestrictedView && (
                  <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full border border-amber-500/50 bg-amber-950/80 text-amber-300 font-semibold uppercase tracking-wider whitespace-nowrap">
                    ⚠️ {language === 'ne' ? 'सीमित दृश्य' : 'Restricted view'}
                  </span>
                )}
              </div>

              {/* Requirement 3: "Block P1 · Row A · Seat 1" (no hash sign) */}
              <p className="text-[11px] sm:text-xs text-muted flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                <span className="font-medium text-slate-300">{seatLine}</span>
              </p>
            </div>
          </div>

          {/* Requirement 5: Price larger (~18-20 px), in accent color, on right of seat info */}
          <div className="pl-2 sm:pl-4 md:border-l md:border-white/15 shrink-0 text-right md:text-left">
            <span className="text-[17px] sm:text-[20px] leading-none font-extrabold text-amber-400 tracking-tight whitespace-nowrap">
              {formatPrice(activeSeat.priceNPR, language)}
            </span>
          </div>
        </div>

        {/* Action Buttons (Requirement 1, 4, 6, 7) */}
        <div className="grid grid-cols-3 md:flex items-center gap-1.5 sm:gap-2 w-full md:w-auto justify-end shrink-0">
          {/* Other Seats (Fly Back to Block/Overview) */}
          <button
            onClick={returnToOverview}
            className={`w-full md:w-auto ${neutralBtnClass}`}
            title="Return to overview"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-white/80 shrink-0" />
            <span className="truncate">{language === 'ne' ? 'अन्य सिट' : 'Other seats'}</span>
          </button>

          {/* Requirement 1 & 6: Add Seat with one plus icon, or disabled limit reached (8) */}
          {selectedSeats.length >= 8 ? (
            <button
              disabled
              className={`w-full md:w-auto ${disabledLimitBtnClass}`}
              title="Maximum of 8 seats reached"
            >
              <span className="truncate">{language === 'ne' ? 'सीमा पुग्यो (८)' : 'Seat limit reached (8)'}</span>
            </button>
          ) : (
            <button
              onClick={addAnotherSeat}
              className={`w-full md:w-auto ${neutralBtnClass}`}
              title="Add this seat and pick another"
            >
              {/* Requirement 1: Only ONE plus as an icon, no duplicate plus in label */}
              <Plus className="w-3.5 h-3.5 text-white/80 shrink-0" />
              <span className="truncate">{language === 'ne' ? 'अर्को सिट' : 'Add seat'}</span>
            </button>
          )}

          {/* Requirement 4: Book this seat (the only filled, accent-colored button) */}
          <button
            onClick={bookCurrentSeat}
            className={`w-full md:w-auto ${bookBtnClass}`}
          >
            <Ticket className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline truncate">{language === 'ne' ? 'बुक गर्नुहोस्' : 'Book this seat'}</span>
            <span className="sm:hidden truncate">{language === 'ne' ? 'बुक' : 'Book'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
