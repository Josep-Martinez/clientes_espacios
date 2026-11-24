import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import type pg from "pg";
import { ApiError, type ActorContext, type ActorRole } from "./contracts.ts";
import type { ServerConfig } from "./config.ts";

const SESSION_COOKIE = "bookfit_session";
const CSRF_COOKIE = "bookfit_csrf";

export function readCookie(
  request: FastifyRequest,
  name: string,
): string | null {
  const header = request.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

export function csrfCookie(reply: FastifyReply, token: string): void {
  reply.header(
    "Set-Cookie",
    `${CSRF_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Strict; Max-Age=3600`,
  );
}

export function issueSessionCookie(
  reply: FastifyReply,
  token: string,
  config: ServerConfig,
): void {
  const secure = config.nodeEnv === "production" ? "; Secure" : "";
  reply.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${config.sessionTtlHours * 3600}${secure}`,
  );
}

export function clearSessionCookie(
  reply: FastifyReply,
  config: ServerConfig,
): void {
  const secure = config.nodeEnv === "production" ? "; Secure" : "";
  reply.header(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`,
  );
}

export function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function validateMutationSecurity(
  request: FastifyRequest,
  config: ServerConfig,
): void {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (!origin || !host)
    throw new ApiError(403, "Origen no permitido.", "origin_denied");
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new ApiError(403, "Origen no permitido.", "origin_denied");
  }
  if (!config.appOrigins.includes(origin) && parsed.host !== host) {
    throw new ApiError(403, "Origen no permitido.", "origin_denied");
  }
  const cookieToken = readCookie(request, CSRF_COOKIE);
  const headerToken = request.headers["x-csrf-token"];
  if (
    !cookieToken ||
    typeof headerToken !== "string" ||
    !constantTimeEqual(cookieToken, headerToken)
  ) {
    throw new ApiError(403, "Token CSRF no válido.", "csrf_invalid");
  }
}

export async function readActorContext(
  pool: pg.Pool,
  request: FastifyRequest,
): Promise<ActorContext | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token || token.length !== 64) return null;
  const result = await pool.query<{
    actor_id: string;
    name: string;
    roles: ActorRole[];
    professional_id: string | null;
    space_ids: string[];
  }>(
    `SELECT a.id AS actor_id, a.display_name AS name,
            COALESCE(array_agg(DISTINCT ar.role) FILTER (WHERE ar.role IS NOT NULL), '{}') AS roles,
            max(p.id::text)::uuid AS professional_id,
            COALESCE(array_agg(DISTINCT sm.space_id::text) FILTER (WHERE sm.space_id IS NOT NULL), '{}')::text[] AS space_ids
       FROM bookfit.dev_sessions ds
       JOIN bookfit.actors a ON a.id=ds.actor_id
       LEFT JOIN bookfit.actor_roles ar ON ar.actor_id=a.id
       LEFT JOIN bookfit.professionals p ON p.actor_id=a.id
       LEFT JOIN bookfit.space_memberships sm ON sm.actor_id=a.id
      WHERE ds.token_hash=$1 AND ds.revoked_at IS NULL AND ds.expires_at>now()
      GROUP BY a.id, a.display_name`,
    [hashSessionToken(token)],
  );
  const row = result.rows[0];
  return row
    ? {
        actorId: row.actor_id,
        name: row.name,
        roles: row.roles,
        professionalId: row.professional_id,
        spaceIds: row.space_ids,
      }
    : null;
}

export async function createDemoSession(
  pool: pg.Pool,
  profileId: string,
  currentToken: string | null,
  config: ServerConfig,
): Promise<{ token: string; context: ActorContext }> {
  if (!config.devProfiles)
    throw new ApiError(404, "No encontrado.", "not_found");
  const actor = await pool.query<{ id: string }>(
    "SELECT id FROM bookfit.actors WHERE id=$1 AND is_demo=true",
    [profileId],
  );
  if (!actor.rowCount)
    throw new ApiError(
      404,
      "Perfil de prueba no encontrado.",
      "profile_not_found",
    );
  const token = randomBytes(32).toString("hex");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (currentToken) {
      await client.query(
        "UPDATE bookfit.dev_sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL",
        [hashSessionToken(currentToken)],
      );
    }
    await client.query(
      `INSERT INTO bookfit.dev_sessions(token_hash,actor_id,expires_at)
       VALUES ($1,$2,now()+($3::text||' hours')::interval)`,
      [hashSessionToken(token), profileId, config.sessionTtlHours],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  const rows = await pool.query<{
    actor_id: string;
    name: string;
    roles: ActorRole[];
    professional_id: string | null;
    space_ids: string[];
  }>(
    `SELECT a.id AS actor_id,a.display_name AS name,
            COALESCE(array_agg(DISTINCT ar.role) FILTER (WHERE ar.role IS NOT NULL), '{}') AS roles,
            max(p.id::text)::uuid AS professional_id,
            COALESCE(array_agg(DISTINCT sm.space_id::text) FILTER (WHERE sm.space_id IS NOT NULL), '{}')::text[] AS space_ids
       FROM bookfit.actors a LEFT JOIN bookfit.actor_roles ar ON ar.actor_id=a.id
       LEFT JOIN bookfit.professionals p ON p.actor_id=a.id
       LEFT JOIN bookfit.space_memberships sm ON sm.actor_id=a.id
      WHERE a.id=$1 GROUP BY a.id,a.display_name`,
    [profileId],
  );
  const row = rows.rows[0];
  if (!row)
    throw new ApiError(
      404,
      "Perfil de prueba no encontrado.",
      "profile_not_found",
    );
  return {
    token,
    context: {
      actorId: row.actor_id,
      name: row.name,
      roles: row.roles,
      professionalId: row.professional_id,
      spaceIds: row.space_ids,
    },
  };
}

export async function revokeDemoSession(
  pool: pg.Pool,
  token: string | null,
): Promise<void> {
  if (!token) return;
  await pool.query(
    "UPDATE bookfit.dev_sessions SET revoked_at=now() WHERE token_hash=$1 AND revoked_at IS NULL",
    [hashSessionToken(token)],
  );
}
