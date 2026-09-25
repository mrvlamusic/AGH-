import { test, expect, APIRequestContext } from "@playwright/test";
const origin = "http://localhost:3100";
const password = "test-password-only-12345";
async function post(
  api: APIRequestContext,
  path: string,
  data: Record<string, unknown> = {},
) {
  const r = await api.post("/api/" + path, {
    headers: { Origin: origin },
    data,
  });
  expect(r.ok(), await r.text()).toBeTruthy();
  return r.json();
}
async function adminLogin(api: APIRequestContext) {
  await post(api, "auth/login", { email: "admin@cubpay.test", password });
}
test("operator completes the seeded flow, safely repeats commands and reloads", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Tu operación/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/landing-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: /Iniciar sesión/ }).click();
  await page.getByLabel("Correo electrónico").fill("admin@cubpay.test");
  await page.getByLabel("Contraseña", { exact: false }).fill(password);
  await page.getByRole("button", { name: /Iniciar sesión/ }).click();
  await expect(
    page.getByRole("heading", { name: "Todo bajo control." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cargar escenario de prueba" })
    .click();
  await expect(
    page.getByText("Se cargaron 6 órdenes ficticias", { exact: false }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/operations-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Ejecutar matching/ }).click();
  await expect(
    page.getByText("Matching completado.", { exact: false }),
  ).toBeVisible();
  const results = await Promise.all(
    Array.from({ length: 5 }, () => post(page.request, "matching")),
  );
  for (const s of results) {
    expect(s.allocations).toHaveLength(5);
    expect(
      s.orders.every(
        (o: { matchedMinor: number; amountMinor: number }) =>
          o.matchedMinor === o.amountMinor,
      ),
    ).toBeTruthy();
  }
  await page.getByRole("button", { name: "Crear lote", exact: true }).click();
  await expect(
    page.getByText("Lote creado con", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Liquidaciones/ }).click();
  await page.getByRole("button", { name: "Confirmar pagos simulados" }).click();
  await expect(
    page.getByText("Pagos simulados confirmados.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Reconciliar y cerrar/ }).click();
  await expect(page.getByText("Verificada", { exact: true })).toBeVisible();
  const state = await (await page.request.get("/api/state")).json();
  expect(
    state.orders.every((o: { status: string }) => o.status === "SETTLED"),
  ).toBeTruthy();
  expect(state.journals).toHaveLength(16);
  await post(page.request, "batches/reconcile", { id: state.batches[0].id });
  await post(page.request, "batches/confirm", { id: state.batches[0].id });
  const again = await post(page.request, "batches");
  expect(again.batches).toHaveLength(1);
  expect(again.journals).toHaveLength(16);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Todo bajo control." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Libro contable/ }).click();
  await expect(page.getByText("16 asientos")).toBeVisible();
  await page.screenshot({
    path: "test-results/ledger-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("invited businesses complete KYB and orders without seeing counterparties", async ({
  browser,
  playwright,
}) => {
  const admin = await playwright.request.newContext({ baseURL: origin });
  await adminLogin(admin);
  const codeA = (await post(admin, "invites")).inviteCode,
    codeB = (await post(admin, "invites")).inviteCode;
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(origin + "/onboarding");
  await page.getByLabel("Código de invitación").fill(codeA);
  await page.getByLabel("Nombre legal").fill("Empresa Prueba A");
  await page.getByLabel("Registro mercantil").fill("TEST-A");
  await page.getByLabel("Identificación fiscal").fill("TAX-A");
  await page.getByLabel("Beneficiario final").fill("Persona Ficticia A");
  await page.getByLabel("Origen de fondos").fill("Ventas simuladas");
  await page.getByLabel("Correo electrónico").fill("business-a@example.test");
  await page.getByLabel("Contraseña", { exact: false }).fill(password);
  await page.getByRole("button", { name: /Enviar expediente/ }).click();
  await expect(
    page.getByRole("heading", { name: "Tu expediente está en revisión" }),
  ).toBeVisible();
  const actorA = (await (await page.request.get(origin + "/api/state")).json())
    .actor;
  const bodyA = {
    side: "NEED_US_SETTLEMENT",
    amount: "1000.01",
    purposeCode: "SUPPLIER_PAYMENT",
    requestId: "request-0123456789012345",
  };
  expect(
    (
      await page.request.post(origin + "/api/orders", {
        headers: { Origin: origin },
        data: bodyA,
      })
    ).status(),
  ).toBe(403);
  await post(admin, "organizations/review", {
    id: actorA.organizationId,
    approved: true,
  });
  await page.reload();
  await page.getByRole("button", { name: /Nueva orden/ }).click();
  await page.getByLabel("Importe USD").fill("1000.01");
  await page.getByRole("button", { name: /Enviar a revisión/ }).click();
  await expect(
    page.getByText("Orden enviada a revisión.", { exact: false }),
  ).toBeVisible();
  const businessB = await playwright.request.newContext({ baseURL: origin });
  const b = await post(businessB, "auth/register", {
    email: "business-b@example.test",
    password,
    inviteCode: codeB,
    legalName: "Empresa Prueba B",
    country: "US",
    registrationNo: "TEST-B",
    taxId: "TAX-B",
    ownerName: "Persona Ficticia B",
    sourceOfFunds: "Ventas simuladas",
  });
  await post(admin, "organizations/review", {
    id: b.actor.organizationId,
    approved: true,
  });
  const bodyB = { ...bodyA, side: "NEED_CUBA_LIQUIDITY" };
  await Promise.all([
    post(businessB, "orders", bodyB),
    post(businessB, "orders", bodyB),
  ]);
  const book = await (await admin.get("/api/state")).json();
  const orders = book.orders.filter((o: { organizationId: string }) =>
    [actorA.organizationId, b.actor.organizationId].includes(o.organizationId),
  );
  expect(orders).toHaveLength(2);
  for (const o of orders) {
    await post(admin, "orders/review", { id: o.id, approved: true });
    await post(admin, "orders/fund", { id: o.id });
  }
  await post(admin, "matching");
  const batched = await post(admin, "batches");
  const batch = batched.batches.at(-1);
  await post(admin, "batches/confirm", { id: batch.id });
  await post(admin, "batches/reconcile", { id: batch.id });
  await page.reload();
  await page.getByRole("button", { name: /Órdenes/ }).click();
  await expect(page.getByText("Liquidada", { exact: true })).toBeVisible();
  const privateState = await (
    await page.request.get(origin + "/api/state")
  ).json();
  expect(privateState.orders).toHaveLength(1);
  expect(privateState.allocations).toEqual([]);
  expect(JSON.stringify(privateState)).not.toContain("Empresa Prueba B");
  expect(JSON.stringify(privateState)).not.toContain(b.actor.organizationId);
  expect(JSON.stringify(privateState)).not.toContain("passwordHash");
  expect(
    (
      await page.request.post(origin + "/api/matching", {
        headers: { Origin: origin },
        data: {},
      })
    ).status(),
  ).toBe(403);
  const csv = await (
    await page.request.get(origin + "/api/orders/export")
  ).text();
  expect(csv.trim().split("\r\n")).toHaveLength(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("Liquidada", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/business-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Cerrar sesión/ }).click();
  await expect(page).toHaveURL(/login/);
  expect((await page.request.get(origin + "/api/state")).status()).toBe(401);
  await context.close();
  await admin.dispose();
  await businessB.dispose();
});
test("API rejects anonymous access, cross-origin writes and reused invites", async ({
  playwright,
}) => {
  const api = await playwright.request.newContext({ baseURL: origin });
  expect((await api.get("/api/state")).status()).toBe(401);
  expect((await api.get("/api/orders/export")).status()).toBe(401);
  expect(
    (
      await api.post("/api/auth/login", {
        headers: { Origin: "https://foreign.example" },
        data: { email: "admin@cubpay.test", password },
      })
    ).status(),
  ).toBe(403);
  const data = {
    email: "unknown@example.test",
    password: "wrong-password-123",
  };
  for (let n = 0; n < 10; n++)
    expect(
      (
        await api.post("/api/auth/login", { headers: { Origin: origin }, data })
      ).status(),
    ).toBe(400);
  expect(
    (
      await api.post("/api/auth/login", { headers: { Origin: origin }, data })
    ).status(),
  ).toBe(429);
  await adminLogin(api);
  const invite = (await post(api, "invites")).inviteCode;
  const company = {
    email: "once@example.test",
    password,
    inviteCode: invite,
    legalName: "One Use",
    country: "CU",
    registrationNo: "TEST",
    taxId: "TEST",
    ownerName: "TEST",
    sourceOfFunds: "TEST",
  };
  await post(api, "auth/register", company);
  const reused = await api.post("/api/auth/register", {
    headers: { Origin: origin },
    data: { ...company, email: "twice@example.test" },
  });
  expect(reused.status()).toBe(400);
  expect((await reused.json()).error).toBe("INVITE_INVALID");
  await api.dispose();
});
