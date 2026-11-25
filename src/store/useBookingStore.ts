import { create } from 'zustand';
import { AppViewMode, Booking, SelectedSeat, ActiveSeatView, StadiumDrillLevel } from '../types';
import venuesData from '../data/venues.json';
import eventsData from '../data/events.json';
import soldSeatsData from '../data/sold-seats.json';
import { isLowEndDevice, isWebGLAvailable } from '../lib/device';

interface BookingStoreState {
  currentView: AppViewMode;
  selectedVenueId: string;
  selectedEventId: string;
  activeSectionId: string | null;
  hoveredSectionId: string | null;
  cameraMode: 'overview' | 'flying' | 'seatview';
  stadiumLevel: StadiumDrillLevel;
  selectedStandId: string | null;
  selectedBlockId: string | null;
  activeSeat: ActiveSeatView | null;
  selectedSeats: SelectedSeat[];
  isLiteMode: boolean;
  bookingResult: Booking | null;
  maxSeats: number;

  // Actions
  setView: (view: AppViewMode) => void;
  selectVenue: (venueId: string, eventId?: string) => void;
  selectSection: (sectionId: string | null) => void;
  setHoveredSection: (sectionId: string | null) => void;
  setCameraMode: (mode: 'overview' | 'flying' | 'seatview') => void;
  setStadiumLevel: (level: StadiumDrillLevel) => void;
  selectStand: (standId: string | null) => void;
  selectBlock: (blockId: string | null) => void;
  drillBack: () => void;
  flyToSeat: (seat: ActiveSeatView) => void;
  returnToOverview: () => void;
  bookCurrentSeat: () => void;
  addAnotherSeat: () => void;
  backToOverview: () => void;
  toggleSeat: (seat: SelectedSeat) => { success: boolean; reason?: 'max_reached' | 'toggled' };
  clearSeats: () => void;
  toggleLiteMode: () => void;
  setLiteMode: (enabled: boolean) => void;
  completeBooking: (booking: Booking) => void;
  resetAll: () => void;
  getSoldSeatKeys: () => string[];
}

const initialLite = !isWebGLAvailable() || isLowEndDevice();

