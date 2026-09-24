import "./globals.css";

export const metadata = {
  title: "CubPay",
  description: "Private B2B liquidity & settlement network",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
