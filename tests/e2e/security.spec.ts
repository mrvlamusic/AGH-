import { test, expect } from "@playwright/test";
const origin = "http://localhost:3100";
test("readiness, request validation and private endpoints fail closed", async ({
  request,
}) => {
  expect((await request.get("/api/ready")).status()).toBe(200);
  expect((await request.get("/api/state")).status()).toBe(401);
  const wrongOrigin = await request.post("/api/auth/login", {
    headers: { Origin: "https://attacker.example" },
    data: { email: "admin@cubpay.test", password: "test-password-only-12345" },
  });
  expect(wrongOrigin.status()).toBe(403);
  const malformed = await request.post("/api/auth/login", {
    headers: { Origin: origin, "Content-Type": "application/json" },
    data: "{broken",
  });
  expect(malformed.status()).toBe(400);
  const array = await request.post("/api/auth/login", {
    headers: { Origin: origin },
    data: [],
  });
  expect(array.status()).toBe(400);
  const oversized = await request.post("/api/auth/login", {
    headers: { Origin: origin },
    data: { payload: "x".repeat(17000) },
  });
  expect(oversized.ok()).toBe(false);
  const unknown = await request.post("/api/unrecognized", {
    headers: { Origin: origin },
    data: {},
  });
  expect(unknown.status()).toBe(401);
  const login = await request.post("/api/auth/login", {
    headers: { Origin: origin },
    data: { email: "admin@cubpay.test", password: "test-password-only-12345" },
  });
  expect(login.status()).toBe(200);
  const cookie = login.headers()["set-cookie"];
  expect(cookie).toContain("HttpOnly");
  expect(cookie.toLowerCase()).toContain("samesite=strict");
  const state = await request.get("/api/state");
  expect(state.headers()["cache-control"]).toContain("no-store");
  const body = await state.json();
  for (const name of ["users", "sessions", "attempts", "invites"])
    expect(body).not.toHaveProperty(name);
  expect(
    (
      await request.post("/api/unrecognized", {
        headers: { Origin: origin },
        data: {},
      })
    ).status(),
  ).toBe(404);
});
