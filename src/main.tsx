import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useBookingStore } from './store/useBookingStore';
import { useI18nStore } from './i18n/useT';

// Expose stores for testing & automation verification
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__BOOKING_STORE__ = useBookingStore;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__I18N_STORE__ = useI18nStore;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
