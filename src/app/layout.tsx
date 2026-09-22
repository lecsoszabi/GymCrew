import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  // Ehhez képest oldódnak fel a relatív hivatkozások (ikon, megosztási kép).
  metadataBase: new URL(siteUrl),
  title: "GymCrew Szeged",
  description: "Beszéljétek meg, mikor mentek kondizni, és lássátok egymást útközben.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "GymCrew" },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body className="min-h-dvh bg-ink text-fg antialiased">{children}</body>
    </html>
  );
}
