"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BrandMark, NavIcon } from "./brand";
import { useRouter } from "next/navigation";
import { Dashboard, feeFor, formatUsd, parseUsd, PURPOSES } from "@cubpay/core";

type Tab =
  "overview" | "orders" | "companies" | "batches" | "ledger" | "activity";
const statuses: Record<string, string> = {
  KYB_PENDING: "Pendiente de revisión",
  VERIFIED: "Verificada",
  REJECTED: "Rechazada",
  COMPLIANCE_REVIEW: "En revisión",
  AWAITING_FUNDING: "Pendiente de fondeo",
  OPEN: "Abierta",
  PARTIALLY_MATCHED: "Asignación parcial",
  FULLY_MATCHED: "Asignada",
  SETTLEMENT_PENDING: "En liquidación",
  SETTLED: "Liquidada",
  CANCELLED: "Cancelada",
  CLOSED: "Cerrado",
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  FAILED: "Fallido",
};
const purposes: Record<string, string> = {
  SUPPLIER_PAYMENT: "Pago a proveedor",
  IMPORT_PAYMENT: "Importación",
  SERVICE_PAYMENT: "Servicios",
  INVOICE_SETTLEMENT: "Liquidación de factura",
};
function Badge({ value }: { value: string }) {
  return (
    <span
      className={
        "pill " +
        (["VERIFIED", "SETTLED", "CLOSED", "CONFIRMED"].includes(value)
          ? "green"
          : ["REJECTED", "CANCELLED", "FAILED"].includes(value)
            ? "red"
            : "neutral")
      }
    >
      {statuses[value] || value}
    </span>
  );
}
function Empty({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="empty">
      <span aria-hidden>◇</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}
const short = (id: string) =>
  id.startsWith("CP-") ? "CP-" + id.slice(-8).toUpperCase() : id;
export default function Workspace({
  adminPage = false,
}: {
  adminPage?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null),
    [tab, setTab] = useState<Tab>("overview"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loaded, setLoaded] = useState(false),
    [invite, setInvite] = useState(""),
    [showOrder, setShowOrder] = useState(false),
    [amount, setAmount] = useState("10000.00"),
    [filter, setFilter] = useState("ALL");
  const active = useRef(false),
    generation = useRef(0),
    requestId = useRef("");
  const load = useCallback(async () => {
    const ticket = ++generation.current;
    try {
      const r = await fetch("/api/state", { cache: "no-store" });
      if (r.status === 401) {
        if (ticket === generation.current) {
          setData(null);
          setLoaded(true);
        }
        return;
      }
      const value = await r.json();
      if (!r.ok) throw Error(value.message);
      if (ticket === generation.current) {
        setData(value);
        setLoaded(true);
      }
    } catch (e) {
      if (ticket === generation.current) {
        setError(e instanceof Error ? e.message : "No se pudo conectar.");
        setLoaded(true);
      }
    }
  }, []);
  useEffect(() => {
    void load();
    const t = setInterval(() => {
      if (!active.current && document.visibilityState === "visible")
        void load();
    }, 15000);
    return () => {
      clearInterval(t);
      generation.current++;
    };
  }, [load]);
  async function command(
    path: string,
    body: Record<string, unknown> = {},
    message = "Operación guardada.",
  ) {
    if (active.current) return false;
    active.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    generation.current++;
    try {
      const r = await fetch("/api/" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      if (!r.ok) {
        if (r.status === 401) setData(null);
        throw Error(result.message);
      }
      if (result.actor) setData(result);
      if (result.inviteCode) setInvite(result.inviteCode);
      setNotice(message);
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo conectar. Puedes reintentar la operación.",
      );
      return false;
    } finally {
      active.current = false;
      setBusy(false);
    }
  }
  async function logout() {
    if (await command("auth/logout", {}, "")) {
      setData(null);
      router.push("/login");
    }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestId.current) requestId.current = crypto.randomUUID();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (
      await command(
        "orders",
        { ...values, requestId: requestId.current },
        "Orden enviada a revisión.",
      )
    ) {
      requestId.current = "";
      setShowOrder(false);
      setTab("orders");
    }
  }
  function startOrder() {
    requestId.current = "";
    setShowOrder(true);
    setTab("orders");
  }
  if (!loaded)
    return (
      <main className="loading" role="status">
        <BrandMark />
        <p>Cargando tu espacio de trabajo…</p>
      </main>
    );
  if (!data)
    return (
      <main className="access-card">
        <Link href="/" className="brand">
          <BrandMark />
          CubPay
        </Link>
        <h1>Tu espacio es privado.</h1>
        <p>Inicia sesión para consultar tus órdenes o acceder a operaciones.</p>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        <Link href="/login" className="button primary">
          Iniciar sesión ↗
        </Link>
        <button className="button secondary" onClick={() => void load()}>
          Reintentar conexión
        </button>
      </main>
    );
  const admin = data.actor.role === "ADMIN",
    org = data.organizations[0],
    verified = org?.status === "VERIFIED";
  if (adminPage && !admin)
    return (
      <main className="access-card">
        <h1>Acceso de operaciones</h1>
        <p>Tu cuenta de empresa no tiene permisos de administración.</p>
        <Link href="/simulation" className="button primary">
          Volver a mi portal
        </Link>
      </main>
    );
  const total = data.orders.reduce((s, o) => s + o.amountMinor, 0),
    settled = data.orders.reduce((s, o) => s + o.settledMinor, 0),
    matched = data.orders.reduce((s, o) => s + o.matchedMinor, 0);
  const openBatches = data.batches.filter((b) => b.status === "OPEN"),
    pendingOrgs = data.organizations.filter((o) => o.status === "KYB_PENDING");
  const nav: { id: Tab; label: string; symbol: string; count?: number }[] = [
    { id: "overview", label: "Resumen", symbol: "◫" },
    { id: "orders", label: "Órdenes", symbol: "⇄", count: data.orders.length },
    ...(admin
      ? [
          {
            id: "companies" as Tab,
            label: "Empresas",
            symbol: "▦",
            count: pendingOrgs.length,
          },
          {
            id: "batches" as Tab,
            label: "Liquidaciones",
            symbol: "↗",
            count: openBatches.length,
          },
          { id: "ledger" as Tab, label: "Libro contable", symbol: "≡" },
        ]
      : []),
    { id: "activity", label: "Actividad", symbol: "◷" },
  ];
  const current = nav.find((n) => n.id === tab)!;
  const filtered = data.orders.filter(
    (o) => filter === "ALL" || o.status === filter,
  );
  let fee = 0;
  try {
    fee = feeFor(parseUsd(amount), 400);
  } catch {}
  const orderTable = (limit?: number) => (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Orden / necesidad</th>
            {admin && <th>Empresa</th>}
            <th>Importe USD</th>
            <th>Avance</th>
            <th>Estado</th>
            <th>
              <span className="sr-only">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, limit).map((o) => (
            <tr key={o.id}>
              <td>
                <strong title={o.id}>{short(o.id)}</strong>
                <small>
                  {o.side === "NEED_US_SETTLEMENT"
                    ? "Liquidación en EE. UU."
                    : "Liquidez en Cuba"}{" "}
                  · {purposes[o.purposeCode]}
                </small>
              </td>
              {admin && (
                <td>
                  {
                    data.organizations.find((x) => x.id === o.organizationId)
                      ?.legalName
                  }
                </td>
              )}
              <td className="numeric">
                <strong>{formatUsd(o.amountMinor)}</strong>
                <small>
                  Comisión: {formatUsd(feeFor(o.amountMinor, o.feeBps))} (
                  {o.feeBps / 100}%)
                </small>
              </td>
              <td>
                <div className="progress">
                  <span
                    style={{
                      width:
                        Math.round((o.matchedMinor / o.amountMinor) * 100) +
                        "%",
                    }}
                  />
                </div>
                <small>
                  {Math.round((o.matchedMinor / o.amountMinor) * 100)}% asignado
                  · {Math.round((o.settledMinor / o.amountMinor) * 100)}%
                  liquidado
                </small>
              </td>
              <td>
                <Badge value={o.status} />
              </td>
              <td>
                <div className="row-actions">
                  {admin && o.status === "COMPLIANCE_REVIEW" && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() =>
                          void command(
                            "orders/review",
                            { id: o.id, approved: true },
                            "Orden aprobada.",
                          )
                        }
                      >
                        Aprobar
                      </button>
                      <button
                        className="text-danger"
                        disabled={busy}
                        onClick={() =>
                          void command(
                            "orders/review",
                            { id: o.id, approved: false },
                            "Orden rechazada.",
                          )
                        }
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  {admin && o.status === "AWAITING_FUNDING" && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        void command(
                          "orders/fund",
                          { id: o.id },
                          "Fondeo simulado registrado en el ledger.",
                        )
                      }
                    >
                      Simular fondeo
                    </button>
                  )}
                  {!admin &&
                    ["COMPLIANCE_REVIEW", "AWAITING_FUNDING"].includes(
                      o.status,
                    ) && (
                      <button
                        disabled={busy}
                        onClick={() =>
                          void command(
                            "orders/cancel",
                            { id: o.id },
                            "Orden cancelada.",
                          )
                        }
                      >
                        Cancelar
                      </button>
                    )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <BrandMark />
          CubPay
        </Link>
        <div className="workspace-label">
          {admin ? "OPERACIONES" : "PORTAL EMPRESARIAL"}
        </div>
        <nav aria-label="Secciones">
          {nav.map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "selected" : ""}
              onClick={() => {
                setTab(n.id);
                setShowOrder(false);
              }}
              aria-current={tab === n.id ? "page" : undefined}
            >
              <span className="nav-symbol" aria-hidden>
                <NavIcon name={n.id} />
              </span>
              {n.label}
              {!!n.count && <span className="nav-count">{n.count}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sandbox-box">
            <span className="live-dot" /> Sandbox activo
            <p>
              Solo datos ficticios.
              <br />
              Sin movimientos de dinero real.
            </p>
          </div>
          <div className="profile">
            <span className="avatar">
              {admin ? "OP" : org?.legalName.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <strong>{admin ? "Operaciones" : org?.legalName}</strong>
              <small>{admin ? "Administrador" : "Cuenta de empresa"}</small>
            </div>
          </div>
          <button
            className="logout"
            disabled={busy}
            onClick={() => void logout()}
          >
            Cerrar sesión <span>↗</span>
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-top">
          <div>
            CubPay <span>/</span> {current.label}
          </div>
          <div className="top-right">
            <span className="pill green">
              <span className="live-dot" /> SIMULACIÓN
            </span>
            <button
              className="refresh"
              title="Actualizar datos"
              aria-label="Actualizar datos"
              disabled={busy}
              onClick={() => void load()}
            >
              ↻
            </button>
          </div>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {admin ? "CENTRO DE OPERACIONES" : "MI EMPRESA"}
              </div>
              <h1>
                {tab === "overview"
                  ? admin
                    ? "Todo bajo control."
                    : "Tu operación, de un vistazo."
                  : current.label}
              </h1>
              <p>
                {admin
                  ? "Supervisa el flujo completo, desde la revisión hasta el cierre."
                  : "Consulta el estado y el historial de tus operaciones simuladas."}
              </p>
            </div>
            {!admin && verified && (
              <button
                className="button primary"
                disabled={busy}
                onClick={startOrder}
              >
                ＋ Nueva orden
              </button>
            )}
            {admin && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  void command(
                    "invites",
                    {},
                    "Invitación creada. Compártela con una empresa de prueba.",
                  )
                }
              >
                ＋ Crear invitación
              </button>
            )}
          </div>
          <div aria-live="polite">
            {notice && (
              <div className="notice success">
                ✓ {notice}
                <button aria-label="Cerrar aviso" onClick={() => setNotice("")}>
                  ×
                </button>
              </div>
            )}
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}
              <button aria-label="Cerrar error" onClick={() => setError("")}>
                ×
              </button>
            </div>
          )}
          {invite && (
            <section className="panel invite-box">
              <h3>Invitación de un solo uso</h3>
              <p>Caduca en 7 días. Guárdala ahora; no se vuelve a mostrar.</p>
              <div className="actions">
                <input
                  aria-label="Código de invitación generado"
                  readOnly
                  value={invite}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  className="button secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(invite);
                      setNotice("Invitación copiada.");
                    } catch {
                      setError("Selecciona y copia el código manualmente.");
                    }
                  }}
                >
                  Copiar
                </button>
                <button className="button subtle" onClick={() => setInvite("")}>
                  Ocultar
                </button>
              </div>
            </section>
          )}
          {!admin && !verified && (
            <section className="panel kyb-banner">
              <div className="large-symbol">◇</div>
              <div>
                <h2>
                  {org?.status === "REJECTED"
                    ? "Expediente rechazado"
                    : "Tu expediente está en revisión"}
                </h2>
                <p>
                  {org?.status === "REJECTED"
                    ? "Contacta al operador de este entorno de prueba para revisar el expediente."
                    : "Operaciones debe aprobar tu empresa antes de que puedas crear órdenes. El estado se actualiza automáticamente."}
                </p>
                <Badge value={org?.status || "KYB_PENDING"} />
              </div>
            </section>
          )}
          {tab === "overview" && (
            <>
              <section className="metric-grid">
                <article className="metric">
                  <span>Volumen de órdenes</span>
                  <strong>{formatUsd(total)}</strong>
                  <small>
                    {data.orders.length} órdenes{" "}
                    {admin ? "en el entorno" : "de tu empresa"}
                  </small>
                </article>
                <article className="metric">
                  <span>Volumen asignado</span>
                  <strong>{formatUsd(matched)}</strong>
                  <small>
                    {admin
                      ? "Suma de ambos lados de cada asignación"
                      : "Sobre el total de tus órdenes"}
                  </small>
                </article>
                <article className="metric">
                  <span>Volumen liquidado</span>
                  <strong>{formatUsd(settled)}</strong>
                  <small>Confirmado y reconciliado</small>
                </article>
                <article className="metric accent">
                  <span>
                    {admin ? "Lotes pendientes" : "Estado de empresa"}
                  </span>
                  <strong>
                    {admin
                      ? openBatches.length
                      : verified
                        ? "Verificada"
                        : "En revisión"}
                  </strong>
                  <small>
                    {admin
                      ? "Por confirmar o reconciliar"
                      : "Verificación de simulación"}
                  </small>
                </article>
              </section>
              <div className="overview-grid">
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <h2>{admin ? "Liquidez disponible" : "Tu avance"}</h2>
                      <p>
                        {admin
                          ? "Saldo abierto pendiente de asignación"
                          : "Cada operación pasa por controles definidos"}
                      </p>
                    </div>
                    <span className="pill neutral">USD</span>
                  </div>
                  {admin ? (
                    <>
                      <div className="liquidity-row">
                        <span className="country small-country">US</span>
                        <div>
                          <strong>Liquidación en EE. UU.</strong>
                          <small>Necesidad abierta</small>
                        </div>
                        <b>{formatUsd(data.market.needUs)}</b>
                      </div>
                      <div className="liquidity-row">
                        <span className="country small-country">CU</span>
                        <div>
                          <strong>Liquidez en Cuba</strong>
                          <small>Necesidad abierta</small>
                        </div>
                        <b>{formatUsd(data.market.needCuba)}</b>
                      </div>
                      <div className="matchable">
                        <span>Asignable ahora</span>
                        <strong>{formatUsd(data.market.matchable)}</strong>
                      </div>
                      <div className="actions">
                        <button
                          className="button primary"
                          disabled={busy || data.market.matchable === 0}
                          onClick={() =>
                            void command(
                              "matching",
                              {},
                              "Matching completado. Las asignaciones previas se conservaron.",
                            )
                          }
                        >
                          Ejecutar matching ↗
                        </button>
                        <button
                          className="button secondary"
                          disabled={
                            busy || !data.allocations.some((a) => !a.batchId)
                          }
                          onClick={() =>
                            void command(
                              "batches",
                              {},
                              "Lote creado con las asignaciones pendientes.",
                            )
                          }
                        >
                          Crear lote
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="workflow-list">
                      {[
                        "Revisión de la empresa",
                        "Aprobación de la orden",
                        "Fondeo simulado",
                        "Asignación privada",
                        "Liquidación y reconciliación",
                      ].map((s, i) => (
                        <div key={s}>
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
                <section className="panel">
                  <div className="section-heading">
                    <h2>
                      {admin ? "Pendientes de atención" : "Actividad reciente"}
                    </h2>
                    <span className="small-label">EN VIVO</span>
                  </div>
                  {admin ? (
                    <div className="attention-list">
                      <button onClick={() => setTab("companies")}>
                        <span>
                          <strong>Empresas por revisar</strong>
                          <small>Expedientes KYB de simulación</small>
                        </span>
                        <b>{pendingOrgs.length} →</b>
                      </button>
                      <button onClick={() => setTab("orders")}>
                        <span>
                          <strong>Órdenes en revisión</strong>
                          <small>Aprobación y fondeo</small>
                        </span>
                        <b>
                          {
                            data.orders.filter((o) =>
                              [
                                "COMPLIANCE_REVIEW",
                                "AWAITING_FUNDING",
                              ].includes(o.status),
                            ).length
                          }{" "}
                          →
                        </b>
                      </button>
                      <button onClick={() => setTab("batches")}>
                        <span>
                          <strong>Lotes abiertos</strong>
                          <small>Pagos simulados y reconciliación</small>
                        </span>
                        <b>{openBatches.length} →</b>
                      </button>
                    </div>
                  ) : (
                    <div className="activity-list">
                      {data.audit.slice(0, 4).map((a) => (
                        <div key={a.id}>
                          <span className="activity-dot" />
                          <div>
                            <strong>{a.detail}</strong>
                            <small>{new Date(a.at).toLocaleString("es")}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {admin &&
                    !data.audit.some((a) => a.action === "DEMO_SEEDED") && (
                      <div className="seed-callout">
                        <p>¿Quieres recorrer el flujo con datos de ejemplo?</p>
                        <button
                          className="button secondary"
                          disabled={busy}
                          onClick={() =>
                            void command(
                              "demo/seed",
                              {},
                              "Se cargaron 6 órdenes ficticias, con 500.000 USD por lado.",
                            )
                          }
                        >
                          Cargar escenario de prueba
                        </button>
                      </div>
                    )}
                </section>
              </div>
              <section className="panel table-panel">
                <div className="section-heading">
                  <h2>Órdenes recientes</h2>
                  <button
                    className="text-button"
                    onClick={() => setTab("orders")}
                  >
                    Ver todas →
                  </button>
                </div>
                {data.orders.length ? (
                  orderTable(6)
                ) : (
                  <Empty
                    title="Aún no hay órdenes"
                    copy={
                      admin
                        ? "Carga el escenario de prueba o invita a una empresa."
                        : "Una vez verificada tu empresa, podrás crear tu primera orden."
                    }
                  />
                )}
              </section>
            </>
          )}
          {tab === "orders" && (
            <>
              {showOrder && (
                <section className="panel order-form">
                  <div className="section-heading">
                    <div>
                      <h2>Nueva orden</h2>
                      <p>
                        Comisión fija del MVP: 4%. Se suma al importe del fondeo
                        simulado.
                      </p>
                    </div>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => setShowOrder(false)}
                    >
                      Cerrar ×
                    </button>
                  </div>
                  <form onSubmit={create}>
                    <div className="field-grid">
                      <label>
                        Necesidad
                        <select name="side">
                          <option value="NEED_US_SETTLEMENT">
                            Liquidación en Estados Unidos
                          </option>
                          <option value="NEED_CUBA_LIQUIDITY">
                            Liquidez USD en Cuba
                          </option>
                        </select>
                      </label>
                      <label>
                        Importe USD
                        <input
                          name="amount"
                          type="number"
                          min="1000"
                          max="1000000"
                          step="0.01"
                          required
                          value={amount}
                          onChange={(e) => {
                            setAmount(e.target.value);
                            requestId.current = "";
                          }}
                        />
                      </label>
                      <label>
                        Propósito
                        <select name="purposeCode">
                          {PURPOSES.map((p) => (
                            <option key={p} value={p}>
                              {purposes[p]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="fee-preview">
                        <small>Comisión estimada</small>
                        <strong>{formatUsd(fee)}</strong>
                        <small>No se realiza ningún cobro real.</small>
                      </div>
                    </div>
                    <button className="button primary" disabled={busy}>
                      Enviar a revisión ↗
                    </button>
                  </form>
                </section>
              )}
              <section className="panel table-panel">
                <div className="section-heading">
                  <h2>{admin ? "Todas las órdenes" : "Mis órdenes"}</h2>
                  <div className="actions">
                    <label className="inline-filter">
                      <span className="sr-only">Filtrar por estado</span>
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option value="ALL">Todos los estados</option>
                        {[
                          "COMPLIANCE_REVIEW",
                          "AWAITING_FUNDING",
                          "OPEN",
                          "PARTIALLY_MATCHED",
                          "FULLY_MATCHED",
                          "SETTLEMENT_PENDING",
                          "SETTLED",
                          "CANCELLED",
                          "REJECTED",
                        ].map((s) => (
                          <option key={s} value={s}>
                            {statuses[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <a
                      className="button secondary small-button"
                      href="/api/orders/export"
                    >
                      Exportar CSV ↓
                    </a>
                  </div>
                </div>
                {filtered.length ? (
                  orderTable()
                ) : (
                  <Empty
                    title="No hay órdenes para mostrar"
                    copy="Crea una orden o selecciona otro estado."
                  />
                )}
              </section>
            </>
          )}
          {tab === "companies" && admin && (
            <section className="company-grid">
              {data.organizations.map((o) => (
                <article className="panel company-card" key={o.id}>
                  <div className="section-heading">
                    <span className="avatar">
                      {o.legalName.slice(0, 2).toUpperCase()}
                    </span>
                    <Badge value={o.status} />
                  </div>
                  <h2>{o.legalName}</h2>
                  <dl>
                    <div>
                      <dt>País</dt>
                      <dd>{o.country === "CU" ? "Cuba" : "Estados Unidos"}</dd>
                    </div>
                    <div>
                      <dt>Registro</dt>
                      <dd>{o.registrationNo}</dd>
                    </div>
                    <div>
                      <dt>Identificación fiscal</dt>
                      <dd>{o.taxId}</dd>
                    </div>
                    <div>
                      <dt>Beneficiario final</dt>
                      <dd>{o.ownerName}</dd>
                    </div>
                    <div>
                      <dt>Origen de fondos</dt>
                      <dd>{o.sourceOfFunds}</dd>
                    </div>
                  </dl>
                  {o.status === "KYB_PENDING" && (
                    <div className="actions">
                      <button
                        className="button primary"
                        disabled={busy}
                        onClick={() =>
                          void command(
                            "organizations/review",
                            { id: o.id, approved: true },
                            "Empresa verificada en sandbox.",
                          )
                        }
                      >
                        Aprobar KYB
                      </button>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() =>
                          void command(
                            "organizations/review",
                            { id: o.id, approved: false },
                            "Expediente rechazado.",
                          )
                        }
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </article>
              ))}
              {!data.organizations.length && (
                <Empty
                  title="Invita a tu primera empresa"
                  copy="Crea una invitación y utiliza el formulario de registro con datos ficticios."
                />
              )}
            </section>
          )}
          {tab === "batches" && admin && (
            <>
              <section className="panel operation-bar">
                <div>
                  <h2>Preparar liquidación</h2>
                  <p>
                    {data.allocations.filter((a) => !a.batchId).length}{" "}
                    asignaciones sin lote · {formatUsd(data.market.matchable)}{" "}
                    asignables
                  </p>
                </div>
                <div className="actions">
                  <button
                    className="button secondary"
                    disabled={busy || !data.market.matchable}
                    onClick={() =>
                      void command("matching", {}, "Matching completado.")
                    }
                  >
                    Ejecutar matching
                  </button>
                  <button
                    className="button primary"
                    disabled={busy || !data.allocations.some((a) => !a.batchId)}
                    onClick={() => void command("batches", {}, "Lote creado.")}
                  >
                    Crear lote ↗
                  </button>
                </div>
              </section>
              {data.batches.length ? (
                [...data.batches].reverse().map((b) => (
                  <section className="panel batch-card" key={b.id}>
                    <div className="section-heading">
                      <div>
                        <h2>{b.id}</h2>
                        <p>
                          {new Date(b.createdAt).toLocaleString("es")} ·{" "}
                          {b.instructions.length} instrucciones
                        </p>
                      </div>
                      <Badge value={b.status} />
                    </div>
                    <div className="batch-summary">
                      <div>
                        <small>Principal por lado</small>
                        <strong>
                          {formatUsd(
                            b.instructions
                              .filter((i) => i.side === "USA")
                              .reduce((s, i) => s + i.amountMinor, 0),
                          )}
                        </strong>
                      </div>
                      <div>
                        <small>Confirmaciones</small>
                        <strong>
                          {
                            b.instructions.filter(
                              (i) => i.status === "CONFIRMED",
                            ).length
                          }{" "}
                          / {b.instructions.length}
                        </strong>
                      </div>
                      <div>
                        <small>Reconciliación</small>
                        <strong>
                          {b.status === "CLOSED" ? "Verificada" : "Pendiente"}
                        </strong>
                      </div>
                    </div>
                    <details>
                      <summary>Ver instrucciones y referencias</summary>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Instrucción</th>
                              <th>Destino</th>
                              <th>Importe</th>
                              <th>Estado</th>
                              <th>Referencia simulada</th>
                            </tr>
                          </thead>
                          <tbody>
                            {b.instructions.map((i) => (
                              <tr key={i.id}>
                                <td>
                                  {i.id}
                                  <small>{short(i.orderId)}</small>
                                </td>
                                <td>{i.side}</td>
                                <td>{formatUsd(i.amountMinor)}</td>
                                <td>
                                  <Badge value={i.status} />
                                </td>
                                <td>{i.providerReference || "Pendiente"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                    {b.status === "OPEN" && (
                      <div className="actions">
                        <button
                          className="button secondary"
                          disabled={
                            busy ||
                            b.instructions.every(
                              (i) => i.status === "CONFIRMED",
                            )
                          }
                          onClick={() =>
                            void command(
                              "batches/confirm",
                              { id: b.id },
                              "Pagos simulados confirmados.",
                            )
                          }
                        >
                          Confirmar pagos simulados
                        </button>
                        <button
                          className="button primary"
                          disabled={
                            busy ||
                            b.instructions.some((i) => i.status !== "CONFIRMED")
                          }
                          onClick={() =>
                            void command(
                              "batches/reconcile",
                              { id: b.id },
                              "Lote reconciliado y cerrado. Asientos contabilizados una sola vez.",
                            )
                          }
                        >
                          Reconciliar y cerrar ✓
                        </button>
                      </div>
                    )}
                  </section>
                ))
              ) : (
                <section className="panel">
                  <Empty
                    title="Todavía no hay lotes"
                    copy="Empareja órdenes y crea un lote para iniciar la liquidación simulada."
                  />
                </section>
              )}
            </>
          )}
          {tab === "ledger" && admin && (
            <>
              <section className="notice info">
                Cada fondeo y liquidación genera un asiento de doble entrada.
                Los importes se almacenan en centavos; todos los fondos son
                simulados.
              </section>
              <section className="panel table-panel">
                <div className="section-heading">
                  <h2>Libro diario</h2>
                  <span className="pill neutral">
                    {data.journals.length} asientos
                  </span>
                </div>
                {data.journals.length ? (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Asiento / cuenta</th>
                          <th>Debe USD</th>
                          <th>Haber USD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...data.journals].reverse().map((j) => (
                          <tr key={j.reference}>
                            <td>
                              <details>
                                <summary>
                                  {j.reference.startsWith("fund:")
                                    ? "Fondeo simulado"
                                    : "Liquidación simulada"}{" "}
                                  <small>
                                    {new Date(j.createdAt).toLocaleString("es")}
                                  </small>
                                </summary>
                                <ul className="ledger-lines">
                                  {j.lines.map((l, i) => (
                                    <li key={i}>
                                      <code>{l.account}</code>
                                      <span>
                                        Debe {formatUsd(l.debitMinor)} · Haber{" "}
                                        {formatUsd(l.creditMinor)}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </details>
                            </td>
                            <td className="numeric">
                              {formatUsd(
                                j.lines.reduce((s, l) => s + l.debitMinor, 0),
                              )}
                            </td>
                            <td className="numeric">
                              {formatUsd(
                                j.lines.reduce((s, l) => s + l.creditMinor, 0),
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    title="El libro está vacío"
                    copy="El primer fondeo simulado creará el primer asiento."
                  />
                )}
              </section>
            </>
          )}
          {tab === "activity" && (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Historial de operaciones</h2>
                  <p>Registro persistente de las acciones autorizadas.</p>
                </div>
                <span className="pill neutral">
                  {data.audit.length} eventos
                </span>
              </div>
              <div className="activity-list full-activity">
                {data.audit.map((a) => (
                  <div key={a.id}>
                    <span className="activity-dot" />
                    <div>
                      <strong>{a.detail}</strong>
                      <small>
                        {a.id} · {new Date(a.at).toLocaleString("es")}
                      </small>
                      {admin && <code>{a.action}</code>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          <footer className="workspace-footer">
            <span className="live-dot" /> CubPay Sandbox{" "}
            <span>Solo simulación · Datos ficticios · Sin fondos reales</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
