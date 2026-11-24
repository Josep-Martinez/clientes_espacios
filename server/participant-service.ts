import type { Pool } from 'pg';
import { inTransaction } from './db.ts';
import { ApiError, type ActorContext, type BookingMode } from './contracts.ts';

function validateDateRange(from: string, to: string, maximumDays = 90): void {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(from) || !pattern.test(to) || from > to) throw new ApiError(422, 'El rango de fechas no es válido.', 'invalid_date_range');
  const first = new Date(`${from}T12:00:00.000Z`).getTime();
  const last = new Date(`${to}T12:00:00.000Z`).getTime();
  if (!Number.isFinite(first) || !Number.isFinite(last) || Math.floor((last-first)/86_400_000) > maximumDays) {
    throw new ApiError(422, `El rango máximo es de ${maximumDays} días.`, 'date_range_too_large');
  }
}

export async function getAgenda(pool: Pool, actor: ActorContext, from: string, to: string): Promise<Array<Record<string, unknown>>> {
  validateDateRange(from,to,180);
  const result = await pool.query<{
    occurrence_id: string; order_id: string; service_date: string; starts_at: Date; ends_at: Date; status: string;
    client_id: string; client_name: string; professional_id: string; professional_name: string; service_id: string;
    service_name: string; space_id: string | null; space_name: string | null; mode: BookingMode; seats: number;
    total_cents: number; occurrence_total_cents: number;
  }>(
    `SELECT b.id AS occurrence_id,o.id AS order_id,b.service_date,b.starts_at,b.ends_at,b.status,
            ca.id AS client_id,ca.display_name AS client_name,p.id AS professional_id,pa.display_name AS professional_name,
            s.id AS service_id,s.name AS service_name,sp.id AS space_id,sp.name AS space_name,o.mode,o.seats,o.total_cents,
            (b.x_service_cents+b.z_service_commission_cents+b.y_space_cents+b.w_space_commission_cents) AS occurrence_total_cents
       FROM bookfit.booking_occurrences b JOIN bookfit.orders o ON o.id=b.order_id
       JOIN bookfit.actors ca ON ca.id=o.client_actor_id
       JOIN bookfit.professionals p ON p.id=o.professional_id JOIN bookfit.actors pa ON pa.id=p.actor_id
       JOIN bookfit.services s ON s.id=o.service_id LEFT JOIN bookfit.spaces sp ON sp.id=o.space_id
      WHERE b.service_date BETWEEN $1::date AND $2::date
        AND b.status<>'pending'
        AND ((o.client_actor_id=$3 AND $4::boolean)
          OR (p.actor_id=$3 AND $5::boolean)
          OR (sp.id IS NOT NULL AND EXISTS (
            SELECT 1 FROM bookfit.space_memberships sm WHERE sm.space_id=sp.id AND sm.actor_id=$3 AND $6::boolean)))
      ORDER BY b.starts_at,ca.display_name`,
    [from,to,actor.actorId,actor.roles.includes('client'),actor.roles.includes('professional'),actor.roles.includes('space_manager')],
  );
  return result.rows.map((row) => ({
    occurrenceId: row.occurrence_id, bookingId: row.order_id, date: row.service_date,
    start: new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(row.starts_at),
    end: new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(row.ends_at),
    status: row.status, clientId: row.client_id, clientName: row.client_name,
    professionalId: row.professional_id, professionalName: row.professional_name,
    serviceId: row.service_id, serviceName: row.service_name, spaceId: row.space_id, spaceName: row.space_name,
    mode: row.mode, seats: row.seats, totalCents: row.total_cents, occurrenceTotalCents: row.occurrence_total_cents,
  }));
}

