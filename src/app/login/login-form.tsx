"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Csak saját oldalon belüli útvonalra irányítunk át. A "//evil.com" és a
  // "https://evil.com" is abszolút cím — ezekkel ki lehetne vinni az embert
  // egy hamis bejelentkező oldalra, ezért mindkettőt elvetjük.
  const next = safeNext(params.get("next"));

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
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
          setInfo("Elküldtünk egy megerősítő e-mailt. Kattints a linkre, aztán jöhet a belépés.");
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

  return (
    <div className="card p-5 animate-fade-up">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(["signin", "signup"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
              setInfo(null);
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
              placeholder="Kristóf"
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
        {info && (
          <p role="status" className="rounded-lg bg-accent/10 px-3 py-2.5 text-sm text-accent">
            {info}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Egy pillanat…" : mode === "signin" ? "Belépés" : "Fiók létrehozása"}
        </button>
      </form>
    </div>
  );
}

/** Csak "/valami" alakú, oldalon belüli útvonalat engedünk át. */
function safeNext(raw: string | null): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

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
