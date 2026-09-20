import { getCrew, getGyms, getSessions, nextSession } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import GroupGate from "@/components/group-gate";
import LiveMap from "./live-map";

export const dynamic = "force-dynamic";
export const metadata = { title: "Térkép · GymCrew" };

export default async function MapPage() {
  const crew = await getCrew();
  const gyms = await getGyms();

  if (!crew.group) return <GroupGate gyms={gyms} email={crew.email} />;

  const { sessions, votes } = await getSessions(crew.group.id);
  const upcoming = nextSession(sessions);

  let arrived: string[] = [];
  if (upcoming) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("check_ins")
      .select("user_id")
      .eq("session_id", upcoming.id);
    arrived = (data ?? []).map((r) => r.user_id);
  }

  const gym = upcoming?.gym_id
    ? (gyms.find((g) => g.id === upcoming.gym_id) ?? crew.group.gym)
    : crew.group.gym;

  return (
    <LiveMap
      groupId={crew.group.id}
      me={crew.userId}
      myName={crew.profile.display_name}
      myAvatar={crew.profile.avatar_url}
      gym={gym ? { id: gym.id, name: gym.name, lat: gym.lat, lng: gym.lng } : null}
      session={
        upcoming
          ? {
              id: upcoming.id,
              startsAt: upcoming.starts_at,
              status: upcoming.status,
              myVote: votes.find((v) => v.session_id === upcoming.id && v.user_id === crew.userId)
                ?.vote ?? null,
            }
          : null
      }
      members={crew.members.map((m) => ({
        id: m.id,
        name: m.display_name,
        avatar: m.avatar_url,
      }))}
      arrived={arrived}
    />
  );
}