export async function getBooking(pool: Pool, actor: ActorContext, bookingId: string): Promise<Record<string, unknown>> {
  const result = await pool.query<{
    id: string; order_id: string; service_date: string; starts_at: Date; ends_at: Date; status: string;
    client_id: string; client_name: string; professional_id: string; professional_name: string;
    service_name: string; space_id: string | null; space_name: string | null; access_instructions: string | null;
    mode: BookingMode; seats: number; total_cents: number;
  }>(
    `SELECT b.id,b.order_id,b.service_date,b.starts_at,b.ends_at,b.status,o.client_actor_id AS client_id,ca.display_name AS client_name,
            p.id AS professional_id,pa.display_name AS professional_name,s.name AS service_name,sp.id AS space_id,sp.name AS space_name,
            CASE WHEN b.status='confirmed' AND o.status='paid' THEN sp.access_instructions ELSE NULL END AS access_instructions,
            o.mode,o.seats,o.total_cents
       FROM bookfit.booking_occurrences b JOIN bookfit.orders o ON o.id=b.order_id
       JOIN bookfit.actors ca ON ca.id=o.client_actor_id JOIN bookfit.professionals p ON p.id=o.professional_id
       JOIN bookfit.actors pa ON pa.id=p.actor_id JOIN bookfit.services s ON s.id=o.service_id
       LEFT JOIN bookfit.spaces sp ON sp.id=o.space_id
      WHERE b.id=$1 AND ((o.client_actor_id=$2 AND $3::boolean) OR (p.actor_id=$2 AND $4::boolean)
        OR EXISTS(SELECT 1 FROM bookfit.space_memberships sm WHERE sm.space_id=o.space_id AND sm.actor_id=$2 AND $5::boolean))`,
    [bookingId,actor.actorId,actor.roles.includes('client'),actor.roles.includes('professional'),actor.roles.includes('space_manager')],
  );
  const row = result.rows[0];
  if (!row) throw new ApiError(404,'Reserva no encontrada.','booking_not_found');
  return {
    occurrenceId: row.id, bookingId: row.order_id, date: row.service_date,
    start: new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(row.starts_at),
    end: new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(row.ends_at),
    status: row.status, clientId: row.client_id, clientName: row.client_name,
    professionalId: row.professional_id, professionalName: row.professional_name,
    serviceName: row.service_name, spaceId: row.space_id, spaceName: row.space_name,
    accessInstructions: row.access_instructions, mode: row.mode, seats: row.seats, totalCents: row.total_cents,
  };
}

export async function getProfessionalPreferences(pool: Pool, actor: ActorContext): Promise<Record<string, unknown>> {
  if (!actor.roles.includes('professional') || !actor.professionalId) throw new ApiError(403,'No tienes un perfil profesional.','professional_role_required');
  const result = await pool.query<{
    base_location_id: string; max_radius_km: string | number; max_travel_minutes: number; buffer_minutes: number; modalities: BookingMode[];
  }>(
    `SELECT pp.base_location_id,pp.max_radius_km,pp.max_travel_minutes,pp.buffer_minutes,pp.modalities
       FROM bookfit.professional_preferences pp JOIN bookfit.professionals p ON p.id=pp.professional_id
      WHERE p.actor_id=$1`, [actor.actorId],
  );
  const row = result.rows[0];
  if (!row) throw new ApiError(404,'Preferencias no encontradas.','preferences_not_found');
  return { baseLocationId: row.base_location_id,maxRadiusKm: Number(row.max_radius_km),maxTravelMinutes: row.max_travel_minutes,bufferMinutes: row.buffer_minutes,modalities: row.modalities };
}

export async function updateProfessionalPreferences(pool: Pool, actor: ActorContext, value: {
  baseLocationId: string; maxRadiusKm: number; maxTravelMinutes: number; bufferMinutes: number; modalities: BookingMode[];
}): Promise<Record<string, unknown>> {
  if (!actor.roles.includes('professional') || !actor.professionalId) throw new ApiError(403,'No tienes un perfil profesional.','professional_role_required');
  if (!Number.isFinite(value.maxRadiusKm) || value.maxRadiusKm < 0 || value.maxRadiusKm > 40
    || !Number.isInteger(value.maxTravelMinutes) || value.maxTravelMinutes < 0 || value.maxTravelMinutes > 180
    || !Number.isInteger(value.bufferMinutes) || value.bufferMinutes < 0 || value.bufferMinutes > 120
    || !Array.isArray(value.modalities) || value.modalities.length < 1
    || value.modalities.some((item) => !['room','gym','home','online'].includes(item))) {
    throw new ApiError(422,'Preferencias no válidas.','invalid_preferences');
  }
  const updated = await pool.query(
    `UPDATE bookfit.professional_preferences pp SET base_location_id=$2,max_radius_km=$3,max_travel_minutes=$4,
         buffer_minutes=$5,modalities=$6::text[]
       FROM bookfit.professionals p WHERE pp.professional_id=p.id AND p.actor_id=$1
       AND EXISTS(SELECT 1 FROM bookfit.locations l WHERE l.id=$2)`,
    [actor.actorId,value.baseLocationId,value.maxRadiusKm,value.maxTravelMinutes,value.bufferMinutes,value.modalities],
  );
  if (!updated.rowCount) throw new ApiError(422,'Selecciona una ubicación válida.','invalid_location');
  await pool.query(
    `INSERT INTO bookfit.audit_events(actor_id,action,entity_kind,entity_id,metadata)
     SELECT $1,'professional.preferences_updated','professional',id,'{}' FROM bookfit.professionals WHERE actor_id=$1`,
    [actor.actorId],
  );
  return getProfessionalPreferences(pool,actor);
}

