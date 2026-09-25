import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { emptyState, ensure, State } from "@cubpay/core";

// A single row lock serializes all domain commands across application instances.
// This intentionally favors correctness over throughput for the sandbox MVP.
const globals = globalThis as typeof globalThis & { cubpayPool?: Pool };
function pool() {
  return (globals.cubpayPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
    idle_in_transaction_session_timeout: 15000,
  }));
}
function validate(value: unknown): State {
  const s = value as State;
  ensure(
    s?.version === 1 &&
      [
        "organizations",
        "orders",
        "allocations",
        "batches",
        "journals",
        "audit",
        "users",
        "sessions",
        "invites",
      ].every((k) => Array.isArray(s[k as keyof State])) &&
      !!s.attempts,
    "INVALID_STORE",
    503,
  );
  return s;
}
export async function transaction<T>(
  operation: (state: State) => T | Promise<T>,
): Promise<T> {
  if (process.env.DATABASE_URL) {
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "SELECT payload FROM cubpay_sandbox_state WHERE id = 1 FOR UPDATE",
      );
      ensure(result.rowCount === 1, "DATABASE_NOT_INITIALIZED", 503);
      const state = validate(result.rows[0].payload);
      const value = await operation(state);
      await client.query(
        "UPDATE cubpay_sandbox_state SET payload = $1::jsonb, updated_at = now() WHERE id = 1",
        [JSON.stringify(state)],
      );
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  ensure(!process.env.VERCEL, "DATABASE_REQUIRED", 503);
  const filename = resolve(
    process.env.CUBPAY_DATA_FILE || ".cubpay/state.json",
  );
  await mkdir(dirname(filename), { recursive: true, mode: 0o700 });
  // Exclusive file lock also protects concurrent local server processes.
  // A crash leaves a lock: fail closed; documented recovery requires stopping servers.
  let lock;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      lock = await open(filename + ".lock", "wx", 0o600);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      await new Promise((r) => setTimeout(r, 30));
    }
  }
  ensure(lock, "STORE_BUSY", 503);
  const temporary = filename + "." + randomUUID() + ".tmp";
  try {
    let state: State;
    try {
      state = validate(JSON.parse(await readFile(filename, "utf8")));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      state = emptyState();
    }
    const value = await operation(state);
    const output = await open(temporary, "wx", 0o600);
    try {
      await output.writeFile(JSON.stringify(state));
      await output.sync();
    } finally {
      await output.close();
    }
    await rename(temporary, filename);
    return value;
  } finally {
    await unlink(temporary).catch(() => {});
    await lock.close();
    await unlink(filename + ".lock");
  }
}
