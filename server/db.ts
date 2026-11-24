import pg, { type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import type { ServerConfig } from "./config.ts";

const { Pool } = pg;

export function createPool(config: ServerConfig): pg.Pool {
  return new Pool({
    connectionString: config.databaseUrl,
    max: 8,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 4_000,
    statement_timeout: 5_000,
    application_name: "bookfit-local-api",
  });
}

export async function inTransaction<T>(
  pool: pg.Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type { PoolClient, QueryResult, QueryResultRow };
