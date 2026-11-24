import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const pnpm = isWindows ? "pnpm.cmd" : "pnpm";
const audit = spawnSync(pnpm, ["audit", "--audit-level", "high"], {
  cwd: process.cwd(),
  stdio: "inherit",
  shell: isWindows,
});
if (audit.error || audit.status !== 0) {
  process.stderr.write(
    "La auditoría de dependencias encontró un bloqueo o no pudo completarse.\n",
  );
  process.exit(audit.status ?? 1);
}

const secretScan = spawnSync(pnpm, ["exec", "secretlint", "."], {
  cwd: process.cwd(),
  encoding: "utf8",
  shell: isWindows,
  maxBuffer: 10 * 1024 * 1024,
});
if (secretScan.error || secretScan.status !== 0) {
  process.stderr.write(
    "El análisis de secretos detectó una posible credencial o no pudo completarse. Revisa los archivos con `pnpm exec secretlint .`; este job oculta el contenido coincidente.\n",
  );
  process.exit(secretScan.status ?? 1);
}
process.stdout.write(
  "Auditoría de dependencias y análisis de secretos completados.\n",
);
