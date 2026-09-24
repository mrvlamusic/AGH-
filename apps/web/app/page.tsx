import { demoOrders, formatUsd, getMarketSummary } from "@cubpay/core";

export default function Home() {
  const market = getMarketSummary(demoOrders);
  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">CubPay</div>
        <div className="badge">SIMULATION MODE · Invite only</div>
      </div>

      <section className="hero">
        <div className="panel">
          <div className="eyebrow">Private B2B Liquidity Network</div>
          <h1>Liquidez coordinada. Settlement controlado.</h1>
          <p>CubPay coordina órdenes verificadas entre empresas que necesitan settlement en Estados Unidos y empresas que necesitan liquidez USD en Cuba. El MVP no mueve dinero real.</p>
          <div className="actions">
            <button className="cta">Crear orden</button>
            <button className="cta secondary">Ver operaciones</button>
          </div>
        </div>
        <div className="panel">
          <h2>Estado de cuenta</h2>
          <div className="small">Organización demo</div>
          <div style={{fontSize:34,fontWeight:800,margin:"8px 0"}}>{formatUsd(2_450_000_00)}</div>
          <div className="small">Volumen histórico simulado</div>
          <div className="notice">Los saldos y settlements mostrados son datos de demostración. No representan fondos custodiados por CubPay.</div>
        </div>
      </section>

      <section className="metrics">
        <div className="metric"><div className="label">Necesitan USA</div><div className="value">{formatUsd(market.needUs)}</div></div>
        <div className="metric"><div className="label">Necesitan Cuba</div><div className="value">{formatUsd(market.needCuba)}</div></div>
        <div className="metric"><div className="label">Matchable ahora</div><div className="value">{formatUsd(market.matchable)}</div></div>
        <div className="metric"><div className="label">Desbalance</div><div className="value">{formatUsd(market.imbalance)}</div></div>
      </section>

      <section className="grid">
        <div className="panel">
          <h2>Order Book privado</h2>
          {demoOrders.map((o) => (
            <div className="order" key={o.id}>
              <div>
                <strong>{o.side === "NEED_US_SETTLEMENT" ? "Necesita settlement USA" : "Necesita liquidez Cuba"}</strong>
                <div className="small">{o.id} · Fee {o.feeBps / 100}% · {o.status}</div>
                <div className="progress"><span style={{width:`${Math.round((o.matchedMinor/o.amountMinor)*100)}%`}} /></div>
              </div>
              <strong>{formatUsd(o.amountMinor)}</strong>
            </div>
          ))}
        </div>

        <div className="panel">
          <h2>Flujo de operación</h2>
          <div className="timeline">
            {["Empresa verificada + KYB","Orden y documentación","Funding confirmado por provider sandbox","Matching con partial fills","Settlement batch diario","Reconciliación + ledger balanceado"].map((s) => (
              <div className="step" key={s}><span className="dot"/><div><strong>{s}</strong><div className="small">Auditable y sujeto a permisos internos.</div></div></div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
