import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { transaction } from "../../apps/web/lib/store";
import { runMatching, seedDemo } from "@cubpay/core";
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "cubpay-store-"));
  process.env.CUBPAY_DATA_FILE = join(directory, "state.json");
  delete process.env.DATABASE_URL;
  delete process.env.VERCEL;
});
afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
  delete process.env.CUBPAY_DATA_FILE;
});
describe("file transactions", () => {
  it("serializes concurrent matching and survives fresh reads", async () => {
    await transaction((s) =>
      seedDemo(s, { id: "admin", role: "ADMIN" }, new Date().toISOString()),
    );
    await Promise.all(
      Array.from({ length: 12 }, () =>
        transaction((s) =>
          runMatching(
            s,
            { id: "admin", role: "ADMIN" },
            new Date().toISOString(),
          ),
        ),
      ),
    );
    const s = await transaction((s) => s);
    expect(s.allocations).toHaveLength(5);
    expect(s.orders.every((o) => o.matchedMinor === o.amountMinor)).toBe(true);
    expect(
      JSON.parse(await readFile(process.env.CUBPAY_DATA_FILE!, "utf8"))
        .allocations,
    ).toHaveLength(5);
  });
  it("rolls back partial mutations on failure", async () => {
    await transaction(() => null);
    await expect(
      transaction((s) => {
        s.attempts.bad = { count: 1, until: 999 };
        throw Error("abort");
      }),
    ).rejects.toThrow("abort");
    expect((await transaction((s) => s)).attempts).toEqual({});
  });
  it("refuses ephemeral file storage on Vercel", async () => {
    process.env.VERCEL = "1";
    await expect(transaction((s) => s)).rejects.toThrow("DATABASE_REQUIRED");
  });
});
