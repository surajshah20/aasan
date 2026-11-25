import React from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingHero } from './features/landing/LandingHero';
import { VenueOverview } from './features/venue/VenueOverview';
import { MockCheckout } from './features/checkout/MockCheckout';
import { TicketView } from './features/ticket/TicketView';
import { useBookingStore } from './store/useBookingStore';

export const App: React.FC = () => {
  const { currentView } = useBookingStore();

  return (
    <div className={`${currentView === 'venue' ? 'h-screen overflow-hidden' : 'min-h-screen'} flex flex-col bg-bg text-text font-sans selection:bg-crimson selection:text-white`}>
      <Header />
      
      <main className={currentView === 'venue' ? 'flex-1 w-full overflow-hidden relative' : 'flex-1'}>
        {currentView === 'landing' && <LandingHero />}
        {currentView === 'venue' && <VenueOverview />}
        {currentView === 'checkout' && <MockCheckout />}
        {currentView === 'ticket' && <TicketView />}
      </main>

      {/* Footer is only rendered on landing, checkout, and ticket views to make 3D venue view 100% hero */}
      {currentView !== 'venue' && <Footer />}
    </div>
  );
};

export default App;
