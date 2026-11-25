import { useBookingStore } from '../store/useBookingStore';
import venuesData from '../data/venues.json';
import { Venue, ActiveSeatView } from '../types';
import { buildStadiumDrillDownData } from '../features/venue/stadiumDrillDownData';

// Stand ID <-> URL Slug bidirectional mappings
export const STAND_ID_TO_SLUG: Record<string, string> = {
  e_lower: 'east-lower',
  east_lower: 'east-lower',
  e_upper: 'east-upper',
  east_upper: 'east-upper',
  se_lower: 'southeast-lower',
  southeast_lower: 'southeast-lower',
  se_upper: 'southeast-upper',
  southeast_upper: 'southeast-upper',
  p_lower: 'pavilion-lower',
  pavilion_lower: 'pavilion-lower',
  p_upper: 'pavilion-upper',
  pavilion_upper: 'pavilion-upper',
  sw_lower: 'southwest-lower',
  southwest_lower: 'southwest-lower',
  sw_upper: 'southwest-upper',
  southwest_upper: 'southwest-upper',
  w_lower: 'west-lower',
  west_lower: 'west-lower',
  w_upper: 'west-upper',
  west_upper: 'west-upper',
  nw_lower: 'northwest-lower',
  northwest_lower: 'northwest-lower',
  nw_upper: 'northwest-upper',
  northwest_upper: 'northwest-upper',
  v_lower: 'north-lower',
  north_lower: 'north-lower',
  v_upper: 'north-upper',
  north_upper: 'north-upper',
  ne_lower: 'northeast-lower',
  northeast_lower: 'northeast-lower',
  ne_upper: 'northeast-upper',
  northeast_upper: 'northeast-upper',
};

export const SLUG_TO_STAND_ID: Record<string, string> = {
  'east-lower': 'e_lower',
  'east-upper': 'e_upper',
  'southeast-lower': 'se_lower',
  'southeast-upper': 'se_upper',
  'pavilion-lower': 'p_lower',
  'pavilion-upper': 'p_upper',
  'southwest-lower': 'sw_lower',
  'southwest-upper': 'sw_upper',
  'west-lower': 'w_lower',
  'west-upper': 'w_upper',
  'northwest-lower': 'nw_lower',
  'northwest-upper': 'nw_upper',
  'north-lower': 'v_lower',
  'north-upper': 'v_upper',
  'northeast-lower': 'ne_lower',
  'northeast-upper': 'ne_upper',
};

// Venue ID <-> URL Slug mappings
export const VENUE_ID_TO_SLUG: Record<string, string> = {
  tu_cricket_ground: 'tu',
  qfx_civil_audi1: 'qfx-civil-audi1',
  qfx_labim_audi2: 'qfx-labim-audi2',
  fcube_audi1: 'fcube-audi1',
  big_movies_audi1: 'big-movies-audi1',
  one_cinemas_audi1: 'one-cinemas-audi1',
};

export const SLUG_TO_VENUE_ID: Record<string, string> = {
  tu: 'tu_cricket_ground',
  'tu-cricket-ground': 'tu_cricket_ground',
  'qfx-civil-audi1': 'qfx_civil_audi1',
  'qfx-civil': 'qfx_civil_audi1',
  'qfx-labim-audi2': 'qfx_labim_audi2',
  'qfx-labim': 'qfx_labim_audi2',
  'fcube-audi1': 'fcube_audi1',
  'big-movies-audi1': 'big_movies_audi1',
  'one-cinemas-audi1': 'one_cinemas_audi1',
};

// Flag to ignore store updates during popstate / initial URL parse
let isApplyingFromUrl = false;
let lastPushedUrl = '';

/**
 * Build canonical URL string from the current Zustand booking store state.
 */
