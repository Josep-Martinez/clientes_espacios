import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseStatusEnv,
  requireLoopbackUrl,
} from "../scripts/lib/localSupabaseStatus.mjs";

test("parseStatusEnv lee variables emitidas por Supabase CLI", () => {
  assert.deepEqual(
    parseStatusEnv("API_URL='http://127.0.0.1:55431'\nANON_KEY=local-key\n"),
    {
      API_URL: "http://127.0.0.1:55431",
      ANON_KEY: "local-key",
    },
  );
});

test("requireLoopbackUrl admite solo hosts de loopback", () => {
  assert.equal(
    requireLoopbackUrl("postgresql://localhost:55432/postgres", "DB").hostname,
    "localhost",
  );
  assert.throws(
    () =>
      requireLoopbackUrl(
        "https://bookfit.example.supabase.co",
        "La URL de Supabase",
      ),
    /loopback/,
  );
});