export async function getMySpaces(pool: Pool, actor: ActorContext): Promise<Array<Record<string, unknown>>> {
  if (!actor.roles.includes('space_manager')) throw new ApiError(403,'No tienes espacios asociados.','space_manager_role_required');
  const result = await pool.query(
    `SELECT s.id,s.name,s.kind,s.location_id,l.name AS location_name,s.capacity,s.equipment,s.amenities,s.description,s.price_per_occurrence_cents
       FROM bookfit.spaces s JOIN bookfit.space_memberships sm ON sm.space_id=s.id
       JOIN bookfit.locations l ON l.id=s.location_id WHERE sm.actor_id=$1 ORDER BY s.name`, [actor.actorId],
  );
  return result.rows.map((row) => ({
    id: row.id,name: row.name,kind: row.kind,locationId: row.location_id,locationName: row.location_name,
    capacity: row.capacity,equipment: row.equipment,amenities: row.amenities,description: row.description,
    pricePerOccurrenceCents: row.price_per_occurrence_cents,
  }));
}

export async function getSpaceMetrics(pool: Pool, actor: ActorContext, spaceId: string, from: string, to: string): Promise<Record<string, unknown>> {
  validateDateRange(from,to,90);
  const allowed = await pool.query('SELECT 1 FROM bookfit.space_memberships WHERE space_id=$1 AND actor_id=$2',[spaceId,actor.actorId]);
  if (!actor.roles.includes('space_manager') || !allowed.rowCount) throw new ApiError(404,'Espacio no encontrado.','space_not_found');
  const [bookings,openHours] = await Promise.all([
    pool.query<{ count: string | number; minutes: string | number; gross: string | number; commission: string | number }>(
      `SELECT count(*) FILTER (WHERE b.status='confirmed') AS count,
              COALESCE(sum(EXTRACT(EPOCH FROM (b.ends_at-b.starts_at))/60) FILTER (WHERE b.status='confirmed'),0) AS minutes,
              COALESCE(sum(b.y_space_cents) FILTER (WHERE b.status='confirmed'),0) AS gross,
              COALESCE(sum(b.w_space_commission_cents) FILTER (WHERE b.status='confirmed'),0) AS commission
         FROM bookfit.booking_occurrences b JOIN bookfit.orders o ON o.id=b.order_id
        WHERE o.space_id=$1 AND b.service_date BETWEEN $2::date AND $3::date`,[spaceId,from,to],
    ),
    pool.query<{ minutes: string | number }>(
      `SELECT COALESCE(sum(EXTRACT(EPOCH FROM (oh.closes_at-oh.opens_at))/60),0) AS minutes
         FROM generate_series($2::date,$3::date,interval '1 day') AS day
         JOIN bookfit.space_opening_hours oh ON oh.space_id=$1 AND oh.weekday=EXTRACT(DOW FROM day)::int`,
      [spaceId,from,to],
    ),
  ]);
  const row = bookings.rows[0];
  const open = Number(openHours.rows[0].minutes);
  const booked = Number(row.minutes);
  const gross = Number(row.gross);
  const commission = Number(row.commission);
  return {
    spaceId,from,to,confirmedOccurrences: Number(row.count),bookedMinutes: booked,openMinutes: open,
    utilizationPercent: open ? Math.min(100,Math.round(booked/open*100)) : 0,
    grossEarningsCents: gross,spaceCommissionCents: commission,estimatedOwnerEarningsCents: gross-commission,
  };
}

export async function getInformationRequests(pool: Pool, actor: ActorContext): Promise<Array<Record<string, unknown>>> {
  const result = await pool.query(
    `SELECT ir.id,ir.booking_occurrence_id,ir.sender_actor_id,sa.display_name AS sender_name,
            ir.recipient_actor_id,ra.display_name AS recipient_name,ir.recipient_kind,ir.body,ir.read_at,ir.created_at,
            b.service_date,s.name AS service_name
       FROM bookfit.information_requests ir JOIN bookfit.actors sa ON sa.id=ir.sender_actor_id
       JOIN bookfit.actors ra ON ra.id=ir.recipient_actor_id JOIN bookfit.booking_occurrences b ON b.id=ir.booking_occurrence_id
       JOIN bookfit.orders o ON o.id=b.order_id JOIN bookfit.services s ON s.id=o.service_id
      WHERE ir.sender_actor_id=$1 OR ir.recipient_actor_id=$1 ORDER BY ir.created_at DESC LIMIT 100`,[actor.actorId],
  );
  return result.rows.map((row) => ({
    id: row.id,bookingOccurrenceId: row.booking_occurrence_id,senderId: row.sender_actor_id,senderName: row.sender_name,
    recipientId: row.recipient_actor_id,recipientName: row.recipient_name,recipientKind: row.recipient_kind,
    body: row.body,readAt: row.read_at,createdAt: row.created_at,date: row.service_date,serviceName: row.service_name,
    direction: row.sender_actor_id===actor.actorId?'sent':'received',
  }));
}

