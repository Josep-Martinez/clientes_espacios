import { randomUUID } from "node:crypto";
import {
  readLocalSupabaseStatus,
  requireLoopbackUrl,
} from "./lib/localSupabaseStatus.mjs";

const status = readLocalSupabaseStatus();
const apiValue = status.API_URL ?? status.SUPABASE_URL;
const publicKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const publicAuthToken = status.PUBLISHABLE_KEY ? null : status.ANON_KEY;
const serviceKey = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
const serviceAuthToken = status.SERVICE_ROLE_KEY;
if (!apiValue || !publicKey || !serviceKey) {
  throw new Error(
    "La CLI no devolvió las URLs y claves locales de Auth; comprueba que API y Auth están habilitados.",
  );
}
const apiUrl = requireLoopbackUrl(apiValue, "La URL de Supabase");
if (apiUrl.protocol !== "http:") {
  throw new Error("La URL de Supabase local debe usar HTTP.");
}

const email = `bookfit-auth-${randomUUID()}@example.test`;
const password = `Bf-${randomUUID()}`;
let userId;

async function request(
  path,
  { key = publicKey, token = publicAuthToken, ...options } = {},
) {
  return fetch(new URL(path, apiUrl), {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
    headers: {
      apikey: key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

async function deleteTestUser() {
  if (!userId) return;
  const response = await request(`/auth/v1/admin/users/${userId}`, {
    key: serviceKey,
    token: serviceAuthToken,
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(
      `No se pudo eliminar el usuario Auth temporal (HTTP ${response.status}).`,
    );
  }
}

try {
  const signup = await request("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!signup.ok) {
    const error = await readJson(signup);
    const code =
      isRecord(error) &&
      typeof error.error_code === "string" &&
      /^[a-z_]{1,60}$/.test(error.error_code)
        ? `, ${error.error_code}`
        : "";
    throw new Error(
      `El registro local de Auth falló (HTTP ${signup.status}${code}).`,
    );
  }
  const signupPayload = await readJson(signup);
  if (isRecord(signupPayload) && isRecord(signupPayload.user)) {
    userId =
      typeof signupPayload.user.id === "string"
        ? signupPayload.user.id
        : undefined;
  }
  if (!userId) throw new Error("Auth no devolvió el ID del usuario temporal.");

  const login = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) {
    throw new Error(
      `El inicio de sesión local de Auth falló (HTTP ${login.status}); confirma que los emails estén desactivados para esta prueba.`,
    );
  }
  const loginPayload = await readJson(login);
  if (
    !isRecord(loginPayload) ||
    typeof loginPayload.access_token !== "string"
  ) {
    throw new Error("Auth no devolvió una sesión de acceso válida.");
  }

  const privateSchema = await request("/rest/v1/actors?select=id", {
    headers: { "Accept-Profile": "bookfit" },
  });
  if (privateSchema.status !== 406) {
    throw new Error(
      `La API no rechazó el esquema privado bookfit como se esperaba (HTTP ${privateSchema.status}).`,
    );
  }

  const logout = await request("/auth/v1/logout", {
    method: "POST",
    token: loginPayload.access_token,
  });
  if (!logout.ok) {
    throw new Error(
      `El cierre de sesión local de Auth falló (HTTP ${logout.status}).`,
    );
  }
} finally {
  await deleteTestUser();
}

process.stdout.write(
  "Auth local pasó: registro, inicio/cierre de sesión, clave pública y esquema BookFit privado. Usuario temporal eliminado.\n",
);
