import { Suspense } from "react";
import LoginForm from "./login-form";
import { isSupabaseConfigured } from "@/lib/env";
import { AuthShell } from "@/components/brand";

export const metadata = { title: "Belépés · GymCrew Szeged" };

export default function LoginPage() {
  return (
    <AuthShell
      subtitle={
        <>
          Beszéljétek meg, mikor mentek kondizni,
          <br />
          és lássátok egymást útközben.
        </>
      }
    >
      {isSupabaseConfigured() ? (
        <Suspense
          fallback={<div className="h-72 animate-pulse rounded-ui border border-line bg-surface" />}
        >
          <LoginForm />
        </Suspense>
      ) : (
        <SetupNotice />
      )}
    </AuthShell>
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
      <pre className="mt-3 overflow-x-auto rounded-ui bg-surface-2 p-3 text-[11px] leading-relaxed text-muted">
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
