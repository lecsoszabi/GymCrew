"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCrew } from "@/lib/data";
import { todayHU } from "@/lib/date";
import type { Goal, Level, Vote } from "@/lib/types";

const GOALS: Goal[] = ["muscle", "strength", "fat_loss", "fitness", "health", "other"];
const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];

function oneOf<T extends string>(allowed: T[], v: string | null | undefined): T | null {
  return v != null && (allowed as string[]).includes(v) ? (v as T) : null;
}

export type Result = { ok: true } | { ok: false; error: string };

const ok: Result = { ok: true };
const fail = (error: string): Result => ({ ok: false, error });

function refresh() {
  revalidatePath("/app", "layout");
}

// ---------------------------------------------------------------------------
// Napi szándék: "ma megyek" / "ma nem"
// ---------------------------------------------------------------------------

export async function setDailyCheckin(input: {
  going: boolean;
  reason?: string;
  fromTime?: string;
  toTime?: string;
}): Promise<Result> {
  const crew = await getCrew();
  if (!crew.group) return fail("Előbb lépj be egy csoportba.");

  const reason = input.reason?.trim() || null;
  if (!input.going && (!reason || reason.length < 3)) {
    return fail("Ha ma nem mész, írd le röviden, miért.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("daily_checkins").upsert(
    {
      user_id: crew.userId,
      group_id: crew.group.id,
      day: todayHU(),
      going: input.going,
      reason,
      from_time: input.going ? input.fromTime || null : null,
      to_time: input.going ? input.toTime || null : null,
    },
    { onConflict: "user_id,day" }
  );

  if (error) return fail(error.message);
  refresh();
  return ok;
}

// ---------------------------------------------------------------------------
// Edzés-időpontok
// ---------------------------------------------------------------------------

export async function proposeSession(input: {
  startsAt: string;
  durationMin: number;
  note?: string;
  gymId?: string | null;
}): Promise<Result> {
  const crew = await getCrew();
  if (!crew.group) return fail("Előbb lépj be egy csoportba.");

  const when = new Date(input.startsAt);
  if (Number.isNaN(when.getTime())) return fail("Érvénytelen időpont.");
  if (when.getTime() < Date.now() - 60_000) return fail("Múltbeli időpontot nem lehet javasolni.");
  if (when.getTime() > Date.now() + 120 * 86_400_000)
    return fail("Legfeljebb 120 nappal előre tervezhetsz.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      group_id: crew.group.id,
      gym_id: input.gymId ?? crew.group.gym_id,
      starts_at: when.toISOString(),
      duration_min: Math.min(300, Math.max(15, Math.round(input.durationMin))),
      created_by: crew.userId,
      note: input.note?.trim() || null,
      status: "proposed",
    })
    .select("id")
    .single();

  if (error) return fail(error.message);

  // Aki javasolja, arról feltételezzük, hogy megy.
  await supabase
    .from("session_votes")
    .upsert({ session_id: data.id, user_id: crew.userId, vote: "yes", reason: null });

  await syncStatus(data.id);
  refresh();
  return ok;
}

