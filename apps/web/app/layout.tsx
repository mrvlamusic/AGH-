import "./fonts.css";
import "./globals.css";
import "./premium.css";
export const metadata = {
  title: "CubPay · Liquidez empresarial",
  description:
    "Liquidez empresarial, condiciones claras y seguimiento de cada operación. Versión de demostración.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
