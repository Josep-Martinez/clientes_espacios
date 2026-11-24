import type { Pool } from "pg";
import type {
  BookfitRow,
  ProfessionalPreferencesRow,
} from "./database-types.ts";
import {
  assertBookableDate,
  createLocalInterval,
  isProfessionalIntervalAvailable,
  loadLocations,
  readProfessionalOccupancy,
  travelDistanceKm,
} from "./availability.ts";
import { ApiError, type BookingMode } from "./contracts.ts";

type ServiceRecord = Pick<
  BookfitRow<"services">,
  | "id"
  | "professional_id"
  | "name"
  | "category"
  | "description"
  | "service_format"
  | "duration_minutes"
  | "price_cents"
  | "modalities"
  | "required_equipment"
  | "group_capacity"
  | "class_activity"
> & {
  professional_name: string;
  professional_headline: string;
  professional_zone: string;
  professional_rating: string | number;
};

type ProfessionalRecord = Omit<
  Pick<
    BookfitRow<"professionals">,
    | "id"
    | "actor_id"
    | "slug"
    | "headline"
    | "bio"
    | "public_zone"
    | "public_location_id"
    | "rating"
    | "review_count"
    | "categories"
  >,
  "rating"
> & {
  display_name: string;
  rating: string | number;
};

type SpaceRecord = Pick<
  BookfitRow<"spaces">,
  | "id"
  | "name"
  | "slug"
  | "kind"
  | "location_id"
  | "capacity"
  | "equipment"
  | "amenities"
  | "description"
  | "price_per_occurrence_cents"
>;

type LocationRecord = Pick<
  BookfitRow<"locations">,
  "id" | "slug" | "name" | "is_online"
>;
type ProfessionalHoursRecord = Pick<
  BookfitRow<"professional_hours">,
  "opens_at" | "closes_at"
>;
type AvailabilityPreferencesRecord = Pick<
  ProfessionalPreferencesRow,
  "base_location_id" | "max_radius_km" | "max_travel_minutes" | "buffer_minutes"
>;
type AvailabilityServiceRecord = Pick<
  BookfitRow<"services">,
  | "id"
  | "professional_id"
  | "name"
  | "service_format"
  | "duration_minutes"
  | "price_cents"
  | "modalities"
  | "required_equipment"
> & {
  professional_name: string;
};

function minutes(value: string): number {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

export async function getCatalog(
  pool: Pool,
  search: string,
): Promise<Record<string, unknown>> {
  const term = search.trim().slice(0, 100);
  const pattern = term ? `%${term}%` : null;
  const [locations, professionals, services, spaces] = await Promise.all([
    pool.query<LocationRecord>(
      "SELECT id,slug,name,is_online FROM bookfit.locations ORDER BY name",
    ),
    pool.query<ProfessionalRecord>(
      `SELECT p.id,p.actor_id,a.display_name,p.slug,p.headline,p.bio,p.public_zone,p.public_location_id,p.rating,p.review_count,p.categories
         FROM bookfit.professionals p JOIN bookfit.actors a ON a.id=p.actor_id
        WHERE $1::text IS NULL OR concat_ws(' ',a.display_name,p.headline,p.bio,p.public_zone,array_to_string(p.categories,' ')) ILIKE $1
        ORDER BY p.rating DESC,a.display_name LIMIT 100`,
      [pattern],
    ),
    pool.query<ServiceRecord>(
      `SELECT s.id,s.professional_id,a.display_name AS professional_name,p.headline AS professional_headline,
              p.public_zone AS professional_zone,p.rating AS professional_rating,
              s.name,s.category,s.description,s.service_format,s.duration_minutes,s.price_cents,
              s.modalities,s.required_equipment,s.group_capacity,s.class_activity
         FROM bookfit.services s JOIN bookfit.professionals p ON p.id=s.professional_id
         JOIN bookfit.actors a ON a.id=p.actor_id
        WHERE $1::text IS NULL OR concat_ws(' ',s.name,s.category,s.description,a.display_name) ILIKE $1
        ORDER BY s.name LIMIT 100`,
      [pattern],
    ),
    pool.query<SpaceRecord>(
      `SELECT s.id,s.name,s.slug,s.kind,s.location_id,s.capacity,s.equipment,s.amenities,s.description,s.price_per_occurrence_cents
         FROM bookfit.spaces s JOIN bookfit.locations l ON l.id=s.location_id
        WHERE $1::text IS NULL OR concat_ws(' ',s.name,s.kind,s.description,l.name,array_to_string(s.equipment,' ')) ILIKE $1
        ORDER BY s.kind,s.name LIMIT 100`,
      [pattern],
    ),
  ]);
  const professionalData = professionals.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.display_name,
    initials: row.display_name
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
    headline: row.headline,
    bio: row.bio,
    publicZone: row.public_zone,
    publicLocationId: row.public_location_id,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    categories: row.categories,
  }));
  return {
    locations: locations.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      isOnline: row.is_online,
    })),
    professionals: professionalData,
    services: services.rows.map((row) => ({
      id: row.id,
      professionalId: row.professional_id,
      professionalName: row.professional_name,
      professionalHeadline: row.professional_headline,
      professionalZone: row.professional_zone,
      professionalRating: Number(row.professional_rating),
      name: row.name,
      category: row.category,
      description: row.description,
      format: row.service_format,
      durationMinutes: row.duration_minutes,
      priceCents: row.price_cents,
      modalities: row.modalities,
      requiredEquipment: row.required_equipment,
      groupCapacity: row.group_capacity,
      classActivity: row.class_activity,
    })),
    spaces: spaces.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      kind: row.kind,
      locationId: row.location_id,
      capacity: row.capacity,
      equipment: row.equipment,
      amenities: row.amenities,
      description: row.description,
      pricePerOccurrenceCents: row.price_per_occurrence_cents,
    })),
  };
}

