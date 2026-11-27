import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

const databaseUrl = process.env.BOOKFIT_TEST_DATABASE_URL ?? null;
if (!databaseUrl)
  throw new Error(
    "BOOKFIT_TEST_DATABASE_URL no está definida. Ejecuta `pnpm test:integration` para preparar una base local desechable.",
  );
const parsedTestUrl = new URL(databaseUrl);
const testHost = parsedTestUrl.hostname.replace(/^\[|\]$/g, "");
if (
  !["postgres:", "postgresql:"].includes(parsedTestUrl.protocol) ||
  !["127.0.0.1", "localhost", "::1"].includes(testHost)
) {
  throw new Error(
    "Las pruebas de integración solo admiten una URL PostgreSQL en loopback.",
  );
}

const ids = {
  client: "10000000-0000-4000-8000-000000000001",
  clientWithSeedBookings: "10000000-0000-4000-8000-000000000002",
  professional: "10000000-0000-4000-8000-000000000003",
  dualRole: "10000000-0000-4000-8000-000000000005",
  manager: "10000000-0000-4000-8000-000000000010",
  seededOccurrence: "71000000-0000-4000-8000-000000000003",
  dualRoleOccurrence: "71000000-0000-4000-8000-000000000005",
  pilatesService: "40000000-0000-4000-8000-000000000003",
  personalService: "40000000-0000-4000-8000-000000000001",
  physioService: "40000000-0000-4000-8000-000000000006",
  podologyService: "40000000-0000-4000-8000-000000000007",
};

function madridToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function dateAfter(days) {
  const date = new Date(`${madridToday()}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextProfessionalWorkdayOffset() {
  for (let offset = 1; offset <= 7; offset += 1) {
    const weekday = new Date(`${dateAfter(offset)}T12:00:00.000Z`).getUTCDay();
    if (weekday >= 1 && weekday <= 6) return offset;
  }
  throw new Error(
    "No se encontró un día de trabajo profesional en la próxima semana.",
  );
}

test(
  "BookFit API: permisos, solicitudes, pagos persistentes y concurrencia",
  { skip: false },
  async (t) => {
    const [{ Pool }, { createApp }] = await Promise.all([
      import("pg"),
      import("../../server/app.ts"),
    ]);
    const config = {
      nodeEnv: "test",
      host: "127.0.0.1",
      port: 3001,
      databaseUrl,
      devProfiles: true,
      paymentMode: "fake",
      sessionTtlHours: 2,
      appOrigins: ["http://127.0.0.1:5173"],
    };
    let pool = new Pool({ connectionString: databaseUrl, max: 6 });
    let app = createApp(pool, config);
    await app.ready();
    const sessionTokenHashes = new Set();

    const appRequest = (method, url, session, payload, extraHeaders = {}) =>
      app.inject({
        method,
        url,
        ...(payload === undefined ? {} : { payload }),
        headers: {
          host: "127.0.0.1:5173",
          ...(session ? { cookie: session.cookie } : {}),
          ...(["POST", "PATCH", "PUT", "DELETE"].includes(method)
            ? {
                origin: "http://127.0.0.1:5173",
                "x-csrf-token": session?.csrfToken ?? "",
              }
            : {}),
          ...extraHeaders,
        },
      });

    async function signIn(profileId) {
      const csrfResponse = await app.inject({
        method: "GET",
        url: "/api/csrf",
      });
      assert.equal(csrfResponse.statusCode, 200);
      const csrfToken = csrfResponse.json().data.token;
      const csrfSetCookie = String(csrfResponse.headers["set-cookie"]);
      const csrfCookie = csrfSetCookie.split(";", 1)[0];
      const login = await app.inject({
        method: "POST",
        url: "/api/dev/session",
        payload: { profileId },
        headers: {
          host: "127.0.0.1:5173",
          origin: "http://127.0.0.1:5173",
          cookie: csrfCookie,
          "x-csrf-token": csrfToken,
        },
      });
      assert.equal(login.statusCode, 201, login.body);
      const cookies = Array.isArray(login.headers["set-cookie"])
        ? login.headers["set-cookie"]
        : [login.headers["set-cookie"]];
      const sessionCookie = String(
        cookies.find((value) => String(value).startsWith("bookfit_session=")),
      ).split(";", 1)[0];
      const sessionSetCookie = String(
        cookies.find((value) => String(value).startsWith("bookfit_session=")),
      );
      const sessionToken = decodeURIComponent(sessionCookie.split("=", 2)[1]);
      sessionTokenHashes.add(
        createHash("sha256").update(sessionToken).digest("hex"),
      );
      return {
        cookie: `${csrfCookie}; ${sessionCookie}`,
        csrfToken,
        csrfSetCookie,
        sessionSetCookie,
        sessionToken,
      };
    }

    t.after(async () => {
      await app.close();
      if (sessionTokenHashes.size > 0) {
        await pool.query(
          "UPDATE bookfit.dev_sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE token_hash=ANY($1::text[])",
          [[...sessionTokenHashes]],
        );
      }
      await pool.end();
    });

    await t.test(
      "visitante explora y las mutaciones requieren CSRF",
      async () => {
        const catalog = await appRequest("GET", "/api/catalog");
        assert.equal(catalog.statusCode, 200);
        assert.ok(catalog.json().data.services.length > 0);
        const service = catalog.json().data.services[0];
        assert.equal(typeof service.professionalName, "string");
        assert.equal(typeof service.professionalHeadline, "string");
        assert.equal(typeof service.professionalZone, "string");
        assert.equal(typeof service.professionalRating, "number");
        assert.equal(
          JSON.stringify(catalog.json()).includes("access_instructions"),
          false,
        );
        const rejected = await app.inject({
          method: "POST",
          url: "/api/dev/session",
          payload: { profileId: ids.client },
        });
        assert.equal(rejected.statusCode, 403);
      },
    );

    const client = await signIn(ids.client);
    const anotherClient = await signIn(ids.clientWithSeedBookings);
    const professional = await signIn(ids.professional);
    const dualRole = await signIn(ids.dualRole);
    const manager = await signIn(ids.manager);
    const agendaFrom = madridToday();
    const agendaTo = dateAfter(90);

    await t.test(
      "los perfiles solo consultan objetos relacionados",
      async () => {
        const privateBooking = await appRequest(
          "GET",
          `/api/bookings/${ids.seededOccurrence}`,
          client,
        );
        assert.equal(privateBooking.statusCode, 404);
        const allowedBooking = await appRequest(
          "GET",
          `/api/bookings/${ids.seededOccurrence}`,
          anotherClient,
        );
        assert.equal(allowedBooking.statusCode, 200);
        const unrelatedMetrics = await appRequest(
          "GET",
          `/api/my-spaces/50000000-0000-4000-8000-000000000002/metrics?from=${agendaFrom}&to=${dateAfter(16)}`,
          manager,
        );
        assert.equal(unrelatedMetrics.statusCode, 404);
      },
    );

    await t.test(
      "solo el profesional relacionado envía solicitudes y solo el destinatario las marca leídas",
      async () => {
        const forbidden = await appRequest(
          "POST",
          "/api/information-requests",
          client,
          {
            bookingOccurrenceId: ids.seededOccurrence,
            recipientKind: "client",
            body: "No permitido",
          },
        );
        assert.equal(forbidden.statusCode, 403);

        const sent = await appRequest(
          "POST",
          "/api/information-requests",
          professional,
          {
            bookingOccurrenceId: ids.seededOccurrence,
            recipientKind: "client",
            body: "¿Puedes confirmar un detalle de la sesión?",
          },
        );
        assert.equal(sent.statusCode, 201, sent.body);
        const requestId = sent.json().data.items[0].id;
        const senderCannotMarkRead = await appRequest(
          "PATCH",
          `/api/information-requests/${requestId}/read`,
          professional,
          {},
        );
        assert.equal(senderCannotMarkRead.statusCode, 404);
        const recipientRequests = await appRequest(
          "GET",
          "/api/information-requests",
          anotherClient,
        );
        assert.ok(
          recipientRequests
            .json()
            .data.items.some((item) => item.id === requestId),
        );
        const receivedRequest = recipientRequests
          .json()
          .data.items.find((item) => item.id === requestId);
        assert.equal(receivedRequest.senderActorId, ids.professional);
        assert.equal(
          receivedRequest.recipientActorId,
          ids.clientWithSeedBookings,
        );
        assert.match(receivedRequest.serviceDate, /^\d{4}-\d{2}-\d{2}$/);
        const recipientCanMarkRead = await appRequest(
          "PATCH",
          `/api/information-requests/${requestId}/read`,
          anotherClient,
          {},
        );
        assert.equal(recipientCanMarkRead.statusCode, 200);
        const unrelated = await appRequest(
          "GET",
          "/api/information-requests",
          client,
        );
        assert.equal(
          unrelated.json().data.items.some((item) => item.id === requestId),
          false,
        );

        const sentToManager = await appRequest(
          "POST",
          "/api/information-requests",
          professional,
          {
            bookingOccurrenceId: ids.seededOccurrence,
            recipientKind: "space_manager",
            body: "El acceso será por la puerta lateral.",
          },
        );
        assert.equal(sentToManager.statusCode, 201, sentToManager.body);
        const managerInbox = await appRequest(
          "GET",
          "/api/information-requests",
          manager,
        );
        assert.ok(
          managerInbox
            .json()
            .data.items.some(
              (item) => item.body === "El acceso será por la puerta lateral.",
            ),
        );
      },
    );

    await t.test(
      "el profesional consulta y actualiza sus preferencias; el cliente no puede hacerlo",
      async () => {
        const current = await appRequest(
          "GET",
          "/api/professional/preferences",
          professional,
        );
        assert.equal(current.statusCode, 200, current.body);
        const saved = await appRequest(
          "PATCH",
          "/api/professional/preferences",
          professional,
          current.json().data,
        );
        assert.equal(saved.statusCode, 200, saved.body);
        const forbidden = await appRequest(
          "PATCH",
          "/api/professional/preferences",
          client,
          current.json().data,
        );
        assert.equal(forbidden.statusCode, 403);
      },
    );

    await t.test(
      "la agenda deduplica el doble rol cuando una misma reserva le corresponde por profesional y gestor",
      async () => {
        const me = await appRequest("GET", "/api/me", dualRole);
        assert.deepEqual(
          new Set(me.json().data.roles),
          new Set(["professional", "space_manager"]),
        );
        const agenda = await appRequest(
          "GET",
          `/api/agenda?from=${agendaFrom}&to=${agendaTo}`,
          dualRole,
        );
        const matching = agenda
          .json()
          .data.items.filter(
            (item) => item.occurrenceId === ids.dualRoleOccurrence,
          );
        assert.equal(matching.length, 1);
        assert.match(matching[0].date, /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(typeof matching[0].clientActorId, "string");
        assert.equal(typeof matching[0].clientName, "string");
      },
    );

    await t.test(
      "el aforo no se sobrevende en checkouts concurrentes y la espera solo acepta una clase llena",
      async () => {
        const classes = await appRequest(
          "GET",
          `/api/classes?from=${agendaFrom}&to=${agendaTo}`,
        );
        const availableClass = classes
          .json()
          .data.items.find(
            (item) =>
              item.serviceId === ids.pilatesService && item.availableSeats >= 2,
          );
        assert.ok(
          availableClass,
          "La seed debe conservar una clase de Pilates con plazas libres.",
        );
        const notFull = await appRequest(
          "POST",
          `/api/classes/${availableClass.id}/waitlist`,
          client,
          { seats: 1 },
        );
        assert.equal(notFull.statusCode, 409);
        const competingSeats =
          Math.floor(availableClass.availableSeats / 2) + 1;
        const create = (session, key) =>
          appRequest(
            "POST",
            "/api/checkouts",
            session,
            {
              serviceId: ids.pilatesService,
              mode: "room",
              seats: competingSeats,
              slots: [
                {
                  date: availableClass.date,
                  startMinute: availableClass.startMinute,
                  spaceId: availableClass.spaceId,
                  classSessionId: availableClass.id,
                },
              ],
            },
            { "idempotency-key": key },
          );
        const [first, second] = await Promise.all([
          create(client, `race-a-${crypto.randomUUID()}`),
          create(anotherClient, `race-b-${crypto.randomUUID()}`),
        ]);
        assert.deepEqual(
          [first.statusCode, second.statusCode].sort(),
          [201, 409],
        );
        const winner = first.statusCode === 201 ? first : second;
        const released = await appRequest(
          "POST",
          `/api/dev/checkouts/${winner.json().data.checkoutId}/pay`,
          first.statusCode === 201 ? client : anotherClient,
          { outcome: "failure" },
          { "idempotency-key": `race-cleanup-${crypto.randomUUID()}` },
        );
        assert.equal(released.statusCode, 200, released.body);
        assert.equal(released.json().data.status, "failed");
        const fullClass = classes
          .json()
          .data.items.find(
            (item) =>
              item.serviceId === ids.pilatesService &&
              item.availableSeats === 0,
          );
        const waiting = await appRequest(
          "POST",
          `/api/classes/${fullClass.id}/waitlist`,
          client,
          { seats: 1 },
        );
        assert.equal(waiting.statusCode, 200, waiting.body);
      },
    );

    await t.test(
      "el fallo y la caducidad del pago liberan retención y plaza sin duplicar eventos",
      async () => {
        const list = await appRequest(
          "GET",
          `/api/classes?from=${agendaFrom}&to=${agendaTo}`,
        );
        const yoga = list
          .json()
          .data.items.find(
            (item) =>
              item.serviceId === "40000000-0000-4000-8000-000000000004" &&
              item.availableSeats > 0,
          );
        assert.ok(yoga, "La seed debe ofrecer una clase de Yoga disponible.");
        for (const outcome of ["failure", "expired"]) {
          const checkoutResponse = await appRequest(
            "POST",
            "/api/checkouts",
            client,
            {
              serviceId: yoga.serviceId,
              mode: "room",
              seats: 1,
              slots: [
                {
                  date: yoga.date,
                  startMinute: yoga.startMinute,
                  spaceId: yoga.spaceId,
                  classSessionId: yoga.id,
                },
              ],
            },
            { "idempotency-key": `${outcome}-${crypto.randomUUID()}` },
          );
          assert.equal(checkoutResponse.statusCode, 201, checkoutResponse.body);
          const checkout = checkoutResponse.json().data;
          const paymentKey = `result-${crypto.randomUUID()}`;
          const result = await appRequest(
            "POST",
            `/api/dev/checkouts/${checkout.checkoutId}/pay`,
            client,
            { outcome },
            {
              "idempotency-key": paymentKey,
            },
          );
          assert.equal(result.statusCode, 200, result.body);
          assert.equal(
            result.json().data.status,
            outcome === "failure" ? "failed" : "expired",
          );
          const replay = await appRequest(
            "POST",
            `/api/dev/checkouts/${checkout.checkoutId}/pay`,
            client,
            { outcome },
            {
              "idempotency-key": paymentKey,
            },
          );
          assert.deepEqual(replay.json().data, result.json().data);
          const eventCount = await pool.query(
            "SELECT count(*)::int AS total FROM bookfit.payment_events WHERE payment_attempt_id=(SELECT id FROM bookfit.payment_attempts WHERE order_id=$1)",
            [checkout.checkoutId],
          );
          assert.equal(eventCount.rows[0].total, 1);
          const refreshed = await appRequest(
            "GET",
            `/api/classes?from=${agendaFrom}&to=${agendaTo}`,
          );
          const refreshedYoga = refreshed
            .json()
            .data.items.find((item) => item.id === yoga.id);
          assert.ok(
            refreshedYoga.availableSeats > 0,
            `La retención ${outcome} debe devolver la plaza.`,
          );
        }
      },
    );

    await t.test(
      "la cancelación afecta solo la fecha elegida de una reserva recurrente",
      async () => {
        const firstOffset = nextProfessionalWorkdayOffset();
        const firstDate = dateAfter(firstOffset);
        const secondDate = dateAfter(firstOffset + 7);
        const [firstAvailability, secondAvailability] = await Promise.all([
          appRequest(
            "GET",
            `/api/availability?serviceId=${ids.personalService}&mode=online&date=${firstDate}`,
          ),
          appRequest(
            "GET",
            `/api/availability?serviceId=${ids.personalService}&mode=online&date=${secondDate}`,
          ),
        ]);
        assert.equal(firstAvailability.statusCode, 200, firstAvailability.body);
        assert.equal(
          secondAvailability.statusCode,
          200,
          secondAvailability.body,
        );
        const firstSlot = firstAvailability.json().data.slots[0];
        const secondSlot = secondAvailability.json().data.slots[0];
        assert.ok(
          firstSlot && secondSlot,
          "La disponibilidad semilla debe ofrecer ambos días.",
        );
        const checkoutResponse = await appRequest(
          "POST",
          "/api/checkouts",
          client,
          {
            serviceId: ids.personalService,
            mode: "online",
            seats: 1,
            slots: [firstSlot, secondSlot].map((slot) => ({
              date: slot.date,
              startMinute: slot.startMinute,
            })),
          },
          { "idempotency-key": `series-${crypto.randomUUID()}` },
        );
        assert.equal(checkoutResponse.statusCode, 201, checkoutResponse.body);
        const checkout = checkoutResponse.json().data;
        const paid = await appRequest(
          "POST",
          `/api/dev/checkouts/${checkout.checkoutId}/pay`,
          client,
          { outcome: "success" },
          {
            "idempotency-key": `series-pay-${crypto.randomUUID()}`,
          },
        );
        assert.equal(paid.statusCode, 200, paid.body);
        const [first, second] = checkout.occurrences;
        const otherClientCannotCancel = await appRequest(
          "POST",
          `/api/occurrences/${first.id}/cancel`,
          anotherClient,
          {},
        );
        assert.equal(otherClientCannotCancel.statusCode, 404);
        const cancelled = await appRequest(
          "POST",
          `/api/occurrences/${first.id}/cancel`,
          client,
          {},
        );
        assert.equal(cancelled.statusCode, 200, cancelled.body);
        assert.equal(
          (await appRequest("GET", `/api/bookings/${first.id}`, client)).json()
            .data.status,
          "cancelled",
        );
        assert.equal(
          (await appRequest("GET", `/api/bookings/${second.id}`, client)).json()
            .data.status,
          "confirmed",
        );
        const cleanup = await appRequest(
          "POST",
          `/api/occurrences/${second.id}/cancel`,
          client,
          {},
        );
        assert.equal(cleanup.statusCode, 200, cleanup.body);
      },
    );

    await t.test(
      "el pago idempotente sobrevive al reinicio del servidor y sigue visible en agenda",
      async () => {
        const classes = await appRequest(
          "GET",
          `/api/classes?from=${agendaFrom}&to=${agendaTo}`,
        );
        const freeYoga = classes
          .json()
          .data.items.find(
            (item) =>
              item.serviceId === "40000000-0000-4000-8000-000000000004" &&
              item.availableSeats > 0,
          );
        assert.ok(
          freeYoga,
          "La seed debe ofrecer una clase de Yoga disponible.",
        );
        const checkoutResponse = await appRequest(
          "POST",
          "/api/checkouts",
          client,
          {
            serviceId: freeYoga.serviceId,
            mode: "room",
            seats: 1,
            slots: [
              {
                date: freeYoga.date,
                startMinute: freeYoga.startMinute,
                spaceId: freeYoga.spaceId,
                classSessionId: freeYoga.id,
              },
            ],
          },
          { "idempotency-key": `paid-${crypto.randomUUID()}` },
        );
        assert.equal(checkoutResponse.statusCode, 201, checkoutResponse.body);
        const checkout = checkoutResponse.json().data;
        assert.equal(checkout.status, "pending");
        assert.ok(checkout.holdExpiresAt);

        const paymentKey = `pay-${crypto.randomUUID()}`;
        const paymentHeaders = { "idempotency-key": paymentKey };
        const paid = await appRequest(
          "POST",
          `/api/dev/checkouts/${checkout.checkoutId}/pay`,
          client,
          { outcome: "success" },
          paymentHeaders,
        );
        assert.equal(paid.statusCode, 200, paid.body);
        assert.equal(paid.json().data.status, "paid");
        const replay = await appRequest(
          "POST",
          `/api/dev/checkouts/${checkout.checkoutId}/pay`,
          client,
          { outcome: "success" },
          paymentHeaders,
        );
        assert.equal(replay.statusCode, 200);
        assert.equal(replay.json().data.status, "paid");
        const eventCount = await pool.query(
          "SELECT count(*)::int AS total FROM bookfit.payment_events WHERE payment_attempt_id=(SELECT id FROM bookfit.payment_attempts WHERE order_id=$1)",
          [checkout.checkoutId],
        );
        assert.equal(eventCount.rows[0].total, 1);

        await app.close();
        await pool.end();
        pool = new Pool({ connectionString: databaseUrl, max: 6 });
        app = createApp(pool, config);
        await app.ready();
        const persisted = await appRequest(
          "GET",
          `/api/bookings/${checkout.occurrences[0].id}`,
          client,
        );
        assert.equal(persisted.statusCode, 200, persisted.body);
        assert.equal(persisted.json().data.status, "confirmed");
        const agenda = await appRequest(
          "GET",
          `/api/agenda?from=${agendaFrom}&to=${agendaTo}`,
          client,
        );
        assert.ok(
          agenda
            .json()
            .data.items.some(
              (item) => item.occurrenceId === checkout.occurrences[0].id,
            ),
        );
        const cleanup = await appRequest(
          "POST",
          `/api/occurrences/${checkout.occurrences[0].id}/cancel`,
          client,
          {},
        );
        assert.equal(cleanup.statusCode, 200, cleanup.body);
      },
    );

    await t.test(
      "la concurrencia bloquea dos reservas del mismo profesional a la misma hora",
      async () => {
        const date = dateAfter(7);
        const availability = await appRequest(
          "GET",
          `/api/availability?serviceId=${ids.personalService}&mode=online&date=${date}`,
        );
        assert.equal(availability.statusCode, 200, availability.body);
        const slot = availability
          .json()
          .data.slots.find((item) => item.startMinute >= 12 * 60);
        assert.ok(slot, "La seed debe ofrecer un horario de tarde libre.");
        const body = {
          serviceId: ids.personalService,
          mode: "online",
          seats: 1,
          slots: [{ date: slot.date, startMinute: slot.startMinute }],
        };
        const checkout = (session, key) =>
          appRequest("POST", "/api/checkouts", session, body, {
            "idempotency-key": key,
          });
        const [first, second] = await Promise.all([
          checkout(client, `professional-race-a-${crypto.randomUUID()}`),
          checkout(anotherClient, `professional-race-b-${crypto.randomUUID()}`),
        ]);
        assert.deepEqual(
          [first.statusCode, second.statusCode].sort(),
          [201, 409],
        );
        const winner = first.statusCode === 201 ? first : second;
        const winnerSession = first.statusCode === 201 ? client : anotherClient;
        const checkoutId = winner.json().data.checkoutId;
        const release = await appRequest(
          "POST",
          `/api/dev/checkouts/${checkoutId}/pay`,
          winnerSession,
          { outcome: "failure" },
          { "idempotency-key": `professional-cleanup-${crypto.randomUUID()}` },
        );
        assert.equal(release.statusCode, 200, release.body);
        assert.equal(release.json().data.status, "failed");
      },
    );

    await t.test(
      "la concurrencia evita reservar la misma sala para dos profesionales",
      async () => {
        const date = dateAfter(7);
        const [physioAvailability, podologyAvailability] = await Promise.all([
          appRequest(
            "GET",
            `/api/availability?serviceId=${ids.physioService}&mode=room&date=${date}`,
          ),
          appRequest(
            "GET",
            `/api/availability?serviceId=${ids.podologyService}&mode=room&date=${date}`,
          ),
        ]);
        assert.equal(physioAvailability.statusCode, 200);
        assert.equal(podologyAvailability.statusCode, 200);
        const sharedRoomId = "50000000-0000-4000-8000-000000000002";
        const physioSlots = physioAvailability.json().data.slots;
        const podologySlots = podologyAvailability.json().data.slots;
        const physioSlot = physioSlots.find(
          (slot) =>
            slot.startMinute >= 12 * 60 &&
            slot.spaces.some((space) => space.id === sharedRoomId) &&
            podologySlots.some(
              (candidate) =>
                candidate.startMinute === slot.startMinute &&
                candidate.spaces.some((space) => space.id === sharedRoomId),
            ),
        );
        assert.ok(
          physioSlot,
          "La seed debe ofrecer un horario común en Consulta Azul.",
        );
        const podologySlot = podologySlots.find(
          (slot) => slot.startMinute === physioSlot.startMinute,
        );
        assert.ok(podologySlot);
        const create = (session, serviceId, slot, key) =>
          appRequest(
            "POST",
            "/api/checkouts",
            session,
            {
              serviceId,
              mode: "room",
              seats: 1,
              slots: [
                {
                  date: slot.date,
                  startMinute: slot.startMinute,
                  spaceId: sharedRoomId,
                },
              ],
            },
            { "idempotency-key": key },
          );
        const [first, second] = await Promise.all([
          create(
            client,
            ids.physioService,
            physioSlot,
            `room-race-a-${crypto.randomUUID()}`,
          ),
          create(
            anotherClient,
            ids.podologyService,
            podologySlot,
            `room-race-b-${crypto.randomUUID()}`,
          ),
        ]);
        assert.deepEqual(
          [first.statusCode, second.statusCode].sort(),
          [201, 409],
        );
        const winner = first.statusCode === 201 ? first : second;
        const winnerSession = first.statusCode === 201 ? client : anotherClient;
        const release = await appRequest(
          "POST",
          `/api/dev/checkouts/${winner.json().data.checkoutId}/pay`,
          winnerSession,
          { outcome: "failure" },
          { "idempotency-key": `room-cleanup-${crypto.randomUUID()}` },
        );
        assert.equal(release.statusCode, 200, release.body);
        assert.equal(release.json().data.status, "failed");
      },
    );

    await t.test(
      "los reintentos concurrentes con la misma clave crean un solo checkout y pago",
      async () => {
        const date = dateAfter(7);
        const availability = await appRequest(
          "GET",
          `/api/availability?serviceId=${ids.personalService}&mode=online&date=${date}`,
        );
        assert.equal(availability.statusCode, 200, availability.body);
        const slot = availability
          .json()
          .data.slots.find((item) => item.startMinute >= 14 * 60);
        assert.ok(slot, "La seed debe ofrecer un horario online libre.");
        const body = {
          serviceId: ids.personalService,
          mode: "online",
          seats: 1,
          slots: [{ date: slot.date, startMinute: slot.startMinute }],
        };
        const checkoutKey = `checkout-retry-${crypto.randomUUID()}`;
        const create = () =>
          appRequest("POST", "/api/checkouts", client, body, {
            "idempotency-key": checkoutKey,
          });
        const [first, replay] = await Promise.all([create(), create()]);
        assert.equal(first.statusCode, 201, first.body);
        assert.equal(replay.statusCode, 201, replay.body);
        assert.equal(
          replay.json().data.checkoutId,
          first.json().data.checkoutId,
        );
        const checkoutId = first.json().data.checkoutId;
        const checkoutKeyCount = await pool.query(
          "SELECT count(*)::int AS total FROM bookfit.idempotency_keys WHERE actor_id=$1 AND operation='checkout' AND key=$2",
          [ids.client, checkoutKey],
        );
        assert.equal(checkoutKeyCount.rows[0].total, 1);

        const paymentKey = `payment-retry-${crypto.randomUUID()}`;
        const pay = () =>
          appRequest(
            "POST",
            `/api/dev/checkouts/${checkoutId}/pay`,
            client,
            { outcome: "success" },
            { "idempotency-key": paymentKey },
          );
        const [paid, paymentReplay] = await Promise.all([pay(), pay()]);
        assert.equal(paid.statusCode, 200, paid.body);
        assert.equal(paymentReplay.statusCode, 200, paymentReplay.body);
        assert.deepEqual(paymentReplay.json().data, paid.json().data);
        assert.equal(paid.json().data.status, "paid");
        const paymentEvents = await pool.query(
          "SELECT count(*)::int AS total FROM bookfit.payment_events WHERE payment_attempt_id=(SELECT id FROM bookfit.payment_attempts WHERE order_id=$1)",
          [checkoutId],
        );
        assert.equal(paymentEvents.rows[0].total, 1);
        const occurrences = await pool.query(
          "SELECT count(*)::int AS total FROM bookfit.booking_occurrences WHERE order_id=$1",
          [checkoutId],
        );
        assert.equal(occurrences.rows[0].total, 1);
        const cancellation = await appRequest(
          "POST",
          `/api/occurrences/${first.json().data.occurrences[0].id}/cancel`,
          client,
          {},
        );
        assert.equal(cancellation.statusCode, 200, cancellation.body);
      },
    );

    await t.test(
      "sesiones, cookies y origen protegen mutaciones y caducan correctamente",
      async () => {
        const session = await signIn(ids.client);
        assert.match(session.sessionSetCookie, /Path=\//);
        assert.match(session.sessionSetCookie, /HttpOnly/i);
        assert.match(session.sessionSetCookie, /SameSite=Strict/i);
        assert.match(session.sessionSetCookie, /Max-Age=7200/i);
        assert.doesNotMatch(session.sessionSetCookie, /; Secure/i);
        assert.match(session.csrfSetCookie, /Path=\//);
        assert.match(session.csrfSetCookie, /SameSite=Strict/i);
        assert.match(session.csrfSetCookie, /Max-Age=3600/i);

        const hostileOrigin = await appRequest(
          "DELETE",
          "/api/dev/session",
          session,
          undefined,
          { origin: "https://attacker.example" },
        );
        assert.equal(hostileOrigin.statusCode, 403);
        assert.equal(hostileOrigin.json().error.code, "origin_denied");
        assert.equal(
          (await appRequest("GET", "/api/me", session)).json().data.actorId,
          ids.client,
          "El origen inválido no debe revocar la sesión.",
        );
        const agendaPath = `/api/agenda?from=${agendaFrom}&to=${agendaTo}`;
        assert.equal(
          (await appRequest("GET", agendaPath, session)).statusCode,
          200,
        );

        const badCsrf = await appRequest(
          "DELETE",
          "/api/dev/session",
          session,
          undefined,
          { "x-csrf-token": "incorrect-token" },
        );
        assert.equal(badCsrf.statusCode, 403);
        assert.equal(badCsrf.json().error.code, "csrf_invalid");

        const logout = await appRequest("DELETE", "/api/dev/session", session);
        assert.equal(logout.statusCode, 200, logout.body);
        assert.equal(logout.json().data.signedOut, true);
        const clearedCookie = String(logout.headers["set-cookie"]);
        assert.match(clearedCookie, /bookfit_session=;/);
        assert.match(clearedCookie, /Max-Age=0/i);
        assert.match(clearedCookie, /HttpOnly/i);
        assert.equal(
          (await appRequest("GET", agendaPath, session)).statusCode,
          401,
        );

        const expiringSession = await signIn(ids.client);
        const tokenHash = createHash("sha256")
          .update(expiringSession.sessionToken)
          .digest("hex");
        const expired = await pool.query(
          "UPDATE bookfit.dev_sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1 AND revoked_at IS NULL",
          [tokenHash],
        );
        assert.equal(expired.rowCount, 1);
        const expiredMe = await appRequest("GET", agendaPath, expiringSession);
        assert.equal(expiredMe.statusCode, 401);
        assert.equal(expiredMe.json().error.code, "session_required");
      },
    );
  },
);
