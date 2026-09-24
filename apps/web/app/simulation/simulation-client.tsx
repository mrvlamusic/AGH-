"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { Allocation, Order, formatUsd, getMarketSummary, matchOrders } from "@cubpay/core";

type AuditItem = { id:string; at:string; action:string; detail:string };
type BatchState = "NONE" | "CREATED" | "PAYOUTS_CONFIRMED" | "RECONCILED";

const initialOrders: Order[] = [
  { id:"CP-US-1001", organizationId:"org-a", side:"NEED_US_SETTLEMENT", amountMinor:250_000_00, matchedMinor:0, feeBps:400, status:"OPEN", createdAt:"2026-09-24T08:00:00Z" },
  { id:"CP-US-1002", organizationId:"org-b", side:"NEED_US_SETTLEMENT", amountMinor:80_000_00, matchedMinor:0, feeBps:500, status:"OPEN", createdAt:"2026-09-24T08:10:00Z" },
  { id:"CP-US-1003", organizationId:"org-c", side:"NEED_US_SETTLEMENT", amountMinor:170_000_00, matchedMinor:0, feeBps:350, status:"OPEN", createdAt:"2026-09-24T08:20:00Z" },
  { id:"CP-CU-2001", organizationId:"org-d", side:"NEED_CUBA_LIQUIDITY", amountMinor:100_000_00, matchedMinor:0, feeBps:400, status:"OPEN", createdAt:"2026-09-24T08:05:00Z" },
  { id:"CP-CU-2002", organizationId:"org-e", side:"NEED_CUBA_LIQUIDITY", amountMinor:300_000_00, matchedMinor:0, feeBps:300, status:"OPEN", createdAt:"2026-09-24T08:15:00Z" },
  { id:"CP-CU-2003", organizationId:"org-f", side:"NEED_CUBA_LIQUIDITY", amountMinor:100_000_00, matchedMinor:0, feeBps:450, status:"OPEN", createdAt:"2026-09-24T08:25:00Z" }
];

