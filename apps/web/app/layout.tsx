import "./globals.css";
export const metadata = {
  title: "CubPay · Portal de simulación",
  description:
    "Coordinación privada de liquidez empresarial. MVP de simulación; sin fondos reales.",
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
