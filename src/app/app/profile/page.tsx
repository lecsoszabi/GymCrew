import { createClient } from "@/lib/supabase/server";
import { getCheckIns, getCrew } from "@/lib/data";
import { memberStats } from "@/lib/stats";
import ProfileEditor from "./profile-editor";
import type { Availability } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profil · GymCrew" };

export default async function ProfilePage() {
  const crew = await getCrew();
  const supabase = await createClient();

  const [{ data: availability }, checkIns] = await Promise.all([
    supabase.from("availability").select("*").eq("user_id", crew.userId),
    getCheckIns([crew.userId], 365),
  ]);

  const stats = memberStats(checkIns, crew.userId);

  return (
    <ProfileEditor
      userId={crew.userId}
      email={crew.email}
      profile={{
        displayName: crew.profile.display_name,
        avatarUrl: crew.profile.avatar_url,
        heightCm: crew.profile.height_cm,
        weightKg: crew.profile.weight_kg,
        birthDate: crew.profile.birth_date,
        sex: crew.profile.sex,
        goal: crew.profile.goal,
        level: crew.profile.experience_level,
      }}
      groupName={crew.group?.name ?? null}
      isOwner={crew.isOwner}
      availability={(availability ?? []) as Availability[]}
      totals={{ total: stats.total, last30: stats.last30, streak: stats.streakWeeks }}
    />
  );
}
