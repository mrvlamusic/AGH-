import { afterAll, expect, it } from "vitest";
import pg from "pg";
import { readFile } from "node:fs/promises";
import { emptyState, runMatching, seedDemo } from "@cubpay/core";
import { transaction } from "../../apps/web/lib/store";
const connection = process.env.TEST_DATABASE_URL;
it.skipIf(!connection)(
  "PostgreSQL serializes concurrent commands and rolls back failed transactions",
  async () => {
    process.env.DATABASE_URL = connection;
    const client = new pg.Client({ connectionString: connection });
    await client.connect();
    try {
      await client.query(await readFile("database/001_sandbox.sql", "utf8"));
      await client.query(
        "UPDATE cubpay_sandbox_state SET payload=$1::jsonb WHERE id=1",
        [JSON.stringify(emptyState())],
      );
      await transaction((s) =>
        seedDemo(s, { id: "a", role: "ADMIN" }, "2026-01-01"),
      );
      await Promise.all(
        Array.from({ length: 12 }, () =>
          transaction((s) =>
            runMatching(s, { id: "a", role: "ADMIN" }, "2026-01-01"),
          ),
        ),
      );
      expect((await transaction((s) => s)).allocations).toHaveLength(5);
      await expect(
        transaction((s) => {
          s.orders = [];
          throw Error("rollback");
        }),
      ).rejects.toThrow();
      expect((await transaction((s) => s)).orders).toHaveLength(6);
    } finally {
      await client.end();
      delete process.env.DATABASE_URL;
    }
  },
);
afterAll(async () => {
  const globals = globalThis as typeof globalThis & { cubpayPool?: pg.Pool };
  if (globals.cubpayPool) {
    await globals.cubpayPool.end();
    delete globals.cubpayPool;
  }
});
