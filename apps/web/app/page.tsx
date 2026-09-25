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
            <span className="live-dot" /> LIQUIDEZ EMPRESARIAL
          </div>
          <h1>
            Tu operación.
            <br />
            En <em>equilibrio.</em>
          </h1>
          <p>
            Diseñada para conectar al sector privado cubano con empresas de
            Estados Unidos y mercados internacionales. Coordina tus necesidades
            de liquidez con condiciones claras y seguimiento de cada operación.
          </p>
          <div className="actions">
            <Link className="button primary" href="/onboarding">
              Registrar mi empresa <span aria-hidden>↗</span>
            </Link>
            <Link className="button secondary" href="/login">
              Entrar al portal
            </Link>
          </div>
          <p className="fine">Acceso por invitación · Empresas verificadas</p>
        </div>
        <div
          className="hero-visual"
          aria-label="Ejemplo ilustrativo de una operación"
        >
          <div className="visual-heading">
            <span>VISTA DE OPERACIÓN</span>
            <span className="pill green">Demo</span>
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
          <strong>Conectado</strong>
          <span>Un punto de encuentro empresarial</span>
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
          <strong>Claro</strong>
          <span>Condiciones y comisiones visibles</span>
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
              "Accede por invitación y completa el perfil de tu empresa para su revisión.",
            ],
            [
              "02",
              "Crea tu orden",
              "Define el importe y el propósito de tu operación. Consulta la comisión antes de enviar tu solicitud.",
            ],
            [
              "03",
              "Sigue el resultado",
              "Consulta el estado de cada orden, sus asignaciones y su historial desde un mismo lugar.",
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
        <span className="brand">
          <BrandMark />
          CubPay
        </span>
        <span>
          Conexiones empresariales. Claridad en cada operación.
          <small>Versión de demostración · Operaciones de prueba</small>
        </span>
        <Link href="/admin">Acceso de operaciones ↗</Link>
      </footer>
    </main>
  );
}