export function buildUrlFromState(): string {
  const state = useBookingStore.getState();
  const {
    currentView,
    selectedVenueId,
    selectedStandId,
    selectedBlockId,
    activeSectionId,
    activeSeat,
    lightingMode,
  } = state;

  if (currentView === 'landing') return '/';
  if (currentView === 'checkout') return '/checkout';
  if (currentView === 'ticket') return '/ticket';

  const venues = venuesData as unknown as Venue[];
  const venue = venues.find((v) => v.id === selectedVenueId) || venues[0];

  let path = '';
  if (venue.type === 'stadium') {
    const venueSlug = VENUE_ID_TO_SLUG[venue.id] || 'tu';
    path = `/stadium/${venueSlug}`;

    if (selectedStandId) {
      const standSlug = STAND_ID_TO_SLUG[selectedStandId] || selectedStandId.replace('_', '-');
      path += `/${standSlug}`;

      if (selectedBlockId) {
        // Derive clean block slug (e.g. e_lower_b3 -> e3)
        let blockSlug = selectedBlockId;
        if (activeSeat?.blockLabel) {
          blockSlug = activeSeat.blockLabel.toLowerCase();
        } else {
          const match = selectedBlockId.match(/([a-z]+)_(?:lower|upper)_b(\d+)/i);
          if (match) {
            blockSlug = `${match[1]}${match[2]}`.toLowerCase();
          }
        }
        path += `/${blockSlug}`;

        if (activeSeat) {
          path += `/${activeSeat.row.toLowerCase()}-${activeSeat.number}`;
        }
      }
    }

    if (lightingMode === 'day') {
      path += '?mode=day';
    } else if (lightingMode === 'evening') {
      path += '?mode=night';
    }
  } else {
    // Cinema
    const venueSlug = VENUE_ID_TO_SLUG[venue.id] || venue.id.replace(/_/g, '-');
    path = `/cinema/${venueSlug}`;

    const sectionId = activeSeat?.sectionId || activeSectionId;
    if (sectionId) {
      path += `/${sectionId.toLowerCase()}`;
      if (activeSeat) {
        path += `/${activeSeat.row.toLowerCase()}-${activeSeat.number}`;
      }
    }
  }

  return path;
}

/**
 * Parse the window URL and restore the exact application view state.
 */
