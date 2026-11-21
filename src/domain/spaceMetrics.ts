import type { DemoBooking } from './models.ts';
import type { DemoSpaceRecord } from './models.ts';

export interface SpaceMetrics {
  confirmedOccurrences: number;
  bookedMinutes: number;
  openMinutes: number;
  utilizationPercent: number;
  grossEarningsCents: number;
  platformCommissionCents: number;
  estimatedOwnerEarningsCents: number;
}

function parseDate(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Number.NaN;
  const timestamp = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date
    ? timestamp
    : Number.NaN;
}

export function calculateSpaceMetrics(input: {
  spaces: DemoSpaceRecord[];
  bookings: DemoBooking[];
  startDate: string;
  endDateExclusive: string;
  spaceCommissionPercent: number;
}): SpaceMetrics {
  const start = parseDate(input.startDate);
  const end = parseDate(input.endDateExclusive);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new RangeError('A valid increasing date range is required.');
  }
  if (!Number.isFinite(input.spaceCommissionPercent) || input.spaceCommissionPercent < 0 || input.spaceCommissionPercent > 100) {
    throw new RangeError('Space commission must be between 0 and 100.');
  }

  const spacesById = new Map(input.spaces.map((space) => [space.id, space]));
  let openMinutes = 0;
  for (let day = start; day < end; day += 24 * 60 * 60 * 1000) {
    const weekday = new Date(day).getUTCDay();
    openMinutes += input.spaces.reduce((total, space) => {
      if (!space.openingHours.weekdays.includes(weekday)) return total;
      return total + Math.max(0, space.openingHours.end - space.openingHours.start);
    }, 0);
  }

  let confirmedOccurrences = 0;
  const occupiedIntervalsBySpaceAndDate = new Map<string, Array<{ start: number; end: number }>>();
  let grossEarningsCents = 0;
  for (const booking of input.bookings) {
    if (!booking.spaceId) continue;
    const space = spacesById.get(booking.spaceId);
    if (!space) continue;

    for (const occurrence of booking.occurrences) {
      const timestamp = parseDate(occurrence.date);
      if (!Number.isFinite(timestamp) || occurrence.status !== 'confirmed' || timestamp < start || timestamp >= end) continue;
      confirmedOccurrences += 1;
      if (Number.isFinite(occurrence.start) && Number.isFinite(occurrence.end) && occurrence.end > occurrence.start) {
        const intervalKey = `${space.id}:${occurrence.date}`;
        const intervals = occupiedIntervalsBySpaceAndDate.get(intervalKey) ?? [];
        intervals.push({ start: occurrence.start, end: occurrence.end });
        occupiedIntervalsBySpaceAndDate.set(intervalKey, intervals);
      }
      grossEarningsCents += Number.isInteger(occurrence.spaceAmountCents) && (occurrence.spaceAmountCents ?? -1) >= 0
        ? occurrence.spaceAmountCents ?? 0
        : space.pricePerOccurrenceCents;
    }
  }

  const bookedMinutes = [...occupiedIntervalsBySpaceAndDate.values()].reduce((total, intervals) => {
    const ordered = [...intervals].sort((a, b) => a.start - b.start || a.end - b.end);
    let intervalStart: number | null = null;
    let intervalEnd = 0;
    let occupied = 0;
    for (const interval of ordered) {
      if (intervalStart === null) {
        intervalStart = interval.start;
        intervalEnd = interval.end;
      } else if (interval.start <= intervalEnd) {
        intervalEnd = Math.max(intervalEnd, interval.end);
      } else {
        occupied += intervalEnd - intervalStart;
        intervalStart = interval.start;
        intervalEnd = interval.end;
      }
    }
    return total + (intervalStart === null ? 0 : occupied + intervalEnd - intervalStart);
  }, 0);
  const platformCommissionCents = Math.round(grossEarningsCents * input.spaceCommissionPercent / 100);
  return {
    confirmedOccurrences,
    bookedMinutes,
    openMinutes,
    utilizationPercent: openMinutes ? Math.round(bookedMinutes / openMinutes * 100) : 0,
    grossEarningsCents,
    platformCommissionCents,
    estimatedOwnerEarningsCents: grossEarningsCents - platformCommissionCents,
  };
}
