import type { DemoBooking, DemoBookingOccurrence, DemoRole } from './models.ts';

export interface AgendaScope {
  clientId?: string;
  professionalId?: string;
  spaceIds?: readonly string[];
}

export interface AgendaEvent {
  bookingId: string;
  occurrenceId: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  serviceId: string;
  spaceId: string | null;
  seats: number;
  mode: DemoBooking['mode'];
  seriesId: string | null;
  occurrence: DemoBookingOccurrence;
}

export interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function getCalendarMonthGrid(year: number, monthIndex: number, today: string): CalendarDay[] {
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new RangeError('A valid year and zero-based month are required.');
  }
  if (!isValidDateKey(today)) throw new RangeError('Today must be a valid YYYY-MM-DD date.');

  const firstOfMonth = new Date(year, monthIndex, 1, 12);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const firstDay = new Date(year, monthIndex, 1 - mondayOffset, 12);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + index, 12);
    const dateKey = toLocalDateKey(date);
    return {
      date: dateKey,
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === monthIndex,
      isToday: dateKey === today,
    };
  });
}

export function getAgendaEvents(bookings: readonly DemoBooking[], scope: AgendaScope): AgendaEvent[] {
  const spaceIds = new Set(scope.spaceIds ?? []);
  const hasScope = Boolean(scope.clientId || scope.professionalId || spaceIds.size);
  if (!hasScope) return [];

  return bookings
    .filter((booking) => Boolean(
      (scope.clientId && booking.clientId === scope.clientId)
      || (scope.professionalId && booking.professionalId === scope.professionalId)
      || (booking.spaceId && spaceIds.has(booking.spaceId)),
    ))
    .flatMap((booking) => booking.occurrences.map((occurrence) => ({
      bookingId: booking.id,
      occurrenceId: occurrence.id,
      clientId: booking.clientId,
      clientName: booking.clientName,
      professionalId: booking.professionalId,
      serviceId: booking.serviceId,
      spaceId: booking.spaceId,
      seats: booking.seats,
      mode: booking.mode,
      seriesId: booking.seriesId,
      occurrence,
    })))
    .sort((first, second) => first.occurrence.date.localeCompare(second.occurrence.date)
      || first.occurrence.start - second.occurrence.start
      || first.clientName.localeCompare(second.clientName, 'es-ES'));
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getAgendaScope(input: {
  accountId: string;
  roles: readonly DemoRole[];
  professionalId?: string;
  spaceIds?: readonly string[];
}): AgendaScope {
  return {
    clientId: input.roles.includes('client') ? input.accountId : undefined,
    professionalId: input.roles.includes('professional') ? input.professionalId : undefined,
    spaceIds: input.roles.includes('space') ? input.spaceIds : undefined,
  };
}

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}
