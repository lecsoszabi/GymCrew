import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/url";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * E-mail megerősítés / magic link visszairányítása.
 *
 * Kétféleképpen érkezhet vissza a felhasználó, és mindkettőt kezelni kell:
 *
 *  - `token_hash` + `type` — a Supabase szerveroldalon ellenőriz. Ez **bármelyik
 *    böngészőben működik**, mert nincs szükség helyben tárolt titokra.
 *  - `code` — PKCE. Ehhez kell a regisztrációkor a böngészőben eltárolt
 *    „code verifier", ezért **csak ugyanabban a böngészőben** működik.
 *    Ha valaki asztali gépen regisztrál, de telefonon nyitja meg a levelet,
 *    ez a lépés elbukik — és ez nem lejárat, hanem hiányzó titok.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));
  // A jelszó-visszaállító link bármilyen hibájánál ugyanaz a teendő: kódot kérni.
  const recovery = next === "/reset-password";

  const fail = (reason: string) =>
    NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(recovery ? "jelszo-link" : reason)}`
    );

  // A Supabase maga is küldhet hibát (pl. tényleg lejárt link).
  const supabaseError = searchParams.get("error_code") ?? searchParams.get("error");
  if (supabaseError) {
    const leirat = searchParams.get("error_description") ?? "";
    if (/expired/i.test(supabaseError + leirat)) return fail("expired");
    return fail("invalid");
  }

  const supabase = await createClient();

  // 1) Szerveroldali ellenőrzés — böngészőfüggetlen.
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return fail(/expired/i.test(error.message) ? "expired" : "invalid");
  }

  // 2) PKCE — csak az eredeti böngészőben van meg a titok.
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);

    // A hiányzó verifier tipikus üzenetei — ez másik böngészőt jelent.
    if (/verifier|code challenge|both auth code/i.test(error.message)) {
      return fail("masik-bongeszo");
    }
    return fail(/expired/i.test(error.message) ? "expired" : "invalid");
  }

  return fail("invalid");
}
