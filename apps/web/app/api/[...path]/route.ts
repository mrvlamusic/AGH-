import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  Actor,
  audit,
  cancelOrder,
  confirmPayouts,
  createBatch,
  createOrder,
  DomainError,
  ensure,
  fundOrder,
  reconcileBatch,
  reviewOrder,
  reviewOrganization,
  runMatching,
  seedDemo,
  Side,
  viewFor,
} from "@cubpay/core";
import { transaction } from "../../../lib/store";
import {
  actorFor,
  COOKIE,
  digest,
  emailInput,
  hashPassword,
  issueSession,
  newInvite,
  passwordInput,
  safeEqual,
  textInput,
  throttle,
  verifyPassword,
} from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
const messages: Record<string, string> = {
  UNAUTHENTICATED: "Inicia sesión para continuar.",
  FORBIDDEN: "No tienes permiso para esta operación.",
  INVALID_CREDENTIALS: "Correo o contraseña incorrectos.",
  RATE_LIMITED: "Demasiados intentos. Vuelve a intentarlo en 15 minutos.",
  PASSWORD_LENGTH: "La contraseña debe tener entre 12 y 128 caracteres.",
  INVALID_EMAIL: "Escribe un correo válido.",
  INVITE_INVALID: "La invitación no existe, caducó o ya fue utilizada.",
  EMAIL_EXISTS: "No se puede registrar esta cuenta.",
  INVALID_INPUT: "Revisa los campos obligatorios.",
  INVALID_AMOUNT: "Usa un importe válido con hasta dos decimales.",
  AMOUNT_RANGE: "El importe debe estar entre 1.000 y 1.000.000 USD.",
  KYB_REQUIRED: "Tu empresa necesita la aprobación KYB de simulación.",
  INVALID_STATE_TRANSITION:
    "La operación no corresponde al estado actual. Actualiza la página.",
  PAYOUTS_NOT_RECONCILED: "Faltan confirmaciones válidas de pago.",
  CANNOT_CANCEL_FUNDED_ORDER:
    "Solo se pueden cancelar órdenes antes del fondeo.",
  ADMIN_NOT_CONFIGURED: "Configura ADMIN_PASSWORD antes de acceder.",
  STORE_BUSY: "El almacenamiento está ocupado. Inténtalo de nuevo.",
  DATABASE_REQUIRED: "Configura PostgreSQL para este despliegue.",
  DATABASE_NOT_INITIALIZED: "Inicializa la base de datos con pnpm db:init.",
  CROSS_ORIGIN: "La solicitud no procede de esta aplicación.",
  IDEMPOTENCY_CONFLICT: "Esta solicitud ya fue usada con otros datos.",
};
function failure(error: unknown) {
  if (error instanceof DomainError)
    return NextResponse.json(
      {
        error: error.code,
        message: messages[error.code] || "No se pudo completar la operación.",
      },
      { status: error.status, headers },
    );
  console.error(
    "CubPay request failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return NextResponse.json(
    {
      error: "SERVER_ERROR",
      message:
        "No se pudo guardar la operación. Comprueba la configuración del servidor.",
    },
    { status: 500, headers },
  );
}
function cookie(
  response: NextResponse,
  token: string,
  request: NextRequest,
  expired = false,
) {
  const publicOrigin = process.env.APP_ORIGIN || request.nextUrl.origin;
  response.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: new URL(publicOrigin).protocol === "https:",
    path: "/",
    maxAge: expired ? 0 : 8 * 60 * 60,
  });
}
async function route(request: NextRequest, segments: string[]) {
  const path = segments.join("/"),
    at = new Date().toISOString();
  const token = request.cookies.get(COOKIE)?.value;
  if (request.method === "GET") {
    if (path === "health")
      return NextResponse.json({ ok: true, mode: "SIMULATION" }, { headers });
    const data = await transaction((state) => {
      const actor = actorFor(state, token);
      const view = viewFor(state, actor);
      if (path === "state") return view;
      if (path === "orders/export") return view.orders;
      throw new DomainError("NOT_FOUND", 404);
    });
    if (path === "orders/export") {
      const orders = data as ReturnType<typeof viewFor>["orders"];
      const csv = [
        "id,side,amount_minor,matched_minor,settled_minor,fee_bps,status",
        ...orders.map((o) =>
          [
            o.id,
            o.side,
            o.amountMinor,
            o.matchedMinor,
            o.settledMinor,
            o.feeBps,
            o.status,
          ].join(","),
        ),
      ].join("\r\n");
      return new NextResponse(csv, {
        headers: {
          ...headers,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="cubpay-orders.csv"',
        },
      });
    }
    return NextResponse.json(data, { headers });
  }
  const origin = process.env.APP_ORIGIN || request.nextUrl.origin;
  ensure(request.headers.get("origin") === origin, "CROSS_ORIGIN", 403);
  ensure(
    request.headers.get("content-type")?.startsWith("application/json"),
    "INVALID_INPUT",
  );
  ensure(
    Number(request.headers.get("content-length") || 0) <= 16384,
    "INVALID_INPUT",
  );
  // Bound streamed bodies too; content-length can be omitted or inaccurate.
  const reader = request.body?.getReader();
  ensure(reader, "INVALID_INPUT");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > 16384) {
      await reader.cancel();
      throw new DomainError("INVALID_INPUT", 413);
    }
    chunks.push(value);
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new DomainError("INVALID_INPUT");
  }
  ensure(
    body && typeof body === "object" && !Array.isArray(body),
    "INVALID_INPUT",
  );
  if (path === "auth/login" || path === "auth/register") {
    const email = emailInput(body.email),
      password = passwordInput(body.password);
    // scrypt runs before acquiring the transaction lock for registration.
    const passwordHash =
      path === "auth/register" ? await hashPassword(password) : "";
    const result = await transaction(async (state) => {
      const key = digest(email);
      if (!throttle(state, key)) return { error: "RATE_LIMITED" };
      let actor: Actor;
      if (path === "auth/login") {
        if (
          email ===
          (process.env.ADMIN_EMAIL || "admin@cubpay.local").toLowerCase()
        ) {
          if (
            !process.env.ADMIN_PASSWORD ||
            process.env.ADMIN_PASSWORD.length < 12
          )
            return { error: "ADMIN_NOT_CONFIGURED" };
          if (!safeEqual(password, process.env.ADMIN_PASSWORD))
            return { error: "INVALID_CREDENTIALS" };
          actor = { id: "admin", role: "ADMIN" };
        } else {
          const user = state.users.find((u) => u.email === email);
          if (!user || !(await verifyPassword(password, user.passwordHash)))
            return { error: "INVALID_CREDENTIALS" };
          actor = {
            id: user.id,
            role: "BUSINESS",
            organizationId: user.organizationId,
          };
        }
      } else {
        const code = textInput(body.inviteCode, 100);
        const invite = state.invites.find(
          (i) =>
            i.tokenHash === digest(code) &&
            !i.usedAt &&
            i.expiresAt > Date.now(),
        );
        if (!invite) return { error: "INVITE_INVALID" };
        if (
          state.users.some((u) => u.email === email) ||
          email ===
            (process.env.ADMIN_EMAIL || "admin@cubpay.local").toLowerCase()
        )
          return { error: "EMAIL_EXISTS" };
        const org = {
          id: randomUUID(),
          legalName: textInput(body.legalName),
          registrationNo: textInput(body.registrationNo),
          taxId: textInput(body.taxId),
          ownerName: textInput(body.ownerName),
          sourceOfFunds: textInput(body.sourceOfFunds, 1000),
          country: textInput(body.country, 2),
          status: "KYB_PENDING" as const,
          createdAt: at,
        };
        ensure(org.country === "CU" || org.country === "US", "INVALID_INPUT");
        const user = {
          id: randomUUID(),
          email,
          passwordHash,
          organizationId: org.id,
        };
        state.organizations.push(org);
        state.users.push(user);
        invite.usedAt = at;
        actor = { id: user.id, role: "BUSINESS", organizationId: org.id };
        audit(
          state,
          actor,
          "KYB_SUBMITTED",
          org.id,
          "Expediente sandbox enviado para revisión",
          at,
          org.id,
        );
      }
      delete state.attempts[key];
      audit(
        state,
        actor,
        "SESSION_STARTED",
        actor.id,
        "Sesión iniciada",
        at,
        actor.organizationId,
      );
      return { token: issueSession(state, actor), actor };
    });
    if (result.error)
      throw new DomainError(
        result.error,
        result.error === "RATE_LIMITED" ? 429 : 400,
      );
    const response = NextResponse.json({ actor: result.actor }, { headers });
    cookie(response, result.token!, request);
    return response;
  }
  const result = await transaction((state) => {
    const actor = actorFor(state, token);
    if (path === "auth/logout") {
      state.sessions = state.sessions.filter(
        (s) => s.tokenHash !== digest(token!),
      );
      audit(
        state,
        actor,
        "SESSION_ENDED",
        actor.id,
        "Sesión cerrada",
        at,
        actor.organizationId,
      );
      return {};
    }
    if (path === "invites") return { inviteCode: newInvite(state, actor, at) };
    if (path === "orders") {
      createOrder(
        state,
        actor,
        {
          side: textInput(body.side) as Side,
          amount: textInput(body.amount, 30),
          purposeCode: textInput(body.purposeCode),
          requestId: textInput(body.requestId, 64),
        },
        at,
      );
    } else if (path === "orders/cancel")
      cancelOrder(state, actor, textInput(body.id), at);
    else if (path === "organizations/review") {
      ensure(typeof body.approved === "boolean", "INVALID_INPUT");
      reviewOrganization(state, actor, textInput(body.id), body.approved, at);
    } else if (path === "orders/review") {
      ensure(typeof body.approved === "boolean", "INVALID_INPUT");
      reviewOrder(state, actor, textInput(body.id), body.approved, at);
    } else if (path === "orders/fund")
      fundOrder(state, actor, textInput(body.id), at);
    else if (path === "matching") runMatching(state, actor, at);
    else if (path === "batches") createBatch(state, actor, at);
    else if (path === "batches/confirm")
      confirmPayouts(state, actor, textInput(body.id), at);
    else if (path === "batches/reconcile")
      reconcileBatch(state, actor, textInput(body.id), at);
    else if (path === "demo/seed") seedDemo(state, actor, at);
    else throw new DomainError("NOT_FOUND", 404);
    return viewFor(state, actor);
  });
  const response = NextResponse.json(result, { headers });
  if (path === "auth/logout") cookie(response, "", request, true);
  return response;
}
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: NextRequest, context: Context) {
  try {
    return await route(request, (await context.params).path);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    return await route(request, (await context.params).path);
  } catch (e) {
    return failure(e);
  }
}
