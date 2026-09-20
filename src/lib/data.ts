import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { todayHU } from "@/lib/date";
import type {
  CheckIn,
  DailyCheckin,
  Group,
  Gym,
  Profile,
  SessionVote,
  TrainingSession,
} from "@/lib/types";

export type Crew = {
  userId: string;
  email: string;
  profile: Profile;
  group: (Group & { gym: Gym | null }) | null;
  members: Profile[];
  isOwner: boolean;
};

/**
 * Minden app-oldal ezzel indul: bejelentkezés + onboarding ellenőrzése,
 * majd a csoport és a tagok betöltése. `cache`-elve, így egy renderen belül
 * akárhányszor hívható egyetlen lekérdezés árán.
 */
export const getCrew = cache(async (): Promise<Crew> => {
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

  if (!profile) redirect("/onboarding");
  if (!profile.onboarded) redirect("/onboarding");

  let group: (Group & { gym: Gym | null }) | null = null;
  let members: Profile[] = [];

  if (profile.group_id) {
    const [{ data: g }, { data: m }] = await Promise.all([
      supabase
        .from("groups")
        .select("*, gym:gyms(*)")
        .eq("id", profile.group_id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("*")
        .eq("group_id", profile.group_id)
        .order("created_at", { ascending: true }),
    ]);
    group = (g as unknown as Group & { gym: Gym | null }) ?? null;
    members = m ?? [];
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    profile,
    group,
    members,
    isOwner: !!group && group.owner_id === user.id,
  };
});

/** A csoport közelgő és legutóbbi edzései, szavazatokkal együtt. */
export async function getSessions(groupId: string) {
  const supabase = await createClient();
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("group_id", groupId)
    .gte("starts_at", since)
    .order("starts_at", { ascending: true });

  const list = (sessions ?? []) as TrainingSession[];
  if (list.length === 0) return { sessions: list, votes: [] as SessionVote[] };

  const { data: votes } = await supabase
    .from("session_votes")
    .select("*")
    .in(
      "session_id",
      list.map((s) => s.id)
    );

  return { sessions: list, votes: (votes ?? []) as SessionVote[] };
}

/** A legközelebbi jövőbeli, nem lemondott edzés. */
export function nextSession(sessions: TrainingSession[]): TrainingSession | null {
  const now = Date.now();
  return (
    sessions
      .filter((s) => s.status !== "cancelled" && new Date(s.starts_at).getTime() > now - 3_600_000)
      .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))[0] ?? null
  );
}

/** A csoport mai "megyek / nem megyek" jelzései. */
export async function getTodayCheckins(groupId: string): Promise<DailyCheckin[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("group_id", groupId)
    .eq("day", todayHU());
  return (data ?? []) as DailyCheckin[];
}

/** Megérkezések a statokhoz. */
export async function getCheckIns(memberIds: string[], days = 365): Promise<CheckIn[]> {
  if (memberIds.length === 0) return [];
  const supabase = await createClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const { data } = await supabase
    .from("check_ins")
    .select("*")
    .in("user_id", memberIds)
    .gte("arrived_at", since)
    .order("arrived_at", { ascending: false });

  return (data ?? []) as CheckIn[];
}

export async function getGyms(): Promise<Gym[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gyms")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });
  return (data ?? []) as Gym[];
}
