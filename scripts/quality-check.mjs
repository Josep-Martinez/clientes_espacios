import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const pnpm = isWindows ? "pnpm.cmd" : "pnpm";
const steps = [
  { name: "Instalación reproducible", args: ["install", "--frozen-lockfile"] },
  { name: "Formato", args: ["format:check"] },
  { name: "Lint", args: ["lint"] },
  { name: "Tipos Supabase", args: ["supabase:types:check"] },
  { name: "TypeScript", args: ["typecheck"] },
  { name: "Pruebas unitarias", args: ["test"] },
  { name: "Pruebas de integración", args: ["test:integration"] },
  {
    name: "Pruebas SQL",
    args: ["test:db"],
    env: { SUPABASE_TELEMETRY_DISABLED: "1" },
  },
  { name: "Auth de Supabase local", args: ["test:auth:local"] },
  { name: "Build", args: ["build"] },
  { name: "Seguridad", args: ["security:check"] },
];

const failures = [];
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
    failures.push(step.name);
    continue;
  }
  if (result.status !== 0) {
    process.stderr.write(`${step.name} falló.\n`);
    failures.push(step.name);
  }
}

if (failures.length > 0) {
  process.stderr.write(`\nQuality gate falló: ${failures.join(", ")}.\n`);
  process.exit(1);
}

process.stdout.write("\nQuality gate completado.\n");
