export type VenueType = 'stadium' | 'cinema';

export interface CameraConfig {
  position: [number, number, number];
  target: [number, number, number];
}

export interface Section {
  id: string;
  name: {
    en: string;
    ne: string;
  };
  tier: string; // e.g. "Recliner" | "Premium" | "Standard" | "Lower" | "Upper" | "VIP"
  priceNPR: number;
  rows: number;
  seatsPerRow: number;
  camera: CameraConfig;
  svgPath?: string;
  color?: string;
  startRowLetter?: string;
}

export interface Venue {
  id: string;
  type: VenueType;
  chain?: string;
  name: {
    en: string;
    ne: string;
  };
  city: string;
  location?: string;
  description: {
    en: string;
    ne: string;
  };
  sections: Section[];
}

export interface EventItem {
  id: string;
  venueId: string;
  title: {
    en: string;
    ne: string;
  };
  subtitle: {
    en: string;
    ne: string;
  };
  category: 'cricket' | 'concert' | 'movie';
  dateISO: string;
  time: string;
  accentColor: string;
  hallName?: string;
}

export type StadiumDrillLevel = 'overview' | 'stand' | 'block' | 'seat';

export interface StadiumBlockInfo {
  id: string;
  label: string;
  standId: string;
  standName: string;
  tierType: 'lower' | 'upper';
  rowStart: string;
  rowEnd: string;
  priceNPR: number;
  totalSeats: number;
  availableSeats: number;
  centerPos: [number, number, number];
  blockCameraPos: [number, number, number];
  blockCameraTarget: [number, number, number];
}

export interface StadiumStandInfo {
  id: string;
  bayIdx: number;
  tierType: 'lower' | 'upper';
  nameEn: string;
  nameNe: string;
  priceNPR: number;
  color: string;
  totalSeats: number;
  availableSeats: number;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  blocks: StadiumBlockInfo[];
}

export interface ActiveSeatView {
  sectionId: string;
  sectionName: string;
  row: string;
  number: number;
  priceNPR: number;
  tier: string;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  isRestrictedView?: boolean;
  blockId?: string;
  blockLabel?: string;
  standId?: string;
}

export interface SelectedSeat {
  sectionId: string;
  row: string;
  number: number;
  priceNPR: number;
  tier: string;
  isRestrictedView?: boolean;
  blockId?: string;
  blockLabel?: string;
}

export interface Booking {
  id: string;
  eventId: string;
  venueId: string;
  seats: SelectedSeat[];
  totalNPR: number;
  paymentMethod: 'esewa' | 'khalti' | 'fonepay' | 'imepay';
  createdAtISO: string;
  customerName?: string;
  customerPhone?: string;
}

export type AppLanguage = 'en' | 'ne';
export type AppViewMode = 'landing' | 'venue' | 'checkout' | 'ticket';
