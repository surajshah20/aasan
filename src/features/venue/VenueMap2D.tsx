import React, { useMemo, useState } from 'react';
import { Section, VenueType } from '../../types';
import { useBookingStore, getSeatId } from '../../store/useBookingStore';
import { useT } from '../../i18n/useT';
import { Tv, ChevronRight, ArrowLeft, Check, X, Sparkles } from 'lucide-react';
import { buildStadiumDrillDownData } from './stadiumDrillDownData';

interface VenueMap2DProps {
  type: VenueType;
  sections: Section[];
  onSelectSection: (sectionId: string) => void;
}

export const VenueMap2D: React.FC<VenueMap2DProps> = ({
  type,
  sections,
  onSelectSection,
}) => {
  const { t, language } = useT();
  const {
    activeSectionId,
    hoveredSectionId,
    setHoveredSection,
    stadiumLevel,
    selectedStandId,
    selectedBlockId,
    selectStand,
    selectBlock,
    drillBack,
    selectedSeats,
    toggleSeat,
    getSoldSeatKeys,
    maxSeats,
  } = useBookingStore();

  const [announcement, setAnnouncement] = useState<string>('');

  const soldKeys = useMemo(() => getSoldSeatKeys(), [getSoldSeatKeys]);

  const { stands, standsMap, blocksMap, lowerSeatsData, upperSeatsData } = useMemo(() => {
    return buildStadiumDrillDownData(sections, soldKeys);
  }, [sections, soldKeys]);

  const allSeats = useMemo(() => {
    return [...lowerSeatsData, ...upperSeatsData];
  }, [lowerSeatsData, upperSeatsData]);

  if (type === 'cinema') {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 select-none">
        {/* Curved Screen Indicator */}
        <div className="w-full max-w-md mb-8 flex flex-col items-center">
          <div className="relative w-4/5 h-6 mb-2">
            <svg viewBox="0 0 400 40" className="w-full h-full overflow-visible">
              <path
                d="M 20 30 Q 200 5 380 30"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="6"
                strokeLinecap="round"
                className="filter drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]"
              />
            </svg>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-sky-400 font-bold tracking-widest uppercase">
            <Tv className="w-3.5 h-3.5" />
            <span>{t('screen_this_way')}</span>
          </div>
        </div>

        {/* 2D Cinema Tiers */}
        <div className="w-full max-w-lg space-y-4">
          {sections.map((section) => {
            const isSelected = activeSectionId === section.id;
            const isHovered = hoveredSectionId === section.id;

            return (
              <div
                key={section.id}
                onClick={() => onSelectSection(section.id)}
                onMouseEnter={() => setHoveredSection(section.id)}
                onMouseLeave={() => setHoveredSection(null)}
                className={`relative p-5 rounded-2xl cursor-pointer border transition-all duration-300 ${
                  isSelected
                    ? 'bg-crimson/20 border-crimson shadow-glow-crimson'
                    : isHovered
                    ? 'bg-white/10 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)]'
                    : 'bg-surface-elevated/80 border-white/10 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: section.color || '#3b82f6' }}
                    />
                    <span className="font-bold text-sm sm:text-base text-white">
                      {section.name[language]}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-muted">
                      {section.tier}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-400">
                    रू {section.priceNPR}
                  </span>
                </div>

                <div className="space-y-1.5 opacity-80">
                  {Array.from({ length: Math.min(section.rows, 3) }).map((_, rIdx) => (
                    <div key={rIdx} className="flex justify-center items-center gap-1">
                      {Array.from({ length: 14 }).map((_, sIdx) => (
                        <div
                          key={sIdx}
                          className={`w-3 h-2 rounded-t-sm ${
                            sIdx === 7 ? 'mr-3' : ''
                          } ${
                            isSelected
                              ? 'bg-crimson'
                              : isHovered
                              ? 'bg-sky-400'
                              : 'bg-white/20'
                          }`}
                        />
                      ))}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
                  <span>{section.rows} rows • {section.seatsPerRow} seats/row</span>
                  <span className="text-sky-400 font-medium">Click to pick seats &rarr;</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── STADIUM 2D / LITE MODE WITH DRILL-DOWN HIERARCHY ───
  const currentStand = selectedStandId ? standsMap.get(selectedStandId) : null;
  const currentBlock = selectedBlockId ? blocksMap.get(selectedBlockId) : null;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 select-none">
      {/* 2D Breadcrumb Bar */}
      <nav aria-label="Stadium Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-white/90">
        {stadiumLevel !== 'overview' && (
          <button
            onClick={drillBack}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all mr-1"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => selectStand(null)}
          className={`font-semibold hover:text-white ${
            stadiumLevel === 'overview' ? 'text-primary font-bold' : 'text-white/60'
          }`}
        >
          Stadium
        </button>
        {currentStand && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-white/30" />
            <button
              onClick={() => selectBlock(null)}
              className={`font-semibold hover:text-white ${
                stadiumLevel === 'stand' ? 'text-primary font-bold' : 'text-white/60'
              }`}
            >
              {currentStand.nameEn}
            </button>
          </>
        )}
        {currentBlock && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-white/30" />
            <span className="text-amber-400 font-bold">
              Block {currentBlock.label}
            </span>
          </>
        )}
      </nav>

      {/* LEVEL 1 (Overview): 16 Clickable Stands */}
      {stadiumLevel === 'overview' && (
        <div>
          <h2 className="text-base font-bold text-white mb-2">Select a Stand / Tier</h2>
          <p className="text-xs text-muted mb-4">Choose from the 16 stadium sections around the pitch.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stands.map((st) => (
              <div
                key={st.id}
                role="button"
                tabIndex={0}
                onClick={() => selectStand(st.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') selectStand(st.id);
                }}
                className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: st.color }} />
                  <span className="font-bold text-xs sm:text-sm text-white group-hover:text-primary transition-colors">
                    {st.nameEn}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>{st.blocks.length} Blocks • {st.tierType.toUpperCase()}</span>
                  <span className="font-bold text-emerald-400">NPR {st.priceNPR}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEVEL 2 (Stand View): Blocks inside the Stand */}
      {stadiumLevel === 'stand' && currentStand && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">{currentStand.nameEn}</h2>
              <p className="text-xs text-muted">Select a block to pick your seats (NPR {currentStand.priceNPR})</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary/20 border border-primary/40 text-primary font-semibold">
              {currentStand.tierType.toUpperCase()} TIER
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {currentStand.blocks.map((blk) => {
              const ratio = blk.availableSeats / (blk.totalSeats || 1);
              const statusText = ratio <= 0.1 ? 'Sold out' : ratio <= 0.4 ? 'Few left' : 'Plenty';
              const statusColor = ratio <= 0.1 ? 'bg-slate-700 text-slate-400' : ratio <= 0.4 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-400';

              return (
                <div
                  key={blk.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectBlock(blk.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') selectBlock(blk.id);
                  }}
                  className="p-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-amber-400/50 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">Block {blk.label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted">Rows {blk.rowStart}–{blk.rowEnd}</p>
                  <p className="text-[11px] text-white/80 mt-1">{blk.availableSeats} / {blk.totalSeats} seats</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LEVEL 3 (Block View): Tappable Accessible Seats Grid */}
      {stadiumLevel === 'block' && currentBlock && (
        <div role="region" aria-label={`Block ${currentBlock.label} Seats`}>
          {/* Live announcement region for Screen Readers */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {announcement}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Block {currentBlock.label} — {currentBlock.standName}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  NPR {currentBlock.priceNPR}
                </span>
              </h2>
              <p className="text-xs text-muted">
                Rows {currentBlock.rowStart} to {currentBlock.rowEnd} • Max {maxSeats} seats
              </p>
            </div>

            {/* "Best Available (2 seats)" quick picker */}
            <button
              onClick={() => {
                const availableInBlock = allSeats.filter(
                  (s) => s.blockId === currentBlock.id && !soldKeys.includes(`${s.row}-${s.number}`)
                );
                const unselected = availableInBlock.filter(
                  (s) => !selectedSeats.some((sel) => getSeatId(sel) === getSeatId(s))
                );
                const toPick = unselected.slice(0, Math.min(2, maxSeats - selectedSeats.length));
                toPick.forEach((seat) => {
                  toggleSeat({
                    sectionId: seat.sectionId,
                    standId: seat.standId,
                    standName: seat.standName,
                    blockId: seat.blockId,
                    blockLabel: seat.blockLabel,
                    row: seat.row,
                    number: seat.number,
                    priceNPR: seat.priceNPR,
                    tier: seat.tier,
                  });
                });
                if (toPick.length > 0) {
                  setAnnouncement(`Selected ${toPick.length} best available seats in Block ${currentBlock.label}.`);
                }
              }}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{language === 'ne' ? 'उत्कृष्ट २ सिट छान्नुहोस्' : 'Best Available (2 Seats)'}</span>
            </button>
          </div>

          {/* Accessible Legend without color alone */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mb-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
            <span className="text-muted font-bold text-[11px]">LEGEND:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-white/10 border border-white/30 flex items-center justify-center text-[10px] font-bold text-white">1</div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-[#dc143c] border-2 border-white flex items-center justify-center text-white"><Check className="w-3 h-3" /></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-500"><X className="w-2.5 h-2.5" /></div>
              <span>Sold out</span>
            </div>
          </div>

          {/* Seat Grid with full ARIA & keyboard focus */}
          <div 
            role="grid" 
            aria-label={`Block ${currentBlock.label} Seats Grid`} 
            className="p-4 rounded-2xl bg-[#080c16] border border-white/10 space-y-3"
          >
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'P']
              .filter((r) => r >= currentBlock.rowStart && r <= currentBlock.rowEnd)
              .map((rowLetter) => {
                const rowSeats = allSeats.filter(
                  (s) => s.blockId === currentBlock.id && s.row === rowLetter
                );
                if (rowSeats.length === 0) return null;

                return (
                  <div key={rowLetter} role="row" className="flex items-center gap-2">
                    <span 
                      className="w-8 text-xs font-bold text-muted text-right select-none"
                      aria-label={`Row ${rowLetter}`}
                    >
                      {rowLetter}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 flex-1">
                      {rowSeats.map((seat) => {
                        const seatKey = `${seat.row}-${seat.number}`;
                        const isSold = soldKeys.includes(seatKey);
                        const isSelected = selectedSeats.some(
                          (sel) => getSeatId(sel) === getSeatId(seat)
                        );

                        const ariaLabel = `Row ${seat.row}, seat ${seat.number}, ${isSold ? 'sold' : isSelected ? 'selected' : 'available'}, NPR ${seat.priceNPR}`;

                        return (
                          <button
                            key={seat.instanceId}
                            role="gridcell"
                            tabIndex={isSold ? -1 : 0}
                            disabled={isSold}
                            aria-selected={isSelected}
                            aria-label={ariaLabel}
                            onClick={() => {
                              const outcome = toggleSeat({
                                sectionId: seat.sectionId,
                                standId: seat.standId,
                                standName: seat.standName,
                                blockId: seat.blockId,
                                blockLabel: seat.blockLabel,
                                row: seat.row,
                                number: seat.number,
                                priceNPR: seat.priceNPR,
                                tier: seat.tier,
                              });
                              setAnnouncement(
                                isSelected
                                  ? `Row ${seat.row}, seat ${seat.number} removed`
                                  : outcome.success
                                  ? `Row ${seat.row}, seat ${seat.number}, ${seat.tier}, NPR ${seat.priceNPR}, selected`
                                  : `Seat limit of ${maxSeats} reached.`
                              );
                            }}
                            className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center cursor-pointer focus:ring-2 focus:ring-amber-400 focus:outline-none ${
                              isSelected
                                ? 'bg-[#dc143c] text-white border-2 border-white font-black shadow-glow-crimson scale-105'
                                : isSold
                                ? 'bg-slate-900 border border-slate-700/60 text-slate-500 cursor-not-allowed line-through'
                                : 'bg-white/10 hover:bg-white/20 text-white/90 border border-white/25 active:scale-95'
                            }`}
                            title={ariaLabel}
                          >
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : isSold ? (
                              <X className="w-2.5 h-2.5 text-slate-500" />
                            ) : (
                              seat.number
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};
