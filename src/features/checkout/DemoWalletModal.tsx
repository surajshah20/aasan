import React, { useState, useEffect } from 'react';
import { useT } from '../../i18n/useT';
import { formatPrice } from '../../lib/money';
import { 
  X, 
  ShieldAlert, 
  Lock, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  QrCode, 
  Smartphone, 
  CreditCard,
  AlertCircle
} from 'lucide-react';

export interface DemoWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatewayId: 'esewa' | 'khalti' | 'fonepay' | 'imepay';
  amountNPR: number;
  customerPhone?: string;
  onPaymentSuccess: (method: string) => void;
}

export const DemoWalletModal: React.FC<DemoWalletModalProps> = ({
  isOpen,
  onClose,
  gatewayId,
  amountNPR,
  customerPhone = '9800000000',
  onPaymentSuccess,
}) => {
  const { language } = useT();

  // Dialog step: 'input' | 'processing' | 'success' | 'failure'
  const [step, setStep] = useState<'input' | 'processing' | 'success' | 'failure'>('input');
  const [demoPhone, setDemoPhone] = useState(customerPhone);
  const [demoPin, setDemoPin] = useState('');
  const [failureReason, setFailureReason] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setDemoPhone(customerPhone);
      setDemoPin('');
      setFailureReason('');
    }
  }, [isOpen, customerPhone, gatewayId]);

  if (!isOpen) return null;

  // Neutral, distinct styling per provider with custom text labels (no copied brand assets)
  const providerMeta = {
    esewa: {
      name: 'eSewa Demo Wallet',
      accent: '#48bb78', // Emerald-green accent
      idLabel: 'eSewa ID / Mobile',
      pinLabel: 'Demo MPIN (4 Digits)',
      pinPlaceholder: '••••',
      type: 'wallet',
    },
    khalti: {
      name: 'Khalti Demo Pay',
      accent: '#805ad5', // Purple accent
      idLabel: 'Khalti Mobile Number',
      pinLabel: 'Demo Khalti PIN / OTP',
      pinPlaceholder: '••••',
      type: 'wallet',
    },
    fonepay: {
      name: 'Fonepay Demo QR & Mobile',
      accent: '#e53e3e', // Crimson-red accent
      idLabel: 'Mobile Banking Account',
      pinLabel: 'Transaction OTP',
      pinPlaceholder: '••••••',
      type: 'qr',
    },
    imepay: {
      name: 'IME Pay Demo Digital',
      accent: '#dd6b20', // Warm amber-orange accent
      idLabel: 'IME Pay Registered Mobile',
      pinLabel: 'Demo Wallet PIN',
      pinPlaceholder: '••••',
      type: 'wallet',
    },
  }[gatewayId];

  const handleStartPayment = (forcedOutcome?: 'success' | 'failure' | 'insufficient') => {
    setStep('processing');
    setFailureReason('');

    // Mask and clear PIN in memory immediately for safety
    setDemoPin('');

    setTimeout(() => {
      if (forcedOutcome === 'failure') {
        setStep('failure');
        setFailureReason(
          language === 'ne' 
            ? 'सिमुलेटेड अस्वीकार: बैंक सर्भरमा समस्या आयो।' 
            : 'Simulated failure: bank network connection timed out.'
        );
      } else if (forcedOutcome === 'insufficient') {
        setStep('failure');
        setFailureReason(
          language === 'ne'
            ? 'सिमुलेटेड त्रुटि: वालेटमा मौज्दात रकम अपुग छ।'
            : 'Simulated failure: Insufficient demo wallet balance.'
        );
      } else {
        // Success
        setStep('success');
        setTimeout(() => {
          onPaymentSuccess(gatewayId);
        }, 1200);
      }
    }, 1500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-wallet-title"
    >
      <div 
        className="relative w-full max-w-md rounded-2xl bg-[#12141c] border border-white/15 p-6 shadow-2xl space-y-5 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with provider badge & close */}
        <div className="flex items-start justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span 
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: providerMeta.accent }}
            />
            <div>
              <h2 id="demo-wallet-title" className="text-base font-bold text-white tracking-wide">
                {providerMeta.name}
              </h2>
              <p className="text-[11px] text-muted">
                {language === 'ne' ? 'सिमुलेटेड सुरक्षित भुक्तानी' : 'Simulated Secure Payment Flow'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={step === 'processing'}
            className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safety Disclaimer Banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold">
              {language === 'ne' ? 'डेमो सूचना:' : 'DEMO NOTICE:'}
            </span>{' '}
            <span>
              {language === 'ne' 
                ? 'यो केवल डेमो हो — वास्तविक पिन, पासवर्ड वा बैंक विवरण नहाल्नुहोस्।'
                : 'Demo mode only — do NOT enter real banking PINs or credentials.'}
            </span>
          </div>
        </div>

        {/* Amount to pay */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#0a0d14] border border-white/10">
          <span className="text-xs text-muted">
            {language === 'ne' ? 'भुक्तानी गर्नुपर्ने रकम' : 'Total Amount Due'}
          </span>
          <span className="text-lg font-bold font-display text-emerald-400">
            {formatPrice(amountNPR, language)}
          </span>
        </div>

        {/* STEP: INPUT FORM */}
        {step === 'input' && (
          <div className="space-y-4">
            {providerMeta.type === 'qr' ? (
              // Fonepay Demo QR Card Placeholder
              <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col items-center justify-center text-center space-y-2.5">
                <div className="w-36 h-36 rounded-lg bg-white p-2.5 flex items-center justify-center shadow-md">
                  <div className="w-full h-full border-2 border-dashed border-slate-700 rounded flex flex-col items-center justify-center text-slate-800 p-2">
                    <QrCode className="w-12 h-12 text-[#dc143c]" />
                    <span className="text-[10px] font-mono font-bold mt-1 text-slate-700">FONEPAY DEMO</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300">
                  {language === 'ne'
                    ? 'कुनै पनि मोबाइल बैंकिङ एपबाट स्क्यान गर्नुहोस् (डेमो)'
                    : 'Scan with any Mobile Banking App (Demo Placeholder)'}
                </p>
              </div>
            ) : (
              // Mobile + PIN inputs for Wallets
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {providerMeta.idLabel}
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
                    <input
                      type="text"
                      value={demoPhone}
                      onChange={(e) => setDemoPhone(e.target.value)}
                      placeholder="98XXXXXXXX"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {providerMeta.pinLabel}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted" />
                    <input
                      type="password"
                      maxLength={6}
                      value={demoPin}
                      onChange={(e) => setDemoPin(e.target.value)}
                      placeholder={providerMeta.pinPlaceholder}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-muted mt-1">
                    {language === 'ne' ? 'कुनै पनि ४-अङ्कको नक्कली पिन हाल्नुहोस्।' : 'Enter any 4 dummy digits (never stored).'}
                  </p>
                </div>
              </div>
            )}

            {/* Pay Button */}
            <button
              onClick={() => handleStartPayment('success')}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              style={{ backgroundColor: providerMeta.accent }}
            >
              <CreditCard className="w-4 h-4" />
              <span>
                {language === 'ne' ? 'भुक्तानी पुष्टि गर्नुहोस्' : 'Confirm & Pay'} ({formatPrice(amountNPR, language)})
              </span>
            </button>
          </div>
        )}

        {/* STEP: PROCESSING */}
        {step === 'processing' && (
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-center animate-fadeIn">
            <Loader2 className="w-9 h-9 animate-spin" style={{ color: providerMeta.accent }} />
            <div>
              <p className="text-sm font-semibold text-white">
                {language === 'ne' ? 'भुक्तानी प्रक्रियामा छ...' : 'Processing Demo Payment...'}
              </p>
              <p className="text-xs text-muted mt-1">
                {language === 'ne' ? 'कृपया केही सेकेन्ड पर्खनुहोस्' : 'Communicating with simulated gateway'}
              </p>
            </div>
          </div>
        )}

        {/* STEP: SUCCESS */}
        {step === 'success' && (
          <div className="py-8 flex flex-col items-center justify-center gap-3 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-base font-bold text-emerald-400">
                {language === 'ne' ? 'भुक्तानी सफल भयो (डेमो)' : 'Payment received (demo)'}
              </p>
              <p className="text-xs text-muted mt-1">
                {language === 'ne' ? 'टिकट जारी गरिँदैछ...' : 'Redirecting to your confirmed ticket...'}
              </p>
            </div>
          </div>
        )}

        {/* STEP: FAILURE */}
        {step === 'failure' && (
          <div className="py-6 flex flex-col items-center justify-center gap-4 text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <XCircle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-400">
                {language === 'ne' ? 'भुक्तानी असफल भयो' : 'Payment Failed'}
              </p>
              <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                {failureReason || (language === 'ne' ? 'कृपया पुनः प्रयास गर्नुहोस्।' : 'Please retry or try another payment method.')}
              </p>
              <p className="text-[11px] text-amber-300/80 mt-1.5 font-medium">
                {language === 'ne' ? 'तपाईंका सिटहरू अझै सुरक्षित छन्।' : 'Your seats remain held for you.'}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full pt-2">
              <button
                onClick={() => setStep('input')}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
              >
                {language === 'ne' ? 'पुनः प्रयास गर्नुहोस्' : 'Retry Payment'}
              </button>
              <button
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-white text-xs font-semibold transition-colors"
              >
                {language === 'ne' ? 'रद्द गर्नुहोस्' : 'Change Provider'}
              </button>
            </div>
          </div>
        )}

        {/* DEMO CONTROLS (Fail, Insufficient, Cancel) */}
        {step === 'input' && (
          <div className="pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-[11px] text-muted mb-2">
              <span className="flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>{language === 'ne' ? 'डेमो परीक्षण विकल्पहरू:' : 'Demo Controls (QA testing):'}</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleStartPayment('success')}
                className="py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-[11px] font-medium border border-emerald-500/25 transition-colors"
              >
                Simulate Success
              </button>
              <button
                type="button"
                onClick={() => handleStartPayment('failure')}
                className="py-1.5 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[11px] font-medium border border-red-500/25 transition-colors"
              >
                Simulate Failure
              </button>
              <button
                type="button"
                onClick={() => handleStartPayment('insufficient')}
                className="py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-medium border border-amber-500/25 transition-colors"
              >
                Insufficient Bal.
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
