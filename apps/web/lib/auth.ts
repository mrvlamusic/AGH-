import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { Actor, audit, ensure, State } from "@cubpay/core";
const derive = promisify(scrypt);
export const COOKIE = "cubpay_session";
export const digest = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export function safeEqual(a: string, b: string) {
  return timingSafeEqual(Buffer.from(digest(a)), Buffer.from(digest(b)));
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await derive(password, salt, 64)) as Buffer;
  return salt + ":" + key.toString("hex");
}
export async function verifyPassword(password: string, encoded: string) {
  const [salt, hash] = encoded.split(":");
  if (!salt || !hash) return false;
  const key = (await derive(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}
export function passwordInput(value: unknown) {
  ensure(
    typeof value === "string" && value.length >= 12 && value.length <= 128,
    "PASSWORD_LENGTH",
  );
  return value;
}
export function textInput(value: unknown, max = 200) {
  ensure(
    typeof value === "string" &&
      value.trim().length > 0 &&
      value.trim().length <= max,
    "INVALID_INPUT",
  );
  return value.trim();
}
export function emailInput(value: unknown) {
  const email = textInput(value, 254).toLowerCase();
  ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), "INVALID_EMAIL");
  return email;
}
export function issueSession(state: State, actor: Actor) {
  const token = randomBytes(32).toString("hex"),
    now = Date.now();
  state.sessions = state.sessions.filter(
    (s) => s.expiresAt > now && s.actor.id !== actor.id,
  );
  state.sessions.push({
    tokenHash: digest(token),
    actor,
    expiresAt: now + 8 * 60 * 60 * 1000,
  });
  return token;
}
export function actorFor(state: State, token?: string): Actor {
  ensure(token, "UNAUTHENTICATED", 401);
  const session = state.sessions.find(
    (s) => s.tokenHash === digest(token) && s.expiresAt > Date.now(),
  );
  ensure(session, "UNAUTHENTICATED", 401);
  return session.actor;
}
export function newInvite(state: State, actor: Actor, at: string) {
  ensure(actor.role === "ADMIN", "FORBIDDEN", 403);
  const token = "CP-" + randomBytes(18).toString("hex");
  const id = randomUUID();
  state.invites.push({
    id,
    tokenHash: digest(token),
    expiresAt: Date.now() + 7 * 86400000,
  });
  audit(
    state,
    actor,
    "INVITE_CREATED",
    id,
    "Invitación de un uso; caduca en 7 días",
    at,
  );
  return token;
}
// Rate-limit counters are committed even when authentication fails.
export function throttle(state: State, key: string) {
  const now = Date.now();
  for (const [k, value] of Object.entries(state.attempts))
    if (value.until <= now) delete state.attempts[k];
  const bucket = (state.attempts[key] ??= {
    count: 0,
    until: now + 15 * 60 * 1000,
  });
  if (bucket.count >= 10) return false;
  bucket.count++;
  return true;
}
