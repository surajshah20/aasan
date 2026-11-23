import React, { useState } from 'react';
import { Section, SelectedSeat } from '../../types';
import { useBookingStore } from '../../store/useBookingStore';
import { useT } from '../../i18n/useT';
import { formatPrice } from '../../lib/money';
import { 
  Check, 
  X, 
  Accessibility, 
  AlertCircle, 
  ArrowRight, 
  Trash2
} from 'lucide-react';

interface SeatPickerProps {
  section: Section;
  onProceedToCheckout: () => void;
}

export const SeatPicker: React.FC<SeatPickerProps> = ({
  section,
  onProceedToCheckout,
}) => {
  const { t, language } = useT();
  const { selectedSeats, toggleSeat, clearSeats, getSoldSeatKeys } = useBookingStore();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const soldKeys = getSoldSeatKeys();
  const startLetterCode = (section.startRowLetter || 'A').charCodeAt(0);

  // Compute total for currently selected seats
  const totalAmount = selectedSeats.reduce((sum, s) => sum + s.priceNPR, 0);

  const handleSeatClick = (rowLetter: string, seatNum: number, isSold: boolean) => {
    if (isSold) return;

    const seatItem: SelectedSeat = {
      sectionId: section.id,
      row: rowLetter,
      number: seatNum,
      priceNPR: section.priceNPR,
      tier: section.tier,
    };

    const res = toggleSeat(seatItem);
    if (!res.success && res.reason === 'max_reached') {
      setToastMessage(t('max_seats_alert'));
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  return (
    <div className="w-full flex flex-col items-center select-none pb-28">
      {/* Toast Warning */}
      {toastMessage && (
        <div className="fixed top-20 z-50 flex items-center gap-2 bg-amber-500/90 text-black px-4 py-2.5 rounded-full font-semibold text-xs shadow-2xl animate-bounce">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Orientation Indicator */}
      <div className="w-full max-w-xl mx-auto mb-8 text-center">
        <div className="h-1.5 w-4/5 mx-auto bg-gradient-to-r from-transparent via-sky-400 to-transparent rounded-full shadow-[0_0_15px_rgba(56,189,248,0.8)] mb-2" />
        <p className="text-[11px] text-muted tracking-widest uppercase font-bold">
          {t('screen_this_way')}
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-8 text-xs text-muted bg-white/[0.03] px-6 py-2.5 rounded-pill border border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-surface-border border border-white/20 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          </div>
          <span>{t('seat_available')}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-crimson text-white flex items-center justify-center shadow-glow-crimson">
            <Check className="w-3 h-3" />
          </div>
          <span className="text-white font-medium">{t('seat_selected')}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white/5 border border-white/5 opacity-40 flex items-center justify-center">
            <X className="w-3 h-3 text-muted" />
          </div>
          <span>{t('seat_sold')}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-sky-950/60 border border-sky-500/50 text-sky-400 flex items-center justify-center">
            <Accessibility className="w-3 h-3" />
          </div>
          <span>{t('seat_accessible')}</span>
        </div>
      </div>

      {/* Interactive Seat Rows */}
      <div className="w-full max-w-3xl overflow-x-auto py-2 px-4 flex flex-col items-center">
        <div className="space-y-3 min-w-max">
          {Array.from({ length: section.rows }).map((_, rIdx) => {
            const rowLetter = String.fromCharCode(startLetterCode + rIdx);
            const halfSeats = Math.ceil(section.seatsPerRow / 2);

            return (
              <div key={rowLetter} className="flex items-center gap-3 sm:gap-4">
                {/* Left Row Letter */}
                <span className="w-6 text-center text-xs font-bold text-muted/70">
                  {rowLetter}
                </span>

                {/* Left Block of Seats */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {Array.from({ length: halfSeats }).map((_, sIdx) => {
                    const seatNum = sIdx + 1;
                    const seatKey = `${rowLetter}-${seatNum}`;
                    const isSold = soldKeys.includes(seatKey);
                    const isSelected = selectedSeats.some(
                      (s) => s.sectionId === section.id && s.row === rowLetter && s.number === seatNum
                    );
                    const isAccessible = sIdx === 0 && rIdx === 0;

                    return (
                      <button
                        key={seatNum}
                        onClick={() => handleSeatClick(rowLetter, seatNum, isSold)}
                        disabled={isSold}
                        aria-label={`Row ${rowLetter} seat ${seatNum}, ${
                          isSold ? 'Sold' : isSelected ? 'Selected' : 'Available'
                        }, ${formatPrice(section.priceNPR, language)}`}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                          isSold
                            ? 'bg-white/[0.04] text-white/20 border border-white/5 cursor-not-allowed'
                            : isSelected
                            ? 'bg-crimson text-white border border-red-400 shadow-glow-crimson scale-105'
                            : isAccessible
                            ? 'bg-sky-950/40 border border-sky-500/40 text-sky-300 hover:bg-sky-900/60'
                            : 'bg-surface-elevated hover:bg-white/15 border border-white/10 hover:border-white/30 text-text/80'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        ) : isSold ? (
                          <X className="w-3 h-3 opacity-30" />
                        ) : isAccessible ? (
                          <Accessibility className="w-3.5 h-3.5 text-sky-400" />
                        ) : (
                          seatNum
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Center Aisle Spacer */}
                <div className="w-6 sm:w-10 text-center text-[10px] text-muted/30 font-mono">
                  ••
                </div>

                {/* Right Block of Seats */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {Array.from({ length: section.seatsPerRow - halfSeats }).map((_, sIdx) => {
                    const seatNum = halfSeats + sIdx + 1;
                    const seatKey = `${rowLetter}-${seatNum}`;
                    const isSold = soldKeys.includes(seatKey);
                    const isSelected = selectedSeats.some(
                      (s) => s.sectionId === section.id && s.row === rowLetter && s.number === seatNum
                    );

                    return (
                      <button
                        key={seatNum}
                        onClick={() => handleSeatClick(rowLetter, seatNum, isSold)}
                        disabled={isSold}
                        aria-label={`Row ${rowLetter} seat ${seatNum}, ${
                          isSold ? 'Sold' : isSelected ? 'Selected' : 'Available'
                        }, ${formatPrice(section.priceNPR, language)}`}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                          isSold
                            ? 'bg-white/[0.04] text-white/20 border border-white/5 cursor-not-allowed'
                            : isSelected
                            ? 'bg-crimson text-white border border-red-400 shadow-glow-crimson scale-105'
                            : 'bg-surface-elevated hover:bg-white/15 border border-white/10 hover:border-white/30 text-text/80'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        ) : isSold ? (
                          <X className="w-3 h-3 opacity-30" />
                        ) : (
                          seatNum
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right Row Letter */}
                <span className="w-6 text-center text-xs font-bold text-muted/70">
                  {rowLetter}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Bottom Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 glass-panel-glow border-t border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Selected Seats Pills */}
          <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto py-1">
            <div className="shrink-0 text-xs text-muted">
              <span className="font-bold text-white text-sm">
                {selectedSeats.length}
              </span>{' '}
              / 8 {t('seats_selected')}:
            </div>

            {selectedSeats.length === 0 ? (
              <span className="text-xs text-muted/60 italic">
                {t('no_seats_selected')}
              </span>
            ) : (
              <div className="flex items-center gap-1.5 flex-nowrap">
                {selectedSeats.map((seat) => (
                  <span
                    key={`${seat.row}-${seat.number}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-crimson/20 border border-crimson/40 text-text text-xs font-semibold"
                  >
                    <span>{seat.row}{seat.number}</span>
                    <button
                      onClick={() => toggleSeat(seat)}
                      className="text-white/60 hover:text-white"
                      title="Remove seat"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={clearSeats}
                  className="p-1 rounded text-muted hover:text-white"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Price & Checkout Action */}
          <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto">
            <div className="text-right">
              <p className="text-[10px] uppercase text-muted tracking-wider">
                {t('total')}
              </p>
              <p className="text-lg sm:text-xl font-display font-extrabold text-white">
                {formatPrice(totalAmount, language)}
              </p>
            </div>

            <button
              onClick={onProceedToCheckout}
              disabled={selectedSeats.length === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-xs sm:text-sm shadow-xl transition-all ${
                selectedSeats.length > 0
                  ? 'bg-crimson hover:bg-crimson-dark text-white shadow-glow-crimson hover:translate-x-0.5 active:scale-95'
                  : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5'
              }`}
            >
              <span>{t('continue_to_checkout')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
