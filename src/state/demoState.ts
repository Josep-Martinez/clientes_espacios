import { DEMO_CLASS_SESSIONS, DEMO_GROUP_SEAT_COUNTS, DEMO_PROFESSIONALS, DEMO_SERVICES, DEMO_SPACES, addDaysToDate, getDefaultSearchDate } from '../data/demoData.ts';
import { DEMO_CLIENT_ID, DEMO_STORAGE_KEY } from '../data/demoConfig.ts';
import type { DemoBooking, DemoBookingOccurrence, DemoState, DemoWaitlistEntry, ProfessionalPreferences } from '../domain/models.ts';
import { cancelOccurrence, resolveCheckoutPayment } from '../domain/reservations.ts';

const DEMO_GROUP_CLIENT_ID = 'asistentes-grupo-demo';
const DEMO_GROUP_CLIENT_NAME = 'Participantes demo';

function getSpaceLocation(spaceId: string | null): string {
  return DEMO_SPACES.find((space) => space.id === spaceId)?.locationId ?? 'online';
}

function makeSeedGroupBooking(sessionId: string, seats: number): DemoBooking | null {
  const session = DEMO_CLASS_SESSIONS.find((item) => item.id === sessionId);
  const service = DEMO_SERVICES.find((item) => item.id === session?.serviceId);
  if (!session || !service) return null;

  return {
    id: `semilla-${session.id}`,
    clientId: DEMO_GROUP_CLIENT_ID,
    clientName: DEMO_GROUP_CLIENT_NAME,
    professionalId: session.professionalId,
    serviceId: session.serviceId,
    spaceId: session.spaceId,
    mode: 'room',
    seats,
    seriesId: null,
    paymentStatus: 'simulated-succeeded',
    occurrences: [{
      id: `ocurrencia-${session.id}`,
      sessionId: session.id,
      date: session.date,
      start: session.start,
      end: session.end,
      status: 'confirmed',
      locationId: getSpaceLocation(session.spaceId),
    }],
  };
}

export function createInitialDemoState(): DemoState {
  const seededGroupBookings = Object.entries(DEMO_GROUP_SEAT_COUNTS)
    .map(([sessionId, seats]) => makeSeedGroupBooking(sessionId, seats))
    .filter((booking): booking is DemoBooking => booking !== null);
  const seedDate = getDefaultSearchDate();
  const sampleBooking: DemoBooking = {
    id: 'semilla-sesion-individual',
    clientId: 'otro-cliente-demo',
    clientName: 'Cliente de muestra',
    professionalId: 'marina-ortega',
    serviceId: 'entrenamiento-uno-a-uno',
    spaceId: 'loft-rueda',
    mode: 'room',
    seats: 1,
    seriesId: null,
    paymentStatus: 'simulated-succeeded',
    occurrences: [{
      id: 'semilla-ocurrencia-individual',
      date: seedDate,
      start: 690,
      end: 750,
      status: 'confirmed',
      locationId: 'ruzafa',
    }],
  };
  const gymBooking: DemoBooking = {
    id: 'semilla-sesion-gimnasio',
    clientId: 'otro-cliente-demo',
    clientName: 'Cliente de muestra',
    professionalId: 'marina-ortega',
    serviceId: 'entrenamiento-gimnasio',
    spaceId: 'senda-gym',
    mode: 'gym',
    seats: 1,
    seriesId: null,
    paymentStatus: 'simulated-succeeded',
    occurrences: [{
      id: 'semilla-ocurrencia-gimnasio',
      date: addDaysToDate(seedDate, 1),
      start: 900,
      end: 955,
      status: 'confirmed',
      locationId: 'ruzafa',
    }],
  };

  return {
    bookings: [...seededGroupBookings, sampleBooking, gymBooking],
    waitlist: [],
    preferencesByProfessional: Object.fromEntries(
      DEMO_PROFESSIONALS.map((professional) => [
        professional.id,
        { ...professional.preferences, modalities: [...professional.preferences.modalities] },
      ]),
    ),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDemoBooking(value: unknown): value is DemoBooking {
  if (!isObject(value) || !Array.isArray(value.occurrences)) return false;
  return typeof value.id === 'string' &&
    typeof value.clientId === 'string' &&
    typeof value.professionalId === 'string' &&
    typeof value.serviceId === 'string' &&
    value.occurrences.every((occurrence) =>
      isObject(occurrence) &&
      typeof occurrence.id === 'string' &&
      typeof occurrence.date === 'string' &&
      (occurrence.status === 'confirmed' || occurrence.status === 'cancelled'),
    );
}

function isWaitlistEntry(value: unknown): value is DemoWaitlistEntry {
  return isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.clientId === 'string' &&
    typeof value.sessionId === 'string' &&
    value.status === 'waitlisted' &&
    value.chargeCents === 0 &&
    value.occupiesSeat === false;
}

export function parseDemoState(serialized: string | null): DemoState {
  if (!serialized) return createInitialDemoState();
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (
      !isObject(parsed) ||
      !Array.isArray(parsed.bookings) ||
      !parsed.bookings.every(isDemoBooking) ||
      !Array.isArray(parsed.waitlist) ||
      !parsed.waitlist.every(isWaitlistEntry) ||
      !isObject(parsed.preferencesByProfessional)
    ) {
      return createInitialDemoState();
    }
    return parsed as unknown as DemoState;
  } catch {
    return createInitialDemoState();
  }
}

export function readDemoState(): DemoState {
  if (typeof window === 'undefined') return createInitialDemoState();
  try {
    return parseDemoState(window.localStorage.getItem(DEMO_STORAGE_KEY));
  } catch {
    return createInitialDemoState();
  }
}

export function saveDemoState(state: DemoState): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function createConfirmedDemoBooking(draft: Omit<DemoBooking, 'paymentStatus'>): DemoBooking {
  const pendingDraft = {
    ...draft,
    paymentStatus: 'simulated-succeeded' as const,
    occurrences: draft.occurrences.map((occurrence) => ({ ...occurrence, status: 'pending' as const })),
  };
  const result = resolveCheckoutPayment({ outcome: 'success', draft: pendingDraft });
  return result.booking;
}

export function cancelDemoBookingOccurrence(
  booking: DemoBooking,
  occurrenceId: string,
): DemoBooking {
  return cancelOccurrence(booking, occurrenceId);
}

export function isBookingOwnedByDemoClient(booking: DemoBooking): boolean {
  return booking.clientId === DEMO_CLIENT_ID;
}

export function updateProfessionalPreferences(
  preferences: DemoState['preferencesByProfessional'],
  professionalId: string,
  value: ProfessionalPreferences,
): DemoState['preferencesByProfessional'] {
  return { ...preferences, [professionalId]: { ...value, modalities: [...value.modalities] } };
}

export function makeWaitlistEntry(input: {
  id: string;
  sessionId: string;
  serviceId: string;
  date: string;
  seats: number;
}): DemoWaitlistEntry {
  return {
    ...input,
    clientId: DEMO_CLIENT_ID,
    status: 'waitlisted',
    chargeCents: 0,
    occupiesSeat: false,
  };
}

export function getLocationForMode(mode: DemoBooking['mode'], selectedSpaceId: string | null, areaId: string): string {
  if (mode === 'online') return 'online';
  if (mode === 'home') return areaId;
  return selectedSpaceId ? getSpaceLocation(selectedSpaceId) : 'online';
}

export function makeOccurrence(input: {
  id: string;
  date: string;
  start: number;
  end: number;
  locationId: string;
  sessionId?: string;
}): DemoBookingOccurrence {
  return { ...input, status: 'pending' };
}
