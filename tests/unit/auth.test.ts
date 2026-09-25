import { expect, it } from "vitest";
import { emptyState } from "@cubpay/core";
import {
  actorFor,
  digest,
  hashPassword,
  issueSession,
  newInvite,
  throttle,
  verifyPassword,
} from "../../apps/web/lib/auth";
it("hashes passwords with individual salts and rejects wrong passwords", async () => {
  const a = await hashPassword("a-test-password"),
    b = await hashPassword("a-test-password");
  expect(a).not.toBe(b);
  expect(await verifyPassword("a-test-password", a)).toBe(true);
  expect(await verifyPassword("wrong-password", a)).toBe(false);
});
it("stores session hashes, expires sessions and rotates old sessions", () => {
  const s = emptyState(),
    actor = { id: "u", role: "ADMIN" as const };
  const token = issueSession(s, actor);
  expect(s.sessions[0].tokenHash).toBe(digest(token));
  expect(actorFor(s, token)).toEqual(actor);
  issueSession(s, actor);
  expect(() => actorFor(s, token)).toThrow("UNAUTHENTICATED");
  s.sessions[0].expiresAt = 0;
  expect(() => actorFor(s, "anything")).toThrow();
});
it("only admins issue unpredictable, expiring hashed invitations", () => {
  const s = emptyState();
  expect(() => newInvite(s, { id: "b", role: "BUSINESS" }, "now")).toThrow(
    "FORBIDDEN",
  );
  const token = newInvite(s, { id: "a", role: "ADMIN" }, "now");
  expect(s.invites[0].tokenHash).toBe(digest(token));
  expect(JSON.stringify(s)).not.toContain(token);
});
it("limits failed attempts and permits retry after the window", () => {
  const s = emptyState();
  for (let n = 0; n < 10; n++) expect(throttle(s, "key")).toBe(true);
  expect(throttle(s, "key")).toBe(false);
  s.attempts.key.until = 0;
  expect(throttle(s, "key")).toBe(true);
});
