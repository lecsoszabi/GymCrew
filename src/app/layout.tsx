import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { CookieNotice } from "@/components/cookie-notice";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// A betűket a next/font a build során letölti, és a saját domainünkről szolgálja
// ki: futás közben nincs kérés a Google felé. A latin-ext kell a magyar ő-höz és ű-höz.
const barlow = Barlow({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

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
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body className="min-h-dvh bg-ink text-fg antialiased">
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}
