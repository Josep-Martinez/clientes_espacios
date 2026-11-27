import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import type { Pool } from "pg";
import {
  ApiError,
  type ActorContext,
  type ActorRole,
  type BookingMode,
} from "./contracts.ts";
import {
  createCheckout,
  cancelOccurrence,
  joinWaitlist,
  payCheckout,
  type CheckoutInput,
} from "./booking-service.ts";
import {
  createCsrfToken,
  csrfCookie,
  createDemoSession,
  clearSessionCookie,
  issueSessionCookie,
  readActorContext,
  readCookie,
  revokeDemoSession,
  validateMutationSecurity,
} from "./auth.ts";
import { getAvailability, getCatalog, getClasses } from "./catalog-service.ts";
import {
  getAgenda,
  getBooking,
  getInformationRequests,
  getMySpaces,
  getProfessionalPreferences,
  getSpaceMetrics,
  createInformationRequest,
  markInformationRequestRead,
  updateProfessionalPreferences,
} from "./participant-service.ts";
import { madridTodayKey } from "./availability.ts";
import type { ServerConfig } from "./config.ts";

const uuidSchema = {
  type: "string",
  pattern:
    "^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
};

function success<T>(data: T) {
  return { success: true as const, data, error: null };
}

function shiftedDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function errorBody(code: string, message: string) {
  return { success: false as const, data: null, error: { code, message } };
}

