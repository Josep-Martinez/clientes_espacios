export interface WaitlistEntry {
  id: string;
  clientId: string;
  sessionId: string;
  status: 'waitlisted';
  chargeCents: 0;
  occupiesSeat: false;
}

export function canReserveSeats(input: {
  capacity: number;
  confirmedSeats: number;
  requestedSeats: number;
}): boolean {
  return (
    Number.isInteger(input.capacity) &&
    Number.isInteger(input.confirmedSeats) &&
    Number.isInteger(input.requestedSeats) &&
    input.capacity >= 0 &&
    input.confirmedSeats >= 0 &&
    input.confirmedSeats <= input.capacity &&
    input.requestedSeats > 0 &&
    input.requestedSeats <= input.capacity - input.confirmedSeats
  );
}

export function countConfirmedSeats(
  sessionId: string,
  bookings: Array<{ seats: number; occurrences: Array<{ sessionId?: string; status: string }> }>,
): number {
  return bookings.reduce((total, booking) => {
    const hasConfirmedOccurrence = booking.occurrences.some(
      (occurrence) => occurrence.sessionId === sessionId && occurrence.status === 'confirmed',
    );
    return total + (hasConfirmedOccurrence ? Math.max(0, booking.seats) : 0);
  }, 0);
}

export function joinWaitlist(
  waitlist: WaitlistEntry[],
  details: { id: string; clientId: string; sessionId: string },
  capacity: { capacity: number; confirmedSeats: number },
): { entry: WaitlistEntry; waitlist: WaitlistEntry[]; remainingSeats: number } | null {
  const remainingSeats = Math.max(0, capacity.capacity - capacity.confirmedSeats);
  if (remainingSeats > 0) return null;

  const entry: WaitlistEntry = {
    ...details,
    status: 'waitlisted',
    chargeCents: 0,
    occupiesSeat: false,
  };

  return {
    entry,
    waitlist: [...waitlist, entry],
    remainingSeats,
  };
}
