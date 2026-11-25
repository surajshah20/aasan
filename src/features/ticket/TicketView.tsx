import React, { useEffect, useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { useBookingStore } from '../../store/useBookingStore';
import { useT } from '../../i18n/useT';
import { formatPrice } from '../../lib/money';
import venuesData from '../../data/venues.json';
import eventsData from '../../data/events.json';
import { Venue, EventItem, SelectedSeat } from '../../types';
import { 
  FileText,
  Image,
  Download,
  Calendar, 
  MapPin, 
  Copy, 
  Check, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { 
  generateTicketPDF, 
  generateTicketPNGs, 
  createSingleTicketCanvas, 
  TicketGenData, 
  ProcessedSeatItem 
} from './ticketGenerator';

export const TicketView: React.FC = () => {
  const { t, language } = useT();
  const { bookingResult, resetAll, setView } = useBookingStore();
  const [copied, setCopied] = useState(false);
  const [activeCarouselIdx, setActiveCarouselIdx] = useState(0);

  const venues = venuesData as unknown as Venue[];
  const events = eventsData as unknown as EventItem[];

  const booking = bookingResult;
  const event = events.find((e) => e.id === booking?.eventId) || events[0];
  const venue = venues.find((v) => v.id === booking?.venueId) || venues[0];

  useEffect(() => {
    // Fire celebratory confetti on mount
    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#dc143c', '#003893', '#f4f1ea', '#38bdf8'],
      });
    } catch {
      // ignore
    }
  }, []);

  // Format Gateway with exact required capitalization: "eSewa", "Khalti", "Fonepay", "IME Pay"
  const formattedPaymentMethod = useMemo(() => {
    if (!booking) return 'eSewa';
    const method = (booking.paymentMethod || 'esewa').toLowerCase();
    switch (method) {
      case 'esewa':
        return 'eSewa';
      case 'khalti':
        return 'Khalti';
      case 'fonepay':
        return 'Fonepay';
      case 'imepay':
        return 'IME Pay';
      default:
        return 'eSewa';
    }
  }, [booking]);

  // Format Date and Time as "Sat, 28 Nov 2026 · 1:15 PM"
  const formattedDateTime = useMemo(() => {
    if (!event) return 'Sat, 28 Nov 2026 · 1:15 PM';
    try {
      const dateISO = event.dateISO || '2026-11-28';
      const [y, m, d] = dateISO.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayName = days[dateObj.getDay()] || 'Sat';
      const monthName = months[dateObj.getMonth()] || 'Nov';
      
      let timeClean = (event.time || '01:15 PM').trim();
      if (timeClean.startsWith('0')) {
        timeClean = timeClean.substring(1);
      }
      return `${dayName}, ${d} ${monthName} ${y} · ${timeClean}`;
    } catch {
      return `${event.dateISO} · ${event.time}`;
    }
  }, [event]);

  // Venue Name & Location (Real names, never repeating city twice)
  const { venueHeadline, venueSubline } = useMemo(() => {
    const isStadium = venue?.type === 'stadium' || venue?.id === 'tu_cricket_ground';
    if (isStadium) {
      return {
        venueHeadline: 'TU International Cricket Ground, Kirtipur',
        venueSubline: 'Tribhuvan University, Kirtipur, Kathmandu Valley',
      };
    }
    // Cinema: Hall and chain
    const chain = venue?.chain || 'QFX Cinemas';
    let rawVenueName = venue?.name?.[language] || venue?.name?.en || 'QFX Cinemas — Civil Mall';
    rawVenueName = rawVenueName.replace(/\s*\([^)]*Audi[^)]*\)/gi, '').replace(/\s*\([^)]*अडी[^)]*\)/gi, '').trim();
    const displayName = (rawVenueName.startsWith('QFX') || rawVenueName.toLowerCase().startsWith(chain.toLowerCase()))
      ? rawVenueName
      : `${chain} — ${rawVenueName}`;
    const hallName = event?.hallName ? event.hallName.split('(')[0].trim() : (language === 'ne' ? 'अडी १' : 'Audi 1');
    return {
      venueHeadline: `${displayName} (${hallName})`,
      venueSubline: venue?.location || `${venue?.city || 'Kathmandu'}, Nepal`,
    };
  }, [venue, event, language]);

  // Seats with exact standard formatting:
  // Stadium: "<Stand/Tier> · Block <id> · Row <letter> · Seat <number>" (e.g. "Grand Pavilion — Lower · Block P1 · Row A · Seat 1")
  // Cinema: "Audi 1 · Row <letter> · Seat <number>" (e.g. "Audi 1 · Row K · Seat 6")
  const processedSeats = useMemo<ProcessedSeatItem[]>(() => {
    if (!booking?.seats) return [];
    const isCinema = venue?.type === 'cinema';
    const cinemaHall = event?.hallName ? event.hallName.split('(')[0].trim() : 'Audi 1';

    return booking.seats.map((seat: SelectedSeat) => {
      if (isCinema) {
        const fullLabel = `${cinemaHall} · Row ${seat.row} · Seat ${seat.number}`;
        return {
          ...seat,
          standName: cinemaHall,
          blockLabel: cinemaHall,
          groupKey: cinemaHall,
          groupTitle: cinemaHall,
          fullLabel,
          shortSeat: `Row ${seat.row} · Seat ${seat.number}`,
          gateOrStand: cinemaHall,
          qrData: `${booking.id} · ${fullLabel}`,
        };
      }

      // Stadium stand & block resolution
      let stand = seat.standName;
      if (!stand) {
        const sec = (seat.sectionId || '').toLowerCase();
        if (sec.includes('pavilion')) stand = 'Grand Pavilion — Lower';
        else if (sec.includes('canopy')) stand = 'North Stand — VIP Canopy';
        else if (sec.includes('north_east')) stand = 'East Stand — Lower';
        else if (sec.includes('west')) stand = 'West Stand — Lower';
        else if (sec.includes('south_west')) stand = 'South-West Hill Stand';
        else stand = seat.tier ? `Stand — ${seat.tier}` : 'Grand Pavilion — Lower';
      }

      let block = seat.blockLabel || (seat.blockId ? `Block ${seat.blockId.toUpperCase()}` : 'Block P1');
      if (!block.toLowerCase().startsWith('block')) {
        block = `Block ${block}`;
      }

      const groupKey = `${stand} · ${block}`;
      const fullLabel = `${stand} · ${block} · Row ${seat.row} · Seat ${seat.number}`;
      const shortSeat = `Row ${seat.row} · Seat ${seat.number}`;
      const gateOrStand = block.toUpperCase();

      return {
        ...seat,
        standName: stand,
        blockLabel: block,
        groupKey,
        groupTitle: groupKey,
        fullLabel,
        shortSeat,
        gateOrStand,
        qrData: `${booking.id} · ${fullLabel}`,
      };
    });
  }, [booking, venue, event]);

  // Group seats by stand & block when seats are in different places
  const seatGroups = useMemo(() => {
    const map = new Map<string, typeof processedSeats>();
    processedSeats.forEach((seat) => {
      const existing = map.get(seat.groupKey) || [];
      existing.push(seat);
      map.set(seat.groupKey, existing);
    });
    return Array.from(map.entries()).map(([groupKey, seats]) => ({
      groupKey,
      groupTitle: seats[0]?.groupTitle || groupKey,
      seats,
    }));
  }, [processedSeats]);

  const handleCopyBookingId = async () => {
    if (!booking?.id) return;
    try {
      await navigator.clipboard.writeText(booking.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);

  const ticketData: TicketGenData = useMemo(() => ({
    booking: booking!,
    venue,
    event,
    seats: processedSeats,
    language,
    formattedPaymentMethod,
    formattedDateTime,
    venueHeadline,
    venueSubline,
  }), [booking, venue, event, processedSeats, language, formattedPaymentMethod, formattedDateTime, venueHeadline, venueSubline]);

  const handleDownloadPDF = async () => {
    if (!booking) return;
    setIsGenerating(true);
    try {
      await generateTicketPDF(ticketData);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveImages = async () => {
    if (!booking) return;
    setIsGenerating(true);
    try {
      await generateTicketPNGs(ticketData);
    } catch (err) {
      console.error('Error generating PNGs:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!booking) return;
    setIsGenerating(true);
    try {
      await generateTicketPDF(ticketData);
      await new Promise((r) => setTimeout(r, 400));
      await generateTicketPNGs(ticketData);
    } catch (err) {
      console.error('Error downloading all:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    (window as any).__generateTicketPDF = handleDownloadPDF;
    (window as any).__generateTicketPNGs = handleSaveImages;
    (window as any).__generateSingleTicketCanvas = (idx = 0) => createSingleTicketCanvas(ticketData, idx);
    (window as any).__ticketData = ticketData;
  }, [ticketData]);

  if (!booking) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted mb-4">No booking found.</p>
        <button
          onClick={resetAll}
          className="px-4 py-2 rounded-xl bg-crimson text-white text-xs font-semibold"
        >
          {t('back_to_home')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-65px)] max-w-2xl mx-auto px-4 sm:px-6 py-8 flex flex-col items-center select-none">
      {/* Header Back & Status */}
      <div className="w-full flex items-center justify-between mb-4">
        <button
          onClick={() => setView('venue')}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back_to_map') || 'Back'}</span>
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{t('booking_confirmed')}</span>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white text-center mb-1">
        Your Aasan Ticket
      </h1>
      {/* Requirement 4: Exact honest demo text */}
      <p className="text-xs text-amber-300/90 text-center max-w-md mb-6 flex items-center justify-center gap-1.5 font-medium">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span>Demo only. This ticket is not valid for entry.</span>
      </p>

      {/* Luxury Dark Ticket Card */}
      <div className="w-full relative rounded-3xl bg-gradient-to-b from-[#181b28] via-[#121420] to-[#0c0e17] border border-white/10 shadow-2xl overflow-hidden mb-8">
        
        {/* Requirement 7: Solid Crimson 3px Line at the top */}
        <div className="h-[3px] w-full bg-crimson" />

        {/* Requirement 4: Prominent Diagonal DEMO Mark Watermark across the Ticket */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
          <div className="rotate-[-25deg] transform border-4 border-crimson/35 bg-crimson/15 px-8 sm:px-14 py-3 sm:py-4 rounded-2xl shadow-2xl backdrop-blur-[1px] text-center">
            <span className="font-mono font-black text-xl sm:text-2xl tracking-[0.25em] text-white/90 drop-shadow block">
              DEMO — NOT VALID FOR ENTRY
            </span>
            <span className="text-[10px] sm:text-xs font-medium text-crimson-light tracking-wider block mt-0.5">
              डेमो टिकट • वास्तविक प्रवेशको लागि मान्य छैन
            </span>
          </div>
        </div>

        <div className="p-6 sm:p-8 relative z-0">
          {/* Top Row: Event & Requirement 1: Booking ID on ONE line in ONE pill, font-mono, with copy button, NEVER wraps */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="flex-1 min-w-0 pr-2">
              <span className="text-[10px] uppercase tracking-wider text-crimson font-bold block mb-1">
                AASAN DEMO PASS
              </span>
              <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight break-words">
                {event?.title?.[language] || event?.title?.en}
              </h2>
            </div>

            {/* Requirement 1: Monospace one-line pill with Copy button, whitespace-nowrap, never wraps */}
            <div className="flex items-center self-start flex-shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.09] border border-white/15 text-text font-mono text-xs sm:text-sm font-bold whitespace-nowrap flex-shrink-0 transition-colors shadow-sm">
                <span className="text-[10px] text-muted uppercase tracking-wider font-sans font-semibold mr-0.5">ID:</span>
                <span className="tracking-wider">{booking.id}</span>
                <button
                  type="button"
                  onClick={handleCopyBookingId}
                  className="ml-1 p-1 rounded-md hover:bg-white/15 text-slate-300 hover:text-white transition-all active:scale-90"
                  title="Copy Booking ID"
                  aria-label="Copy Booking ID"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 animate-scaleIn" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-muted hover:text-white" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Event Meta Grid - Requirement 2: Real venue name, no city twice; Requirement 6: formatted date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5 mb-6 text-xs">
            <div>
              <p className="text-[10px] uppercase text-muted font-bold tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('date_and_time')}</span>
              </p>
              {/* Requirement 6: "Sat, 28 Nov 2026 · 1:15 PM" */}
              <p className="font-bold text-white text-sm">{formattedDateTime}</p>
              <p className="text-[11px] text-muted mt-0.5">{event?.subtitle?.[language] || event?.subtitle?.en}</p>
            </div>

            <div>
              <p className="text-[10px] uppercase text-muted font-bold tracking-wider mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-crimson" />
                <span>{t('venue_location')}</span>
              </p>
              {/* Requirement 2: Real venue name ("TU International Cricket Ground, Kirtipur" or hall & chain) */}
              <p className="font-bold text-white text-sm leading-snug">{venueHeadline}</p>
              <p className="text-[11px] text-muted mt-0.5">{venueSubline}</p>
            </div>
          </div>

          {/* Requirement 3: Confirmed Seats List with exact formatting */}
          {/* "<Stand/Tier> · Block <id> · Row <letter> · Seat <number>" (for stadium) */}
          {/* "Audi 1 · Row <letter> · Seat <number>" (for cinema) */}
          {/* Grouped by stand and block when seats are in different places */}
          <div className="mb-6">
            <p className="text-[10px] uppercase text-muted font-bold tracking-wider mb-2.5 flex items-center justify-between">
              <span>{t('selected_seats_label')} ({processedSeats.length})</span>
              <span className="text-emerald-400 text-[11px] font-semibold">
                Total: {formatPrice(booking.totalNPR, language)}
              </span>
            </p>

            <div className="space-y-3">
              {seatGroups.map((group) => (
                <div key={group.groupKey} className="rounded-2xl bg-white/[0.02] border border-white/5 p-3">
                  {/* Stand & Block Header when grouping */}
                  <div className="flex items-center justify-between text-xs font-bold text-sky-400 mb-2">
                    <span className="pr-2 break-words" title={group.groupTitle}>{group.groupTitle}</span>
                    <span className="text-[10px] text-muted font-normal">
                      {group.seats.length} {group.seats.length === 1 ? 'seat' : 'seats'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {group.seats.map((seat) => (
                      <div
                        key={`${seat.row}-${seat.number}`}
                        className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-crimson/15 border border-crimson/35 text-white text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-crimson flex-shrink-0" />
                          <span className="font-semibold text-white tracking-wide text-xs sm:text-[13px] break-words">
                            {seat.fullLabel}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-emerald-300 font-semibold flex-shrink-0 whitespace-nowrap ml-2">
                          {formatPrice(seat.priceNPR, language)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket Perforation Dashed Line */}
          <div className="relative my-6 flex items-center justify-between">
            <div className="w-6 h-6 rounded-full bg-bg -ml-9 sm:-ml-11 border-r border-white/10" />
            <div className="flex-1 border-b-2 border-dashed border-white/15 mx-2" />
            <div className="w-6 h-6 rounded-full bg-bg -mr-9 sm:-mr-11 border-l border-white/10" />
          </div>

          {/* Requirement 5: Individual QR Code per seat + Carousel/Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted block">
                  DIGITAL PASS QR CODES
                </span>
                <span className="text-xs text-white/80">
                  {processedSeats.length > 1
                    ? `1 unique QR pass per seat (${processedSeats.length} total)`
                    : '1 digital QR pass'}
                </span>
              </div>

              {/* Carousel controls if more than 2 seats */}
              {processedSeats.length > 2 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveCarouselIdx((prev) => Math.max(0, prev - 1))}
                    disabled={activeCarouselIdx === 0}
                    className="p-1 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors"
                    aria-label="Previous QR"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono text-muted px-1.5">
                    {activeCarouselIdx + 1}/{processedSeats.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveCarouselIdx((prev) => Math.min(processedSeats.length - 1, prev + 1))}
                    disabled={activeCarouselIdx === processedSeats.length - 1}
                    className="p-1 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 disabled:pointer-events-none hover:bg-white/10 transition-colors"
                    aria-label="Next QR"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* QR Display: Grid if <= 2 seats, Carousel Card if > 2 seats */}
            {processedSeats.length <= 2 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {processedSeats.map((seat, sIdx) => (
                  <div
                    key={`qr-card-${sIdx}`}
                    className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col items-center text-center"
                  >
                    <div className="bg-white p-2.5 rounded-xl shadow-lg mb-2.5">
                      <QRCodeSVG
                        value={seat.qrData}
                        size={110}
                        level="M"
                        bgColor="#ffffff"
                        fgColor="#0a0b10"
                      />
                    </div>
                    <span className="font-bold text-white text-xs truncate max-w-full">
                      {seat.shortSeat}
                    </span>
                    <span className="text-[10px] text-muted truncate max-w-full">
                      {seat.groupKey}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              /* Carousel for multi-seat bookings */
              <div>
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center gap-5">
                  <div className="bg-white p-3 rounded-2xl shadow-xl flex-shrink-0">
                    <QRCodeSVG
                      value={processedSeats[activeCarouselIdx]?.qrData || ''}
                      size={120}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#0a0b10"
                    />
                  </div>

                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-crimson/20 border border-crimson/40 text-crimson-light text-[10px] font-bold uppercase mb-1">
                      Seat Pass {activeCarouselIdx + 1} of {processedSeats.length}
                    </div>
                    <h3 className="text-base font-bold text-white">
                      {processedSeats[activeCarouselIdx]?.shortSeat}
                    </h3>
                    <p className="text-xs text-sky-400 font-medium break-words mt-0.5">
                      {processedSeats[activeCarouselIdx]?.groupKey}
                    </p>
                    <p className="text-[11px] font-mono text-muted mt-1">
                      Ref: {booking.id}-S{activeCarouselIdx + 1}
                    </p>

                    {/* Quick seat jump dots */}
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-3">
                      {processedSeats.map((_, dotIdx) => (
                        <button
                          key={`dot-${dotIdx}`}
                          type="button"
                          onClick={() => setActiveCarouselIdx(dotIdx)}
                          className={`h-1.5 rounded-full transition-all ${
                            activeCarouselIdx === dotIdx ? 'w-5 bg-crimson' : 'w-1.5 bg-white/20 hover:bg-white/40'
                          }`}
                          aria-label={`Jump to seat ${dotIdx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Requirement 4: Demo Ticket Badge & Requirement 6: Proper Payment Method Casing */}
            <div className="mt-5 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Demo ticket</span>
              </div>

              <div className="text-center sm:text-right text-[11px] text-muted">
                <span>
                  Paid via <strong className="text-white">{formattedPaymentMethod}</strong> (Demo Mode) · Total:{' '}
                  <strong className="text-white">{formatPrice(booking.totalNPR, language)}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Action Buttons: Download PDF, Save images, Download all, and Book Another */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-xl no-print">
        <button
          id="btn-download-pdf"
          type="button"
          onClick={handleDownloadPDF}
          disabled={isGenerating}
          className="flex-1 min-w-[130px] py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/15 transition-all active:scale-98 shadow-sm"
        >
          <FileText className="w-4 h-4 text-sky-400" />
          <span>{isGenerating ? 'Generating...' : 'Download PDF'}</span>
        </button>

        <button
          id="btn-save-images"
          type="button"
          onClick={handleSaveImages}
          disabled={isGenerating}
          className="flex-1 min-w-[130px] py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/15 transition-all active:scale-98 shadow-sm"
        >
          <Image className="w-4 h-4 text-emerald-400" />
          <span>{isGenerating ? 'Generating...' : 'Save images'}</span>
        </button>

        <button
          id="btn-download-all"
          type="button"
          onClick={handleDownloadAll}
          disabled={isGenerating}
          className="flex-1 min-w-[130px] py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/15 transition-all active:scale-98 shadow-sm"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>{isGenerating ? 'Generating...' : 'Download all'}</span>
        </button>

        <button
          type="button"
          onClick={resetAll}
          className="w-full sm:w-auto py-3 px-5 rounded-xl bg-crimson hover:bg-crimson-dark text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-glow-crimson transition-all active:scale-98"
        >
          <span>{t('book_another')}</span>
        </button>
      </div>

      {/* Fallback Print View (only visible when window.print() is called) */}
      <div className="print-only">
        {processedSeats.map((seat, pIdx) => (
          <div key={`print-ticket-${pIdx}`} className="print-ticket-card">
            <div className="print-ticket-crimson-bar" />
            <div className="print-ticket-body">
              <div className="print-ticket-main">
                <div className="print-ticket-header">
                  <div>
                    <span className="print-badge">AASAN ELECTRONIC PASS</span>
                    <h2 className="print-title">{event?.title?.[language] || event?.title?.en}</h2>
                    <p className="print-venue">{venueHeadline} • {venueSubline}</p>
                    <p className="print-date">{formattedDateTime}</p>
                  </div>
                  <div className="print-booking-id">
                    <span>ID: {booking.id}</span>
                  </div>
                </div>

                <div className="print-seat-box">
                  <span className="print-seat-title">{seat.fullLabel}</span>
                </div>

                <div className="print-meta-row">
                  <div><strong>Price:</strong> {formatPrice(seat.priceNPR, language)}</div>
                  <div><strong>Payment:</strong> {formattedPaymentMethod}</div>
                  <div><strong>Status:</strong> DEMO TICKET — NOT VALID FOR ENTRY</div>
                </div>
              </div>

              <div className="print-ticket-stub">
                <div className="print-stub-badge">{seat.gateOrStand}</div>
                <div className="print-stub-seat">{seat.shortSeat}</div>
                <QRCodeSVG
                  value={seat.qrData}
                  size={100}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
                <div className="print-stub-id">{booking.id}</div>
              </div>
            </div>
          </div>
        ))}
        <div className="print-disclaimer">
          Demo concept. Not affiliated with any venue or cinema. Not valid for actual entry.
        </div>
      </div>
    </div>
  );
};