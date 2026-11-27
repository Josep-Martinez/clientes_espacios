import { randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import pg from "pg";
import {
  readLocalSupabaseStatus,
  requireLoopbackUrl,
} from "./lib/localSupabaseStatus.mjs";

const { Client } = pg;
const databaseName = `bookfit_test_${process.pid}_${randomBytes(4).toString("hex")}`;
const quotedDatabaseName = `"${databaseName}"`;
let created = false;
let currentStep = "leer la configuración local";
let adminUrl;
let testUrl;

function readEnv(contents, name) {
  const prefix = `${name}=`;
  const line = contents
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(prefix));
  return (
    line
      ?.slice(prefix.length)
      .trim()
      .replace(/^['"]|['"]$/g, "") ?? null
  );
}

async function applySchema() {
  const status = readLocalSupabaseStatus();
  const statusDatabaseUrl = status.DB_URL ?? status.DATABASE_URL;
  if (!statusDatabaseUrl) {
    throw new Error("Supabase local no devolvió una URL de PostgreSQL.");
  }
  const admin = requireLoopbackUrl(
    statusDatabaseUrl,
    "La conexión administrativa",
  );
  if (
    !["postgres:", "postgresql:"].includes(admin.protocol) ||
    admin.pathname.replace(/^\//, "") !== "postgres"
  ) {
    throw new Error(
      "La conexión administrativa no apunta a la base local esperada.",
    );
  }
  adminUrl = admin.toString();

  const localEnv = await readFile(".env.local", "utf8");
  const runtimeValue = readEnv(localEnv, "DATABASE_URL");
  if (!runtimeValue) {
    throw new Error(
      "Falta DATABASE_URL en .env.local; ejecuta `pnpm local:env`.",
    );
  }
  const runtime = requireLoopbackUrl(runtimeValue, "DATABASE_URL");
  if (
    !["postgres:", "postgresql:"].includes(runtime.protocol) ||
    runtime.hostname !== admin.hostname ||
    runtime.port !== admin.port ||
    decodeURIComponent(runtime.username) !== "bookfit_runtime" ||
    runtime.pathname.replace(/^\//, "") !== "postgres"
  ) {
    throw new Error(
      "DATABASE_URL debe usar el rol bookfit_runtime de la instancia local.",
    );
  }

  currentStep = "crear la base de integración desechable";
  const adminClient = new Client({
    connectionString: adminUrl,
    connectionTimeoutMillis: 5_000,
  });
  await adminClient.connect();
  try {
    await adminClient.query(
      `CREATE DATABASE ${quotedDatabaseName} TEMPLATE template0`,
    );
    created = true;
  } finally {
    await adminClient.end();
  }

  const targetAdmin = new URL(adminUrl);
  targetAdmin.pathname = `/${databaseName}`;
  const migrationClient = new Client({
    connectionString: targetAdmin.toString(),
    connectionTimeoutMillis: 5_000,
  });
  await migrationClient.connect();
  try {
    currentStep = "aplicar las migraciones versionadas";
    const migrationFiles = (await readdir("supabase/migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (const name of migrationFiles) {
      await migrationClient.query(
        await readFile(`supabase/migrations/${name}`, "utf8"),
      );
    }
    currentStep = "aplicar las semillas versionadas";
    await migrationClient.query(await readFile("supabase/seed.sql", "utf8"));
    await migrationClient.query(
      `GRANT CONNECT ON DATABASE ${quotedDatabaseName} TO bookfit_runtime`,
    );
  } finally {
    await migrationClient.end();
  }

  const testRuntime = new URL(runtime.toString());
  testRuntime.pathname = `/${databaseName}`;
  testUrl = testRuntime.toString();
}

async function dropDatabase() {
  if (!created || !adminUrl) return;
  const client = new Client({
    connectionString: adminUrl,
    connectionTimeoutMillis: 5_000,
  });
  await client.connect();
  try {
    await client.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()",
      [databaseName],
    );
    await client.query(`DROP DATABASE ${quotedDatabaseName}`);
    created = false;
  } finally {
    await client.end();
  }
}

try {
  await applySchema();
  process.stdout.write(
    "Pruebas de integración sobre una base local desechable.\n",
  );
  const result = spawnSync(
    process.execPath,
    [
      "--disable-warning=ExperimentalWarning",
      "--experimental-strip-types",
      "--test",
      "tests/integration/bookfit-api.test.mjs",
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        BOOKFIT_TEST_DATABASE_URL: testUrl,
      },
      stdio: "inherit",
    },
  );
  if (result.error)
    throw new Error("No se pudieron iniciar las pruebas de integración.");
  if (result.status !== 0) process.exitCode = result.status ?? 1;
} catch (error) {
  const detail = error instanceof Error ? error.message : "error desconocido";
  process.stderr.write(
    `Pruebas de integración bloqueadas al ${currentStep}: ${detail}\n`,
  );
  process.exitCode = 1;
} finally {
  try {
    await dropDatabase();
  } catch {
    process.stderr.write(
      `No se pudo eliminar la base temporal ${databaseName}; bórrala solo después de comprobar que no contiene datos necesarios.\n`,
    );
    process.exitCode = 1;
  }
}
