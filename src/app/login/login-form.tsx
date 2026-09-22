"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/url";
import { translateAuthError as translate } from "@/lib/auth-errors";
import { CodeStep } from "./code-step";
import { ForgotPassword } from "./forgot-password";
import { PasswordField } from "@/components/password-field";

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
  // Ha a címet még meg kell erősíteni, a kódbeíró képernyőre váltunk.
  const [codeFor, setCodeFor] = useState<{ email: string; justSent: boolean } | null>(null);
  const [forgot, setForgot] = useState(false);

  // A callback pontos okot ad vissza, ne mossuk egybe őket.
  const linkHiba = params.get("error");
  const [linkHibaKezelve, setLinkHibaKezelve] = useState(false);

  function openCode(to: string, justSent: boolean) {
    setCodeFor({ email: to, justSent });
    setLinkHibaKezelve(true);
    setBusy(false);
  }

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
          openCode(email.trim(), true);
          return;
        }
        router.replace("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        // Regisztrált, de a kódot még nem írta be: ott folytatja, ahol abbahagyta.
        if (error && (error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message))) {
          openCode(email.trim(), false);
          return;
        }
        if (error) throw error;
        router.replace(next);
      }
      router.refresh();
    } catch (err) {
      setError(translate(err instanceof Error ? err.message : String(err)));
      setBusy(false);
    }
  }

  if (codeFor) {
    return (
      <CodeStep
        email={codeFor.email}
        justSent={codeFor.justSent}
        onBack={() => {
          setCodeFor(null);
          setMode("signin");
          setPassword("");
          setError(null);
        }}
        onVerified={() => {
          router.replace("/onboarding");
          router.refresh();
        }}
      />
    );
  }

  if (forgot) {
    return (
      <ForgotPassword
        initialEmail={email.trim()}
        onBack={() => {
          setForgot(false);
          setError(null);
        }}
        onVerified={() => {
          router.replace("/reset-password");
          router.refresh();
        }}
      />
    );
  }

  // Másik böngészőben nyitott link: a cím már meg van erősítve, csak belépni kell.
  const linkMegerositve = linkHiba === "masik-bongeszo";
  // A jelszó-visszaállító linknél nem megerősítő kód kell, hanem jelszó-visszaállító.
  const jelszoLink = linkHiba === "jelszo-link";

  return (
    <div className="card p-5 animate-fade-up">
      {linkHiba && !linkHibaKezelve && (
        <div className={`mb-4 rounded-lg px-3 py-2.5 ${linkMegerositve ? "bg-accent/10" : "bg-maybe/10"}`}>
          <p
            role="alert"
            className={`text-sm leading-relaxed ${linkMegerositve ? "text-accent" : "text-maybe"}`}
          >
            {LINK_HIBAK[linkHiba] ?? LINK_HIBAK.invalid}
          </p>
          {jelszoLink && (
            <button
              type="button"
              className="tap mt-2 text-xs font-semibold text-accent underline underline-offset-2"
              onClick={() => {
                setLinkHibaKezelve(true);
                setForgot(true);
              }}
            >
              Kérek jelszó-visszaállító kódot
            </button>
          )}
          {!linkMegerositve && !jelszoLink && (
            <button
              type="button"
              className="tap mt-2 text-xs font-semibold text-accent underline underline-offset-2 disabled:opacity-50"
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
                if (error) {
                  setBusy(false);
                  setError(translate(error.message));
                } else {
                  openCode(email.trim(), true);
                }
              }}
            >
              {email.includes("@")
                ? "Küldjetek megerősítő kódot erre a címre"
                : "Írd be alább az e-mail címed, és küldünk egy kódot"}
            </button>
          )}
        </div>
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
            className={`rounded-lg py-3 text-sm font-semibold transition ${
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
              placeholder="Kovács Anna"
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
          <PasswordField
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Legalább 8 karakter" : "••••••••"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            required
          />
          {mode === "signin" && (
            <button
              type="button"
              className="mt-1 inline-flex min-h-11 items-center text-xs font-semibold text-accent underline-offset-2 hover:underline"
              onClick={() => {
                setError(null);
                setForgot(true);
              }}
            >
              Elfelejtett jelszó?
            </button>
          )}
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
    "A megerősítő link lejárt. Kérj helyette egy kódot, azt bármelyik eszközön beírhatod.",
  invalid:
    "A megerősítő link érvénytelen vagy már fel lett használva. Ha egyszer már rákattintottál, próbálj egyszerűen belépni.",
  // A Supabase a link megnyitásakor már megerősítette a címet, csak a
  // beléptetéshez hiányzik a regisztráló böngésző titka.
  "masik-bongeszo":
    "A címedet megerősítettük ✓ Csak ebben a böngészőben nem tudtunk automatikusan beléptetni, mert a regisztráció egy másikban kezdődött. Lépj be alább az e-mail címeddel és a jelszavaddal.",
  auth: "A megerősítő link nem működött. Kérj helyette egy kódot.",
  "jelszo-link":
    "A jelszó-visszaállító link nem működött: lejárt, már felhasználták, vagy másik böngészőben nyitottad meg. Kérj inkább kódot, azt bármelyik eszközön beírhatod.",
};
