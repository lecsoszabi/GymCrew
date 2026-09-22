import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/brand";
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
    <AuthShell>
      <NewPasswordForm email={user.email ?? ""} />
    </AuthShell>
  );
}
