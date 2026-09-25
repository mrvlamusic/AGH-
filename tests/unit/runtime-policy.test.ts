import { expect, it } from "vitest";
import {
  assertRuntimePolicy,
  assertOperationsEnabled,
} from "../../apps/web/lib/runtime-policy";
const staging = {
  CUBPAY_DEPLOYMENT: "staging",
  CUBPAY_MODE: "sandbox",
  DATABASE_URL: "postgres://example",
  APP_ORIGIN: "https://demo.example.test",
  ADMIN_EMAIL: "operator@example.test",
  ADMIN_PASSWORD: "a-long-random-secret-for-tests",
};
it("refuses live payments even with otherwise valid hosted configuration", () => {
  expect(() =>
    assertRuntimePolicy({ ...staging, CUBPAY_MODE: "live" }),
  ).toThrow("LIVE_MODE_DISABLED");
});
it("requires durable storage, HTTPS and strong operator configuration on hosted staging", () => {
  expect(() => assertRuntimePolicy(staging)).not.toThrow();
  for (const patch of [
    { DATABASE_URL: "" },
    { APP_ORIGIN: "http://demo.example.test" },
    { APP_ORIGIN: "https://demo.example.test/path" },
    { ADMIN_PASSWORD: "short" },
    { ADMIN_EMAIL: "admin@cubpay.local" },
  ])
    expect(() => assertRuntimePolicy({ ...staging, ...patch })).toThrow();
});
it("pause preserves sign in/out but rejects every write path including registration and unknown paths", () => {
  const env = { CUBPAY_OPERATIONS_PAUSED: "true" };
  for (const p of ["auth/login", "auth/logout"])
    expect(() => assertOperationsEnabled(p, env)).not.toThrow();
  for (const p of [
    "orders",
    "auth/register",
    "invites",
    "matching",
    "batches/confirm",
    "anything",
  ])
    expect(() => assertOperationsEnabled(p, env)).toThrow("OPERATIONS_PAUSED");
});
