"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const r = await fetch("/api/auth/" + (register ? "register" : "login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.message);
      router.push(data.actor.role === "ADMIN" ? "/admin" : "/simulation");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo conectar. Inténtalo de nuevo.",
      );
      setBusy(false);
    }
  }
  return (
    <main className="auth-layout">
      <aside className="auth-aside">
        <Link href="/" className="brand">
          <span className="brand-mark">C</span>CubPay
        </Link>
        <div>
          <div className="eyebrow">TU PORTAL EMPRESARIAL</div>
          <h1>
            Claridad para
            <br />
            cada operación.
          </h1>
          <p>
            Acceso privado, órdenes trazables y un proceso de revisión de
            principio a fin.
          </p>
          <div className="auth-note">
            <span className="live-dot" /> Solo simulación
            <br />
            <small>
              Este entorno no acepta ni mueve dinero real. Usa empresas,
              personas y datos ficticios.
            </small>
          </div>
        </div>
        <span className="fine">Cuba ↔ Estados Unidos</span>
      </aside>
      <section className="auth-main">
        <Link href="/" className="back-link">
          ← Volver al inicio
        </Link>
        <div className="auth-form">
          <div className="eyebrow">
            {register ? "ACCESO POR INVITACIÓN" : "BIENVENIDO DE NUEVO"}
          </div>
          <h2>{register ? "Registra tu empresa" : "Inicia sesión"}</h2>
          <p>
            {register
              ? "Completa el expediente de prueba. Operaciones revisará tu solicitud antes de habilitar las órdenes."
              : "Accede a tu espacio de trabajo de CubPay."}
          </p>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <form onSubmit={submit} className="form-stack">
            {register && (
              <>
                <label>
                  Código de invitación
                  <input
                    name="inviteCode"
                    required
                    maxLength={100}
                    autoComplete="off"
                    placeholder="CP-…"
                  />
                </label>
                <div className="field-grid">
                  <label>
                    Nombre legal de la empresa
                    <input name="legalName" required maxLength={200} />
                  </label>
                  <label>
                    País
                    <select name="country">
                      <option value="CU">Cuba</option>
                      <option value="US">Estados Unidos</option>
                    </select>
                  </label>
                  <label>
                    Registro mercantil de prueba
                    <input name="registrationNo" required maxLength={200} />
                  </label>
                  <label>
                    Identificación fiscal de prueba
                    <input name="taxId" required maxLength={200} />
                  </label>
                </div>
                <label>
                  Beneficiario final de prueba
                  <input name="ownerName" required maxLength={200} />
                </label>
                <label>
                  Origen de fondos simulado
                  <textarea
                    name="sourceOfFunds"
                    required
                    maxLength={1000}
                    rows={2}
                  />
                </label>
              </>
            )}
            <label>
              Correo electrónico
              <input
                type="email"
                name="email"
                autoComplete="username"
                required
                maxLength={254}
                placeholder="tu@empresa.com"
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                name="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={12}
                maxLength={128}
              />
              <small>Mínimo 12 caracteres.</small>
            </label>
            <button className="button primary full" disabled={busy}>
              {busy
                ? "Procesando…"
                : register
                  ? "Enviar expediente y crear cuenta"
                  : "Iniciar sesión"}{" "}
              <span aria-hidden>↗</span>
            </button>
          </form>
          <p className="auth-switch">
            {register ? "¿Ya tienes una cuenta?" : "¿Tienes una invitación?"}{" "}
            <Link href={register ? "/login" : "/onboarding"}>
              {register ? "Inicia sesión" : "Registra tu empresa"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
