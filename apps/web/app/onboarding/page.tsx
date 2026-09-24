"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Org = {
  inviteCode: string;
  legalName: string;
  registrationNo: string;
  taxId: string;
  ownerName: string;
  expectedMonthlyVolume: string;
  sourceOfFunds: string;
  status: "INVITED" | "KYB_PENDING" | "VERIFIED";
};

const KEY = "cubpay-demo-organization";

export default function OnboardingPage() {
  const [org, setOrg] = useState<Org>({
    inviteCode: "CUBPAY-DEMO-2026",
    legalName: "",
    registrationNo: "",
    taxId: "",
    ownerName: "",
    expectedMonthlyVolume: "500000",
    sourceOfFunds: "Ingresos comerciales documentados",
    status: "INVITED",
  });

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored) setOrg(JSON.parse(stored));
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = { ...org, status: "KYB_PENDING" as const };
    localStorage.setItem(KEY, JSON.stringify(next));
    setOrg(next);
  }

  function approveDemo() {
    const next = { ...org, status: "VERIFIED" as const };
    localStorage.setItem(KEY, JSON.stringify(next));
    setOrg(next);
  }

  return (
    <main className="shell">
      <div className="topbar">
        <Link href="/" className="brand">CubPay</Link>
        <div className="badge">ONBOARDING · SIMULATION</div>
      </div>

      <section className="grid">
        <form className="panel form" onSubmit={submit}>
          <div className="eyebrow">Invite-only business onboarding</div>
          <h1 style={{fontSize:34}}>CubPay Verified</h1>
          <label>Código de invitación<input value={org.inviteCode} onChange={e=>setOrg({...org,inviteCode:e.target.value})} required /></label>
          <label>Nombre legal<input value={org.legalName} onChange={e=>setOrg({...org,legalName:e.target.value})} placeholder="Empresa Privada S.R.L." required /></label>
          <label>Registro mercantil<input value={org.registrationNo} onChange={e=>setOrg({...org,registrationNo:e.target.value})} required /></label>
          <label>Identificación fiscal<input value={org.taxId} onChange={e=>setOrg({...org,taxId:e.target.value})} required /></label>
          <label>Beneficiario final / UBO<input value={org.ownerName} onChange={e=>setOrg({...org,ownerName:e.target.value})} required /></label>
          <label>Volumen mensual esperado (USD)<input type="number" value={org.expectedMonthlyVolume} onChange={e=>setOrg({...org,expectedMonthlyVolume:e.target.value})} min="1" required /></label>
          <label>Origen de fondos<textarea value={org.sourceOfFunds} onChange={e=>setOrg({...org,sourceOfFunds:e.target.value})} required /></label>
          <button className="cta" type="submit">Enviar expediente KYB</button>
        </form>

        <section className="panel">
          <h2>Estado del expediente</h2>
          <div className={"status status-"+org.status.toLowerCase()}>{org.status}</div>
          <p>En producción, esta etapa requerirá KYB/UBO, source-of-funds, sanctions screening y revisión documental por proveedores autorizados.</p>
          {org.status === "KYB_PENDING" && <button className="cta" onClick={approveDemo}>Aprobar KYB (sandbox)</button>}
          {org.status === "VERIFIED" && <Link href="/simulation" className="cta linkButton">Entrar al Trading Desk</Link>}
          <div className="notice">Esta aprobación solo existe para demostrar el flujo del MVP.</div>
        </section>
      </section>
    </main>
  );
}
