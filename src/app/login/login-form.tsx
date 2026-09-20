"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/url";

type Mode = "signin" | "signup";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ha a regisztrációhoz e-mail megerősítés kell, erre a képernyőre váltunk.
  const [sentTo, setSentTo] = useState<string | null>(null);

  // A callback pontos okot ad vissza, ne mossuk egybe őket.
  const linkHiba = params.get("error");
  const [ujraKuldve, setUjraKuldve] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const supabase = createClient();

    try {
      if (mode === "signup") {
        if (name.trim().length < 2) throw new Error("Adj meg egy nevet (legalább 2 karakter).");
        if (password.length < 8) throw new Error("A jelszó legyen legalább 8 karakter.");

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;

        if (!data.session) {
          setSentTo(email.trim());
          setBusy(false);
          return;
        }
        router.replace("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.replace(next);
      }
      router.refresh();
    } catch (err) {
      setError(translate(err instanceof Error ? err.message : String(err)));
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div className="card animate-fade-up p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/12">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-accent" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
            <path d="m3.5 7 8.5 6 8.5-6" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-lg font-bold tracking-tight">Nézd meg a postádat</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
          Küldtünk egy megerősítő linket ide:
        </p>
        <p className="mt-1.5 break-all text-sm font-semibold text-accent">{sentTo}</p>
        <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed text-muted">
          Kattints rá, és egyből bent is vagy — nem kell újra beírnod a jelszavad.
          Ha pár percen belül nem jön meg, nézd meg a spam mappát.
        </p>
        <button
          className="btn btn-ghost mt-5 w-full"
          onClick={() => {
            setSentTo(null);
            setMode("signin");
            setPassword("");
          }}
        >
          Vissza a belépéshez
        </button>
      </div>
    );
  }

  return (
    <div className="card p-5 animate-fade-up">
      {linkHiba && !ujraKuldve && (
        <div className="mb-4 rounded-lg bg-maybe/10 px-3 py-2.5">
          <p role="alert" className="text-sm leading-relaxed text-maybe">
            {LINK_HIBAK[linkHiba] ?? LINK_HIBAK.invalid}
          </p>
          {linkHiba !== "masik-bongeszo" && (
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-accent underline underline-offset-2 disabled:opacity-50"
              disabled={busy || !email.includes("@")}
              onClick={async () => {
                setBusy(true);
                setError(null);
                const supabase = createClient();
                const { error } = await supabase.auth.resend({
                  type: "signup",
                  email: email.trim(),
                  options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
                });
                setBusy(false);
                if (error) setError(translate(error.message));
                else setUjraKuldve(true);
              }}
            >
              {email.includes("@")
                ? "Küldjetek új linket erre a címre"
                : "Írd be fent az e-mail címed az új linkhez"}
            </button>
          )}
        </div>
      )}

      {ujraKuldve && (
        <p role="alert" className="mb-4 rounded-lg bg-accent/10 px-3 py-2.5 text-sm leading-relaxed text-accent">
          Elküldtük az új megerősítő linket. Fontos: <strong>ugyanabban a böngészőben</strong>{" "}
          nyisd meg, ahol most vagy.
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`rounded-lg py-2.5 text-sm font-semibold transition ${
              mode === m ? "bg-accent text-ink" : "text-muted hover:text-fg"
            }`}
          >
            {m === "signin" ? "Belépés" : "Regisztráció"}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signup" && (
          <div>
            <label className="label" htmlFor="name">
              Neved
            </label>
            <input
              id="name"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Albert"
              autoComplete="name"
              required
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="te@pelda.hu"
            autoComplete="email"
            inputMode="email"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Jelszó
          </label>
          <input
            id="password"
            type="password"
            className="field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Legalább 8 karakter" : "••••••••"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-no/10 px-3 py-2.5 text-sm text-no">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Egy pillanat…" : mode === "signin" ? "Belépés" : "Fiók létrehozása"}
        </button>
      </form>
    </div>
  );
}

/** A callback által visszaadott okok emberi nyelven. */
const LINK_HIBAK: Record<string, string> = {
  expired:
    "A megerősítő link lejárt. Kérj egy újat — az e-mail címed írd be fent.",
  invalid:
    "A megerősítő link érvénytelen vagy már fel lett használva. Ha egyszer már rákattintottál, próbálj egyszerűen belépni.",
  "masik-bongeszo":
    "Ezt a linket abban a böngészőben kell megnyitni, ahol a regisztrációt elkezdted. Ha gépen regisztráltál és telefonon kaptad a levelet, másold át a linket a gépre — vagy regisztrálj újra azon az eszközön, ahol használni fogod.",
  auth: "A megerősítő link nem működött. Kérj egy újat.",
};

/** A Supabase angol hibaüzeneteit érthető magyarra fordítjuk. */
function translate(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Hibás e-mail vagy jelszó.";
  if (m.includes("email not confirmed")) return "Előbb erősítsd meg az e-mail címedet.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Ezzel az e-maillel már van fiók. Lépj be inkább.";
  if (m.includes("password should be at least")) return "A jelszó túl rövid (min. 8 karakter).";
  if (m.includes("unable to validate email") || m.includes("invalid email"))
    return "Ez nem érvényes e-mail cím.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Túl sok próbálkozás. Várj egy kicsit.";
  if (m.includes("failed to fetch"))
    return "Nincs kapcsolat a szerverrel. Ellenőrizd a hálózatot és a beállításokat.";
  return msg;
}
