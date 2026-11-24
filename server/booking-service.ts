import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { calculateCheckout } from "../src/domain/pricing.ts";
import {
  assertBookableDate,
  createLocalInterval,
  isDateKey,
  isProfessionalIntervalAvailable,
  loadLocations,
  readProfessionalOccupancy,
  travelDistanceKm,
  travelMinutesForDistance,
} from "./availability.ts";
import { inTransaction, type PoolClient } from "./db.ts";
import type {
  BookfitRow,
  ProfessionalPreferencesRow,
} from "./database-types.ts";
import {
  ApiError,
  type ActorContext,
  type BookingMode,
  type CheckoutLine,
  type CheckoutResult,
} from "./contracts.ts";
import {
  FakePaymentProvider,
  type FakePaymentOutcome,
} from "./payment-provider.ts";

export interface CheckoutSlotInput {
  date: string;
  startMinute?: number;
  spaceId?: string;
  classSessionId?: string;
}

export interface CheckoutInput {
  serviceId: string;
  mode: BookingMode;
  seats: number;
  areaLocationId?: string;
  slots: CheckoutSlotInput[];
}

type ServiceRow = Pick<
  BookfitRow<"services">,
  | "id"
  | "professional_id"
  | "name"
  | "service_format"
  | "duration_minutes"
  | "price_cents"
  | "modalities"
  | "required_equipment"
>;

type PreferencesRow = ProfessionalPreferencesRow;

type SpaceRow = Pick<
  BookfitRow<"spaces">,
  | "id"
  | "kind"
  | "name"
  | "location_id"
  | "capacity"
  | "price_per_occurrence_cents"
  | "equipment"
>;

interface ResolvedSlot {
  date: string;
  startMinute: number;
  space: SpaceRow | null;
  sessionId: string | null;
  interval: ReturnType<typeof createLocalInterval>;
  locationId: string;
  freeGymEntry: boolean;
}

interface ExistingKeyRow {
  request_hash: string;
  response: CheckoutResult | Record<string, unknown> | null;
}

const lockId = 202611241;
const paymentProvider = new FakePaymentProvider();

export async function lockBookingState(client: PoolClient): Promise<void> {
  await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [lockId]);
}

export async function expireStaleHolds(client: PoolClient): Promise<void> {
  const expired = await client.query<{ id: string }>(
    `SELECT o.id FROM bookfit.orders o JOIN bookfit.checkout_holds h ON h.order_id=o.id
      WHERE o.status='pending' AND h.status='active' AND h.expires_at<=now()
      ORDER BY o.id FOR UPDATE OF o`,
  );
  const ids = expired.rows.map((row) => row.id);
  if (!ids.length) return;
  await client.query(
    "UPDATE bookfit.orders SET status='expired',updated_at=now() WHERE id=ANY($1::uuid[])",
    [ids],
  );
  await client.query(
    "UPDATE bookfit.checkout_holds SET status='expired' WHERE order_id=ANY($1::uuid[]) AND status='active'",
    [ids],
  );
  await client.query(
    "UPDATE bookfit.resource_allocations SET status='expired' WHERE order_id=ANY($1::uuid[]) AND status='held'",
    [ids],
  );
  await client.query(
    "UPDATE bookfit.seat_allocations SET status='expired' WHERE order_id=ANY($1::uuid[]) AND status='held'",
    [ids],
  );
  await client.query(
    "UPDATE bookfit.gym_entitlements SET status='released' WHERE order_id=ANY($1::uuid[]) AND status='reserved'",
    [ids],
  );
}

