import Link from "next/link";
import { BrandMark } from "../components/brand";
export default function Home() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <Link href="/" className="brand">
          <BrandMark />
          CubPay
        </Link>
        <nav>
          <a href="#como-funciona">Cómo funciona</a>
          <Link href="/login">
            Iniciar sesión <span aria-hidden>↗</span>
          </Link>
        </nav>
      </header>
      <section className="landing-hero">
        <div>
          <div className="eyebrow">
            <span className="live-dot" /> ENTORNO DE SIMULACIÓN
          </div>
          <h1>
            Tu operación.
            <br />
            En <em>equilibrio.</em>
          </h1>
          <p>
            Coordina necesidades de liquidez entre empresas de Cuba y Estados
            Unidos. Un espacio privado para seguir cada orden, asignación y
            liquidación simulada.
          </p>
          <div className="actions">
            <Link className="button primary" href="/onboarding">
              Registrar mi empresa <span aria-hidden>↗</span>
            </Link>
            <Link className="button secondary" href="/login">
              Entrar al portal
            </Link>
          </div>
          <p className="fine">
            Acceso por invitación · Sin fondos ni pagos reales
          </p>
        </div>
        <div
          className="hero-visual"
          aria-label="Ejemplo ilustrativo de una operación"
        >
          <div className="visual-heading">
            <span>VISTA DE OPERACIÓN</span>
            <span className="pill green">Sandbox</span>
          </div>
          <div className="route-map">
            <div className="route-end">
              <span className="country">CU</span>
              <span>Cuba</span>
            </div>
            <div className="route-line">
              <span>⇄</span>
            </div>
            <div className="route-end">
              <span className="country">US</span>
              <span>Estados Unidos</span>
            </div>
          </div>
          <div className="visual-amount">
            <span>Ejemplo de asignación</span>
            <strong>
              $100,000<span>.00</span>
            </strong>
            <span>USD · Importe ilustrativo</span>
          </div>
          <div className="visual-steps">
            <div>
              <b>01</b>
              <span>Empresa verificada</span>
              <span className="check">✓</span>
            </div>
            <div>
              <b>02</b>
              <span>Órdenes emparejadas</span>
              <span className="check">✓</span>
            </div>
            <div>
              <b>03</b>
              <span>Liquidación reconciliada</span>
              <span className="check">✓</span>
            </div>
          </div>
          <div className="visual-footer">
            <span className="live-dot" /> Trazabilidad de principio a fin
          </div>
        </div>
      </section>
      <section className="landing-strip">
        <div>
          <strong>Privado</strong>
          <span>Sin exponer contrapartes</span>
        </div>
        <div>
          <strong>Trazable</strong>
          <span>Historial de cada operación</span>
        </div>
        <div>
          <strong>Controlado</strong>
          <span>Aprobaciones por rol</span>
        </div>
        <div>
          <strong>Simulado</strong>
          <span>Cero movimiento de dinero real</span>
        </div>
      </section>
      <section id="como-funciona" className="how">
        <div className="eyebrow">DE LA SOLICITUD AL CIERRE</div>
        <h2>Un flujo claro. En cada paso.</h2>
        <div className="how-grid">
          {[
            [
              "01",
              "Verifica tu empresa",
              "Regístrate con una invitación y envía un expediente de prueba para revisión interna.",
            ],
            [
              "02",
              "Crea tu orden",
              "Indica tu necesidad, importe y propósito. Operaciones revisa y confirma el fondeo simulado.",
            ],
            [
              "03",
              "Sigue el resultado",
              "Consulta el avance de tus órdenes mientras operaciones empareja, confirma y reconcilia.",
            ],
          ].map(([n, title, copy]) => (
            <article key={n}>
              <span className="step-number">{n}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>
      <footer className="landing-footer">
        <span className="brand">CubPay</span>
        <span>MVP de simulación. Utiliza únicamente datos ficticios.</span>
        <Link href="/admin">Acceso de operaciones ↗</Link>
      </footer>
    </main>
  );
}