export const useBookingStore = create<BookingStoreState>((set, get) => ({
  currentView: 'landing',
  selectedVenueId: venuesData[0]?.id || 'qfx_civil_audi1',
  selectedEventId: eventsData[0]?.id || 'event_qfx_movie_1',
  activeSectionId: null,
  hoveredSectionId: null,
  cameraMode: 'overview',
  stadiumLevel: 'overview',
  selectedStandId: null,
  selectedBlockId: null,
  activeSeat: null,
  selectedSeats: [],
  isLiteMode: initialLite,
  bookingResult: null,
  maxSeats: 8,

  setView: (view) => set({ currentView: view }),

  selectVenue: (venueId, eventId) => {
    const matchedEvent = eventId || eventsData.find((e) => e.venueId === venueId)?.id || eventsData[0].id;
    set({
      selectedVenueId: venueId,
      selectedEventId: matchedEvent,
      activeSectionId: null,
      hoveredSectionId: null,
      cameraMode: 'overview',
      activeSeat: null,
      selectedSeats: [],
      currentView: 'venue',
    });
  },

  selectSection: (sectionId) => {
    if (!sectionId) {
      set({ activeSectionId: null, cameraMode: 'overview', activeSeat: null });
      return;
    }
    set({
      activeSectionId: sectionId,
      cameraMode: 'flying',
    });
  },

  setHoveredSection: (sectionId) => set({ hoveredSectionId: sectionId }),

  setCameraMode: (mode) => set({ cameraMode: mode }),

  setStadiumLevel: (level) => set({ stadiumLevel: level }),

  selectStand: (standId) => {
    if (!standId) {
      set({ selectedStandId: null, selectedBlockId: null, stadiumLevel: 'overview', activeSeat: null });
    } else {
      set({ selectedStandId: standId, selectedBlockId: null, stadiumLevel: 'stand', activeSeat: null });
    }
  },

  selectBlock: (blockId) => {
    if (!blockId) {
      set({ selectedBlockId: null, stadiumLevel: 'stand', activeSeat: null });
    } else {
      set({ selectedBlockId: blockId, stadiumLevel: 'block', activeSeat: null });
    }
  },

  drillBack: () => {
    const { stadiumLevel } = get();
    if (stadiumLevel === 'seat') {
      set({ stadiumLevel: 'block', activeSeat: null, cameraMode: 'overview' });
    } else if (stadiumLevel === 'block') {
      set({ stadiumLevel: 'stand', selectedBlockId: null, activeSeat: null });
    } else if (stadiumLevel === 'stand') {
      set({ stadiumLevel: 'overview', selectedStandId: null, selectedBlockId: null, activeSeat: null });
    }
  },

  flyToSeat: (seat) => {
    set({
      activeSeat: seat,
      activeSectionId: seat.sectionId,
      stadiumLevel: 'seat',
      cameraMode: 'flying',
    });
  },

  returnToOverview: () => {
    const { selectedBlockId } = get();
    if (selectedBlockId) {
      // "Other seats" returns to the block view
      set({
        activeSeat: null,
        stadiumLevel: 'block',
        cameraMode: 'overview',
      });
    } else {
      set({
        activeSeat: null,
        stadiumLevel: 'overview',
        selectedStandId: null,
        selectedBlockId: null,
        activeSectionId: null,
        cameraMode: 'overview',
      });
    }
  },

  bookCurrentSeat: () => {
    const { activeSeat, selectedSeats, maxSeats } = get();
    if (!activeSeat) return;

    const seatKey = `${activeSeat.row}-${activeSeat.number}`;
    const alreadyExists = selectedSeats.some(
      (s) => s.sectionId === activeSeat.sectionId && `${s.row}-${s.number}` === seatKey
    );

    let updated = selectedSeats;
    if (!alreadyExists && selectedSeats.length < maxSeats) {
      updated = [
        ...selectedSeats,
        {
          sectionId: activeSeat.sectionId,
          row: activeSeat.row,
          number: activeSeat.number,
          priceNPR: activeSeat.priceNPR,
          tier: activeSeat.tier,
          isRestrictedView: activeSeat.isRestrictedView,
          blockId: activeSeat.blockId,
          blockLabel: activeSeat.blockLabel,
          standId: activeSeat.standId,
          standName: (activeSeat as any).standName,
        },
      ];
    }

    set({
      selectedSeats: updated,
      currentView: 'checkout',
    });
  },

  addAnotherSeat: () => {
    const { activeSeat, selectedSeats, maxSeats } = get();
    if (!activeSeat) return;

    const seatKey = `${activeSeat.row}-${activeSeat.number}`;
    const alreadyExists = selectedSeats.some(
      (s) => s.sectionId === activeSeat.sectionId && `${s.row}-${s.number}` === seatKey
    );

    let updated = selectedSeats;
    if (!alreadyExists && selectedSeats.length < maxSeats) {
      updated = [
        ...selectedSeats,
        {
          sectionId: activeSeat.sectionId,
          row: activeSeat.row,
          number: activeSeat.number,
          priceNPR: activeSeat.priceNPR,
          tier: activeSeat.tier,
          isRestrictedView: activeSeat.isRestrictedView,
          blockId: activeSeat.blockId,
          blockLabel: activeSeat.blockLabel,
          standId: activeSeat.standId,
          standName: (activeSeat as any).standName,
        },
      ];
    }

    const { selectedBlockId } = get();
    set({
      selectedSeats: updated,
      activeSeat: null,
      stadiumLevel: selectedBlockId ? 'block' : 'overview',
      cameraMode: 'overview',
    });
  },

  backToOverview: () => {
    const { stadiumLevel } = get();
    if (stadiumLevel === 'seat') {
      set({ stadiumLevel: 'block', activeSeat: null, cameraMode: 'overview' });
    } else if (stadiumLevel === 'block') {
      set({ stadiumLevel: 'stand', selectedBlockId: null, activeSeat: null });
    } else if (stadiumLevel === 'stand') {
      set({ stadiumLevel: 'overview', selectedStandId: null, selectedBlockId: null, activeSeat: null });
    } else {
      set({
        activeSectionId: null,
        hoveredSectionId: null,
        selectedStandId: null,
        selectedBlockId: null,
        stadiumLevel: 'overview',
        cameraMode: 'overview',
        activeSeat: null,
      });
    }
  },

  toggleSeat: (seat) => {
    const state = get();
    const seatKey = `${seat.row}-${seat.number}`;
    const existsIndex = state.selectedSeats.findIndex(
      (s) => s.sectionId === seat.sectionId && `${s.row}-${s.number}` === seatKey
    );

    if (existsIndex >= 0) {
      set({
        selectedSeats: state.selectedSeats.filter((_, idx) => idx !== existsIndex),
      });
      return { success: true, reason: 'toggled' };
    }

    if (state.selectedSeats.length >= state.maxSeats) {
      return { success: false, reason: 'max_reached' };
    }

    set({
      selectedSeats: [...state.selectedSeats, seat],
    });
    return { success: true, reason: 'toggled' };
  },

  clearSeats: () => set({ selectedSeats: [] }),

  toggleLiteMode: () => set((state) => ({ isLiteMode: !state.isLiteMode })),

  setLiteMode: (enabled) => set({ isLiteMode: enabled }),

  completeBooking: (booking) => set({ bookingResult: booking, currentView: 'ticket' }),

  resetAll: () =>
    set({
      currentView: 'landing',
      activeSectionId: null,
      hoveredSectionId: null,
      activeSeat: null,
      cameraMode: 'overview',
      selectedSeats: [],
      bookingResult: null,
    }),

  getSoldSeatKeys: () => {
    const { selectedEventId } = get();
    const map = soldSeatsData as Record<string, string[]>;
    return map[selectedEventId] || [];
  },
}));
