import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewPasswordForm from "./new-password-form";

export const metadata = { title: "Új jelszó · GymCrew" };

/**
 * Új jelszó beállítása. Ide a jelszó-visszaállító kód beírása után érkezik a
 * felhasználó (akkor már be van léptetve); bejelentkezés nélkül a middleware
 * a loginra küld.
 */
export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center bg-black px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Új jelszó</h1>
          <p className="mt-2 break-all text-sm text-muted">
            Fiók: <span className="font-semibold text-fg">{user.email}</span>
          </p>
        </div>
        <NewPasswordForm email={user.email ?? ""} />
      </div>
    </main>
  );
}
