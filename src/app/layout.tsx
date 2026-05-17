import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MySawit — Platform Manajemen Kebun Sawit",
  description: "Platform terintegrasi untuk manajemen perkebunan kelapa sawit BurhanSawit. Kelola panen, pengiriman, dan payroll secara efisien.",
  keywords: ["sawit", "palm oil", "perkebunan", "manajemen", "MySawit"],
  authors: [{ name: "BurhanSawit" }],
  robots: "noindex",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