export async function createInformationRequest(pool: Pool, actor: ActorContext, input: {
  bookingOccurrenceId: string; recipientKind: 'client'|'space_manager'; body: string;
}): Promise<Array<Record<string, unknown>>> {
  if (!actor.roles.includes('professional') || !actor.professionalId) throw new ApiError(403,'Solo un profesional puede iniciar una solicitud.','professional_role_required');
  const body = input.body.trim();
  if (body.length < 1 || body.length > 1200) throw new ApiError(422,'El texto debe tener hasta 1200 caracteres.','invalid_request_body');
  return inTransaction(pool,async (client) => {
    const occurrence = await client.query<{ id: string; client_actor_id: string; professional_id: string; space_id: string | null }>(
      `SELECT b.id,o.client_actor_id,o.professional_id,o.space_id
         FROM bookfit.booking_occurrences b JOIN bookfit.orders o ON o.id=b.order_id
         JOIN bookfit.professionals p ON p.id=o.professional_id
        WHERE b.id=$1 AND p.actor_id=$2 AND b.status='confirmed' AND o.status='paid' FOR UPDATE OF b,o`,
      [input.bookingOccurrenceId,actor.actorId],
    );
    const row = occurrence.rows[0];
    if (!row) throw new ApiError(404,'Reserva no encontrada.','booking_not_found');
    const sentRecently = await client.query<{ total: string }>(
      `SELECT count(*)::text AS total FROM bookfit.information_requests
        WHERE sender_actor_id=$1 AND created_at>now()-interval '1 minute'`,[actor.actorId],
    );
    if (Number(sentRecently.rows[0].total) >= 5) throw new ApiError(429,'Has alcanzado el límite temporal de solicitudes.','request_rate_limited');
    let recipients: string[];
    if (input.recipientKind === 'client') {
      recipients = [row.client_actor_id];
    } else {
      if (!row.space_id) throw new ApiError(409,'La reserva no está vinculada a un espacio.','space_not_related');
      const managers = await client.query<{ actor_id: string }>(
        `SELECT sm.actor_id FROM bookfit.space_memberships sm JOIN bookfit.actor_roles ar ON ar.actor_id=sm.actor_id
          WHERE sm.space_id=$1 AND ar.role='space_manager' AND sm.actor_id<>$2 ORDER BY sm.actor_id`,
        [row.space_id,actor.actorId],
      );
      recipients = managers.rows.map((manager) => manager.actor_id);
      if (!recipients.length) throw new ApiError(409,'No hay un gestor vinculado a ese espacio.','space_manager_unavailable');
    }
    const created: Array<Record<string, unknown>> = [];
    for (const recipientId of recipients) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO bookfit.information_requests(booking_occurrence_id,sender_actor_id,recipient_actor_id,recipient_kind,body)
         VALUES($1,$2,$3,$4,$5) RETURNING id`,
        [row.id,actor.actorId,recipientId,input.recipientKind,body],
      );
      created.push({ id: result.rows[0].id,bookingOccurrenceId: row.id,recipientId,recipientKind: input.recipientKind,body,direction:'sent' });
    }
    await client.query(
      `INSERT INTO bookfit.audit_events(actor_id,action,entity_kind,entity_id,metadata)
       VALUES($1,'information_request.sent','booking_occurrence',$2,$3::jsonb)`,
      [actor.actorId,row.id,JSON.stringify({recipient_kind: input.recipientKind,count: recipients.length})],
    );
    return created;
  });
}

export async function markInformationRequestRead(pool: Pool, actor: ActorContext, requestId: string): Promise<{ id: string; readAt: string }> {
  const result = await pool.query<{ id: string; read_at: Date }>(
    `UPDATE bookfit.information_requests SET read_at=COALESCE(read_at,now())
      WHERE id=$1 AND recipient_actor_id=$2 RETURNING id,read_at`,[requestId,actor.actorId],
  );
  if (!result.rowCount) throw new ApiError(404,'Solicitud no encontrada.','request_not_found');
  return { id: result.rows[0].id,readAt: result.rows[0].read_at.toISOString() };
}
