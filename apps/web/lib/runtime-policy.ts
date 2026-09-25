import { ensure } from "@cubpay/core";

/** Hosted staging is deliberately still sandbox-only. No live rail exists. */
export function assertRuntimePolicy(env: NodeJS.ProcessEnv = process.env) {
  ensure(
    !env.CUBPAY_MODE || env.CUBPAY_MODE === "sandbox",
    "LIVE_MODE_DISABLED",
    503,
  );
  ensure(
    !env.CUBPAY_DEPLOYMENT ||
      ["local", "staging"].includes(env.CUBPAY_DEPLOYMENT),
    "INVALID_DEPLOYMENT",
    503,
  );
  if (env.CUBPAY_DEPLOYMENT === "staging" || env.VERCEL) {
    ensure(env.DATABASE_URL, "DATABASE_REQUIRED", 503);
    let origin: URL;
    try {
      origin = new URL(env.APP_ORIGIN || "");
    } catch {
      throw new Error("INVALID_PUBLIC_ORIGIN");
    }
    ensure(
      origin.protocol === "https:" &&
        origin.origin === env.APP_ORIGIN &&
        !origin.username &&
        !origin.password,
      "INVALID_PUBLIC_ORIGIN",
      503,
    );
    ensure(
      env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.length >= 24,
      "WEAK_ADMIN_SECRET",
      503,
    );
    ensure(
      env.ADMIN_EMAIL && !env.ADMIN_EMAIL.endsWith(".local"),
      "INVALID_ADMIN_EMAIL",
      503,
    );
  }
}
export function assertOperationsEnabled(
  path: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (path === "auth/login" || path === "auth/logout") return;
  ensure(env.CUBPAY_OPERATIONS_PAUSED !== "true", "OPERATIONS_PAUSED", 503);
}
