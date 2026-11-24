import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

const baseURL =
  process.env.BOOKFIT_E2E_BASE_URL ??
  `http://127.0.0.1:${process.env.BOOKFIT_E2E_WEB_PORT ?? "5173"}`;
const checkoutsToFail = new Set();
const occurrencesToCancel = new Set();

function madridDateAfter(days) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce((value, part) => {
      if (part.type !== "literal") value[part.type] = part.value;
      return value;
    }, {});
  const date = new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day) + days,
      12,
    ),
  );
  return date.toISOString().slice(0, 10);
}

async function selectClientProfile(page) {
  await page.getByRole("button", { name: /Elegir perfil/ }).click();
  const profileDialog = page.getByRole("dialog", {
    name: "Elige un perfil de prueba",
  });
  await expect(profileDialog).toBeVisible();
  await profileDialog.getByRole("button", { name: /Alex Vidal/ }).click();
  await expect(
    page.getByText("Sesión iniciada como Alex Vidal."),
  ).toBeVisible();
}

async function removeOccurrence(page, occurrenceId) {
  const cookies = await page.context().cookies(baseURL);
  const csrfToken = cookies.find(
    (cookie) => cookie.name === "bookfit_csrf",
  )?.value;
  if (!csrfToken)
    throw new Error("No hay cookie CSRF para limpiar la reserva E2E.");

  const response = await page.request.post(
    `${baseURL}/api/occurrences/${occurrenceId}/cancel`,
    {
      data: {},
      headers: {
        origin: baseURL,
        "x-csrf-token": csrfToken,
      },
    },
  );
  if (
    !response.ok() &&
    response.status() !== 404 &&
    response.status() !== 409
  ) {
    throw new Error(
      `No se pudo limpiar la reserva E2E (${response.status()}).`,
    );
  }
}

async function releasePendingCheckout(page, checkoutId) {
  const cookies = await page.context().cookies(baseURL);
  const csrfToken = cookies.find(
    (cookie) => cookie.name === "bookfit_csrf",
  )?.value;
  if (!csrfToken)
    throw new Error("No hay cookie CSRF para liberar la retención E2E.");

  const response = await page.request.post(
    `${baseURL}/api/dev/checkouts/${checkoutId}/pay`,
    {
      data: { outcome: "failure" },
      headers: {
        origin: baseURL,
        "x-csrf-token": csrfToken,
        "idempotency-key": `e2e-cleanup-${randomUUID()}`,
      },
    },
  );
  if (!response.ok() && response.status() !== 409) {
    throw new Error(
      `No se pudo liberar la retención E2E (${response.status()}).`,
    );
  }
}

async function signOutDemoSession(page) {
  const cookies = await page.context().cookies(baseURL);
  if (!cookies.some((cookie) => cookie.name === "bookfit_session")) return;

  const csrfToken = cookies.find(
    (cookie) => cookie.name === "bookfit_csrf",
  )?.value;
  if (!csrfToken)
    throw new Error("No hay cookie CSRF para cerrar la sesión E2E.");

  const response = await page.request.delete(`${baseURL}/api/dev/session`, {
    headers: {
      origin: baseURL,
      "x-csrf-token": csrfToken,
    },
  });
  if (!response.ok() && response.status() !== 204) {
    throw new Error(`No se pudo cerrar la sesión E2E (${response.status()}).`);
  }
}

async function findAgendaCard(page, serviceName, date) {
  const targetDay = String(Number(date.slice(-2)));
  const targetMonth = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    month: "short",
  })
    .format(new Date(`${date}T12:00:00.000Z`))
    .replaceAll(".", "")
    .toLocaleLowerCase("es-ES");
  const cards = page.locator(".bf-agenda-card");
  for (let index = 0; index < (await cards.count()); index += 1) {
    const card = cards.nth(index);
    const [title, day, month] = await Promise.all([
      card.locator(".bf-agenda-title h2").innerText(),
      card.locator(".bf-agenda-date strong").innerText(),
      card.locator(".bf-agenda-date span").innerText(),
    ]);
    if (
      title === serviceName &&
      day === targetDay &&
      month.replaceAll(".", "").toLocaleLowerCase("es-ES") === targetMonth
    ) {
      return card;
    }
  }
  return null;
}