export async function getClasses(
  pool: Pool,
  from: string,
  to: string,
): Promise<Array<Record<string, unknown>>> {
  if (
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(from) ||
    !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(to) ||
    from > to
  ) {
    throw new ApiError(
      422,
      "El rango de fechas no es válido.",
      "invalid_date_range",
    );
  }
  const span = Math.floor(
    (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) /
      86_400_000,
  );
  if (span > 90)
    throw new ApiError(
      422,
      "El rango máximo es de 90 días.",
      "date_range_too_large",
    );
  const result = await pool.query<{
    id: string;
    service_id: string;
    service_name: string;
    service_category: string;
    professional_id: string;
    professional_name: string;
    space_id: string;
    space_name: string;
    location_name: string;
    service_date: string;
    starts_at: Date;
    ends_at: Date;
    capacity: number;
    service_price_cents: number;
    space_price_cents: number;
    used_seats: string | number;
  }>(
    `SELECT c.id,c.service_id,s.name AS service_name,s.category AS service_category,c.professional_id,a.display_name AS professional_name,
            c.space_id,sp.name AS space_name,l.name AS location_name,c.service_date::text AS service_date,c.starts_at,c.ends_at,c.capacity,
            s.price_cents AS service_price_cents,sp.price_per_occurrence_cents AS space_price_cents,
            COALESCE(sum(sa.seats) FILTER (WHERE sa.status='confirmed' AND o.status='paid'
              OR sa.status='held' AND o.status='pending' AND h.expires_at>now()),0) AS used_seats
       FROM bookfit.class_sessions c JOIN bookfit.services s ON s.id=c.service_id
       JOIN bookfit.professionals p ON p.id=c.professional_id JOIN bookfit.actors a ON a.id=p.actor_id
       JOIN bookfit.spaces sp ON sp.id=c.space_id JOIN bookfit.locations l ON l.id=sp.location_id
       LEFT JOIN bookfit.seat_allocations sa ON sa.class_session_id=c.id
       LEFT JOIN bookfit.orders o ON o.id=sa.order_id LEFT JOIN bookfit.checkout_holds h ON h.order_id=o.id
      WHERE c.service_date BETWEEN $1::date AND $2::date
      GROUP BY c.id,s.name,s.category,a.display_name,sp.name,l.name,s.price_cents,sp.price_per_occurrence_cents
      ORDER BY c.service_date,c.starts_at LIMIT 100`,
    [from, to],
  );
  return result.rows.map((row) => ({
    id: row.id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    category: row.service_category,
    professionalId: row.professional_id,
    professionalName: row.professional_name,
    spaceId: row.space_id,
    spaceName: row.space_name,
    locationName: row.location_name,
    date: row.service_date,
    start: new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(row.starts_at),
    end: new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(row.ends_at),
    startMinute: minutes(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Madrid",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(row.starts_at),
    ),
    capacity: row.capacity,
    usedSeats: Number(row.used_seats),
    availableSeats: Math.max(0, row.capacity - Number(row.used_seats)),
    servicePriceCents: row.service_price_cents,
    spacePriceCents: row.space_price_cents,
  }));
}

