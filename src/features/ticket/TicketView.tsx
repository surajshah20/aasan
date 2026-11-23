import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { useBookingStore } from '../../store/useBookingStore';
import { useT } from '../../i18n/useT';
import { formatPrice } from '../../lib/money';
import venuesData from '../../data/venues.json';
import eventsData from '../../data/events.json';
import { Venue, EventItem } from '../../types';
import { 
  CheckCircle, 
  Download, 
  Calendar, 
  MapPin, 
  Sparkles,
  Ticket as TicketIcon
} from 'lucide-react';

export const TicketView: React.FC = () => {
  const { t, language } = useT();
  const { bookingResult, resetAll } = useBookingStore();
  const ticketCardRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadTicket = () => {
    // Generate an image or trigger print
    window.print();
  };

  return (
    <div className="min-h-[calc(100vh-65px)] max-w-2xl mx-auto px-4 sm:px-8 py-10 flex flex-col items-center">
      {/* Success Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-pill bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
        <CheckCircle className="w-4 h-4" />
        <span>{t('booking_confirmed')}</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white text-center mb-2">
        {t('ticket_title')}
      </h1>
      <p className="text-xs text-muted text-center max-w-md mb-8">
        {t('show_qr_instruction')}
      </p>

      {/* Luxury Dark Ticket Card */}
      <div
        ref={ticketCardRef}
        className="w-full relative rounded-3xl bg-gradient-to-b from-[#181b28] via-[#121420] to-[#0d0f17] border border-white/10 shadow-2xl overflow-hidden mb-8"
      >
        {/* Ticket Header Graphic Bar */}
        <div className="h-3 w-full bg-gradient-to-r from-crimson via-nepalblue to-sky-400" />

        <div className="p-6 sm:p-8">
          {/* Top Row: Event & Booking ID */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-crimson font-bold">
                AASAN DIGITAL PASS
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                {event.title[language]}
              </h2>
              <p className="text-xs text-muted mt-1">{venue.name[language]}</p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-muted block uppercase">
                {t('booking_id')}
              </span>
              <span className="font-mono font-bold text-xs sm:text-sm text-text bg-white/5 px-2.5 py-1 rounded border border-white/10">
                {booking.id}
              </span>
            </div>
          </div>

          {/* Event Meta Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 mb-6 text-xs">
            <div>
              <p className="text-[10px] uppercase text-muted font-semibold mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-sky-400" />
                <span>{t('date_and_time')}</span>
              </p>
              <p className="font-semibold text-text">{event.dateISO}</p>
              <p className="text-muted">{event.time}</p>
            </div>

            <div>
              <p className="text-[10px] uppercase text-muted font-semibold mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-crimson" />
                <span>{t('venue_location')}</span>
              </p>
              <p className="font-semibold text-text">{venue.city}</p>
              <p className="text-muted">{venue.location}</p>
            </div>
          </div>

          {/* Selected Seats Badges */}
          <div className="mb-6">
            <p className="text-[10px] uppercase text-muted font-bold tracking-wider mb-2">
              {t('selected_seats_label')} ({booking.seats.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {booking.seats.map((seat) => (
                <div
                  key={`${seat.row}-${seat.number}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-crimson/15 border border-crimson/40 text-white font-semibold text-xs"
                >
                  <TicketIcon className="w-3.5 h-3.5 text-crimson" />
                  <span>Row {seat.row} • Seat #{seat.number}</span>
                  <span className="text-[10px] text-white/60">({seat.tier})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ticket Perforation Dashed Line */}
          <div className="relative my-6 flex items-center justify-between">
            <div className="w-6 h-6 rounded-full bg-bg -ml-9 border-r border-white/10" />
            <div className="flex-1 border-b-2 border-dashed border-white/10 mx-2" />
            <div className="w-6 h-6 rounded-full bg-bg -mr-9 border-l border-white/10" />
          </div>

          {/* Bottom QR Section */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
            <div className="bg-white p-3 rounded-2xl shadow-xl flex items-center justify-center">
              <QRCodeSVG
                value={`https://aasan.np/verify?id=${booking.id}`}
                size={110}
                level="M"
                bgColor="#ffffff"
                fgColor="#0a0b10"
              />
            </div>

            <div className="flex-1 text-center sm:text-left text-xs">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-400 font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Verified Digital Ticket</span>
              </div>
              <p className="text-muted text-[11px] leading-relaxed mb-2">
                Paid via {booking.paymentMethod.toUpperCase()} (Demo Mode). Total:{' '}
                <span className="font-bold text-white">
                  {formatPrice(booking.totalNPR, language)}
                </span>
              </p>
              <p className="text-[10px] text-muted/60 font-mono">
                NON-TRANSFERABLE • GATE SCAN REQUIRED
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Action Buttons */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <button
          onClick={handleDownloadTicket}
          className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all active:scale-98"
        >
          <Download className="w-4 h-4 text-sky-400" />
          <span>{t('download_ticket')}</span>
        </button>

        <button
          onClick={resetAll}
          className="flex-1 py-3 px-4 rounded-xl bg-crimson hover:bg-crimson-dark text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-glow-crimson transition-all active:scale-98"
        >
          <span>{t('book_another')}</span>
        </button>
      </div>
    </div>
  );
};