test.describe("BookFit navegador", () => {
  test.afterEach(async ({ page }) => {
    for (const checkoutId of checkoutsToFail) {
      await releasePendingCheckout(page, checkoutId);
    }
    for (const occurrenceId of occurrencesToCancel) {
      await removeOccurrence(page, occurrenceId);
    }
    await signOutDemoSession(page);
    checkoutsToFail.clear();
    occurrencesToCancel.clear();
  });

  test("perfil, búsqueda, checkout pagado y agenda tras recargar", async ({
    page,
  }) => {
    const pageErrors = [];
    let occurrenceId;
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/");
    await expect(page).toHaveTitle(/BookFit/);
    await expect(
      page.getByRole("heading", { name: /Tu próxima sesión empieza/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Encuentra una sesión" }),
    ).toBeVisible();

    await selectClientProfile(page);

    const search = page.getByRole("textbox", {
      name: "¿Qué te gustaría hacer?",
    });
    await search.fill("Entrenamiento personal");
    await page.getByRole("button", { name: "Buscar" }).click();

    const service = page.getByLabel("Servicio");
    await expect(service.locator("option")).toHaveCount(2);
    await service.selectOption({
      label: "Entrenamiento personal · Marina Ortega",
    });
    await page.getByLabel("Modalidad").selectOption("room");
    const dateInput = page.getByLabel("Fecha de inicio");
    const requestedDate = madridDateAfter(7);
    await dateInput.fill(requestedDate);
    await expect(dateInput).toHaveValue(requestedDate);

    await page
      .getByRole("button", { name: "Ver horarios disponibles" })
      .click();
    const slot = page.locator(".bf-slot-button").first();
    await expect(slot).toBeVisible();

    const checkoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/checkouts") &&
        response.request().method() === "POST",
    );
    await slot.click();
    const checkoutResponse = await checkoutResponsePromise;
    expect(checkoutResponse.status()).toBe(201);
    const checkoutBody = await checkoutResponse.json();
    occurrenceId = checkoutBody.data?.occurrences?.[0]?.id;
    const checkoutId = checkoutBody.data?.checkoutId;
    if (typeof occurrenceId !== "string" || typeof checkoutId !== "string") {
      throw new Error(
        "El checkout no devolvió IDs para limpiar la reserva E2E.",
      );
    }
    checkoutsToFail.add(checkoutId);
    occurrencesToCancel.add(occurrenceId);
    expect(checkoutBody.data?.occurrences?.[0]?.date).toBe(requestedDate);
    const bookedDate = requestedDate;

    const checkoutDialog = page.getByRole("dialog", {
      name: "Revisa tu reserva",
    });
    await expect(checkoutDialog).toBeVisible();
    await expect(checkoutDialog.getByText("Total")).toBeVisible();

    const paymentResponsePromise = page.waitForResponse(
      (response) =>
        /\/api\/dev\/checkouts\/[^/]+\/pay$/.test(response.url()) &&
        response.request().method() === "POST",
    );
    await checkoutDialog.getByRole("button", { name: "Pago correcto" }).click();
    const paymentResponse = await paymentResponsePromise;
    const paymentBody = await paymentResponse.json();
    if (paymentBody.data?.status === "paid") {
      checkoutsToFail.delete(checkoutId);
      occurrencesToCancel.add(occurrenceId);
    }
    expect(paymentResponse.status()).toBe(200);
    await expect(
      page.getByText(
        "Pago simulado correcto. La reserva quedó guardada en PostgreSQL.",
      ),
    ).toBeVisible();
    await checkoutDialog.getByRole("button", { name: "Cerrar" }).click();

    await page.reload();
    await expect(
      page.getByRole("button", { name: /Alex Vidal/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Agenda" }).click();
    await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();

    const newBooking = await findAgendaCard(
      page,
      "Entrenamiento personal",
      bookedDate,
    );
    expect(newBooking).not.toBeNull();
    await expect(
      newBooking.getByText("Confirmada", { exact: true }),
    ).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("un pago fallido libera la retención y mantiene la página operativa", async ({
    page,
  }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/");
    await selectClientProfile(page);
    await page.getByLabel("Servicio").selectOption({
      label: "Entrenamiento personal · Marina Ortega",
    });
    await page.getByLabel("Modalidad").selectOption("room");
    const dateInput = page.getByLabel("Fecha de inicio");
    const requestedDate = madridDateAfter(7);
    await dateInput.fill(requestedDate);
    await expect(dateInput).toHaveValue(requestedDate);
    await page
      .getByRole("button", { name: "Ver horarios disponibles" })
      .click();

    const checkoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/checkouts") &&
        response.request().method() === "POST",
    );
    await page.locator(".bf-slot-button").first().click();
    const checkoutResponse = await checkoutResponsePromise;
    expect(checkoutResponse.status()).toBe(201);
    const { data } = await checkoutResponse.json();
    const checkoutId = data?.checkoutId;
    if (typeof checkoutId !== "string") {
      throw new Error(
        "El checkout no devolvió un ID para limpiar la retención.",
      );
    }
    checkoutsToFail.add(checkoutId);
    expect(data?.occurrences?.[0]?.date).toBe(requestedDate);

    const failureResponsePromise = page.waitForResponse(
      (response) =>
        /\/api\/dev\/checkouts\/[^/]+\/pay$/.test(response.url()) &&
        response.request().method() === "POST",
    );
    const checkoutDialog = page.getByRole("dialog", {
      name: "Revisa tu reserva",
    });
    await checkoutDialog.getByRole("button", { name: "Simular fallo" }).click();
    const failureResponse = await failureResponsePromise;
    expect(failureResponse.status()).toBe(200);
    const failure = await failureResponse.json();
    expect(failure.data?.status).toBe("failed");
    checkoutsToFail.delete(checkoutId);

    await expect(checkoutDialog.getByText("Pago fallido")).toBeVisible();
    await expect(
      checkoutDialog.getByText("No se ha confirmado ni cobrado una reserva."),
    ).toBeVisible();
    await expect(page.locator("#bf-main")).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test("búsqueda vacía, foco por teclado y composición móvil sin desbordamiento", async ({
    page,
  }) => {
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Encuentra una sesión" }),
    ).toBeVisible();

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "Saltar al contenido" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();
    await skipLink.press("Enter");
    await expect(page.locator("#bf-main")).toBeVisible();

    const search = page.getByRole("textbox", {
      name: "¿Qué te gustaría hacer?",
    });
    await search.fill("sin-resultados-bookfit-e2e");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(
      page.getByText("No hay servicios para mostrar. Intenta otra búsqueda."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "BookFit, explorar" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Tu próxima sesión empieza/ }),
    ).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(search).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(
      dimensions.viewportWidth,
    );

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
