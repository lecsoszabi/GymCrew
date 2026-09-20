import { getCrew, getGyms, getSessions } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import GroupGate from "@/components/group-gate";
import PlanClient from "./plan-client";
import { commonSlots } from "@/lib/date";
import type { Availability } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Terv · GymCrew" };

export default async function PlanPage() {
  const crew = await getCrew();
  const gyms = await getGyms();

  if (!crew.group) return <GroupGate gyms={gyms} email={crew.email} />;

  const supabase = await createClient();
  const [{ sessions, votes }, { data: availability }, { data: arrivals }] = await Promise.all([
    getSessions(crew.group.id),
    supabase
      .from("availability")
      .select("*")
      .in("user_id", crew.members.map((m) => m.id)),
    supabase
      .from("check_ins")
      .select("session_id, user_id")
      .in("user_id", crew.members.map((m) => m.id))
      .not("session_id", "is", null),
  ]);

  const avail = (availability ?? []) as Availability[];
  const memberIds = crew.members.map((m) => m.id);

  // Azok a heti sávok, amikor MINDENKI ráér.
  const slots = commonSlots(avail, memberIds, 60).slice(0, 8);

  return (
    <PlanClient
      me={crew.userId}
      isOwner={crew.isOwner}
      groupGymId={crew.group.gym_id}
      gyms={gyms}
      members={crew.members.map((m) => ({
        id: m.id,
        name: m.display_name,
        avatar: m.avatar_url,
      }))}
      sessions={sessions}
      votes={votes}
      arrivals={(arrivals ?? []).map((a) => ({
        sessionId: a.session_id as string,
        userId: a.user_id,
      }))}
      myAvailability={avail.filter((a) => a.user_id === crew.userId)}
      availabilityByMember={memberIds.map((id) => ({
        id,
        count: avail.filter((a) => a.user_id === id).length,
      }))}
      commonSlots={slots}
    />
  );
}