export default function SimulationClient() {
  const [orders,setOrders] = useState<Order[]>(initialOrders);
  const [allocations,setAllocations] = useState<Allocation[]>([]);
  const [batch,setBatch] = useState<BatchState>("NONE");
  const [side,setSide] = useState<Order["side"]>("NEED_US_SETTLEMENT");
  const [amount,setAmount] = useState("100000");
  const [fee,setFee] = useState("4");
  const [audit,setAudit] = useState<AuditItem[]>([
    {id:"A-1",at:new Date().toISOString(),action:"DEMO_STARTED",detail:"Simulation ledger initialized"}
  ]);

  const market=useMemo(()=>getMarketSummary(orders),[orders]);

  function log(action:string,detail:string){
    setAudit(items=>[{id:crypto.randomUUID(),at:new Date().toISOString(),action,detail},...items]);
  }

  function createOrder(e:FormEvent){
    e.preventDefault();
    const amountMinor=Math.round(Number(amount)*100);
    if(!Number.isFinite(amountMinor)||amountMinor<=0) return;
    const prefix=side==="NEED_US_SETTLEMENT"?"CP-US":"CP-CU";
    const order:Order={
      id:`${prefix}-${Date.now().toString().slice(-6)}`,
      organizationId:"demo-new-org",
      side,
      amountMinor,
      matchedMinor:0,
      feeBps:Math.round(Number(fee)*100),
      status:"OPEN",
      createdAt:new Date().toISOString()
    };
    setOrders(o=>[...o,order]);
    log("ORDER_CREATED",`${order.id} · ${formatUsd(amountMinor)} · fee ${fee}%`);
    setBatch("NONE");
  }

  function runMatching(){
    const next=matchOrders(orders);
    setAllocations(next);
    const matchedByOrder=new Map<string,number>();
    next.forEach(a=>{
      matchedByOrder.set(a.leftOrderId,(matchedByOrder.get(a.leftOrderId)||0)+a.amountMinor);
      matchedByOrder.set(a.rightOrderId,(matchedByOrder.get(a.rightOrderId)||0)+a.amountMinor);
    });
    setOrders(current=>current.map(o=>{
      const matched=matchedByOrder.get(o.id)||0;
      return {...o,matchedMinor:matched,status:matched===0?"OPEN":matched>=o.amountMinor?"FULLY_MATCHED":"PARTIALLY_MATCHED"};
    }));
    log("MATCHING_EXECUTED",`${next.length} allocations · ${formatUsd(next.reduce((s,a)=>s+a.amountMinor,0))}`);
    setBatch("NONE");
  }

  function createBatch(){
    if(!allocations.length) return;
    setBatch("CREATED");
    log("SETTLEMENT_BATCH_CREATED",`SB-${new Date().toISOString().slice(0,10)} · ${allocations.length} allocations`);
  }
  function confirmPayouts(){
    if(batch!=="CREATED") return;
    setBatch("PAYOUTS_CONFIRMED");
    log("SANDBOX_PAYOUTS_CONFIRMED","Mock Cuba + U.S. providers confirmed payout instructions");
  }
  function reconcile(){
    if(batch!=="PAYOUTS_CONFIRMED") return;
    setBatch("RECONCILED");
    setOrders(current=>current.map(o=>o.status==="FULLY_MATCHED"?{...o,status:"SETTLED"}:o));
    log("BATCH_RECONCILED","Debits = credits · batch closed with zero critical breaks");
  }
  function reset(){
    setOrders(initialOrders);setAllocations([]);setBatch("NONE");
    setAudit([{id:crypto.randomUUID(),at:new Date().toISOString(),action:"DEMO_RESET",detail:"Seed order book restored"}]);
  }

  function exportCsv(){
    const header="id,side,amount_usd,matched_usd,fee_percent,status";
    const rows=orders.map(o=>[o.id,o.side,(o.amountMinor/100).toFixed(2),(o.matchedMinor/100).toFixed(2),(o.feeBps/100).toFixed(2),o.status].join(","));
    const blob=new Blob([[header,...rows].join("\n")],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="cubpay-orders-demo.csv";a.click();URL.revokeObjectURL(url);
    log("REPORT_EXPORTED","Order report exported to CSV");
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div><Link href="/" className="brand">CubPay</Link><div className="small">Liquidity Trading Desk</div></div>
        <div className="badge">SIMULATION MODE · NO REAL FUNDS</div>
      </div>

      <section className="metrics">
        <div className="metric"><div className="label">Need USA</div><div className="value">{formatUsd(market.needUs)}</div></div>
        <div className="metric"><div className="label">Need Cuba</div><div className="value">{formatUsd(market.needCuba)}</div></div>
        <div className="metric"><div className="label">Matchable</div><div className="value">{formatUsd(market.matchable)}</div></div>
        <div className="metric"><div className="label">Batch</div><div className="value compact">{batch}</div></div>
      </section>

      <section className="grid">
        <form className="panel form" onSubmit={createOrder}>
          <div className="eyebrow">Create verified order</div>
          <h2>Nueva orden</h2>
          <label>Necesidad<select value={side} onChange={e=>setSide(e.target.value as Order["side"])}><option value="NEED_US_SETTLEMENT">Necesito settlement en USA</option><option value="NEED_CUBA_LIQUIDITY">Necesito liquidez USD en Cuba</option></select></label>
          <label>Monto USD<input type="number" min="1000" step="1000" value={amount} onChange={e=>setAmount(e.target.value)} /></label>
          <label>Fee<select value={fee} onChange={e=>setFee(e.target.value)}><option value="5">5% Standard</option><option value="4">4% Verified</option><option value="3">3% Institutional</option></select></label>
          <label>Purpose<select defaultValue="SUPPLIER_PAYMENT"><option>SUPPLIER_PAYMENT</option><option>IMPORT_PAYMENT</option><option>SERVICE_PAYMENT</option><option>INVOICE_SETTLEMENT</option></select></label>
          <button className="cta" type="submit">Crear orden aprobada (sandbox)</button>
        </form>

        <section className="panel">
          <div className="eyebrow">Operations</div>
          <h2>Settlement diario</h2>
          <div className="actions vertical">
            <button className="cta" onClick={runMatching}>1. Run Matching</button>
            <button className="cta secondary" disabled={!allocations.length} onClick={createBatch}>2. Create Settlement Batch</button>
            <button className="cta secondary" disabled={batch!=="CREATED"} onClick={confirmPayouts}>3. Confirm Mock Payouts</button>
            <button className="cta secondary" disabled={batch!=="PAYOUTS_CONFIRMED"} onClick={reconcile}>4. Reconcile & Close</button>
          </div>
          <div className="actions"><button className="cta secondary" onClick={exportCsv}>Export CSV</button><button className="cta danger" onClick={reset}>Reset Demo</button></div>
          <div className="notice">Real settlement adapters remain disabled until regulated partners and legal/compliance approvals exist.</div>
        </section>
      </section>

      <section className="grid">
        <section className="panel">
          <h2>Private Order Book</h2>
          {orders.map(o=>{
            const pct=o.amountMinor?Math.round((o.matchedMinor/o.amountMinor)*100):0;
            return <div className="order" key={o.id}><div><strong>{o.side==="NEED_US_SETTLEMENT"?"USA settlement":"Cuba liquidity"}</strong><div className="small">{o.id} · {o.feeBps/100}% · {o.status}</div><div className="progress"><span style={{width:`${pct}%`}}/></div></div><div className="right"><strong>{formatUsd(o.amountMinor)}</strong><div className="small">{pct}% matched</div></div></div>
          })}
        </section>

        <section className="panel">
          <h2>Matching Allocations</h2>
          {!allocations.length && <p>Ejecuta el matching para generar allocations privadas.</p>}
          {allocations.map(a=><div className="order" key={a.id}><div><strong>{a.id}</strong><div className="small">{a.leftOrderId} ↔ {a.rightOrderId}</div></div><strong>{formatUsd(a.amountMinor)}</strong></div>)}
        </section>
      </section>

      <section className="panel" style={{marginTop:18}}>
        <h2>Immutable-style Audit Trail (demo)</h2>
        {audit.map(item=><div className="audit" key={item.id}><div><strong>{item.action}</strong><div className="small">{item.detail}</div></div><div className="small">{new Date(item.at).toLocaleTimeString()}</div></div>)}
      </section>
    </main>
  );
}
