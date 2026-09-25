// Read-only smoke probe. Never sends credentials or performs domain commands.
const origin = process.argv[2];
if (!origin)
  throw Error(
    "Usage: node scripts/staging-check.mjs https://your-staging-host",
  );
const url = new URL(origin);
if (url.origin !== origin || url.username || url.password)
  throw Error("Use an origin without a path or credentials");
if (
  url.protocol !== "https:" &&
  !["localhost", "127.0.0.1"].includes(url.hostname)
)
  throw Error("Remote staging requires HTTPS");
for (const [path, status] of [
  ["/api/health", 200],
  ["/api/ready", 200],
  ["/api/state", 401],
  ["/api/orders/export", 401],
]) {
  const response = await fetch(origin + path, {
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (response.status !== status)
    throw Error(`${path}: expected ${status}, received ${response.status}`);
  if (!response.headers.get("cache-control")?.includes("no-store"))
    throw Error(`${path}: missing no-store`);
  console.log(`PASS ${path}: ${status}`);
}
console.log(
  "Read-only smoke checks passed. This does not certify real-money readiness.",
);
