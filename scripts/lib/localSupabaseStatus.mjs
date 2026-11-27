import { spawnSync } from "node:child_process";

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export function parseStatusEnv(output) {
  return Object.fromEntries(
    output.split(/\r?\n/).flatMap((line) => {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) return [];
      return [[match[1], match[2].replace(/^['"]|['"]$/g, "")]];
    }),
  );
}

export function requireLoopbackUrl(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} no es una URL válida.`);
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error(`${label} debe apuntar a Supabase local en loopback.`);
  }
  return parsed;
}

export function readLocalSupabaseStatus() {
  const result = spawnSync(
    pnpmCommand,
    ["exec", "supabase", "status", "--output", "env"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" },
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (result.error || result.status !== 0) {
    throw new Error(
      "No se pudo leer el estado de Supabase local. Inicia la pila con `pnpm local:start` y comprueba Docker.",
    );
  }
  return parseStatusEnv(result.stdout);
}
