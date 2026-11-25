import { randomBytes } from "node:crypto";
import { chmod, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const status = spawnSync(
  "pnpm",
  ["exec", "supabase", "status", "--output", "env"],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

if (status.status !== 0) {
  process.stderr.write(
    "Supabase local no responde. Inicia BuqFit local y aplica las migraciones antes de configurar el entorno.\n",
  );
  process.exit(status.status ?? 1);
}

const env = Object.fromEntries(
  status.stdout.split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, "")]] : [];
  }),
);
const migrationUrl = env.DB_URL ?? env.DATABASE_URL;
if (!migrationUrl) throw new Error("Supabase status no devolvió DB_URL.");

const adminUrl = new URL(migrationUrl);
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(adminUrl.hostname)) {
  throw new Error(
    "La base dev debe estar en loopback. Se rechazó una conexión remota.",
  );
}

const password = randomBytes(32).toString("hex");
const configured = spawnSync(
  "psql",
  [
    adminUrl.toString(),
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    `ALTER ROLE buqfit_runtime WITH LOGIN PASSWORD '${password}'`,
  ],
  { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] },
);
if (configured.status !== 0) {
  process.stderr.write(
    "No se pudo configurar la credencial de ejecución buqfit_runtime. Comprueba que la migración ya se aplicó.\n",
  );
  process.exit(configured.status ?? 1);
}

const runtimeUrl = new URL(migrationUrl);
runtimeUrl.username = "buqfit_runtime";
runtimeUrl.password = password;
const localEnv = [
  "# Generated locally. Do not commit or copy these credentials to VITE_* variables.",
  `DATABASE_URL=${runtimeUrl.toString()}`,
  "NODE_ENV=development",
  "API_HOST=127.0.0.1",
  "API_PORT=3001",
  "BUQFIT_DEV_PROFILES=true",
  "BUQFIT_PAYMENT_MODE=fake",
  "SESSION_TTL_HOURS=168",
  "",
].join("\n");
const target = resolve(process.cwd(), ".env.local");
await writeFile(target, localEnv, { mode: 0o600 });
await chmod(target, 0o600);
process.stdout.write(
  "Entorno local escrito en .env.local; la API usará buqfit_runtime.\n",
);
