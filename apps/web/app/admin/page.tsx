import { demoOrders, formatUsd, matchOrders } from "@cubpay/core";

export default function AdminPage() {
  const allocations = matchOrders(demoOrders);
  const total = allocations.reduce((s,a)=>s+a.amountMinor,0);
  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">CubPay Admin</div>
        <div className="badge">INTERNAL · SIMULATION</div>
      </div>
      <section className="metrics">
        <div className="metric"><div className="label">Órdenes</div><div className="value">{demoOrders.length}</div></div>
        <div className="metric"><div className="label">Allocations</div><div className="value">{allocations.length}</div></div>
        <div className="metric"><div className="label">Volumen match</div><div className="value">{formatUsd(total)}</div></div>
        <div className="metric"><div className="label">Alertas críticas</div><div className="value">0</div></div>
      </section>
      <section className="grid">
        <div className="panel">
          <h2>Matching graph</h2>
          {allocations.map(a=>(
            <div className="order" key={a.id}>
              <div><strong>{a.leftOrderId} → {a.rightOrderId}</strong><div className="small">{a.id} · Private allocation</div></div>
              <strong>{formatUsd(a.amountMinor)}</strong>
            </div>
          ))}
        </div>
        <div className="panel">
          <h2>Controles operativos</h2>
          <div className="timeline">
            {["Confirmar KYB sandbox","Confirmar funding Cuba sandbox","Confirmar funding USA sandbox","Run Matching","Crear settlement batch","Confirmar payouts","Ejecutar reconciliation"].map((x,i)=>(
              <div className="step" key={x}><span className="dot"/><div><strong>{i+1}. {x}</strong><div className="small">Requiere rol interno y audit log en la siguiente fase.</div></div></div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
