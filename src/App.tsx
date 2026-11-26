import React, { useEffect, Suspense, lazy } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingHero } from './features/landing/LandingHero';
import { useBookingStore } from './store/useBookingStore';
import { initUrlRouting } from './lib/urlRouting';
import { AlertCircle, X, Loader2 } from 'lucide-react';

const VenueOverview = lazy(() => import('./features/venue/VenueOverview').then((m) => ({ default: m.VenueOverview })));
const MockCheckout = lazy(() => import('./features/checkout/MockCheckout').then((m) => ({ default: m.MockCheckout })));
const TicketView = lazy(() => import('./features/ticket/TicketView').then((m) => ({ default: m.TicketView })));

export const App: React.FC = () => {
  const { currentView, toastMessage, setToastMessage } = useBookingStore();

  useEffect(() => {
    const cleanupRouting = initUrlRouting();
    return () => cleanupRouting();
  }, []);

  return (
    <div className={`${currentView === 'venue' ? 'h-screen overflow-hidden' : 'min-h-screen'} flex flex-col bg-bg text-text font-sans selection:bg-crimson selection:text-white`}>
      <Header />

      {/* Toast Notification Banner (Used for unavailable/sold seat fallback and URL alerts) */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-[#12141c]/95 border border-amber-500/40 text-amber-200 text-xs font-semibold shadow-2xl backdrop-blur-xl animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-amber-400/70 hover:text-amber-200 p-0.5 rounded-full hover:bg-white/10 ml-1 transition-colors"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <main className={currentView === 'venue' ? 'flex-1 w-full overflow-hidden relative' : 'flex-1'}>
        <Suspense fallback={
          <div className="w-full min-h-[50vh] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-crimson animate-spin" />
          </div>
        }>
          {currentView === 'landing' && <LandingHero />}
          {currentView === 'venue' && <VenueOverview />}
          {currentView === 'checkout' && <MockCheckout />}
          {currentView === 'ticket' && <TicketView />}
        </Suspense>
      </main>

      {/* Footer is only rendered on landing, checkout, and ticket views to make 3D venue view 100% hero */}
      {currentView !== 'venue' && <Footer />}
    </div>
  );
};

export default App;