export function syncStateFromUrl(): void {
  if (typeof window === 'undefined') return;

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(window.location.search);
  const modeParam = searchParams.get('mode');

  isApplyingFromUrl = true;

  try {
    const store = useBookingStore.getState();

    // 1. Root / Landing
    if (pathname === '' || pathname === '/') {
      store.setView('landing');
      return;
    }

    // 2. Checkout
    if (pathname === '/checkout') {
      store.setView('checkout');
      return;
    }

    // 3. Ticket
    if (pathname === '/ticket') {
      store.setView('ticket');
      return;
    }

    // 4. Stadium Routes: /stadium/:venueSlug/:standSlug?/:blockSlug?/:seatSlug?
    const stadiumMatch = pathname.match(/^\/stadium\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?(?:\/([^/]+))?$/i);
    if (stadiumMatch) {
      const [, venueSlug, standSlug, blockSlug, seatSlug] = stadiumMatch;
      const venueId = SLUG_TO_VENUE_ID[venueSlug.toLowerCase()] || 'tu_cricket_ground';
      const venues = venuesData as unknown as Venue[];
      const stadiumVenue = venues.find((v) => v.id === venueId) || venues[0];

      store.selectVenue(stadiumVenue.id);

      // Handle Lighting mode query param
      if (modeParam === 'day') {
        store.setLightingMode('day');
      } else if (modeParam === 'night' || modeParam === 'evening') {
        store.setLightingMode('evening');
      }

      // Build stadium data for validation
      const soldKeys = store.getSoldSeatKeys();
      const stadiumData = buildStadiumDrillDownData(stadiumVenue.sections, soldKeys);

      // No Stand specified -> Overview
      if (!standSlug) {
        store.returnToOverview();
        return;
      }

      // Resolve Stand
      const targetStandId = SLUG_TO_STAND_ID[standSlug.toLowerCase()] || standSlug.toLowerCase().replace(/-/g, '_');
      const stand = stadiumData.stands.find((s) => s.id === targetStandId || s.id.toLowerCase() === targetStandId);

      if (!stand) {
        store.setToastMessage(`Stand "${standSlug}" not found. Showing stadium overview.`);
        store.returnToOverview();
        return;
      }

      store.selectStand(stand.id);

      // No Block specified -> Stand Level
      if (!blockSlug) {
        useBookingStore.setState({
          stadiumLevel: 'stand',
          selectedBlockId: null,
          activeSeat: null,
          cameraMode: 'overview',
        });
        return;
      }

      // Resolve Block
      const cleanBlockSlug = blockSlug.toLowerCase();
      const block = stand.blocks.find(
        (b) =>
          b.label.toLowerCase() === cleanBlockSlug ||
          b.id.toLowerCase() === cleanBlockSlug ||
          b.id.toLowerCase().endsWith(`_${cleanBlockSlug}`)
      );

      if (!block) {
        store.setToastMessage(`Block "${blockSlug}" not found. Showing ${stand.nameEn}.`);
        useBookingStore.setState({
          stadiumLevel: 'stand',
          selectedBlockId: null,
          activeSeat: null,
          cameraMode: 'overview',
        });
        return;
      }

      store.selectBlock(block.id);

      // No Seat specified -> Block Level
      if (!seatSlug) {
        useBookingStore.setState({
          stadiumLevel: 'block',
          activeSeat: null,
          cameraMode: 'overview',
        });
        return;
      }

      // Resolve Seat: Format e.g. "a-12" or "A12"
      const seatParts = seatSlug.match(/^([a-z]+)-?(\d+)$/i);
      if (!seatParts) {
        store.setToastMessage(`Invalid seat format "${seatSlug}". Showing block ${block.label}.`);
        useBookingStore.setState({
          stadiumLevel: 'block',
          activeSeat: null,
          cameraMode: 'overview',
        });
        return;
      }

      const rowLetter = seatParts[1].toUpperCase();
      const seatNumber = parseInt(seatParts[2], 10);

      // Find seat in block seats
      const allStadiumSeats = [...stadiumData.lowerSeatsData, ...stadiumData.upperSeatsData];
      const seat = allStadiumSeats.find(
        (s) => s.blockId === block.id && s.row === rowLetter && s.number === seatNumber
      );

      if (!seat) {
        store.setToastMessage(`Seat Row ${rowLetter} · Seat ${seatNumber} not found. Showing block ${block.label}.`);
        useBookingStore.setState({
          stadiumLevel: 'block',
          activeSeat: null,
          cameraMode: 'overview',
        });
        return;
      }

      // Check if seat is sold
      const seatKey = `${seat.row}-${seat.number}`;
      const isSold = soldKeys.includes(seatKey);
      if (isSold) {
        store.setToastMessage(`Seat ${seat.row}${seat.number} in ${block.label} is already booked. Showing block view.`);
        useBookingStore.setState({
          stadiumLevel: 'block',
          activeSeat: null,
          cameraMode: 'overview',
        });
        return;
      }

      // Seat is available: fly directly into seat view
      const activeSeat: ActiveSeatView = {
        sectionId: seat.sectionId,
        sectionName: seat.sectionName,
        row: seat.row,
        number: seat.number,
        priceNPR: seat.priceNPR,
        tier: seat.tier,
        cameraPosition: [seat.position[0], seat.position[1] + 1.2, seat.position[2]],
        cameraTarget: [0, 0.4, 0],
        blockId: seat.blockId,
        blockLabel: seat.blockLabel,
        standId: seat.standId,
        standName: seat.standName,
      };

      useBookingStore.setState({
        stadiumLevel: 'seat',
        selectedStandId: stand.id,
        selectedBlockId: block.id,
        activeSeat,
        cameraMode: 'seatview',
      });
      return;
    }

    // 5. Cinema Routes: /cinema/:venueSlug/:sectionSlug?/:seatSlug?
    const cinemaMatch = pathname.match(/^\/cinema\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/i);
    if (cinemaMatch) {
      const [, venueSlug, sectionSlug, seatSlug] = cinemaMatch;
      const venueId = SLUG_TO_VENUE_ID[venueSlug.toLowerCase()] || venueSlug.replace(/-/g, '_');
      const venues = venuesData as unknown as Venue[];
      const cinemaVenue = venues.find((v) => v.id === venueId || v.id.includes(venueSlug)) || venues.find((v) => v.type === 'cinema') || venues[0];

      store.selectVenue(cinemaVenue.id);

      if (!sectionSlug) {
        useBookingStore.setState({
          activeSectionId: null,
          activeSeat: null,
          cameraMode: 'overview',
        });
        return;
      }

      const cleanSectionSlug = sectionSlug.toLowerCase();
      const section = cinemaVenue.sections.find(
        (s) => s.id.toLowerCase() === cleanSectionSlug || s.tier.toLowerCase() === cleanSectionSlug
      );

      if (!section) {
        store.setToastMessage(`Section "${sectionSlug}" not found. Showing hall overview.`);
        useBookingStore.setState({
          activeSectionId: null,
          activeSeat: null,
          cameraMode: 'overview',
        });
        return;
      }

      store.selectSection(section.id);

      if (!seatSlug) return;

      const seatParts = seatSlug.match(/^([a-z]+)-?(\d+)$/i);
      if (!seatParts) {
        store.setToastMessage(`Invalid cinema seat format "${seatSlug}".`);
        return;
      }

      const rowLetter = seatParts[1].toUpperCase();
      const seatNumber = parseInt(seatParts[2], 10);
      const soldKeys = store.getSoldSeatKeys();
      const isSold = soldKeys.includes(`${rowLetter}-${seatNumber}`);

      if (isSold) {
        store.setToastMessage(`Seat ${rowLetter}${seatNumber} is already booked. Showing hall view.`);
        return;
      }

      // Fly to cinema seat
      const eyePos: [number, number, number] = [0, 4.2, 5.0];
      const targetLook: [number, number, number] = [0, 4.3, -13.5];

      const activeSeat: ActiveSeatView = {
        sectionId: section.id,
        sectionName: section.name.en,
        row: rowLetter,
        number: seatNumber,
        priceNPR: section.priceNPR,
        tier: section.tier,
        cameraPosition: eyePos,
        cameraTarget: targetLook,
      };

      store.flyToSeat(activeSeat);
      return;
    }

    // Default Fallback
    store.setView('landing');
  } finally {
    isApplyingFromUrl = false;
  }
}

/**
 * Initialize bidirectional URL synchronization and window popstate listening.
 */
export function initUrlRouting(): () => void {
  if (typeof window === 'undefined') return () => {};

  // 1. Initial hydration from current URL
  syncStateFromUrl();
  lastPushedUrl = window.location.pathname + window.location.search;

  // 2. Browser Back / Forward handler
  const handlePopState = () => {
    syncStateFromUrl();
    lastPushedUrl = window.location.pathname + window.location.search;
  };
  window.addEventListener('popstate', handlePopState);

  // 3. Subscribe to Zustand store changes to update URL via pushState
  const unsubscribe = useBookingStore.subscribe(() => {
    if (isApplyingFromUrl) return;

    const newUrl = buildUrlFromState();
    const currentFullUrl = window.location.pathname + window.location.search;

    if (newUrl && newUrl !== currentFullUrl && newUrl !== lastPushedUrl) {
      lastPushedUrl = newUrl;
      window.history.pushState(null, '', newUrl);
    }
  });

  return () => {
    window.removeEventListener('popstate', handlePopState);
    unsubscribe();
  };
}
