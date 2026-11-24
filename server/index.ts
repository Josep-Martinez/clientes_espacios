import { createApp } from "./app.ts";
import { readServerConfig } from "./config.ts";
import { createPool } from "./db.ts";

const config = readServerConfig();
const pool = createPool(config);
const app = createApp(pool, config);

try {
  await pool.query("SELECT 1 FROM bookfit.actors LIMIT 1");
  await app.listen({ host: config.host, port: config.port });
  process.stdout.write(
    `BookFit API disponible en http://${config.host}:${config.port}\n`,
  );
} catch {
  process.stderr.write(
    "No se pudo iniciar BookFit API. Comprueba Supabase local, migraciones y .env.local.\n",
  );
  await pool.end();
  process.exitCode = 1;
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await app.close();
    await pool.end();
    process.exit(0);
  });
}
