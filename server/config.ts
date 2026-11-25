import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadLocalEnvironment(): void {
  try {
    const contents = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export interface ServerConfig {
  nodeEnv: string;
  host: string;
  port: number;
  databaseUrl: string;
  devProfiles: boolean;
  paymentMode: "fake" | "disabled";
  sessionTtlHours: number;
  appOrigins: string[];
}

export function readServerConfig(): ServerConfig {
  loadLocalEnvironment();
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const devProfiles = process.env.BUQFIT_DEV_PROFILES === "true";
  const paymentMode =
    process.env.BUQFIT_PAYMENT_MODE ??
    (nodeEnv === "production" ? "disabled" : "fake");
  if (!["fake", "disabled"].includes(paymentMode)) {
    throw new Error(
      "Stripe is not installed in this phase. BUQFIT_PAYMENT_MODE must be fake or disabled.",
    );
  }
  if (nodeEnv === "production" && (devProfiles || paymentMode === "fake")) {
    throw new Error(
      "Production cannot start with demo profiles or fake payments enabled.",
    );
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl)
    throw new Error(
      "DATABASE_URL is missing. Run `pnpm local:env` after the local database reset.",
    );
  const databaseHost = new URL(databaseUrl).hostname.replace(/^\[|\]$/g, "");
  if (
    nodeEnv !== "production" &&
    !["127.0.0.1", "localhost", "::1"].includes(databaseHost)
  ) {
    throw new Error(
      "Development DATABASE_URL must point to a loopback database.",
    );
  }
  const port = Number(process.env.API_PORT ?? 3001);
  const host = process.env.API_HOST ?? "127.0.0.1";
  if (
    !["127.0.0.1", "localhost", "::1"].includes(host.replace(/^\[|\]$/g, ""))
  ) {
    throw new Error("This local phase only binds the API to loopback.");
  }
  const sessionTtlHours = Number(process.env.SESSION_TTL_HOURS ?? 168);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("API_PORT is invalid.");
  if (
    !Number.isInteger(sessionTtlHours) ||
    sessionTtlHours < 1 ||
    sessionTtlHours > 720
  ) {
    throw new Error("SESSION_TTL_HOURS must be between 1 and 720.");
  }
  return {
    nodeEnv,
    host,
    port,
    databaseUrl,
    devProfiles,
    paymentMode: paymentMode as ServerConfig["paymentMode"],
    sessionTtlHours,
    appOrigins: (
      process.env.APP_ORIGINS ?? "http://127.0.0.1:5173,http://localhost:5173"
    )
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}
