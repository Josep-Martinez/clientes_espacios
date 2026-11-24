import type { Pool, PoolClient } from "pg";
import { ApiError } from "./contracts.ts";
import type { BookfitRow } from "./database-types.ts";

export interface LocalInterval {
  date: string;
  startMinute: number;
  endMinute: number;
  startsAt: Date;
  endsAt: Date;
  weekday: number;
}

export type LocationRow = Omit<
  Pick<
    BookfitRow<"locations">,
    "id" | "slug" | "name" | "is_online" | "x_km" | "y_km"
  >,
  "x_km" | "y_km"
> & {
  x_km: string | number;
  y_km: string | number;
};

export interface ActiveAllocation {
  starts_at: Date;
  ends_at: Date;
  location_id: string | null;
  resource_kind: "professional" | "space";
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function weekdayForDate(value: string): number {
  return new Date(`${value}T12:00:00.000Z`).getUTCDay();
}

export function madridTodayKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function assertBookableDate(
  date: string,
  now = new Date(),
  horizonDays = 90,
): void {
  if (!isDateKey(date))
    throw new ApiError(422, "La fecha no es válida.", "invalid_date");
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 365) {
    throw new ApiError(
      500,
      "El horizonte de reservas no está configurado correctamente.",
      "invalid_booking_horizon",
    );
  }
  const today = madridTodayKey(now);
  const latest = new Date(`${today}T12:00:00.000Z`);
  latest.setUTCDate(latest.getUTCDate() + horizonDays);
  if (date <= today || date > latest.toISOString().slice(0, 10)) {
    throw new ApiError(
      422,
      `Las fechas deben estar entre mañana y los próximos ${horizonDays} días.`,
      "date_out_of_range",
    );
  }
}

function madridWallParts(timestamp: number): number[] {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return [
    Number(values.year),
    Number(values.month),
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  ];
}

export function madridLocalInstant(date: string, minuteOfDay: number): Date {
  if (
    !isDateKey(date) ||
    !Number.isInteger(minuteOfDay) ||
    minuteOfDay < 0 ||
    minuteOfDay >= 1440
  ) {
    throw new ApiError(422, "Fecha u hora no válida.", "invalid_local_time");
  }
  const [year, month, day] = date.split("-").map(Number);
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  const wallTimestamp = Date.UTC(year, month - 1, day, hour, minute);
  const offsetAt = (timestamp: number): number => {
    const [y, m, d, h, min, sec] = madridWallParts(timestamp);
    return Date.UTC(y, m - 1, d, h, min, sec) - timestamp;
  };
  const matches = new Set<number>();
  // Probe the full day around this wall time so both offsets are found on DST
  // transition days. Iterative offset conversion alone silently picks one side
  // of an ambiguous fall-back hour.
  for (let deltaHours = -24; deltaHours <= 24; deltaHours += 1) {
    const candidate =
      wallTimestamp - offsetAt(wallTimestamp + deltaHours * 60 * 60_000);
    const actual = madridWallParts(candidate);
    if (
      actual[0] === year &&
      actual[1] === month &&
      actual[2] === day &&
      actual[3] === hour &&
      actual[4] === minute
    ) {
      matches.add(candidate);
    }
  }
  if (matches.size === 0) {
    throw new ApiError(
      422,
      "La hora local no existe por el cambio horario.",
      "nonexistent_local_time",
    );
  }
  if (matches.size > 1) {
    throw new ApiError(
      422,
      "La hora local es ambigua por el cambio horario.",
      "ambiguous_local_time",
    );
  }
  return new Date(matches.values().next().value as number);
}

export function createLocalInterval(
  date: string,
  startMinute: number,
  durationMinutes: number,
): LocalInterval {
  if (
    !isDateKey(date) ||
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 1 ||
    startMinute + durationMinutes > 1440
  ) {
    throw new ApiError(
      422,
      "La duración no cabe en el día seleccionado.",
      "invalid_interval",
    );
  }
  const endDate = new Date(`${date}T12:00:00.000Z`);
  endDate.setUTCDate(
    endDate.getUTCDate() + Math.floor((startMinute + durationMinutes) / 1440),
  );
  const endDateKey = endDate.toISOString().slice(0, 10);
  return {
    date,
    startMinute,
    endMinute: startMinute + durationMinutes,
    startsAt: madridLocalInstant(date, startMinute),
    endsAt: madridLocalInstant(
      endDateKey,
      (startMinute + durationMinutes) % 1440,
    ),
    weekday: weekdayForDate(date),
  };
}

