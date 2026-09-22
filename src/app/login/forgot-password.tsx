"use client";

import { useState } from "react";
import { translateAuthError } from "@/lib/auth-errors";
import { CodeStep, sendCode } from "./code-step";

/**
 * Elfelejtett jelszó: e-mail cím → kód a levélben → új jelszó (/reset-password).
 * Ugyanaz a kódbeíró képernyő, mint a regisztrációnál.
 */
export function ForgotPassword({
  initialEmail,
  onBack,
  onVerified,
}: {
  initialEmail: string;
  onBack: () => void;
  onVerified: () => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await sendCode("recovery", email.trim());
    setBusy(false);
    if (error) {
      setError(translateAuthError(error.message));
      return;
    }
    setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <CodeStep purpose="recovery" email={sentTo} justSent onBack={onBack} onVerified={onVerified} />
    );
  }

  return (
    <div className="card animate-fade-up p-5">
      <h2 className="text-lg font-bold tracking-tight">Elfelejtett jelszó</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Add meg az e-mail címed, és küldünk rá egy kódot. Azzal új jelszót állíthatsz be.
      </p>

      <form onSubmit={request} className="mt-5 space-y-4">
        <div>
          <label className="label" htmlFor="forgot-email">
            E-mail
          </label>
          <input
            id="forgot-email"
            type="email"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="te@pelda.hu"
            autoComplete="email"
            inputMode="email"
            autoFocus={!initialEmail}
            required
          />
        </div>

        {error && (
          <p role="alert" className="rounded-ui bg-no/10 px-3 py-2.5 text-sm text-no">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {busy ? "Küldés…" : "Kódot kérek"}
        </button>
      </form>

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
