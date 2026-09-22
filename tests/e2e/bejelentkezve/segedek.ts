import { readFileSync } from "node:fs";
import type { BrowserContext, Page } from "@playwright/test";

/** A Supabase címe és nyilvános kulcsa a .env.local-ból (ugyanaz, mint az appé). */
export function supabaseEnv() {
  const env = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
  );
  return { url: env.NEXT_PUBLIC_SUPABASE_URL as string, key: env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string };
}

/**
 * A bejelentkezett felhasználó hozzáférési tokenje a sütiből — ugyanaz, amivel
 * az app is dolgozik, így a teszt az RLS szabályai szerint csak azt teheti,
 * amit a felhasználó maga is.
 */
export async function accessToken(context: BrowserContext): Promise<{ token: string; userId: string }> {
  const cookies = await context.cookies();
  const parts = cookies
    .filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((c) => c.value)
    .join("");
  if (!parts) throw new Error("Nincs bejelentkezett munkamenet — futtasd: node scripts/teszt-belepes.mjs a");
  const json = parts.startsWith("base64-")
    ? Buffer.from(parts.slice(7), "base64url").toString("utf8")
    : decodeURIComponent(parts);
  const data = JSON.parse(json);
  return { token: data.access_token, userId: data.user.id };
}

/** Kis REST-kliens a felhasználó nevében. */
export async function rest(context: BrowserContext) {
  const { url, key } = supabaseEnv();
  const { token, userId } = await accessToken(context);
  const headers = {
    apikey: key,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
  const call = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  };
  return { userId, call };
}

/**
 * Telefonos GPS szimulálása. Mint a valódi telefon: a figyelés indításakor
 * azonnal visszaad egy tárolt pozíciót, utána 150 ms-onként pár métert "remeg".
 * A hívásokat a window.__gps-be számolja.
 */
export async function fakePhoneGps(page: Page, at = { lat: 46.253, lng: 20.1414 }) {
  await page.addInitScript((start) => {
    const w = window as unknown as { __gps: { watch: number; clear: number; updates: number } };
    w.__gps = { watch: 0, clear: 0, updates: 0 };
    const timers = new Map<number, ReturnType<typeof setInterval>>();
    const fix = (lat: number, lng: number) =>
      ({
        coords: { latitude: lat, longitude: lng, accuracy: 12, heading: null, altitude: null, altitudeAccuracy: null, speed: null },
        timestamp: Date.now(),
      }) as GeolocationPosition;

    const geo = {
      getCurrentPosition(ok: PositionCallback) {
        setTimeout(() => ok(fix(start.lat, start.lng)), 10);
      },
      watchPosition(ok: PositionCallback) {
        w.__gps.watch++;
        const id = w.__gps.watch;
        setTimeout(() => ok(fix(start.lat, start.lng)), 0);
        let i = 0;
        timers.set(
          id,
          setInterval(() => {
            i++;
            w.__gps.updates++;
            const j = Math.sin(i) * 0.00002; // kb. 2 méter
            ok(fix(start.lat + j, start.lng + j));
          }, 150)
        );
        return id;
      },
      clearWatch(id: number) {
        w.__gps.clear++;
        clearInterval(timers.get(id));
        timers.delete(id);
      },
    };
    Object.defineProperty(navigator, "geolocation", { value: geo, configurable: true });
    if (navigator.permissions) {
      const orig = navigator.permissions.query.bind(navigator.permissions);
      navigator.permissions.query = ((d: PermissionDescriptor) =>
        d?.name === "geolocation"
          ? Promise.resolve({ state: "granted", onchange: null } as unknown as PermissionStatus)
          : orig(d)) as typeof navigator.permissions.query;
    }
  }, at);
}
