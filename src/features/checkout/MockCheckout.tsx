import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useBookingStore, getSeatId } from '../../store/useBookingStore';
import { useT } from '../../i18n/useT';
import { formatPrice } from '../../lib/money';
import venuesData from '../../data/venues.json';
import eventsData from '../../data/events.json';
import { Venue, EventItem, Booking } from '../../types';
import { DemoWalletModal } from './DemoWalletModal';
import { 
  ArrowLeft,
  Lock,
  Clock,
  User,
  AlertTriangle,
  RotateCcw,
  Ticket
} from 'lucide-react';

export const MockCheckout: React.FC = () => {
  const { t, language } = useT();
  const {
    selectedVenueId,
    selectedEventId,
    selectedSeats,
    clearSeats,
    setView,
    setToastMessage,
    completeBooking,
  } = useBookingStore();

  const [selectedGateway, setSelectedGateway] = useState<'esewa' | 'khalti' | 'fonepay' | 'imepay'>('esewa');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // ──────────────────────────────────────────────────────────
  // 1. BUYER DETAILS STATE & VALIDATION
  // ──────────────────────────────────────────────────────────
  const remembered = useMemo(() => {
    try {
      const saved = localStorage.getItem('aasan_remembered_buyer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  const sessionSaved = useMemo(() => {
    try {
      const saved = sessionStorage.getItem('aasan_current_buyer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, []);

  const [fullName, setFullName] = useState<string>(
    sessionSaved?.fullName || remembered?.fullName || ''
  );
  const [phone, setPhone] = useState<string>(
    sessionSaved?.phone || remembered?.phone || ''
  );
  const [email, setEmail] = useState<string>(
    sessionSaved?.email || ''
  );
  const [rememberMe, setRememberMe] = useState<boolean>(!!remembered);

  const [touched, setTouched] = useState<{ fullName?: boolean; phone?: boolean; email?: boolean }>({});
  const [submitted, setSubmitted] = useState(false);

  // Validation rules:
  // Full Name: 2-60 chars, Latin or Devanagari letters, spaces, hyphens, dots
  const isNameValid = useMemo(() => {
    const trimmed = fullName.trim();
    if (trimmed.length < 2 || trimmed.length > 60) return false;
    return /^[a-zA-Z\u0900-\u097F\s.'-]+$/.test(trimmed);
  }, [fullName]);

  // Mobile: 10 digits starting with 98 or 97
  const isPhoneValid = useMemo(() => {
    const cleanPhone = phone.replace(/[\s-]/g, '');
    return /^(97|98)\d{8}$/.test(cleanPhone);
  }, [phone]);

  // Email: optional, standard regex if provided
  const isEmailValid = useMemo(() => {
    if (!email.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }, [email]);

  const isFormValid = isNameValid && isPhoneValid && isEmailValid;

  // Persist in sessionStorage for current booking
  useEffect(() => {
    try {
      sessionStorage.setItem(
        'aasan_current_buyer',
        JSON.stringify({ fullName, phone, email })
      );
    } catch {
      // ignore
    }
  }, [fullName, phone, email]);

  // Handle Remember On This Device toggle
  const handleRememberToggle = (checked: boolean) => {
    setRememberMe(checked);
    try {
      if (checked && isNameValid && isPhoneValid) {
        localStorage.setItem(
          'aasan_remembered_buyer',
          JSON.stringify({ fullName, phone })
        );
      } else {
        localStorage.removeItem('aasan_remembered_buyer');
      }
    } catch {
      // ignore
    }
  };

  const handleClearRemembered = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      localStorage.removeItem('aasan_remembered_buyer');
      sessionStorage.removeItem('aasan_current_buyer');
    } catch {
      // ignore
    }
    setFullName('');
    setPhone('');
    setEmail('');
    setRememberMe(false);
    setTouched({});
  };

  // ──────────────────────────────────────────────────────────
  // 2. SEAT RESERVATION TIMER (Server-independent Timestamp)
  // ──────────────────────────────────────────────────────────
  const holdSecondsFromQuery = useMemo(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      const customHold = p.get('holdSeconds');
      if (customHold && !isNaN(Number(customHold))) {
        return Math.max(5, parseInt(customHold, 10));
      }
    }
    return 600; // 10 minutes default
  }, []);

  const totalHoldDuration = holdSecondsFromQuery;

  // Initialize or restore expiry timestamp
  const expiryTimestamp = useMemo(() => {
    if (typeof window === 'undefined') return Date.now() + totalHoldDuration * 1000;
    try {
      const saved = sessionStorage.getItem('aasan_seat_hold_expiry');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (parsed > Date.now()) return parsed;
      }
      const newExpiry = Date.now() + totalHoldDuration * 1000;
      sessionStorage.setItem('aasan_seat_hold_expiry', newExpiry.toString());
      return newExpiry;
    } catch {
      return Date.now() + totalHoldDuration * 1000;
    }
  }, [totalHoldDuration]);

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    return Math.max(0, Math.floor((expiryTimestamp - Date.now()) / 1000));
  });

  const hasExpiredRef = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiryTimestamp - now) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0 && !hasExpiredRef.current) {
        hasExpiredRef.current = true;
        clearInterval(timer);
        try {
          sessionStorage.removeItem('aasan_seat_hold_expiry');
        } catch {
          // ignore
        }
        // Expiry action: Release seats, notify user, return to seat view
        clearSeats();
        setToastMessage(
          language === 'ne'
            ? 'तपाईंका सिटहरू फुकुवा गरिएका छन्। कृपया पुनः छान्नुहोस्।'
            : 'Your seats were released. Please select again.'
        );
        setView('venue');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiryTimestamp, clearSeats, setView, setToastMessage, language]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.max(0, Math.min(100, (remainingSeconds / totalHoldDuration) * 100));
  const isTimerLow = remainingSeconds <= 120; // under 2 minutes

  // ──────────────────────────────────────────────────────────
  // 3. VENUE & EVENT DATA
  // ──────────────────────────────────────────────────────────
  const venues = venuesData as unknown as Venue[];
  const events = eventsData as unknown as EventItem[];
  const venue = venues.find((v) => v.id === selectedVenueId) || venues[0];
  const event = events.find((e) => e.id === selectedEventId) || events[0];
  const totalNPR = selectedSeats.reduce((sum, s) => sum + s.priceNPR, 0);

  const gateways = [
    {
      id: 'esewa' as const,
      name: 'eSewa',
      color: '#48bb78',
      badge: 'eSewa Demo Wallet',
    },
    {
      id: 'khalti' as const,
      name: 'Khalti',
      color: '#805ad5',
      badge: 'Khalti Demo Pay',
    },
    {
      id: 'fonepay' as const,
      name: 'Fonepay',
      color: '#e53e3e',
      badge: 'QR & Mobile Banking',
    },
    {
      id: 'imepay' as const,
      name: 'IME Pay',
      color: '#dd6b20',
      badge: 'IME Digital Demo',
    },
  ];

  const handleProceedToPayment = () => {
    setSubmitted(true);
    setTouched({ fullName: true, phone: true, email: true });

    if (!isFormValid) return;

    if (remainingSeconds <= 0) {
      setToastMessage(
        language === 'ne'
          ? 'सिट आरक्षण समय सकियो। कृपया पुनः सिट छान्नुहोस्।'
          : 'Hold expired. Please reselect your seats.'
      );
      return;
    }

    if (rememberMe) {
      try {
        localStorage.setItem(
          'aasan_remembered_buyer',
          JSON.stringify({ fullName, phone })
        );
      } catch {
        // ignore
      }
    }

    setIsWalletModalOpen(true);
  };

  const handlePaymentSuccess = (method: string) => {
    try {
      sessionStorage.removeItem('aasan_seat_hold_expiry');
    } catch {
      // ignore
    }

    const newBooking: Booking = {
      id: `ASN-${Math.floor(100000 + Math.random() * 900000)}`,
      eventId: event.id,
      venueId: venue.id,
      seats: selectedSeats,
      totalNPR,
      paymentMethod: method as any,
      createdAtISO: new Date().toISOString(),
      customerName: fullName.trim() || 'Aasan Guest User',
      customerPhone: `+977 ${phone.replace(/[\s-]/g, '')}`,
    };

    setIsWalletModalOpen(false);
    completeBooking(newBooking);
  };

  if (selectedSeats.length === 0) {
    return (
      <div className="min-h-[calc(100vh-65px)] max-w-lg mx-auto px-4 py-16 flex flex-col items-center justify-center text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
          <Ticket className="w-8 h-8 opacity-70" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">
          {language === 'ne' ? 'तपाईंको कार्ट खाली छ' : 'Your cart is empty'}
        </h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
          {language === 'ne'
            ? 'तपाईंले कुनै सिट छान्नुभएको छैन वा तपाईंको सिट होल्ड समय सकिएको छ। कृपया ३D नक्साबाट सिट चयन गर्नुहोस्।'
            : 'You haven’t selected any seats yet, or your reservation hold expired. Please choose seats from the venue map.'}
        </p>
        <button
          onClick={() => setView('venue')}
          className="px-6 py-2.5 rounded-full bg-crimson hover:bg-crimson-dark text-white text-xs font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{language === 'ne' ? 'सिट चयनमा फर्कनुहोस्' : 'Select Seats from Map'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-65px)] max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-10 select-none">
      {/* Back button */}
      <button
        onClick={() => setView('venue')}
        className="flex items-center gap-2 text-xs text-muted hover:text-white mb-5 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t('back_to_map')}</span>
      </button>

      {/* ────────────────────────────────────────────────────────── */}
      {/* SEAT RESERVATION TIMER HEADER WITH PROGRESS BAR */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className={`p-4 rounded-xl border mb-7 transition-all duration-300 ${
        isTimerLow 
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 animate-pulse' 
          : 'bg-[#121622] border-white/10 text-white'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${isTimerLow ? 'text-amber-400' : 'text-emerald-400'}`} />
            <span className="text-xs sm:text-sm font-semibold">
              {language === 'ne' 
                ? `सिटहरू आरक्षित छन्: ${formatCountdown(remainingSeconds)}` 
                : `Seats held for ${formatCountdown(remainingSeconds)}`}
            </span>
          </div>

          <span className="text-[11px] text-muted">
            {isTimerLow ? (
              <span className="text-amber-300 font-bold">
                {language === 'ne' ? 'समय सकिन लाग्यो! तुरुन्तै भुक्तानी गर्नुहोस्' : 'Time running out! Complete checkout soon'}
              </span>
            ) : (
              <span>
                {language === 'ne' ? '१० मिनेटभित्र भुक्तानी सम्पन्न गर्नुहोस्' : 'Seats are held while you complete payment'}
              </span>
            )}
          </span>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-linear rounded-full ${
              isTimerLow ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: Buyer Details Form + Provider Select */}
        <div className="md:col-span-7 space-y-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-white mb-1">
              {t('checkout_title')}
            </h2>
            <p className="text-xs text-muted">
              {language === 'ne' ? 'टिकट प्राप्त गर्न आफ्नो विवरण र भुक्तानी विधि छान्नुहोस्।' : 'Enter attendee contact details and select payment method.'}
            </p>
          </div>

          {/* ────────────────────────────────────────────────────────── */}
          {/* BUYER DETAILS FORM (Name, Phone, Email) */}
          {/* ────────────────────────────────────────────────────────── */}
          <div className="p-5 rounded-2xl bg-[#12141c] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#dc143c]" />
                <span>{language === 'ne' ? 'टिकट धनीको विवरण' : 'Attendee / Buyer Details'}</span>
              </h3>
              {remembered && (
                <button
                  type="button"
                  onClick={handleClearRemembered}
                  className="text-[11px] text-muted hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{language === 'ne' ? 'विवरण मेटाउनुहोस्' : 'Clear'}</span>
                </button>
              )}
            </div>

            {/* Field: Full Name */}
            <div>
              <label htmlFor="full-name" className="block text-xs font-semibold text-slate-300 mb-1">
                {language === 'ne' ? 'पूरा नाम *' : 'Full Name *'}
              </label>
              <div className="relative">
                <input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
                  placeholder={language === 'ne' ? 'उदा: सुरेश शर्मा' : 'e.g. Suresh Sharma'}
                  className={`w-full px-3.5 py-2.5 rounded-xl bg-white/5 border text-xs text-white focus:outline-none transition-colors ${
                    (touched.fullName || submitted) && !isNameValid
                      ? 'border-red-500 bg-red-500/5 focus:border-red-500'
                      : 'border-white/15 focus:border-[#dc143c]'
                  }`}
                  aria-invalid={(touched.fullName || submitted) && !isNameValid}
                  aria-describedby="name-error"
                />
              </div>
              {(touched.fullName || submitted) && !isNameValid && (
                <p id="name-error" className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>
                    {language === 'ne'
                      ? 'नाम २ देखि ६० अक्षरको हुनुपर्छ (अक्षर मात्र)।'
                      : 'Name must be 2 to 60 characters (letters only).'}
                  </span>
                </p>
              )}
            </div>

            {/* Field: Mobile Number */}
            <div>
              <label htmlFor="mobile-number" className="block text-xs font-semibold text-slate-300 mb-1">
                {language === 'ne' ? 'मोबाइल नम्बर (नेपाल) *' : 'Mobile Number (Nepal) *'}
              </label>
              <div className="relative flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-white/15 bg-white/10 text-xs font-mono text-slate-300 select-none">
                  +977
                </span>
                <input
                  id="mobile-number"
                  type="tel"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                  placeholder="98XXXXXXXX"
                  className={`w-full px-3.5 py-2.5 rounded-r-xl bg-white/5 border text-xs text-white focus:outline-none font-mono transition-colors ${
                    (touched.phone || submitted) && !isPhoneValid
                      ? 'border-red-500 bg-red-500/5 focus:border-red-500'
                      : 'border-white/15 focus:border-[#dc143c]'
                  }`}
                  aria-invalid={(touched.phone || submitted) && !isPhoneValid}
                  aria-describedby="phone-error"
                />
              </div>
              {(touched.phone || submitted) && !isPhoneValid && (
                <p id="phone-error" className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>
                    {language === 'ne'
                      ? '९८ वा ९७ बाट सुरु हुने १० अंकको नम्बर प्रविष्ट गर्नुहोस्।'
                      : 'Enter a valid 10-digit mobile number starting with 98 or 97.'}
                  </span>
                </p>
              )}
            </div>

            {/* Field: Email (Optional) */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1">
                {language === 'ne' ? 'इमेल (वैकल्पिक)' : 'Email Address (Optional)'}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                placeholder="name@example.com"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white/5 border text-xs text-white focus:outline-none transition-colors ${
                  (touched.email || submitted) && !isEmailValid
                    ? 'border-red-500 bg-red-500/5 focus:border-red-500'
                    : 'border-white/15 focus:border-[#dc143c]'
                }`}
                aria-invalid={(touched.email || submitted) && !isEmailValid}
                aria-describedby="email-error"
              />
              {(touched.email || submitted) && !isEmailValid && (
                <p id="email-error" className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>
                    {language === 'ne' ? 'कृपया मान्य इमेल ठेगाना प्रविष्ट गर्नुहोस्।' : 'Please enter a valid email address.'}
                  </span>
                </p>
              )}
            </div>

            {/* Privacy Checkbox & Note */}
            <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => handleRememberToggle(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#dc143c] focus:ring-0 cursor-pointer"
                />
                <span>{language === 'ne' ? 'यस यन्त्रमा विवरण सुरक्षित राख्नुहोस्' : 'Remember on this device'}</span>
              </label>

              <p className="text-[11px] text-muted">
                {language === 'ne' 
                  ? 'डेमो मात्र। तपाईंको विवरण यसै ब्राउजरमा रहन्छ।' 
                  : 'Demo only. Your details stay in this browser.'}
              </p>
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────── */}
          {/* PAYMENT GATEWAY SELECTOR */}
          {/* ────────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">
              {language === 'ne' ? 'भुक्तानी विधि रोज्नुहोस्' : 'Select Payment Method'}
            </h3>

            {gateways.map((gw) => {
              const isSelected = selectedGateway === gw.id;
              return (
                <div
                  key={gw.id}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() => setSelectedGateway(gw.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedGateway(gw.id);
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

          {/* Pay Trigger Button */}
          <button
            onClick={handleProceedToPayment}
            disabled={remainingSeconds <= 0}
            className={`w-full py-4 px-6 rounded-xl font-bold text-sm text-white shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isFormValid && remainingSeconds > 0
                ? 'bg-[#dc143c] hover:bg-[#b01030] active:scale-98 shadow-glow-crimson'
                : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/5'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>
              {language === 'ne' 
                ? `भुक्तानी अघि बढाउनुहोस् (${formatPrice(totalNPR, language)})` 
                : `Proceed to Pay (${formatPrice(totalNPR, language)})`}
            </span>
          </button>
        </div>

        {/* Right Column: Order Summary */}
        <div className="md:col-span-5">
          <div className="sticky top-24 rounded-2xl bg-surface-elevated border border-white/10 p-6 space-y-5">
            <h3 className="font-bold text-base text-white border-b border-white/10 pb-3">
              {t('event_details')}
            </h3>

            <div>
              <p className="font-bold text-sm text-white mb-1">
                {event.title[language] || event.title.en}
              </p>
              <p className="text-xs text-muted">{venue.name[language] || venue.name.en}</p>
              <p className="text-xs text-muted mt-0.5">{event.dateISO} • {event.time}</p>
            </div>

            {/* Buyer in Summary */}
            {fullName.trim() && (
              <div className="border-t border-white/5 pt-3">
                <span className="text-[11px] text-muted font-medium">
                  {language === 'ne' ? 'टिकट धनी:' : 'Attendee:'}
                </span>
                <p className="text-xs font-semibold text-white mt-0.5">{fullName.trim()}</p>
                {phone && <p className="text-[11px] font-mono text-muted">+977 {phone.replace(/[\s-]/g, '')}</p>}
              </div>
            )}

            {/* Selected Seats Chips */}
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

            {/* Total Price */}
            <div className="border-t border-white/10 pt-4 flex items-center justify-between">
              <span className="text-sm text-muted">{t('total')}</span>
              <span className="text-xl font-display font-extrabold text-emerald-400">
                {formatPrice(totalNPR, language)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. DEMO WALLET MODAL DIALOG */}
      {/* ────────────────────────────────────────────────────────── */}
      <DemoWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        gatewayId={selectedGateway}
        amountNPR={totalNPR}
        customerPhone={phone.replace(/[\s-]/g, '')}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