export function createApp(pool: Pool, config: ServerConfig): FastifyInstance {
  const app = Fastify({
    logger: false,
    bodyLimit: 65_536,
    requestTimeout: 15_000,
    routerOptions: { maxParamLength: 200 },
  });
  const contexts = new WeakMap<FastifyRequest, ActorContext | null>();
  const rateWindows = new Map<string, { count: number; resetsAt: number }>();
  let requestCount = 0;

  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/api/")) return;
    const path = request.url.split("?", 1)[0];
    let bucket = "api";
    let limit = 180;
    if (request.method === "POST" && path === "/api/dev/session") {
      bucket = "session";
      limit = 12;
    } else if (
      request.method === "POST" &&
      (path === "/api/checkouts" ||
        /\/api\/dev\/checkouts\/[^/]+\/pay$/.test(path))
    ) {
      bucket = "checkout";
      limit = 24;
    } else if (
      request.method === "POST" &&
      path === "/api/information-requests"
    ) {
      bucket = "information-request";
      limit = 10;
    }
    const now = Date.now();
    const key = `${request.ip}:${bucket}`;
    let window = rateWindows.get(key);
    if (!window || window.resetsAt <= now) {
      window = { count: 0, resetsAt: now + 60_000 };
      rateWindows.set(key, window);
    }
    window.count += 1;
    requestCount += 1;
    if (requestCount % 128 === 0) {
      for (const [entry, value] of rateWindows)
        if (value.resetsAt <= now) rateWindows.delete(entry);
    }
    if (window.count > limit) {
      reply.header(
        "Retry-After",
        String(Math.max(1, Math.ceil((window.resetsAt - now) / 1000))),
      );
      throw new ApiError(
        429,
        "Has enviado demasiadas solicitudes. Espera un minuto e inténtalo de nuevo.",
        "rate_limited",
      );
    }
  });

  app.addHook("onRequest", async (request) => {
    if (
      request.url.startsWith("/api") &&
      ["POST", "PATCH", "PUT", "DELETE"].includes(request.method)
    ) {
      validateMutationSecurity(request, config);
    }
  });
  app.addHook("preHandler", async (request) => {
    if (request.url.startsWith("/api"))
      contexts.set(request, await readActorContext(pool, request));
  });
  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("X-Frame-Options", "DENY");
    reply.header(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    reply.header(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
    );
    reply.header("Cache-Control", "no-store");
    return payload;
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiError)
      return reply
        .code(error.statusCode)
        .send(errorBody(error.code, error.message));
    const candidate = error as Error & {
      validation?: unknown;
      code?: string;
      statusCode?: number;
    };
    if (candidate.validation)
      return reply
        .code(422)
        .send(
          errorBody("invalid_request", "Los datos enviados no son válidos."),
        );
    if (
      candidate.code === "23P01" ||
      candidate.code === "23505" ||
      candidate.code === "40P01"
    ) {
      return reply
        .code(409)
        .send(
          errorBody(
            "booking_conflict",
            "El recurso acaba de ocuparse. Actualiza la disponibilidad e inténtalo de nuevo.",
          ),
        );
    }
    // Avoid logging request bodies, cookies, SQL, or database connection details.
    console.error(
      "BookFit API error:",
      candidate.name,
      candidate.code ?? "unclassified",
    );
    return reply
      .code(500)
      .send(errorBody("internal_error", "No se pudo completar la solicitud."));
  });
  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send(errorBody("not_found", "No encontrado.")),
  );

  function actor(request: FastifyRequest): ActorContext {
    const context = contexts.get(request);
    if (!context)
      throw new ApiError(
        401,
        "Inicia sesión para continuar.",
        "session_required",
      );
    return context;
  }

  function requireRole(request: FastifyRequest, role: ActorRole): ActorContext {
    const context = actor(request);
    if (!context.roles.includes(role))
      throw new ApiError(
        403,
        "No tienes permiso para esta operación.",
        "role_forbidden",
      );
    return context;
  }

  app.get("/api/health", async () =>
    success({ status: "ok", service: "BookFit API" }),
  );

  app.get("/api/csrf", async (_request, reply) => {
    const token = createCsrfToken();
    csrfCookie(reply, token);
    return success({ token });
  });

  app.get("/api/me", async (request) => success(contexts.get(request) ?? null));

  app.get(
    "/api/dev/profiles",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              success: { const: true },
              data: { type: "object", additionalProperties: true },
              error: { type: "null" },
            },
            required: ["success", "data", "error"],
          },
        },
      },
    },
    async () => {
      if (!config.devProfiles)
        throw new ApiError(404, "No encontrado.", "not_found");
      const result = await pool.query<{
        id: string;
        name: string;
        roles: ActorRole[];
        professional_id: string | null;
        space_ids: string[];
      }>(
        `SELECT a.id,a.display_name AS name,
              COALESCE(array_agg(DISTINCT ar.role) FILTER(WHERE ar.role IS NOT NULL),'{}') AS roles,
              max(p.id::text)::uuid AS professional_id,
              COALESCE(array_agg(DISTINCT sm.space_id::text) FILTER(WHERE sm.space_id IS NOT NULL),'{}')::text[] AS space_ids
         FROM bookfit.actors a JOIN bookfit.actor_roles ar ON ar.actor_id=a.id
         LEFT JOIN bookfit.professionals p ON p.actor_id=a.id LEFT JOIN bookfit.space_memberships sm ON sm.actor_id=a.id
        WHERE a.is_demo=true GROUP BY a.id,a.display_name ORDER BY a.display_name`,
      );
      return success({
        profiles: result.rows.map((row) => ({
          id: row.id,
          name: row.name,
          roles: row.roles,
          professionalId: row.professional_id,
          spaceIds: row.space_ids,
        })),
      });
    },
  );

  app.post(
    "/api/dev/session",
    {
      schema: {
        body: {
          type: "object",
          required: ["profileId"],
          properties: { profileId: uuidSchema },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const body = request.body as { profileId: string };
      const currentToken = readCookie(request, "bookfit_session");
      const session = await createDemoSession(
        pool,
        body.profileId,
        currentToken,
        config,
      );
      issueSessionCookie(reply, session.token, config);
      return reply.code(201).send(success(session.context));
    },
  );

  app.delete("/api/dev/session", async (request, reply) => {
    await revokeDemoSession(pool, readCookie(request, "bookfit_session"));
    clearSessionCookie(reply, config);
    return success({ signedOut: true });
  });

  app.get(
    "/api/catalog",
    {
      schema: {
        querystring: {
          type: "object",
          properties: { query: { type: "string", maxLength: 100 } },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const query = (request.query as { query?: string }).query ?? "";
      return success(await getCatalog(pool, query));
    },
  );

  app.get(
    "/api/classes",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            from: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            to: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const query = request.query as { from?: string; to?: string };
      const from = query.from ?? madridTodayKey();
      const to = query.to ?? shiftedDate(from, 45);
      return success({ items: await getClasses(pool, from, to) });
    },
  );

  app.get(
    "/api/availability",
    {
      schema: {
        querystring: {
          type: "object",
          required: ["serviceId", "mode", "date"],
          properties: {
            serviceId: uuidSchema,
            mode: { enum: ["room", "gym", "home", "online"] },
            date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            areaLocationId: uuidSchema,
            seats: { type: "integer", minimum: 1, maximum: 12 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const query = request.query as {
        serviceId: string;
        mode: BookingMode;
        date: string;
        areaLocationId?: string;
        seats?: number;
      };
      return success(
        await getAvailability(pool, { ...query, seats: query.seats ?? 1 }),
      );
    },
  );

  app.get(
    "/api/classes/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: uuidSchema },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const id = (request.params as { id: string }).id;
      const items = await getClasses(
        pool,
        madridTodayKey(),
        shiftedDate(madridTodayKey(), 90),
      );
      const found = items.find((item) => item.id === id);
      if (!found)
        throw new ApiError(404, "Clase no encontrada.", "class_not_found");
      return success(found);
    },
  );

  app.post(
    "/api/checkouts",
    {
      schema: {
        body: {
          type: "object",
          required: ["serviceId", "mode", "seats", "slots"],
          properties: {
            serviceId: uuidSchema,
            mode: { enum: ["room", "gym", "home", "online"] },
            seats: { type: "integer", minimum: 1, maximum: 12 },
            areaLocationId: uuidSchema,
            slots: {
              type: "array",
              minItems: 1,
              maxItems: 8,
              items: {
                type: "object",
                required: ["date"],
                properties: {
                  date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                  startMinute: { type: "integer", minimum: 0, maximum: 1439 },
                  spaceId: uuidSchema,
                  classSessionId: uuidSchema,
                },
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const context = requireRole(request, "client");
      const key = request.headers["idempotency-key"];
      if (typeof key !== "string")
        throw new ApiError(
          422,
          "Falta una clave de idempotencia.",
          "idempotency_key_required",
        );
      const result = await createCheckout({
        pool,
        actor: context,
        body: request.body as CheckoutInput,
        idempotencyKey: key,
      });
      return reply.code(201).send(success(result));
    },
  );

  app.post(
    "/api/dev/checkouts/:id/pay",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: uuidSchema },
          additionalProperties: false,
        },
        body: {
          type: "object",
          required: ["outcome"],
          properties: { outcome: { enum: ["success", "failure", "expired"] } },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const context = requireRole(request, "client");
      if (!config.devProfiles || config.paymentMode !== "fake")
        throw new ApiError(404, "No encontrado.", "not_found");
      const id = (request.params as { id: string }).id;
      const key = request.headers["idempotency-key"];
      if (typeof key !== "string")
        throw new ApiError(
          422,
          "Falta una clave de idempotencia.",
          "idempotency_key_required",
        );
      const body = request.body as {
        outcome: "success" | "failure" | "expired";
      };
      return success(
        await payCheckout({
          pool,
          actor: context,
          checkoutId: id,
          outcome: body.outcome,
          idempotencyKey: key,
        }),
      );
    },
  );

  app.get(
    "/api/agenda",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            from: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            to: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const context = actor(request);
      const query = request.query as { from?: string; to?: string };
      const today = madridTodayKey();
      const from = query.from ?? shiftedDate(today, -30);
      const to = query.to ?? shiftedDate(today, 90);
      return success({ items: await getAgenda(pool, context, from, to) });
    },
  );

  app.get(
    "/api/bookings/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: uuidSchema },
          additionalProperties: false,
        },
      },
    },
    async (request) =>
      success(
        await getBooking(
          pool,
          actor(request),
          (request.params as { id: string }).id,
        ),
      ),
  );

  app.post(
    "/api/occurrences/:id/cancel",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: uuidSchema },
          additionalProperties: false,
        },
        body: { type: "object", properties: {}, additionalProperties: false },
      },
    },
    async (request) => {
      const context = requireRole(request, "client");
      return success(
        await cancelOccurrence({
          pool,
          actor: context,
          occurrenceId: (request.params as { id: string }).id,
        }),
      );
    },
  );

  app.post(
    "/api/classes/:id/waitlist",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: uuidSchema },
          additionalProperties: false,
        },
        body: {
          type: "object",
          properties: { seats: { type: "integer", minimum: 1, maximum: 12 } },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const context = requireRole(request, "client");
      const seats = (request.body as { seats?: number }).seats ?? 1;
      return success(
        await joinWaitlist({
          pool,
          actor: context,
          classSessionId: (request.params as { id: string }).id,
          seats,
        }),
      );
    },
  );

  app.get("/api/professional/preferences", async (request) =>
    success(await getProfessionalPreferences(pool, actor(request))),
  );
  app.patch(
    "/api/professional/preferences",
    {
      schema: {
        body: {
          type: "object",
          required: [
            "baseLocationId",
            "maxRadiusKm",
            "maxTravelMinutes",
            "bufferMinutes",
            "modalities",
          ],
          properties: {
            baseLocationId: uuidSchema,
            maxRadiusKm: { type: "number", minimum: 0, maximum: 40 },
            maxTravelMinutes: { type: "integer", minimum: 0, maximum: 180 },
            bufferMinutes: { type: "integer", minimum: 0, maximum: 120 },
            trainingApproach: { type: "string", maxLength: 500 },
            qualifications: { type: "string", maxLength: 300 },
            modalities: {
              type: "array",
              minItems: 1,
              uniqueItems: true,
              items: { enum: ["room", "gym", "home", "online"] },
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (request) =>
      success(
        await updateProfessionalPreferences(
          pool,
          actor(request),
          request.body as {
            baseLocationId: string;
            maxRadiusKm: number;
            maxTravelMinutes: number;
            bufferMinutes: number;
            modalities: BookingMode[];
            trainingApproach?: string;
            qualifications?: string;
          },
        ),
      ),
  );

  app.get("/api/my-spaces", async (request) =>
    success({ items: await getMySpaces(pool, actor(request)) }),
  );
  app.get(
    "/api/my-spaces/:id/metrics",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: uuidSchema },
          additionalProperties: false,
        },
        querystring: {
          type: "object",
          required: ["from", "to"],
          properties: {
            from: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            to: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          },
          additionalProperties: false,
        },
      },
    },
    async (request) => {
      const params = request.params as { id: string };
      const query = request.query as { from: string; to: string };
      return success(
        await getSpaceMetrics(
          pool,
          actor(request),
          params.id,
          query.from,
          query.to,
        ),
      );
    },
  );

  app.get("/api/information-requests", async (request) =>
    success({ items: await getInformationRequests(pool, actor(request)) }),
  );
  app.post(
    "/api/information-requests",
    {
      schema: {
        body: {
          type: "object",
          required: ["bookingOccurrenceId", "recipientKind", "body"],
          properties: {
            bookingOccurrenceId: uuidSchema,
            recipientKind: { enum: ["client", "space_manager"] },
            body: { type: "string", minLength: 1, maxLength: 1200 },
          },
          additionalProperties: false,
        },
      },
    },
    async (request, reply) => {
      const result = await createInformationRequest(
        pool,
        actor(request),
        request.body as {
          bookingOccurrenceId: string;
          recipientKind: "client" | "space_manager";
          body: string;
        },
      );
      return reply.code(201).send(success({ items: result }));
    },
  );
  app.patch(
    "/api/information-requests/:id/read",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: { id: uuidSchema },
          additionalProperties: false,
        },
      },
    },
    async (request) =>
      success(
        await markInformationRequestRead(
          pool,
          actor(request),
          (request.params as { id: string }).id,
        ),
      ),
  );

  return app;
}
