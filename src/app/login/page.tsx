import { Suspense } from "react";
import LoginForm from "./login-form";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "Belépés · GymCrew Szeged" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-black px-5 py-12">
      {/* halvány fénykör a háttérben */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #c8ff4d 0%, transparent 65%)" }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-9 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface">
            <svg viewBox="0 0 512 512" className="h-9 w-9" aria-hidden>
              <g stroke="#c8ff4d" strokeWidth="34" strokeLinecap="round" fill="none">
                <path d="M148 256h216" />
                <path d="M120 200v112M92 222v68" />
                <path d="M392 200v112M420 222v68" />
              </g>
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">GymCrew Szeged</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Beszéljétek meg, mikor mentek kondizni —<br />
            és lássátok egymást útközben.
          </p>
        </div>

        {isSupabaseConfigured() ? (
          <Suspense
            fallback={<div className="h-72 animate-pulse rounded-2xl border border-line bg-surface" />}
          >
            <LoginForm />
          </Suspense>
        ) : (
          <SetupNotice />
        )}

        <p className="mt-8 text-center text-[11px] leading-relaxed text-muted/70">
          A helyzetedet csak a csoporttársaid látják, kizárólag az edzés előtti
          fél órában, amíg be nem érsz a terembe.
        </p>
      </div>
    </main>
  );
}

/** Akkor látszik, ha a Supabase kulcsok még nincsenek beállítva. */
function SetupNotice() {
  return (
    <div className="card p-5 text-left">
      <h2 className="text-sm font-bold">Még nincs beállítva a Supabase</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Az app csak akkor enged be bárkit, ha megvan az adatbázis-kapcsolat. Két érték kell
        a <code className="text-accent">.env.local</code> fájlba:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-3 text-[11px] leading-relaxed text-muted">
{`NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...`}
      </pre>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        A lépésről lépésre útmutató a projekt <code className="text-accent">README.md</code>
        {" "}fájljában van. Szerkesztés után indítsd újra a szervert.
      </p>
    </div>
  );
}