export async function loadLocations(
  db: Pool | PoolClient,
): Promise<Map<string, LocationRow>> {
  const result = await db.query<LocationRow>(
    "SELECT id,slug,name,x_km,y_km,is_online FROM bookfit.locations",
  );
  return new Map(result.rows.map((row) => [row.id, row]));
}

export function travelDistanceKm(
  locations: Map<string, LocationRow>,
  fromId: string,
  toId: string,
): number {
  if (fromId === toId) return 0;
  const from = locations.get(fromId);
  const to = locations.get(toId);
  if (!from || !to) return Number.POSITIVE_INFINITY;
  if (from.is_online || to.is_online) return 0;
  const distance = Math.hypot(
    Number(from.x_km) - Number(to.x_km),
    Number(from.y_km) - Number(to.y_km),
  );
  return Math.round(distance * 10) / 10;
}

export function travelMinutesForDistance(distance: number): number {
  return distance <= 0 ? 0 : Math.ceil(distance * 4 + 5);
}

export function isProfessionalIntervalAvailable(input: {
  candidate: LocalInterval;
  locationId: string;
  baseLocationId: string;
  maxRadiusKm: number;
  maxTravelMinutes: number;
  bufferMinutes: number;
  allocations: ActiveAllocation[];
  blocks: Array<{ starts_at: Date; ends_at: Date }>;
  locations: Map<string, LocationRow>;
}): boolean {
  const { candidate, allocations, blocks } = input;
  const start = candidate.startsAt.getTime();
  const end = candidate.endsAt.getTime();
  if (
    blocks.some(
      (block) =>
        block.starts_at.getTime() < end && start < block.ends_at.getTime(),
    )
  )
    return false;
  if (
    allocations.some(
      (item) =>
        item.starts_at.getTime() < end && start < item.ends_at.getTime(),
    )
  )
    return false;
  const distanceFromBase = travelDistanceKm(
    input.locations,
    input.baseLocationId,
    input.locationId,
  );
  if (distanceFromBase > input.maxRadiusKm) return false;

  const previous = allocations
    .filter((item) => item.ends_at.getTime() <= start)
    .sort((a, b) => b.ends_at.getTime() - a.ends_at.getTime())[0];
  const next = allocations
    .filter((item) => item.starts_at.getTime() >= end)
    .sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime())[0];
  if (previous?.location_id) {
    const travel = travelMinutesForDistance(
      travelDistanceKm(input.locations, previous.location_id, input.locationId),
    );
    if (
      travel > input.maxTravelMinutes ||
      start <
        previous.ends_at.getTime() + (travel + input.bufferMinutes) * 60_000
    )
      return false;
  }
  if (next?.location_id) {
    const travel = travelMinutesForDistance(
      travelDistanceKm(input.locations, input.locationId, next.location_id),
    );
    if (
      travel > input.maxTravelMinutes ||
      end + (travel + input.bufferMinutes) * 60_000 > next.starts_at.getTime()
    )
      return false;
  }
  return true;
}

export async function readProfessionalOccupancy(
  db: Pool | PoolClient,
  professionalId: string,
  date: string,
): Promise<{
  allocations: ActiveAllocation[];
  blocks: Array<{ starts_at: Date; ends_at: Date }>;
}> {
  const rangeFrom = new Date(`${date}T00:00:00.000Z`);
  rangeFrom.setUTCDate(rangeFrom.getUTCDate() - 1);
  const rangeTo = new Date(`${date}T23:59:59.999Z`);
  rangeTo.setUTCDate(rangeTo.getUTCDate() + 1);
  const allocations = await db.query<ActiveAllocation>(
    `SELECT ra.starts_at,ra.ends_at,ra.location_id,ra.resource_kind
         FROM bookfit.resource_allocations ra
         LEFT JOIN bookfit.orders o ON o.id=ra.order_id
         LEFT JOIN bookfit.checkout_holds h ON h.order_id=o.id
        WHERE ra.resource_kind='professional' AND ra.resource_id=$1
          AND ra.starts_at<$3 AND ra.ends_at>$2
          AND (ra.status='confirmed' AND (ra.order_id IS NULL OR o.status='paid')
            OR ra.status='held' AND o.status='pending' AND h.expires_at>now())`,
    [professionalId, rangeFrom.toISOString(), rangeTo.toISOString()],
  );
  const blocks = await db.query<{ starts_at: Date; ends_at: Date }>(
    `SELECT starts_at,ends_at FROM bookfit.professional_blocks
        WHERE professional_id=$1 AND starts_at<$3 AND ends_at>$2`,
    [professionalId, rangeFrom.toISOString(), rangeTo.toISOString()],
  );
  return { allocations: allocations.rows, blocks: blocks.rows };
}
