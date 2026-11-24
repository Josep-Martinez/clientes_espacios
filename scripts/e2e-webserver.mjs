import { spawn } from "node:child_process";

const api = spawn(
  process.execPath,
  [
    "--disable-warning=ExperimentalWarning",
    "--experimental-strip-types",
    "server/index.ts",
  ],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  },
);
const web = spawn(
  "pnpm",
  [
    "exec",
    "vite",
    "--host",
    "127.0.0.1",
    "--port",
    process.env.VITE_PORT ?? "5173",
  ],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  },
);
const children = [api, web];
let stopping = false;

function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill(signal);
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stop(signal));
}

for (const child of children) {
  child.on("error", (error) => {
    process.stderr.write(
      `No se pudo iniciar el servidor E2E: ${error.message}\n`,
    );
    process.exitCode = 1;
    stop();
  });
  child.on("exit", (code, signal) => {
    if (stopping) return;
    process.exitCode = code ?? (signal ? 1 : 0);
    stop();
  });
}
