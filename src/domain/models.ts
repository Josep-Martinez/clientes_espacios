import type { PrivateCommitment } from './availability.ts';
import type { SpaceOpeningHours, SpaceKind } from './spaces.ts';

export type BookingMode = 'room' | 'gym' | 'home' | 'online';
export type ServiceFormat = 'individual' | 'group';
export type DemoRole = 'client' | 'professional' | 'space';

export interface DemoConversationMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface DemoConversation {
  id: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  status: 'pending' | 'accepted' | 'declined';
  requestedAt: string;
  messages: DemoConversationMessage[];
}

export interface ProfessionalPreferences {
  baseLocationId: string;
  maxRadiusKm: number;
  maxTravelMinutes: number;
  bufferMinutes: number;
  modalities: BookingMode[];
}

export interface DemoProfessional {
  id: string;
  name: string;
  initials: string;
  headline: string;
  categories: string[];
  bio: string;
  publicZone: string;
  publicAreaLocationId: string;
  rating: number;
  reviewCount: number;
  preferences: ProfessionalPreferences;
  privateCalendarByWeekday: Record<number, PrivateCommitment[]>;
}

export interface DemoService {
  id: string;
  professionalId: string;
  name: string;
  category: string;
  description: string;
  format: ServiceFormat;
  durationMinutes: number;
  priceCents: number;
  modalities: BookingMode[];
  requiredEquipment: string[];
  groupCapacity?: number;
  classActivity?: string;
}

export interface DemoLocation {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface DemoClassSession {
  id: string;
  serviceId: string;
  professionalId: string;
  spaceId: string;
  date: string;
  start: number;
  end: number;
  capacity: number;
}

export interface DemoBookingOccurrence {
  id: string;
  date: string;
  start: number;
  end: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  sessionId?: string;
  locationId: string;
  /** Sample space fee allocated to this occurrence; 0 for a complimentary entry. */
  spaceAmountCents?: number;
  [key: string]: unknown;
}

export interface DemoBooking {
  id: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  serviceId: string;
  spaceId: string | null;
  mode: BookingMode;
  seats: number;
  seriesId: string | null;
  paymentStatus: 'simulated-succeeded';
  occurrences: DemoBookingOccurrence[];
}

export interface DemoWaitlistEntry {
  id: string;
  clientId: string;
  sessionId: string;
  serviceId: string;
  date: string;
  seats: number;
  status: 'waitlisted';
  chargeCents: 0;
  occupiesSeat: false;
}

export interface DemoState {
  bookings: DemoBooking[];
  waitlist: DemoWaitlistEntry[];
  preferencesByProfessional: Record<string, ProfessionalPreferences>;
  conversations: DemoConversation[];
}

export interface DemoSpaceRecord {
  id: string;
  name: string;
  kind: SpaceKind;
  locationId: string;
  zoneLabel: string;
  capacity: number;
  equipment: string[];
  pricePerOccurrenceCents: number;
  openingHours: SpaceOpeningHours;
  accessInstructions: string;
  description: string;
  amenities: string[];
}
