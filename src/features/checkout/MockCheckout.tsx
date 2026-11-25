import React, { useState } from 'react';
import { useBookingStore, getSeatId } from '../../store/useBookingStore';
import { useT } from '../../i18n/useT';
import { formatPrice } from '../../lib/money';
import venuesData from '../../data/venues.json';
import eventsData from '../../data/events.json';
import { Venue, EventItem, Booking } from '../../types';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowLeft,
  Lock
} from 'lucide-react';

export const MockCheckout: React.FC = () => {
  const { t, language } = useT();
  const {
    selectedVenueId,
    selectedEventId,
    selectedSeats,
    setView,
    completeBooking,
  } = useBookingStore();

  const [selectedGateway, setSelectedGateway] = useState<'esewa' | 'khalti' | 'fonepay' | 'imepay'>('esewa');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const venues = venuesData as unknown as Venue[];
  const events = eventsData as unknown as EventItem[];

  const venue = venues.find((v) => v.id === selectedVenueId) || venues[0];
  const event = events.find((e) => e.id === selectedEventId) || events[0];

  const totalNPR = selectedSeats.reduce((sum, s) => sum + s.priceNPR, 0);

  const gateways = [
    {
      id: 'esewa' as const,
      name: t('esewa'),
      color: '#60bb46',
      badge: 'eSewa Wallet',
    },
    {
      id: 'khalti' as const,
      name: t('khalti'),
      color: '#5c2d91',
      badge: 'Khalti Pay',
    },
    {
      id: 'fonepay' as const,
      name: t('fonepay'),
      color: '#e31b23',
      badge: 'QR & Mobile Banking',
    },
    {
      id: 'imepay' as const,
      name: t('imepay'),
      color: '#ed1c24',
      badge: 'IME Digital',
    },
  ];

  const handleSimulatePayment = (success: boolean) => {
    setIsProcessing(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsProcessing(false);
      if (success) {
        const newBooking: Booking = {
          id: `ASN-${Math.floor(100000 + Math.random() * 900000)}`,
          eventId: event.id,
          venueId: venue.id,
          seats: selectedSeats,
          totalNPR,
          paymentMethod: selectedGateway,
          createdAtISO: new Date().toISOString(),
          customerName: 'Aasan Guest User',
          customerPhone: '+977 98XXXXXXXX',
        };
        completeBooking(newBooking);
      } else {
        setErrorMessage(t('payment_failed'));
      }
    }, 1800);
  };

  return (
    <div className="min-h-[calc(100vh-65px)] max-w-4xl mx-auto px-4 sm:px-8 py-10">
      {/* Back button */}
      <button
        onClick={() => setView('venue')}
        className="flex items-center gap-2 text-xs text-muted hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('back_to_map')}</span>
      </button>

      {/* Demo Warning Banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-medium mb-8">
        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
        <div>
          <span className="font-bold">{t('demo_payment_warning')}.</span>{' '}
          <span>{t('demo_notice')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left: Payment Gateway Selector */}
        <div className="md:col-span-7 space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white mb-1">
              {t('checkout_title')}
            </h2>
            <p className="text-xs text-muted">
              {t('select_payment')}
            </p>
          </div>

          <div className="space-y-3">
            {gateways.map((gw) => {
              const isSelected = selectedGateway === gw.id;
              return (
                <div
                  key={gw.id}
                  onClick={() => {
                    setSelectedGateway(gw.id);
                    setErrorMessage(null);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-surface-elevated border-crimson shadow-glow-crimson'
                      : 'bg-surface/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-inner"
                      style={{ backgroundColor: gw.color }}
                    >
                      {gw.id.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white">{gw.name}</p>
                      <p className="text-xs text-muted">{gw.badge}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-crimson bg-crimson'
                          : 'border-white/30'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error Message if Simulation Failed */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Simulated Wallet Actions */}
          <div className="p-5 rounded-2xl bg-surface-elevated/80 border border-white/10 space-y-4">
            <div className="flex items-center justify-between text-xs text-muted pb-3 border-b border-white/5">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Simulated Secure Gateway</span>
              </span>
              <span className="font-mono text-[11px]">DEMO-GATEWAY-2026</span>
            </div>

            {isProcessing ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 className="w-8 h-8 text-crimson animate-spin" />
                <p className="text-xs text-muted">{t('processing_payment')}</p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <button
                  onClick={() => handleSimulatePayment(true)}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-900/30 transition-all active:scale-98"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('approve_payment')} ({formatPrice(totalNPR, language)})</span>
                </button>

                <button
                  onClick={() => handleSimulatePayment(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white font-medium text-xs flex items-center justify-center gap-2 transition-all border border-white/5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{t('fail_payment')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="md:col-span-5">
          <div className="sticky top-24 rounded-2xl bg-surface-elevated border border-white/10 p-6 space-y-5">
            <h3 className="font-bold text-base text-white border-b border-white/10 pb-3">
              {t('event_details')}
            </h3>

            <div>
              <p className="font-bold text-sm text-white mb-1">
                {event.title[language]}
              </p>
              <p className="text-xs text-muted">{venue.name[language]}</p>
              <p className="text-xs text-muted">{event.dateISO} • {event.time}</p>
            </div>

            <div className="border-t border-white/5 pt-4">
              <p className="text-xs text-muted mb-2 font-medium">
                {t('selected_seats_label')} ({selectedSeats.length})
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedSeats.map((s) => {
                  const prefix = s.blockLabel
                    ? s.blockLabel
                    : s.standName
                      ? s.standName.replace(' Stand', '').replace('— Lower', '').replace('— Upper', '').trim()
                      : s.sectionId;
                  return (
                    <span
                      key={getSeatId(s)}
                      className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-text text-xs"
                    >
                      {prefix} · Row {s.row} · Seat {s.number}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 flex items-center justify-between">
              <span className="text-sm text-muted">{t('total')}</span>
              <span className="text-xl font-display font-extrabold text-white">
                {formatPrice(totalNPR, language)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
