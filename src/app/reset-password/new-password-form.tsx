"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/auth-errors";
import { PasswordField } from "@/components/password-field";

export default function NewPasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("A jelszó legyen legalább 8 karakter.");
      return;
    }
    if (password !== again) {
      setError("A két jelszó nem egyezik.");
      return;
    }

    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setError(translateAuthError(error.message));
      setBusy(false);
      return;
    }
    router.replace("/app");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card animate-fade-up space-y-4 p-5">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Új jelszó</h2>
        <p className="mt-1.5 break-all text-sm leading-relaxed text-muted">
          Fiók: <span className="font-semibold text-fg">{email}</span>
        </p>
      </div>

      {/* A jelszókezelő így tudja, melyik fiókhoz mentse az új jelszót. */}
      <input
        type="email"
        name="username"
        autoComplete="username"
        value={email}
        readOnly
        hidden
      />

      <div>
        <label className="label" htmlFor="new-password">
          Új jelszó
        </label>
        <PasswordField
          id="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Legalább 8 karakter"
          autoComplete="new-password"
          autoFocus
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="new-password-again">
          Még egyszer
        </label>
        <PasswordField
          id="new-password-again"
          value={again}
          onChange={(e) => setAgain(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>

      {error && (
        <p role="alert" className="rounded-ui bg-no/10 px-3 py-2.5 text-sm text-no">
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? "Mentés…" : "Mentem az új jelszót"}
      </button>
    </form>
  );
}
