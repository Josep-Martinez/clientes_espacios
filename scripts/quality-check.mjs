import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const pnpm = isWindows ? "pnpm.cmd" : "pnpm";
const steps = [
  { name: "Formato", args: ["format:check"] },
  { name: "Lint", args: ["lint"] },
  { name: "Tipos Supabase", args: ["supabase:types:check"] },
  { name: "TypeScript", args: ["typecheck"] },
  { name: "Pruebas unitarias", args: ["test"] },
  {
    name: "Pruebas de integración",
    args: ["test:integration"],
    env: { BOOKFIT_REQUIRE_INTEGRATION: "true" },
  },
  {
    name: "Pruebas SQL",
    args: ["test:db"],
    env: { SUPABASE_TELEMETRY_DISABLED: "1" },
  },
  { name: "Build", args: ["build"] },
  { name: "Seguridad", args: ["security:check"] },
];

for (const step of steps) {
  process.stdout.write(`\n== ${step.name} ==\n`);
  const result = spawnSync(pnpm, step.args, {
    cwd: process.cwd(),
    env: { ...process.env, ...step.env },
    stdio: "inherit",
    shell: isWindows,
  });
  if (result.error) {
    process.stderr.write(`${step.name} no pudo iniciarse.\n`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.stderr.write(`${step.name} falló.\n`);
    process.exit(result.status ?? 1);
  }
}

process.stdout.write("\nQuality gate completado.\n");
