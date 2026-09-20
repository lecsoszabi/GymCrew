import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Alapvető védelmi fejlécek minden válaszon.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Az oldal nem ágyazható iframe-be → nincs kattintás-eltérítés.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // A böngésző ne találgassa a tartalomtípust.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Idegen oldalra ne szivárogjon ki a teljes URL.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // A helyzetlekérést csak a saját oldalunk kérheti; kamera/mikrofon tiltva.
          {
            key: "Permissions-Policy",
            value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()",
          },
          // HTTPS kikényszerítése (a Vercel amúgy is HTTPS-t ad).
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
};

export default nextConfig;
