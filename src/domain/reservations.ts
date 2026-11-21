export type OccurrenceStatus = 'pending' | 'confirmed' | 'cancelled';

export interface BookingOccurrence {
  id: string;
  status: OccurrenceStatus;
  [key: string]: unknown;
}

export interface BookingSeries<T extends BookingOccurrence = BookingOccurrence> {
  id: string;
  occurrences: T[];
  [key: string]: unknown;
}

export interface BookingDraft<T extends BookingOccurrence = BookingOccurrence> {
  id: string;
  occurrences: T[];
  [key: string]: unknown;
}

export function resolveCheckoutPayment<T extends BookingDraft>(input: {
  outcome: 'success' | 'failure';
  draft: T;
}):
  | { paymentStatus: 'succeeded'; booking: T }
  | { paymentStatus: 'failed'; booking: null } {
  if (input.outcome === 'failure') {
    return { paymentStatus: 'failed', booking: null };
  }

  const booking = {
    ...input.draft,
    occurrences: input.draft.occurrences.map((occurrence) => ({
      ...occurrence,
      status: 'confirmed' as const,
    })),
  };

  return { paymentStatus: 'succeeded', booking };
}

export function cancelOccurrence<T extends BookingOccurrence>(
  series: BookingSeries<T>,
  occurrenceId: string,
): BookingSeries<T> {
  return {
    ...series,
    occurrences: series.occurrences.map((occurrence) =>
      occurrence.id === occurrenceId && occurrence.status === 'confirmed'
        ? { ...occurrence, status: 'cancelled' }
        : occurrence,
    ),
  };
}
import type { DemoBooking } from './models.ts';


export function hasConfirmedGymVisit(
  bookings: DemoBooking[],
  clientId: string,
  gymSpaceId: string,
): boolean {
  return bookings.some((booking) =>
    booking.clientId === clientId &&
    booking.spaceId === gymSpaceId &&
    booking.mode === 'gym' &&
    booking.occurrences.some((occurrence) => occurrence.status === 'confirmed'),
  );
}
