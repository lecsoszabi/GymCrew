/**
 * Bejelentkezés utáni visszairányítás szűrése.
 *
 * Csak saját oldalon belüli útvonalat engedünk. A "//evil.com" és a
 * "https://evil.com" is abszolút cím — ezekkel ki lehetne vinni a felhasználót
 * egy hamis bejelentkező oldalra (nyílt átirányítás).
 */
export function safeNext(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  // Protokoll-relatív ("//host") és a visszaperjeles változata is kifelé visz.
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}
