import { createClient } from "@/lib/supabase/server";
import type { Gym } from "@/lib/types";
import GroupGateForms from "./group-gate-forms";

/** Ez fogad, ha még nincs csoportod: meghívók, új csapat, vagy belépés kóddal. */
export default async function GroupGate({ gyms, email }: { gyms: Gym[]; email: string }) {
  const supabase = await createClient();
  const { data: invites } = await supabase
    .from("group_invites")
    .select("id, group_id, status, groups(name)")
    .eq("invited_email", email.toLowerCase())
    .eq("status", "pending");

  const pending = (invites ?? []).map((i) => ({
    id: i.id as string,
    groupName:
      ((i as unknown as { groups: { name: string } | null }).groups?.name) ?? "Ismeretlen csapat",
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Csapat kell hozzá</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Az app csoportban működik. Hozz létre egyet és hívd be a többieket, vagy lépj be
          egy meglévőbe a kóddal. Egyszerre egy csapatnak lehetsz tagja.
        </p>
      </header>

      <GroupGateForms gyms={gyms} pendingInvites={pending} />
    </div>
  );
}