export async function castVote(input: {
  sessionId: string;
  vote: Vote;
  reason?: string;
}): Promise<Result> {
  const crew = await getCrew();
  if (!crew.group) return fail("Előbb lépj be egy csoportba.");

  const reason = input.reason?.trim() || null;
  // A "nem"-hez kötelező indok — az adatbázis is kikényszeríti, itt csak
  // szebb hibaüzenetet adunk.
  if (input.vote === "no" && (!reason || reason.length < 3)) {
    return fail("A nemet indokolni kell — írd le röviden, miért nem jó.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("session_votes").upsert(
    {
      session_id: input.sessionId,
      user_id: crew.userId,
      vote: input.vote,
      reason: input.vote === "no" ? reason : reason,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,user_id" }
  );

  if (error) return fail(error.message);

  await syncStatus(input.sessionId);
  refresh();
  return ok;
}

/** Ha mindenki igent mondott → megerősítve; ha valaki nemet → vissza javasoltra. */
async function syncStatus(sessionId: string) {
  const crew = await getCrew();
  if (!crew.group) return;

  const supabase = await createClient();
  const { data: votes } = await supabase
    .from("session_votes")
    .select("user_id, vote")
    .eq("session_id", sessionId);

  const { data: session } = await supabase
    .from("sessions")
    .select("status")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.status === "cancelled" || session.status === "done") return;

  const memberIds = crew.members.map((m) => m.id);
  const yes = (votes ?? []).filter((v) => v.vote === "yes").map((v) => v.user_id);
  const everyoneIn = memberIds.length > 0 && memberIds.every((id) => yes.includes(id));

  const target = everyoneIn ? "confirmed" : "proposed";
  if (session.status !== target) {
    await supabase.from("sessions").update({ status: target }).eq("id", sessionId);
  }
}

export async function setSessionStatus(input: {
  sessionId: string;
  status: "proposed" | "confirmed" | "cancelled" | "done";
}): Promise<Result> {
  const crew = await getCrew();
  if (!crew.group) return fail("Előbb lépj be egy csoportba.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ status: input.status })
    .eq("id", input.sessionId)
    .eq("group_id", crew.group.id);

  if (error) return fail(error.message);
  refresh();
  return ok;
}

export async function deleteSession(sessionId: string): Promise<Result> {
  const crew = await getCrew();
  if (!crew.group) return fail("Előbb lépj be egy csoportba.");

  const supabase = await createClient();
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (error) return fail(error.message);
  refresh();
  return ok;
}

export async function setSessionGym(input: {
  sessionId: string;
  gymId: string;
}): Promise<Result> {
  const crew = await getCrew();
  if (!crew.group) return fail("Előbb lépj be egy csoportba.");
  if (!crew.isOwner) return fail("A termet csak a csoport főnöke állíthatja át.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ gym_id: input.gymId })
    .eq("id", input.sessionId)
    .eq("group_id", crew.group.id);

  if (error) return fail(error.message);
  refresh();
  return ok;
}

// ---------------------------------------------------------------------------
// Megérkezés
// ---------------------------------------------------------------------------

export async function checkIn(input: {
  sessionId: string | null;
  source?: "auto" | "manual";
}): Promise<Result> {
  const crew = await getCrew();
  if (!crew.group) return fail("Előbb lépj be egy csoportba.");

  const supabase = await createClient();
  const { error } = await supabase.from("check_ins").upsert(
    {
      session_id: input.sessionId,
      user_id: crew.userId,
      gym_id: crew.group.gym_id,
      arrived_at: new Date().toISOString(),
      source: input.source ?? "manual",
    },
    { onConflict: "session_id,user_id" }
  );

  if (error) return fail(error.message);
  refresh();
  return ok;
}

// ---------------------------------------------------------------------------
// Heti ráérés
// ---------------------------------------------------------------------------

export async function saveAvailability(
  slots: { weekday: number; start_min: number; end_min: number }[]
): Promise<Result> {
  const crew = await getCrew();
  const supabase = await createClient();

  const clean = slots
    .filter(
      (s) =>
        Number.isInteger(s.weekday) &&
        s.weekday >= 0 &&
        s.weekday <= 6 &&
        s.end_min > s.start_min &&
        s.start_min >= 0 &&
        s.end_min <= 1440
    )
    .slice(0, 40);

  const { error: delErr } = await supabase
    .from("availability")
    .delete()
    .eq("user_id", crew.userId);
  if (delErr) return fail(delErr.message);

  if (clean.length > 0) {
    const { error } = await supabase
      .from("availability")
      .insert(clean.map((s) => ({ ...s, user_id: crew.userId })));
    if (error) return fail(error.message);
  }

  refresh();
  return ok;
}

// ---------------------------------------------------------------------------
// Profil frissítés (súly, stb.)
// ---------------------------------------------------------------------------

export async function updateProfile(input: {
  display_name?: string;
  avatar_url?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  goal?: string | null;
  experience_level?: string | null;
}): Promise<Result> {
  const crew = await getCrew();
  const supabase = await createClient();

  if (input.display_name !== undefined && input.display_name.trim().length < 2) {
    return fail("A név legyen legalább 2 karakter.");
  }
  if (input.weight_kg != null && (input.weight_kg < 30 || input.weight_kg > 300)) {
    return fail("A testsúly 30 és 300 kg között lehet.");
  }
  if (input.height_cm != null && (input.height_cm < 100 || input.height_cm > 250)) {
    return fail("A magasság 100 és 250 cm között lehet.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      ...(input.display_name !== undefined && { display_name: input.display_name.trim() }),
      ...(input.avatar_url !== undefined && { avatar_url: input.avatar_url }),
      ...(input.height_cm !== undefined && { height_cm: input.height_cm }),
      ...(input.weight_kg !== undefined && { weight_kg: input.weight_kg }),
      ...(input.goal !== undefined && { goal: oneOf(GOALS, input.goal) }),
      ...(input.experience_level !== undefined && {
        experience_level: oneOf(LEVELS, input.experience_level),
      }),
    })
    .eq("id", crew.userId);

  if (error) return fail(error.message);
  refresh();
  return ok;
}