function requestHash(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

async function previousResponse<T>(
  client: PoolClient,
  actorId: string,
  operation: string,
  key: string,
  hash: string,
): Promise<T | null> {
  const existing = await client.query<ExistingKeyRow>(
    "SELECT request_hash,response FROM bookfit.idempotency_keys WHERE actor_id=$1 AND operation=$2 AND key=$3 FOR UPDATE",
    [actorId, operation, key],
  );
  if (!existing.rowCount) return null;
  if (existing.rows[0].request_hash !== hash) {
    throw new ApiError(
      409,
      "La clave de idempotencia ya se usó con otra petición.",
      "idempotency_conflict",
    );
  }
  return existing.rows[0].response as T | null;
}

async function insertKey(
  client: PoolClient,
  actorId: string,
  operation: string,
  key: string,
  hash: string,
): Promise<void> {
  await client.query(
    "INSERT INTO bookfit.idempotency_keys(actor_id,operation,key,request_hash) VALUES($1,$2,$3,$4)",
    [actorId, operation, key, hash],
  );
}

async function saveKeyResponse(
  client: PoolClient,
  actorId: string,
  operation: string,
  key: string,
  response: unknown,
): Promise<void> {
  await client.query(
    "UPDATE bookfit.idempotency_keys SET response=$4::jsonb WHERE actor_id=$1 AND operation=$2 AND key=$3",
    [actorId, operation, key, JSON.stringify(response)],
  );
}

function assertCheckoutInput(input: CheckoutInput): void {
  if (
    !Array.isArray(input.slots) ||
    input.slots.length < 1 ||
    input.slots.length > 8
  ) {
    throw new ApiError(
      422,
      "Selecciona entre una y ocho fechas.",
      "invalid_dates",
    );
  }
  if (!Number.isInteger(input.seats) || input.seats < 1 || input.seats > 12) {
    throw new ApiError(
      422,
      "El número de plazas no es válido.",
      "invalid_seats",
    );
  }
  const duplicates = new Set<string>();
  for (const slot of input.slots) {
    if (!isDateKey(slot.date))
      throw new ApiError(
        422,
        "Una de las fechas no es válida.",
        "invalid_date",
      );
    const marker = `${slot.date}:${slot.startMinute ?? ""}:${slot.classSessionId ?? ""}`;
    if (duplicates.has(marker))
      throw new ApiError(
        422,
        "No repitas una misma fecha y hora.",
        "duplicate_slot",
      );
    duplicates.add(marker);
  }
}

function moneyLines(
  occurrenceId: string,
  values: { X: number; Z: number; Y: number; W: number },
): CheckoutLine[] {
  return [
    {
      occurrenceId,
      kind: "service",
      description: "Servicio profesional",
      amountCents: values.X,
    },
    {
      occurrenceId,
      kind: "service_commission",
      description: "Comisión del servicio · ejemplo 10%",
      amountCents: values.Z,
    },
    {
      occurrenceId,
      kind: "space",
      description:
        values.Y === 0
          ? "Uso del espacio · cortesía o no aplica"
          : "Uso del espacio",
      amountCents: values.Y,
    },
    {
      occurrenceId,
      kind: "space_commission",
      description: "Comisión del espacio · ejemplo 12%",
      amountCents: values.W,
    },
  ];
}

function localTime(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

async function lockResources(
  client: PoolClient,
  slots: ResolvedSlot[],
  professionalId: string,
): Promise<void> {
  const lockRows = new Map<
    string,
    { kind: "professional" | "space"; id: string; date: string }
  >();
  for (const slot of slots) {
    const proKey = `professional:${professionalId}:${slot.date}`;
    lockRows.set(proKey, {
      kind: "professional",
      id: professionalId,
      date: slot.date,
    });
    if (slot.space) {
      const spaceKey = `space:${slot.space.id}:${slot.date}`;
      lockRows.set(spaceKey, {
        kind: "space",
        id: slot.space.id,
        date: slot.date,
      });
    }
  }
  const ordered = [...lockRows.values()].sort(
    (a, b) =>
      a.kind.localeCompare(b.kind) ||
      a.id.localeCompare(b.id) ||
      a.date.localeCompare(b.date),
  );
  for (const row of ordered) {
    await client.query(
      `INSERT INTO bookfit.resource_day_locks(resource_kind,resource_id,service_date)
       VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,
      [row.kind, row.id, row.date],
    );
    await client.query(
      `SELECT 1 FROM bookfit.resource_day_locks
        WHERE resource_kind=$1 AND resource_id=$2 AND service_date=$3 FOR UPDATE`,
      [row.kind, row.id, row.date],
    );
  }
}

async function resolveSpace(
  client: PoolClient,
  input: {
    spaceId?: string;
    mode: BookingMode;
    interval: ReturnType<typeof createLocalInterval>;
    requiredEquipment: string[];
    seats: number;
  },
): Promise<SpaceRow | null> {
  if (input.mode === "home" || input.mode === "online") {
    if (input.spaceId)
      throw new ApiError(
        422,
        "Esta modalidad no utiliza una sala.",
        "space_not_applicable",
      );
    return null;
  }
  if (!input.spaceId)
    throw new ApiError(
      422,
      "Selecciona un espacio disponible.",
      "space_required",
    );
  const result = await client.query<SpaceRow>(
    `SELECT id,kind,name,location_id,capacity,price_per_occurrence_cents,equipment
       FROM bookfit.spaces WHERE id=$1 AND kind=$2 AND capacity >= $3
         AND equipment @> $4::text[]`,
    [input.spaceId, input.mode, input.seats, input.requiredEquipment],
  );
  const space = result.rows[0];
  if (!space)
    throw new ApiError(
      409,
      "Ese espacio no sirve para el servicio o la capacidad elegidos.",
      "space_incompatible",
    );
  const opening = await client.query<{ opens_at: string; closes_at: string }>(
    `SELECT opens_at::text,closes_at::text FROM bookfit.space_opening_hours
      WHERE space_id=$1 AND weekday=$2`,
    [space.id, input.interval.weekday],
  );
  const schedule = opening.rows[0];
  if (
    !schedule ||
    timeMinutes(schedule.opens_at) > input.interval.startMinute ||
    timeMinutes(schedule.closes_at) < input.interval.endMinute
  ) {
    throw new ApiError(
      409,
      "El espacio está cerrado en ese horario.",
      "space_closed",
    );
  }
  const blocked = await client.query(
    `SELECT 1 FROM bookfit.space_blocks WHERE space_id=$1 AND starts_at<$3 AND ends_at>$2 LIMIT 1`,
    [
      space.id,
      input.interval.startsAt.toISOString(),
      input.interval.endsAt.toISOString(),
    ],
  );
  if (blocked.rowCount)
    throw new ApiError(
      409,
      "El espacio no está disponible en esa fecha.",
      "space_blocked",
    );
  return space;
}

function timeMinutes(value: string): number {
  const [hour, minute] = value.slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

async function ensureSpaceFree(
  client: PoolClient,
  spaceId: string,
  interval: ReturnType<typeof createLocalInterval>,
): Promise<void> {
  const occupied = await client.query(
    `SELECT 1 FROM bookfit.resource_allocations ra
       LEFT JOIN bookfit.orders o ON o.id=ra.order_id
       LEFT JOIN bookfit.checkout_holds h ON h.order_id=o.id
      WHERE ra.resource_kind='space' AND ra.resource_id=$1
        AND ra.starts_at<$3 AND ra.ends_at>$2
        AND (ra.status='confirmed' AND (ra.order_id IS NULL OR o.status='paid')
          OR ra.status='held' AND o.status='pending' AND h.expires_at>now())
      LIMIT 1`,
    [spaceId, interval.startsAt.toISOString(), interval.endsAt.toISOString()],
  );
  if (occupied.rowCount)
    throw new ApiError(
      409,
      "Ese horario del espacio acaba de ocuparse.",
      "slot_conflict",
    );
}

async function ensureProfessionalFree(input: {
  client: PoolClient;
  professionalId: string;
  preferences: PreferencesRow;
  interval: ReturnType<typeof createLocalInterval>;
  locationId: string;
  locations: Awaited<ReturnType<typeof loadLocations>>;
}): Promise<void> {
  const hours = await input.client.query<{
    opens_at: string;
    closes_at: string;
  }>(
    `SELECT opens_at::text,closes_at::text FROM bookfit.professional_hours
      WHERE professional_id=$1 AND weekday=$2`,
    [input.professionalId, input.interval.weekday],
  );
  const schedule = hours.rows[0];
  if (
    !schedule ||
    timeMinutes(schedule.opens_at) > input.interval.startMinute ||
    timeMinutes(schedule.closes_at) < input.interval.endMinute
  ) {
    throw new ApiError(
      409,
      "El profesional no trabaja en ese horario.",
      "outside_professional_hours",
    );
  }
  const occupancy = await readProfessionalOccupancy(
    input.client,
    input.professionalId,
    input.interval.date,
  );
  const available = isProfessionalIntervalAvailable({
    candidate: input.interval,
    locationId: input.locationId,
    baseLocationId: input.preferences.base_location_id,
    maxRadiusKm: Number(input.preferences.max_radius_km),
    maxTravelMinutes: input.preferences.max_travel_minutes,
    bufferMinutes: input.preferences.buffer_minutes,
    allocations: occupancy.allocations,
    blocks: occupancy.blocks,
    locations: input.locations,
  });
  if (!available)
    throw new ApiError(
      409,
      "El profesional no está disponible en esa fecha y hora.",
      "professional_unavailable",
    );
}

export async function createCheckout(input: {
  pool: Pool;
  actor: ActorContext;
  body: CheckoutInput;
  idempotencyKey: string;
}): Promise<CheckoutResult> {
  assertCheckoutInput(input.body);
  if (!/^[\w.-]{8,160}$/.test(input.idempotencyKey))
    throw new ApiError(
      422,
      "Falta una clave de idempotencia válida.",
      "idempotency_key_required",
    );
  const payloadHash = requestHash(input.body);

  return inTransaction(input.pool, async (client) => {
    await lockBookingState(client);
    const existing = await previousResponse<CheckoutResult>(
      client,
      input.actor.actorId,
      "checkout",
      input.idempotencyKey,
      payloadHash,
    );
    if (existing) return existing;
    await insertKey(
      client,
      input.actor.actorId,
      "checkout",
      input.idempotencyKey,
      payloadHash,
    );
    await expireStaleHolds(client);

    const serviceResult = await client.query<ServiceRow>(
      `SELECT id,professional_id,name,service_format,duration_minutes,price_cents,modalities,required_equipment
         FROM bookfit.services WHERE id=$1`,
      [input.body.serviceId],
    );
    const service = serviceResult.rows[0];
    if (!service)
      throw new ApiError(404, "Servicio no encontrado.", "service_not_found");
    if (!service.modalities.includes(input.body.mode))
      throw new ApiError(
        422,
        "Esa modalidad no está publicada para el servicio.",
        "mode_not_allowed",
      );
    if (!input.actor.roles.includes("client"))
      throw new ApiError(
        403,
        "Solo un perfil cliente puede reservar.",
        "client_role_required",
      );
    if (service.service_format === "individual" && input.body.seats !== 1)
      throw new ApiError(
        422,
        "Las sesiones individuales admiten una plaza.",
        "invalid_seats",
      );
    if (
      service.service_format === "group" &&
      (input.body.mode !== "room" ||
        input.body.slots.some((slot) => !slot.classSessionId))
    ) {
      throw new ApiError(
        422,
        "Selecciona una clase publicada para cada fecha.",
        "class_session_required",
      );
    }
    if (
      service.service_format === "individual" &&
      input.body.slots.some((slot) => slot.classSessionId)
    ) {
      throw new ApiError(
        422,
        "El servicio individual no usa plazas de clase.",
        "unexpected_class_session",
      );
    }

    const prefResult = await client.query<PreferencesRow>(
      "SELECT base_location_id,max_radius_km,max_travel_minutes,buffer_minutes,modalities FROM bookfit.professional_preferences WHERE professional_id=$1",
      [service.professional_id],
    );
    const preferences = prefResult.rows[0];
    if (!preferences || !preferences.modalities.includes(input.body.mode))
      throw new ApiError(
        409,
        "El profesional no acepta esta modalidad.",
        "professional_mode_unavailable",
      );
    const locations = await loadLocations(client);
    const slots: ResolvedSlot[] = [];
    const sortedInput = [...input.body.slots].sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.startMinute ?? 0) - (b.startMinute ?? 0),
    );
    let firstGymEntryAvailable = false;
    let selectedGymId: string | null = null;
    if (input.body.mode === "gym") {
      selectedGymId = sortedInput[0]?.spaceId ?? null;
      if (
        !selectedGymId ||
        sortedInput.some((slot) => slot.spaceId !== selectedGymId)
      ) {
        throw new ApiError(
          422,
          "Elige el mismo gimnasio para todas las fechas.",
          "gym_space_required",
        );
      }
      const activeEntitlement = await client.query(
        `SELECT 1 FROM bookfit.gym_entitlements WHERE client_actor_id=$1 AND space_id=$2 AND status IN ('reserved','consumed') LIMIT 1`,
        [input.actor.actorId, selectedGymId],
      );
      firstGymEntryAvailable = !activeEntitlement.rowCount;
    }

    for (const selected of sortedInput) {
      assertBookableDate(selected.date);
      let startMinute = selected.startMinute;
      let sessionId: string | null = null;
      let space: SpaceRow | null;
      if (selected.classSessionId) {
        const sessionResult = await client.query<{
          id: string;
          service_id: string;
          service_date: string;
          starts_at: Date;
          ends_at: Date;
          capacity: number;
          professional_id: string;
          space_id: string;
          location_id: string;
        }>(
          `SELECT c.id,c.service_id,c.service_date::text AS service_date,c.starts_at,c.ends_at,c.capacity,c.professional_id,c.space_id,s.location_id
             FROM bookfit.class_sessions c JOIN bookfit.spaces s ON s.id=c.space_id
            WHERE c.id=$1`,
          [selected.classSessionId],
        );
        const session = sessionResult.rows[0];
        if (
          !session ||
          session.service_id !== service.id ||
          session.service_date !== selected.date
        ) {
          throw new ApiError(
            404,
            "Clase no encontrada para esa fecha.",
            "class_not_found",
          );
        }
        const localStart = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/Madrid",
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
        }).format(session.starts_at);
        startMinute = timeMinutes(localStart);
        sessionId = session.id;
        const spaceResult = await client.query<SpaceRow>(
          "SELECT id,kind,name,location_id,capacity,price_per_occurrence_cents,equipment FROM bookfit.spaces WHERE id=$1",
          [session.space_id],
        );
        space = spaceResult.rows[0] ?? null;
        if (
          !space ||
          space.kind !== "room" ||
          space.capacity < input.body.seats
        )
          throw new ApiError(
            409,
            "La clase no tiene capacidad suficiente.",
            "class_capacity",
          );
      } else {
        if (!Number.isInteger(startMinute) || startMinute === undefined)
          throw new ApiError(
            422,
            "Selecciona una hora disponible.",
            "start_time_required",
          );
        space = await resolveSpace(client, {
          spaceId: selected.spaceId,
          mode: input.body.mode,
          interval: createLocalInterval(
            selected.date,
            startMinute,
            service.duration_minutes,
          ),
          requiredEquipment: service.required_equipment,
          seats: input.body.seats,
        });
      }
      if (startMinute === undefined)
        throw new ApiError(
          422,
          "Hora de clase no válida.",
          "start_time_required",
        );
      const interval = createLocalInterval(
        selected.date,
        startMinute,
        service.duration_minutes,
      );
      const locationId =
        space?.location_id ??
        (input.body.mode === "online"
          ? locations.get("20000000-0000-4000-8000-000000000008")?.id
          : input.body.areaLocationId);
      if (!locationId || !locations.has(locationId))
        throw new ApiError(
          422,
          "Selecciona una zona válida.",
          "invalid_location",
        );
      if (sessionId) {
        const sessionEnd = new Date(
          (
            await client.query<{ ends_at: Date }>(
              "SELECT ends_at FROM bookfit.class_sessions WHERE id=$1",
              [sessionId],
            )
          ).rows[0].ends_at,
        );
        if (
          Math.abs(sessionEnd.getTime() - interval.endsAt.getTime()) > 60_000
        ) {
          // Group session duration comes from the class row; keep its exact end in the occurrence below.
          const classRow = await client.query<{
            starts_at: Date;
            ends_at: Date;
            service_date: string;
          }>(
            "SELECT starts_at,ends_at,service_date FROM bookfit.class_sessions WHERE id=$1",
            [sessionId],
          );
          interval.endsAt.setTime(new Date(classRow.rows[0].ends_at).getTime());
        }
      }
      if (!sessionId && space)
        await ensureSpaceFree(client, space.id, interval);
      if (!sessionId && space)
        await ensureProfessionalFree({
          client,
          professionalId: service.professional_id,
          preferences,
          interval,
          locationId,
          locations,
        });
      if (!sessionId && !space)
        await ensureProfessionalFree({
          client,
          professionalId: service.professional_id,
          preferences,
          interval,
          locationId,
          locations,
        });
      slots.push({
        date: selected.date,
        startMinute: startMinute!,
        space,
        sessionId,
        interval,
        locationId,
        freeGymEntry: Boolean(
          firstGymEntryAvailable &&
          input.body.mode === "gym" &&
          slots.length === 0,
        ),
      });
    }

    const orderSpaceId = slots[0]?.space?.id ?? null;
    if (slots.some((slot) => (slot.space?.id ?? null) !== orderSpaceId)) {
      throw new ApiError(
        422,
        "Una compra de varias fechas debe usar el mismo espacio.",
        "mixed_spaces",
      );
    }
    const sortedResolved = [...slots].sort(
      (a, b) => a.interval.startsAt.getTime() - b.interval.startsAt.getTime(),
    );
    for (let index = 1; index < sortedResolved.length; index += 1) {
      const previousSlot = sortedResolved[index - 1];
      const currentSlot = sortedResolved[index];
      if (
        previousSlot.interval.endsAt.getTime() >
        currentSlot.interval.startsAt.getTime()
      ) {
        throw new ApiError(
          422,
          "Las fechas seleccionadas se solapan.",
          "overlapping_selected_slots",
        );
      }
      const distance = travelDistanceKm(
        locations,
        previousSlot.locationId,
        currentSlot.locationId,
      );
      const travel = travelMinutesForDistance(distance);
      if (
        travel > preferences.max_travel_minutes ||
        currentSlot.interval.startsAt.getTime() <
          previousSlot.interval.endsAt.getTime() +
            (travel + preferences.buffer_minutes) * 60_000
      ) {
        throw new ApiError(
          422,
          "Las horas elegidas no dejan margen suficiente para el desplazamiento.",
          "selected_slots_travel_conflict",
        );
      }
    }
    await lockResources(client, slots, service.professional_id);
    // Recheck exclusive resources after taking the sentinel locks.
    for (const slot of slots) {
      if (slot.sessionId) {
        const occupancy = await client.query<{ seats: string | number }>(
          `SELECT COALESCE(sum(sa.seats),0) AS seats FROM bookfit.seat_allocations sa
             JOIN bookfit.orders o ON o.id=sa.order_id
            WHERE sa.class_session_id=$1 AND (sa.status='confirmed' AND o.status='paid'
              OR sa.status='held' AND o.status='pending')`,
          [slot.sessionId],
        );
        const session = await client.query<{ capacity: number }>(
          "SELECT capacity FROM bookfit.class_sessions WHERE id=$1",
          [slot.sessionId],
        );
        if (
          Number(occupancy.rows[0].seats) + input.body.seats >
          session.rows[0].capacity
        ) {
          throw new ApiError(
            409,
            "La clase ya no tiene plazas suficientes.",
            "class_full",
          );
        }
      } else {
        if (slot.space)
          await ensureSpaceFree(client, slot.space.id, slot.interval);
        await ensureProfessionalFree({
          client,
          professionalId: service.professional_id,
          preferences,
          interval: slot.interval,
          locationId: slot.locationId,
          locations,
        });
      }
    }

    let complimentarySpaceOccurrences = 0;
    const feeRows: Array<{
      X: number;
      Z: number;
      Y: number;
      W: number;
      total: number;
    }> = [];
    for (const slot of slots) {
      const complimentary = slot.freeGymEntry ? 1 : 0;
      complimentarySpaceOccurrences += complimentary;
      feeRows.push(
        calculateCheckout({
          servicePriceCents: service.price_cents,
          occurrenceCount: 1,
          seats: input.body.seats,
          spacePricePerOccurrenceCents:
            slot.space?.price_per_occurrence_cents ?? 0,
          freeSpaceOccurrences: complimentary,
          fees: { serviceCommissionPercent: 10, spaceCommissionPercent: 12 },
        }),
      );
    }
    const total = feeRows.reduce((sum, row) => sum + row.total, 0);
    const serviceSubtotal = feeRows.reduce((sum, row) => sum + row.X, 0);
    const serviceCommission = feeRows.reduce((sum, row) => sum + row.Z, 0);
    const spaceSubtotal = feeRows.reduce((sum, row) => sum + row.Y, 0);
    const spaceCommission = feeRows.reduce((sum, row) => sum + row.W, 0);
    const orderId = randomUUID();
    await client.query(
      `INSERT INTO bookfit.orders(id,client_actor_id,professional_id,service_id,space_id,mode,seats,status,
          subtotal_service_cents,service_commission_cents,subtotal_space_cents,space_commission_cents,total_cents)
       VALUES($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10,$11,$12)`,
      [
        orderId,
        input.actor.actorId,
        service.professional_id,
        service.id,
        orderSpaceId,
        input.body.mode,
        input.body.seats,
        serviceSubtotal,
        serviceCommission,
        spaceSubtotal,
        spaceCommission,
        total,
      ],
    );
    if (firstGymEntryAvailable && selectedGymId) {
      await client.query(
        `INSERT INTO bookfit.gym_entitlements(client_actor_id,space_id,order_id,status)
         VALUES($1,$2,$3,'reserved')`,
        [input.actor.actorId, selectedGymId, orderId],
      );
    }
    const hold = await client.query<{ expires_at: Date }>(
      `INSERT INTO bookfit.checkout_holds(order_id,status,expires_at)
       VALUES($1,'active',now()+interval '10 minutes') RETURNING expires_at`,
      [orderId],
    );
    const checkoutLines: CheckoutLine[] = [];
    const occurrenceSummary: CheckoutResult["occurrences"] = [];
    for (const [index, slot] of slots.entries()) {
      const occurrenceId = randomUUID();
      const fee = feeRows[index];
      await client.query(
        `INSERT INTO bookfit.booking_occurrences(id,order_id,class_session_id,service_date,starts_at,ends_at,status,location_id,
            x_service_cents,z_service_commission_cents,y_space_cents,w_space_commission_cents)
         VALUES($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11)`,
        [
          occurrenceId,
          orderId,
          slot.sessionId,
          slot.date,
          slot.interval.startsAt.toISOString(),
          slot.interval.endsAt.toISOString(),
          slot.locationId,
          fee.X,
          fee.Z,
          fee.Y,
          fee.W,
        ],
      );
      const lines = moneyLines(occurrenceId, fee);
      checkoutLines.push(...lines);
      for (const line of lines) {
        await client.query(
          `INSERT INTO bookfit.order_lines(occurrence_id,line_type,description,amount_cents)
           VALUES($1,$2,$3,$4)`,
          [occurrenceId, line.kind, line.description, line.amountCents],
        );
      }
      if (slot.sessionId) {
        await client.query(
          `INSERT INTO bookfit.seat_allocations(order_id,class_session_id,client_actor_id,seats,status)
           VALUES($1,$2,$3,$4,'held')`,
          [orderId, slot.sessionId, input.actor.actorId, input.body.seats],
        );
      } else {
        const resources: Array<{ kind: "professional" | "space"; id: string }> =
          [
            { kind: "professional", id: service.professional_id },
            ...(slot.space
              ? [{ kind: "space" as const, id: slot.space.id }]
              : []),
          ];
        for (const resource of resources) {
          await client.query(
            `INSERT INTO bookfit.resource_allocations(resource_kind,resource_id,location_id,service_date,starts_at,ends_at,order_id,status)
             VALUES($1,$2,$3,$4,$5,$6,$7,'held')`,
            [
              resource.kind,
              resource.id,
              slot.locationId,
              slot.date,
              slot.interval.startsAt.toISOString(),
              slot.interval.endsAt.toISOString(),
              orderId,
            ],
          );
        }
      }
      occurrenceSummary.push({
        id: occurrenceId,
        date: slot.date,
        start: localTime(slot.startMinute),
        end: localTime(slot.startMinute + service.duration_minutes),
      });
    }
    const response: CheckoutResult = {
      checkoutId: orderId,
      status: "pending",
      holdExpiresAt: hold.rows[0].expires_at.toISOString(),
      totalCents: total,
      lines: checkoutLines,
      occurrences: occurrenceSummary,
    };
    await saveKeyResponse(
      client,
      input.actor.actorId,
      "checkout",
      input.idempotencyKey,
      response,
    );
    await client.query(
      `INSERT INTO bookfit.audit_events(actor_id,action,entity_kind,entity_id,metadata)
       VALUES($1,'checkout.created','order',$2,$3::jsonb)`,
      [
        input.actor.actorId,
        orderId,
        JSON.stringify({
          dates: slots.length,
          amount_cents: total,
          complimentary_space_occurrences: complimentarySpaceOccurrences,
        }),
      ],
    );
    return response;
  });
}

export async function payCheckout(input: {
  pool: Pool;
  actor: ActorContext;
  checkoutId: string;
  outcome: FakePaymentOutcome;
  idempotencyKey: string;
}): Promise<{
  checkoutId: string;
  status: "paid" | "failed" | "expired";
  totalCents: number;
}> {
  if (!/^[\w.-]{8,160}$/.test(input.idempotencyKey))
    throw new ApiError(
      422,
      "Falta una clave de idempotencia válida.",
      "idempotency_key_required",
    );
  const before = await input.pool.query<{
    total_cents: number;
    status: string;
  }>(
    "SELECT total_cents,status FROM bookfit.orders WHERE id=$1 AND client_actor_id=$2",
    [input.checkoutId, input.actor.actorId],
  );
  if (!before.rowCount)
    throw new ApiError(404, "Checkout no encontrado.", "checkout_not_found");
  const payload = { checkoutId: input.checkoutId, outcome: input.outcome };
  const hash = requestHash(payload);
  const operation = `pay:${input.checkoutId}`;
  const providerStart = await paymentProvider.startAttempt({
    checkoutId: input.checkoutId,
    amountCents: before.rows[0].total_cents,
    currency: "EUR",
    idempotencyKey: input.idempotencyKey,
  });
  const providerResult = await paymentProvider.processResult({
    checkoutId: input.checkoutId,
    providerReference: providerStart.providerReference,
    providerEventId: `fake-event:${input.checkoutId}:${input.idempotencyKey}`,
    outcome: input.outcome,
  });

  return inTransaction(input.pool, async (client) => {
    await lockBookingState(client);
    const existing = await previousResponse<{
      checkoutId: string;
      status: "paid" | "failed" | "expired";
      totalCents: number;
    }>(client, input.actor.actorId, operation, input.idempotencyKey, hash);
    if (existing) return existing;
    await insertKey(
      client,
      input.actor.actorId,
      operation,
      input.idempotencyKey,
      hash,
    );
    await expireStaleHolds(client);
    const locked = await client.query<{
      status: string;
      total_cents: number;
      hold_expires_at: Date | null;
      hold_status: string | null;
    }>(
      `SELECT o.status,o.total_cents,h.expires_at AS hold_expires_at,h.status AS hold_status
         FROM bookfit.orders o LEFT JOIN bookfit.checkout_holds h ON h.order_id=o.id
        WHERE o.id=$1 AND o.client_actor_id=$2 FOR UPDATE OF o`,
      [input.checkoutId, input.actor.actorId],
    );
    const order = locked.rows[0];
    if (!order)
      throw new ApiError(404, "Checkout no encontrado.", "checkout_not_found");
    const attemptResult = await client.query<{
      id: string;
      status: string;
      amount_cents: number;
      provider_reference: string | null;
    }>(
      "SELECT id,status,amount_cents,provider_reference FROM bookfit.payment_attempts WHERE order_id=$1 FOR UPDATE",
      [input.checkoutId],
    );
    let attempt = attemptResult.rows[0];
    if (
      attempt &&
      (attempt.amount_cents !== order.total_cents ||
        (attempt.status === "pending" &&
          attempt.provider_reference !== providerStart.providerReference))
    ) {
      throw new ApiError(
        409,
        "El intento de pago no coincide con el importe de la reserva.",
        "payment_amount_mismatch",
      );
    }
    if (!attempt) {
      const created = await client.query<{
        id: string;
        status: string;
        amount_cents: number;
        provider_reference: string;
      }>(
        `INSERT INTO bookfit.payment_attempts(order_id,provider,provider_reference,status,amount_cents,currency)
         VALUES($1,'fake',$2,'pending',$3,'EUR') RETURNING id,status,amount_cents,provider_reference`,
        [input.checkoutId, providerStart.providerReference, order.total_cents],
      );
      attempt = created.rows[0];
    }
    const eventExists = await client.query(
      "SELECT 1 FROM bookfit.payment_events WHERE provider='fake' AND provider_event_id=$1",
      [`fake-event:${input.checkoutId}:${input.idempotencyKey}`],
    );
    if (eventExists.rowCount) {
      const prior = {
        checkoutId: input.checkoutId,
        status: (order.status === "paid"
          ? "paid"
          : order.status === "expired"
            ? "expired"
            : "failed") as "paid" | "failed" | "expired",
        totalCents: order.total_cents,
      };
      await saveKeyResponse(
        client,
        input.actor.actorId,
        operation,
        input.idempotencyKey,
        prior,
      );
      return prior;
    }
    if (attempt.status !== "pending" || order.status !== "pending") {
      const prior = {
        checkoutId: input.checkoutId,
        status: (order.status === "paid"
          ? "paid"
          : order.status === "expired"
            ? "expired"
            : "failed") as "paid" | "failed" | "expired",
        totalCents: order.total_cents,
      };
      await client.query(
        `INSERT INTO bookfit.payment_events(provider,provider_event_id,payment_attempt_id,event_type)
         VALUES('fake',$1,$2,'fake.duplicate.ignored') ON CONFLICT DO NOTHING`,
        [`fake-event:${input.checkoutId}:${input.idempotencyKey}`, attempt.id],
      );
      await saveKeyResponse(
        client,
        input.actor.actorId,
        operation,
        input.idempotencyKey,
        prior,
      );
      return prior;
    }
    if (!order.hold_expires_at || order.hold_status !== "active") {
      await expireOrder(client, input.checkoutId);
      await client.query(
        "UPDATE bookfit.payment_attempts SET status='expired',updated_at=now() WHERE id=$1",
        [attempt.id],
      );
      await client.query(
        `INSERT INTO bookfit.payment_events(provider,provider_event_id,payment_attempt_id,event_type)
         VALUES('fake',$1,$2,'fake.expired') ON CONFLICT DO NOTHING`,
        [`fake-event:${input.checkoutId}:${input.idempotencyKey}`, attempt.id],
      );
      const result = {
        checkoutId: input.checkoutId,
        status: "expired" as const,
        totalCents: order.total_cents,
      };
      await saveKeyResponse(
        client,
        input.actor.actorId,
        operation,
        input.idempotencyKey,
        result,
      );
      return result;
    }
    if (
      providerStart.amountCents !== order.total_cents ||
      providerStart.currency !== "EUR"
    ) {
      throw new ApiError(
        409,
        "El importe del intento no coincide con la reserva.",
        "payment_amount_mismatch",
      );
    }
    if (providerResult.outcome === "success") {
      await client.query(
        "UPDATE bookfit.orders SET status='paid',updated_at=now() WHERE id=$1",
        [input.checkoutId],
      );
      await client.query(
        "UPDATE bookfit.booking_occurrences SET status='confirmed' WHERE order_id=$1 AND status='pending'",
        [input.checkoutId],
      );
      await client.query(
        "UPDATE bookfit.resource_allocations SET status='confirmed' WHERE order_id=$1 AND status='held'",
        [input.checkoutId],
      );
      await client.query(
        "UPDATE bookfit.seat_allocations SET status='confirmed' WHERE order_id=$1 AND status='held'",
        [input.checkoutId],
      );
      await client.query(
        "UPDATE bookfit.checkout_holds SET status='confirmed' WHERE order_id=$1 AND status='active'",
        [input.checkoutId],
      );
      await client.query(
        "UPDATE bookfit.gym_entitlements SET status='consumed' WHERE order_id=$1 AND status='reserved'",
        [input.checkoutId],
      );
    } else {
      const expired = providerResult.outcome === "expired";
      await client.query(
        "UPDATE bookfit.orders SET status=$2,updated_at=now() WHERE id=$1",
        [input.checkoutId, expired ? "expired" : "failed"],
      );
      await client.query(
        "UPDATE bookfit.booking_occurrences SET status='cancelled' WHERE order_id=$1 AND status='pending'",
        [input.checkoutId],
      );
      await client.query(
        "UPDATE bookfit.resource_allocations SET status=$2 WHERE order_id=$1 AND status='held'",
        [input.checkoutId, expired ? "expired" : "released"],
      );
      await client.query(
        "UPDATE bookfit.seat_allocations SET status=$2 WHERE order_id=$1 AND status='held'",
        [input.checkoutId, expired ? "expired" : "released"],
      );
      await client.query(
        "UPDATE bookfit.checkout_holds SET status=$2 WHERE order_id=$1 AND status='active'",
        [input.checkoutId, expired ? "expired" : "released"],
      );
      await client.query(
        "UPDATE bookfit.gym_entitlements SET status='released' WHERE order_id=$1 AND status='reserved'",
        [input.checkoutId],
      );
    }
    const finalStatus =
      providerResult.outcome === "success"
        ? "paid"
        : providerResult.outcome === "expired"
          ? "expired"
          : "failed";
    await client.query(
      "UPDATE bookfit.payment_attempts SET status=$2,updated_at=now() WHERE id=$1",
      [
        attempt.id,
        providerResult.outcome === "success"
          ? "succeeded"
          : providerResult.outcome === "failure"
            ? "failed"
            : "expired",
      ],
    );
    await client.query(
      `INSERT INTO bookfit.payment_events(provider,provider_event_id,payment_attempt_id,event_type)
       VALUES('fake',$1,$2,$3) ON CONFLICT DO NOTHING`,
      [
        `fake-event:${input.checkoutId}:${input.idempotencyKey}`,
        attempt.id,
        `fake.${providerResult.outcome}`,
      ],
    );
    const response = {
      checkoutId: input.checkoutId,
      status: finalStatus,
      totalCents: order.total_cents,
    } as const;
    await saveKeyResponse(
      client,
      input.actor.actorId,
      operation,
      input.idempotencyKey,
      response,
    );
    await client.query(
      `INSERT INTO bookfit.audit_events(actor_id,action,entity_kind,entity_id,metadata)
       VALUES($1,$2,'order',$3,$4::jsonb)`,
      [
        input.actor.actorId,
        `payment.${finalStatus}`,
        input.checkoutId,
        JSON.stringify({ amount_cents: order.total_cents, provider: "fake" }),
      ],
    );
    return response;
  });
}

async function expireOrder(
  client: PoolClient,
  checkoutId: string,
): Promise<void> {
  await client.query(
    "UPDATE bookfit.orders SET status='expired',updated_at=now() WHERE id=$1 AND status='pending'",
    [checkoutId],
  );
  await client.query(
    "UPDATE bookfit.checkout_holds SET status='expired' WHERE order_id=$1 AND status='active'",
    [checkoutId],
  );
  await client.query(
    "UPDATE bookfit.resource_allocations SET status='expired' WHERE order_id=$1 AND status='held'",
    [checkoutId],
  );
  await client.query(
    "UPDATE bookfit.seat_allocations SET status='expired' WHERE order_id=$1 AND status='held'",
    [checkoutId],
  );
  await client.query(
    "UPDATE bookfit.gym_entitlements SET status='released' WHERE order_id=$1 AND status='reserved'",
    [checkoutId],
  );
}

export async function cancelOccurrence(input: {
  pool: Pool;
  actor: ActorContext;
  occurrenceId: string;
}): Promise<{ occurrenceId: string; status: "cancelled" }> {
  return inTransaction(input.pool, async (client) => {
    await lockBookingState(client);
    const row = await client.query<{
      id: string;
      order_id: string;
      client_actor_id: string;
      status: string;
      service_date: string;
      starts_at: Date;
      ends_at: Date;
      class_session_id: string | null;
    }>(
      `SELECT b.id,b.order_id,o.client_actor_id,b.status,b.service_date,b.starts_at,b.ends_at,b.class_session_id
         FROM bookfit.booking_occurrences b JOIN bookfit.orders o ON o.id=b.order_id
        WHERE b.id=$1 AND o.client_actor_id=$2 FOR UPDATE OF b,o`,
      [input.occurrenceId, input.actor.actorId],
    );
    const occurrence = row.rows[0];
    if (!occurrence)
      throw new ApiError(404, "Reserva no encontrada.", "booking_not_found");
    if (occurrence.status === "cancelled")
      return { occurrenceId: occurrence.id, status: "cancelled" };
    if (
      occurrence.status !== "confirmed" ||
      new Date(occurrence.starts_at).getTime() <= Date.now()
    ) {
      throw new ApiError(
        409,
        "Esta reserva ya no se puede cancelar desde la demo.",
        "cancellation_closed",
      );
    }
    await client.query(
      "UPDATE bookfit.booking_occurrences SET status='cancelled' WHERE id=$1",
      [occurrence.id],
    );
    await client.query(
      "UPDATE bookfit.resource_allocations SET status='released' WHERE order_id=$1 AND service_date=$2 AND starts_at=$3 AND ends_at=$4 AND status='confirmed'",
      [
        occurrence.order_id,
        occurrence.service_date,
        occurrence.starts_at,
        occurrence.ends_at,
      ],
    );
    if (occurrence.class_session_id) {
      await client.query(
        "UPDATE bookfit.seat_allocations SET status='released' WHERE order_id=$1 AND class_session_id=$2 AND status='confirmed'",
        [occurrence.order_id, occurrence.class_session_id],
      );
    }
    const remaining = await client.query(
      "SELECT 1 FROM bookfit.booking_occurrences WHERE order_id=$1 AND status='confirmed' LIMIT 1",
      [occurrence.order_id],
    );
    if (!remaining.rowCount) {
      await client.query(
        "UPDATE bookfit.orders SET status='cancelled',updated_at=now() WHERE id=$1",
        [occurrence.order_id],
      );
      await client.query(
        "UPDATE bookfit.gym_entitlements SET status='released' WHERE order_id=$1 AND status='consumed'",
        [occurrence.order_id],
      );
    }
    await client.query(
      `INSERT INTO bookfit.audit_events(actor_id,action,entity_kind,entity_id,metadata)
       VALUES($1,'occurrence.cancelled','booking_occurrence',$2,'{}')`,
      [input.actor.actorId, occurrence.id],
    );
    return { occurrenceId: occurrence.id, status: "cancelled" };
  });
}

export async function joinWaitlist(input: {
  pool: Pool;
  actor: ActorContext;
  classSessionId: string;
  seats: number;
}): Promise<{ entryId: string; status: "waiting" }> {
  if (!Number.isInteger(input.seats) || input.seats < 1 || input.seats > 12)
    throw new ApiError(422, "Número de plazas no válido.", "invalid_seats");
  return inTransaction(input.pool, async (client) => {
    await lockBookingState(client);
    await expireStaleHolds(client);
    const session = await client.query<{ id: string; capacity: number }>(
      "SELECT id,capacity FROM bookfit.class_sessions WHERE id=$1",
      [input.classSessionId],
    );
    if (!session.rowCount)
      throw new ApiError(404, "Clase no encontrada.", "class_not_found");
    if (input.seats > session.rows[0].capacity)
      throw new ApiError(
        422,
        "El número de plazas supera la capacidad de la clase.",
        "invalid_seats",
      );
    const used = await client.query<{ seats: string | number }>(
      `SELECT COALESCE(sum(sa.seats),0) AS seats FROM bookfit.seat_allocations sa
        JOIN bookfit.orders o ON o.id=sa.order_id WHERE sa.class_session_id=$1
         AND (sa.status='confirmed' AND o.status='paid' OR sa.status='held' AND o.status='pending')`,
      [input.classSessionId],
    );
    if (Number(used.rows[0].seats) < session.rows[0].capacity) {
      throw new ApiError(
        409,
        "Aún quedan plazas; puedes reservar la clase.",
        "class_not_full",
      );
    }
    const entry = await client.query<{ id: string }>(
      `INSERT INTO bookfit.waitlist_entries(client_actor_id,class_session_id,seats,status)
       VALUES($1,$2,$3,'waiting') ON CONFLICT (client_actor_id,class_session_id) WHERE status='waiting'
       DO UPDATE SET seats=GREATEST(bookfit.waitlist_entries.seats,EXCLUDED.seats) RETURNING id`,
      [input.actor.actorId, input.classSessionId, input.seats],
    );
    return { entryId: entry.rows[0].id, status: "waiting" };
  });
}
