import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import prettier from "prettier";

const target = resolve("src/types/database.types.ts");
const checkOnly = process.argv.includes("--check");
const result = spawnSync(
  "pnpm",
  [
    "exec",
    "supabase",
    "gen",
    "types",
    "typescript",
    "--local",
    "--schema",
    "buqfit",
  ],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" },
    maxBuffer: 20 * 1024 * 1024,
  },
);

if (
  result.error ||
  result.status !== 0 ||
  !result.stdout.includes("export type Database")
) {
  process.stderr.write(
    "No se pudieron generar los tipos. Comprueba que Supabase local está iniciado y con migraciones aplicadas.\n",
  );
  process.exit(result.status ?? 1);
}

const generated = await prettier.format(result.stdout, {
  parser: "typescript",
});
if (checkOnly) {
  let current;
  try {
    current = await readFile(target, "utf8");
  } catch {
    process.stderr.write(
      "Faltan los tipos versionados. Ejecuta `pnpm supabase:types`.\n",
    );
    process.exit(1);
  }
  if (current !== generated) {
    process.stderr.write(
      "Los tipos de Supabase están desactualizados. Ejecuta `pnpm supabase:types` y guarda el resultado.\n",
    );
    process.exit(1);
  }
  process.stdout.write("Los tipos versionados coinciden con Supabase local.\n");
} else {
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, generated, { mode: 0o644 });
  process.stdout.write(
    "Tipos TypeScript generados desde el esquema local buqfit.\n",
  );
}
