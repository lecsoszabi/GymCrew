"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * A regisztráció és a jelszó-visszaállítás a Supabase biztonsági sütijeit
 * (…-code-verifier) is beteszi, és 400 napig ott hagyná őket. A kódos
 * megerősítéshez és a jelszavas belépéshez nincs rájuk szükség, ezért a
 * sikeres belépés után töröljük őket (adattakarékosság, GDPR 5. cikk).
 */
export function clearCodeVerifiers() {
  for (const cookie of document.cookie.split("; ")) {
    const name = cookie.slice(0, cookie.indexOf("="));
    if (/^sb-.+-code-verifier(\.\d+)?$/.test(name)) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    }
  }
}
