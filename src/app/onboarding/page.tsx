import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    <main className="mx-auto min-h-dvh w-full max-w-lg px-5 py-10">
      <header className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">1. lépés</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight">Pár adat rólad</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          A testadatokból jönnek a statisztikáid. A testsúlyt bármikor frissítheted a
          profilodnál — az app eltárolja a változást.
        </p>
      </header>

      <OnboardingForm
        userId={user.id}
        initialName={profile?.display_name ?? ""}
        initialAvatar={profile?.avatar_url ?? null}
      />
    </main>
  );
}
