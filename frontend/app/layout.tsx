import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Imp Tracker",
  description: "Estado de servicios públicos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-950 min-h-screen antialiased">{children}</body>
    </html>
  );
}
