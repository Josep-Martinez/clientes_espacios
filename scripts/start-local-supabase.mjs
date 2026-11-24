import { spawn, spawnSync } from "node:child_process";

const networkName = "bookfit-local";
const inspect = spawnSync("docker", ["network", "inspect", networkName], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

if (inspect.status !== 0) {
  const created = spawnSync(
    "docker",
    [
      "network",
      "create",
      "--driver",
      "bridge",
      "--opt",
      "com.docker.network.bridge.host_binding_ipv4=127.0.0.1",
      networkName,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (created.status !== 0) {
    process.stderr.write(
      `No se pudo preparar la red Docker local de BookFit: ${created.stderr.trim()}\n`,
    );
    process.exit(created.status ?? 1);
  }
} else {
  try {
    const [network] = JSON.parse(inspect.stdout);
    if (
      network?.Options?.["com.docker.network.bridge.host_binding_ipv4"] !==
      "127.0.0.1"
    ) {
      throw new Error(
        `La red existente ${networkName} no limita los puertos publicados a 127.0.0.1.`,
      );
    }
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : "No se pudo validar la red Docker local."}\n`,
    );
    process.exit(1);
  }
}

const child = spawn(
  "pnpm",
  ["exec", "supabase", "start", "--network-id", networkName],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  process.stderr.write(`No se pudo ejecutar Supabase CLI: ${error.message}\n`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