export async function getAvailability(
  pool: Pool,
  input: {
    serviceId: string;
    mode: BookingMode;
    date: string;
    areaLocationId?: string;
    seats: number;
  },
): Promise<{ date: string; slots: Array<Record<string, unknown>> }> {
  assertBookableDate(input.date);
  if (!Number.isInteger(input.seats) || input.seats < 1 || input.seats > 12)
    throw new ApiError(422, "Número de plazas no válido.", "invalid_seats");
  const serviceResult = await pool.query<AvailabilityServiceRecord>(
    `SELECT s.*,a.display_name AS professional_name FROM bookfit.services s
       JOIN bookfit.professionals p ON p.id=s.professional_id JOIN bookfit.actors a ON a.id=p.actor_id WHERE s.id=$1`,
    [input.serviceId],
  );
  const service = serviceResult.rows[0];
  if (!service)
    throw new ApiError(404, "Servicio no encontrado.", "service_not_found");
  if (service.service_format !== "individual")
    throw new ApiError(
      422,
      "Las clases de grupo usan la lista de clases.",
      "group_uses_classes",
    );
  if (!service.modalities.includes(input.mode))
    throw new ApiError(422, "Modalidad no disponible.", "mode_not_allowed");
  if (input.seats !== 1)
    throw new ApiError(
      422,
      "El servicio individual admite una plaza.",
      "invalid_seats",
    );
  const weekday = new Date(`${input.date}T12:00:00Z`).getUTCDay();
  const hours = await pool.query<ProfessionalHoursRecord>(
    "SELECT opens_at::text,closes_at::text FROM bookfit.professional_hours WHERE professional_id=$1 AND weekday=$2",
    [service.professional_id, weekday],
  );
  if (!hours.rowCount) return { date: input.date, slots: [] };
  const prefsResult = await pool.query<AvailabilityPreferencesRecord>(
    "SELECT base_location_id,max_radius_km,max_travel_minutes,buffer_minutes FROM bookfit.professional_preferences WHERE professional_id=$1",
    [service.professional_id],
  );
  const preferences = prefsResult.rows[0];
  const locations = await loadLocations(pool);
  let targetLocationId =
    input.mode === "online"
      ? locations.get("20000000-0000-4000-8000-000000000008")?.id
      : input.areaLocationId;
  if (
    input.mode === "home" &&
    (!targetLocationId || !locations.has(targetLocationId))
  )
    throw new ApiError(422, "Selecciona una zona válida.", "invalid_location");

  const spacesResult =
    input.mode === "room" || input.mode === "gym"
      ? await pool.query<
          SpaceRecord & {
            location_name: string;
            opens_at: string | null;
            closes_at: string | null;
          }
        >(
          `SELECT sp.id,sp.name,sp.slug,sp.kind,sp.location_id,sp.capacity,sp.equipment,sp.amenities,sp.description,
              sp.price_per_occurrence_cents,l.name AS location_name,oh.opens_at::text,oh.closes_at::text
         FROM bookfit.spaces sp JOIN bookfit.locations l ON l.id=sp.location_id
         LEFT JOIN bookfit.space_opening_hours oh ON oh.space_id=sp.id AND oh.weekday=$3
        WHERE sp.kind=$1 AND sp.capacity >= $2 AND sp.equipment @> $4::text[] AND oh.space_id IS NOT NULL
        ORDER BY sp.name`,
          [input.mode, input.seats, weekday, service.required_equipment],
        )
      : {
          rows: [] as Array<
            SpaceRecord & {
              location_name: string;
              opens_at: string | null;
              closes_at: string | null;
            }
          >,
        };
  const profile = {
    base_location_id: preferences.base_location_id,
    max_radius_km: Number(preferences.max_radius_km),
    max_travel_minutes: preferences.max_travel_minutes,
    buffer_minutes: preferences.buffer_minutes,
  };
  const occupancy = await readProfessionalOccupancy(
    pool,
    service.professional_id,
    input.date,
  );
  const hoursStart = minutes(hours.rows[0].opens_at);
  const hoursEnd = minutes(hours.rows[0].closes_at);
  const candidateStarts: number[] = [];
  for (
    let start = Math.ceil(hoursStart / 30) * 30;
    start + service.duration_minutes <= hoursEnd;
    start += 30
  ) {
    candidateStarts.push(start);
  }
  const slots: Array<Record<string, unknown>> = [];
  for (const startMinute of candidateStarts) {
    const interval = createLocalInterval(
      input.date,
      startMinute,
      service.duration_minutes,
    );
    const slotSpaces: Array<Record<string, unknown>> = [];
    if (input.mode === "room" || input.mode === "gym") {
      for (const space of spacesResult.rows) {
        if (
          minutes(space.opens_at ?? "24:00") > startMinute ||
          minutes(space.closes_at ?? "00:00") < interval.endMinute
        )
          continue;
        if (
          travelDistanceKm(
            locations,
            profile.base_location_id,
            space.location_id,
          ) > profile.max_radius_km
        )
          continue;
        const spaceConflict = await pool.query(
          `SELECT 1 FROM bookfit.resource_allocations ra LEFT JOIN bookfit.orders o ON o.id=ra.order_id
             LEFT JOIN bookfit.checkout_holds h ON h.order_id=o.id
            WHERE ra.resource_kind='space' AND ra.resource_id=$1 AND ra.starts_at<$3 AND ra.ends_at>$2
              AND (ra.status='confirmed' AND (ra.order_id IS NULL OR o.status='paid')
                OR ra.status='held' AND o.status='pending' AND h.expires_at>now()) LIMIT 1`,
          [
            space.id,
            interval.startsAt.toISOString(),
            interval.endsAt.toISOString(),
          ],
        );
        if (spaceConflict.rowCount) continue;
        const blocked = await pool.query(
          "SELECT 1 FROM bookfit.space_blocks WHERE space_id=$1 AND starts_at<$3 AND ends_at>$2 LIMIT 1",
          [
            space.id,
            interval.startsAt.toISOString(),
            interval.endsAt.toISOString(),
          ],
        );
        if (blocked.rowCount) continue;
        if (
          !isProfessionalIntervalAvailable({
            candidate: interval,
            locationId: space.location_id,
            baseLocationId: profile.base_location_id,
            maxRadiusKm: profile.max_radius_km,
            maxTravelMinutes: profile.max_travel_minutes,
            bufferMinutes: profile.buffer_minutes,
            allocations: occupancy.allocations,
            blocks: occupancy.blocks,
            locations,
          })
        )
          continue;
        slotSpaces.push({
          id: space.id,
          name: space.name,
          kind: space.kind,
          locationId: space.location_id,
          locationName: space.location_name,
          capacity: space.capacity,
          equipment: space.equipment,
          pricePerOccurrenceCents: space.price_per_occurrence_cents,
        });
      }
      if (slotSpaces.length)
        slots.push({
          date: input.date,
          startMinute,
          endMinute: interval.endMinute,
          spaces: slotSpaces,
        });
    } else {
      if (!targetLocationId)
        targetLocationId = locations.get(
          "20000000-0000-4000-8000-000000000008",
        )?.id;
      if (
        targetLocationId &&
        isProfessionalIntervalAvailable({
          candidate: interval,
          locationId: targetLocationId,
          baseLocationId: profile.base_location_id,
          maxRadiusKm: profile.max_radius_km,
          maxTravelMinutes: profile.max_travel_minutes,
          bufferMinutes: profile.buffer_minutes,
          allocations: occupancy.allocations,
          blocks: occupancy.blocks,
          locations,
        })
      )
        slots.push({
          date: input.date,
          startMinute,
          endMinute: interval.endMinute,
          spaces: [],
        });
    }
    if (slots.length >= 48) break;
  }
  return { date: input.date, slots };
}
