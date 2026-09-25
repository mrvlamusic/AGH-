import "./fonts.css";
import "./globals.css";
import "./premium.css";
export const metadata = {
  title: "USGC · US Global Commercial",
  description:
    "USGC — Plataforma de pagos y operaciones empresariales. US Global Commercial. Versión de demostración.",
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
