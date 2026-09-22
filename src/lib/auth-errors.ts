/** A Supabase angol hibaüzeneteit érthető magyarra fordítjuk. */
export function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Hibás e-mail vagy jelszó.";
  if (m.includes("email not confirmed")) return "Előbb erősítsd meg az e-mail címedet.";
  if (m.includes("token has expired or is invalid"))
    return "Hibás vagy lejárt kód. Nézd meg, jól írtad-e be — vagy kérj újat.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Ezzel az e-maillel már van fiók. Lépj be inkább.";
  if (m.includes("password should be at least")) return "A jelszó túl rövid (min. 8 karakter).";
  if (m.includes("should be different from the old password"))
    return "Az új jelszó nem lehet ugyanaz, mint a régi.";
  if (m.includes("password should contain") || m.includes("weak") || m.includes("easy to guess"))
    return "Ez a jelszó túl gyenge. Válassz hosszabbat, betűkkel és számokkal vegyesen.";
  if (m.includes("auth session missing") || m.includes("session_not_found"))
    return "Lejárt a munkamenet. Kérj új kódot az „Elfelejtett jelszó?” gombbal.";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "Ez nem érvényes e-mail cím.";
  const wait = retryAfterSeconds(msg);
  if (wait !== null) return `Túl gyorsan kérted újra. ${wait} másodperc múlva próbáld megint.`;
  if (m.includes("email rate limit"))
    return "Most nem tudunk több levelet küldeni. Próbáld újra egy kicsit később.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Túl sok próbálkozás. Várj egy kicsit.";
  if (m.includes("failed to fetch"))
    return "Nincs kapcsolat a szerverrel. Ellenőrizd a hálózatot és a beállításokat.";
  return msg;
}

/** Ha a Supabase megírja, hány másodperc múlva lehet újra levelet kérni. */
export function retryAfterSeconds(msg: string): number | null {
  const m = /after (\d+) seconds?/i.exec(msg);
  return m ? Number(m[1]) : null;
}
