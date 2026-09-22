import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/brand";
import OnboardingForm from "./onboarding-form";

export const metadata = { title: "Add meg az adataid · GymCrew" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <AuthShell wide top>
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">1. lépés</p>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight">Pár adat rólad</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Csak a neved kötelező. A testadatokból jönnek a saját statisztikáid: a csapattársaid
          nem látják őket, és a profilodnál bármikor módosíthatod vagy törölheted őket.
        </p>
      </header>

      <OnboardingForm
        userId={user.id}
        initialName={profile?.display_name ?? ""}
        initialAvatar={profile?.avatar_url ?? null}
      />
    </AuthShell>
  );
}
