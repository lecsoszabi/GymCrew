/**
 * A Supabase kulcsok megléte. Amíg nincsenek beállítva, az app nem enged be
 * senkit — a login oldal helyett egy rövid beállítási útmutató fogad.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (url.includes("placeholder") || key.includes("placeholder")) return false;
  return /^https:\/\/.+\.supabase\.(co|in)$/.test(url.replace(/\/$/, ""));
}
