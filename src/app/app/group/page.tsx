import { getCrew, getGyms } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import GroupGate from "@/components/group-gate";
import GroupManager from "./group-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Csapat · GymCrew" };

export default async function GroupPage() {
  const crew = await getCrew();
  const gyms = await getGyms();

  if (!crew.group) return <GroupGate gyms={gyms} email={crew.email} />;

  const supabase = await createClient();
  const { data: invites } = await supabase
    .from("group_invites")
    .select("*")
    .eq("group_id", crew.group.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <GroupManager
      group={{
        id: crew.group.id,
        name: crew.group.name,
        inviteCode: crew.group.invite_code,
        gymId: crew.group.gym_id,
        gymName: crew.group.gym?.name ?? null,
        ownerId: crew.group.owner_id,
      }}
      me={crew.userId}
      isOwner={crew.isOwner}
      members={crew.members.map((m) => ({
        id: m.id,
        name: m.display_name,
        avatar: m.avatar_url,
      }))}
      invites={(invites ?? []).map((i) => ({ id: i.id, email: i.invited_email }))}
      gyms={gyms}
    />
  );
}
