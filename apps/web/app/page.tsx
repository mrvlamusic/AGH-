import Link from "next/link";
import { demoOrders, formatUsd, getMarketSummary } from "@cubpay/core";

export default function Home() {
  const market = getMarketSummary(demoOrders);
  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">CubPay</div>
        <div className="nav"><Link href="/onboarding">Onboarding</Link><Link href="/simulation">Trading Desk</Link><Link href="/admin">Admin</Link></div>
      </div>

      <section className="hero">
        <div className="panel">
          <div className="eyebrow">Private B2B Liquidity & Settlement Network</div>
          <h1>Una red privada para coordinar liquidez empresarial entre Cuba y Estados Unidos.</h1>
          <p>Invite-only. Empresas verificadas crean órdenes, CubPay ejecuta matching con partial fills y settlement diario mediante adapters regulados. Este MVP opera únicamente en simulación.</p>
          <div className="actions">
            <Link className="cta linkButton" href="/onboarding">Crear cuenta por invitación</Link>
            <Link className="cta secondary linkButton" href="/simulation">Abrir demo operativo</Link>
          </div>
        </div>
        <div className="panel">
          <div className="eyebrow">Demo market</div>
          <div style={{fontSize:34,fontWeight:800,margin:"12px 0"}}>{formatUsd(market.matchable)}</div>
          <div className="small">Liquidez matchable en el seed inicial</div>
          <div className="notice">No hay fondos reales, cuentas bancarias reales ni pagos reales conectados.</div>
        </div>
      </section>

      <section className="metrics">
        <div className="metric"><div className="label">Need USA</div><div className="value">{formatUsd(500_000_00)}</div></div>
        <div className="metric"><div className="label">Need Cuba</div><div className="value">{formatUsd(500_000_00)}</div></div>
        <div className="metric"><div className="label">Service fee</div><div className="value">3–5%</div></div>
        <div className="metric"><div className="label">Access</div><div className="value compact">Invite only</div></div>
      </section>

      <section className="grid">
        <div className="panel"><h2>Business workflow</h2><div className="timeline">{["Invitation + KYB","Purpose & documentation","Funding confirmation","Private matching","Daily settlement batch","Reconciliation + audit"].map(s=><div className="step" key={s}><span className="dot"/><div><strong>{s}</strong><div className="small">Controlled workflow with provider boundaries.</div></div></div>)}</div></div>
        <div className="panel"><h2>What this MVP proves</h2><p>Que la lógica operativa puede manejar órdenes opuestas, partial fills, fees, batches, settlement confirmations y reconciliación sin revelar las contrapartes a los usuarios.</p><Link className="cta linkButton" href="/simulation">Probar flujo completo</Link></div>
      </section>
    </main>
  );
}
