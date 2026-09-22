"use client";

import { useEffect, useState } from "react";
import { clearCodeVerifiers, createClient } from "@/lib/supabase/client";
import { retryAfterSeconds, translateAuthError } from "@/lib/auth-errors";

const RESEND_WAIT = 60;

/** Honnan jön a kód: regisztráció megerősítése vagy elfelejtett jelszó. */
export type CodePurpose = "signup" | "recovery";

/** Új levél kérése — a jelszó-visszaállításnál ugyanaz, mint az első. */
export function sendCode(purpose: CodePurpose, email: string) {
  const auth = createClient().auth;
  if (purpose === "recovery") {
    // Ha valaki mégis a levélben lévő linket nyitja meg, az új jelszó oldalára érjen.
    return auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
  }
  return auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
  });
}

/**
 * A levélben kapott kód beírása — regisztráció megerősítéséhez és elfelejtett
 * jelszóhoz.
 *
 * Link helyett azért kód, mert a link (PKCE miatt) csak abban a böngészőben
 * működik, ahol a folyamat elkezdődött, és a levelezők linkellenőrzője
 * még a felhasználó előtt "rákattinthat". A kódot bármelyik eszközről be
 * lehet írni, és azt senki nem használja el helyette.
 */
export function CodeStep({
  email,
  justSent,
  purpose = "signup",
  onBack,
  onVerified,
}: {
  email: string;
  /** Épp most ment ki a levél — új kódot csak kicsit később lehet kérni. */
  justSent: boolean;
  purpose?: CodePurpose;
  onBack: () => void;
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(justSent ? RESEND_WAIT : 0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const { error } = await createClient().auth.verifyOtp({
      email,
      token: code,
      type: purpose === "recovery" ? "recovery" : "email",
    });
    if (error) {
      setError(translateAuthError(error.message));
      setBusy(false);
      return;
    }
    // Sikernél a gomb foglalt marad, amíg a következő oldal betölt.
    clearCodeVerifiers();
    onVerified();
  }

  async function resend() {
    setError(null);
    setInfo(null);
    setBusy(true);
    const { error } = await sendCode(purpose, email);
    setBusy(false);
    if (error) {
      setError(translateAuthError(error.message));
      setCooldown(retryAfterSeconds(error.message) ?? 0);
      return;
    }
    setCode("");
    setInfo("Elküldtük az új kódot. A korábbi már nem érvényes.");
    setCooldown(RESEND_WAIT);
  }

  return (
    <div className="card animate-fade-up p-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-ui bg-accent/12">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-accent" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
            <path d="m3.5 7 8.5 6 8.5-6" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-lg font-bold tracking-tight">Nézd meg a postádat</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
          {purpose === "recovery"
            ? // Nem áruljuk el, van-e ilyen fiók, ahogy a Supabase sem.
              "Ha van fiókod ezzel a címmel, küldtünk rá egy kódot, amivel új jelszót állíthatsz be:"
            : justSent
              ? "Küldtünk egy megerősítő kódot ide:"
              : "Ezt a címet még nem erősítetted meg. A kódot ide küldtük:"}
        </p>
        <p className="mt-1.5 break-all text-sm font-semibold text-accent">{email}</p>
      </div>

      <form onSubmit={verify} className="mt-6">
        <label className="label" htmlFor="otp">
          Megerősítő kód
        </label>
        <input
          id="otp"
          className="field text-center font-display text-3xl font-bold tracking-[0.3em] tabular-nums placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:tracking-normal"
          value={code}
          // Beillesztésnél a szóközt, kötőjelet is elhagyjuk. A hossz a Supabase
          // beállítása (6–10 jegy), ezért itt nem kötjük meg.
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="A kód a levélből"
          autoFocus
        />

        {error && (
          <p role="alert" className="mt-3 rounded-ui bg-no/10 px-3 py-2.5 text-sm text-no">
            {error}
          </p>
        )}
        {info && (
          <p role="status" className="mt-3 rounded-ui bg-accent/10 px-3 py-2.5 text-sm text-accent">
            {info}
          </p>
        )}

        <button type="submit" className="btn btn-primary mt-4 w-full" disabled={busy || code.length < 6}>
          {busy ? "Egy pillanat…" : purpose === "recovery" ? "Tovább az új jelszóhoz" : "Megerősítem"}
        </button>
      </form>

      <button type="button" className="btn btn-ghost mt-2 w-full" disabled={busy || cooldown > 0} onClick={resend}>
        {cooldown > 0 ? `Új kódot ${cooldown} mp múlva kérhetsz` : "Új kódot kérek"}
      </button>

      <p className="mx-auto mt-4 max-w-xs text-center text-xs leading-relaxed text-muted">
        Ha pár percen belül nem jön meg, nézd meg a spam mappát is.
      </p>

      <button
        type="button"
        className="mt-2 min-h-11 w-full text-center text-xs font-semibold text-muted underline underline-offset-2 hover:text-fg"
        onClick={onBack}
      >
        Vissza a belépéshez
      </button>
    </div>
  );
}
