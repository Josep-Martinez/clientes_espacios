import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync(".env.local")) {
  process.stdout.write("Configurando credenciales locales de BookFit…\n");
  const setup = spawnSync("pnpm", ["local:env"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (setup.status !== 0) {
    process.stderr.write(
      "No se pudo preparar .env.local. Comprueba que Supabase local está iniciado y con migraciones aplicadas.\n",
    );
    process.exit(setup.status ?? 1);
  }
}

async function isBookFitApiAvailable() {
  const apiUrl = `http://127.0.0.1:${process.env.API_PORT ?? 3001}/api/health`;
  const response = await fetch(apiUrl, {
    signal: AbortSignal.timeout(500),
  });
  if (!response.ok) return false;
  const payload = await response.json();
  return payload?.success === true && payload?.data?.service === "BookFit API";
}

async function isBookFitWebAvailable() {
  const webUrl = `http://127.0.0.1:${process.env.VITE_PORT ?? 5173}/`;
  const response = await fetch(webUrl, {
    signal: AbortSignal.timeout(500),
  });
  if (!response.ok) return false;
  const html = await response.text();
  return html.includes("BookFit") && html.includes("/src/main.tsx");
}

let reuseApi = false;
let reuseWeb = false;
try {
  reuseApi = await isBookFitApiAvailable();
} catch {
  // No API is listening yet; start the normal local server below.
}
try {
  reuseWeb = await isBookFitWebAvailable();
} catch {
  // No BookFit web server is listening yet; start Vite below.
}

if (reuseApi) {
  process.stdout.write(
    `API BookFit ya disponible en 127.0.0.1:${process.env.API_PORT ?? 3001}; se reutiliza.\n`,
  );
}
if (reuseWeb) {
  process.stdout.write(
    `BookFit web ya disponible en 127.0.0.1:${process.env.VITE_PORT ?? 5173}; se reutiliza.\n`,
  );
}

const scripts = [
  ...(reuseApi ? [] : ["dev:api"]),
  ...(reuseWeb ? [] : ["dev:web"]),
];
if (scripts.length === 0) process.exit(0);

const children = scripts.map((script) =>
  spawn("pnpm", ["run", script], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  }),
);

let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill(signal);
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
for (const child of children) {
  child.on("error", (error) => {
    process.stderr.write(
      `No se pudo iniciar un proceso local: ${error.message}\n`,
    );
    stop();
  });
  child.on("exit", (code) => {
    if (!stopping && code !== 0) stop();
  });
}
