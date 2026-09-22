"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCrew } from "@/lib/data";
import { dayOfHU, dayRangeHU, todayHU } from "@/lib/date";
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
// "Ma megyek" / "Ma nem" — a napi jelzés és a mai időpont egyben
//
// Korábban a napi jelzés és az időpont két külön dolog volt, és nem derült ki,
// mi köztük a különbség. A lokátor viszont csak időponttal működik, így aki csak
// "Ma megyek"-et nyomott, annak sosem kapcsolt be. Most a "Ma megyek" mindig egy
// időponthoz köt: ha van mai, arra szavaz igennel; ha nincs, létrehozza. És
// fordítva: a mai időpontra adott szavazat a napi jelzést is beállítja.
// ---------------------------------------------------------------------------

/** A csoport mai, még véget nem ért időpontja (Budapest szerint). */
async function todaysLiveSession(groupId: string) {
  const supabase = await createClient();
  const { start, end } = dayRangeHU(todayHU());
  const { data } = await supabase
    .from("sessions")
    .select("id, starts_at, duration_min")
    .eq("group_id", groupId)
    .in("status", ["proposed", "confirmed"])
    .gte("starts_at", start)
    .lt("starts_at", end)
    .order("starts_at", { ascending: true });

  const now = Date.now();
  return (
    (data ?? []).find((s) => new Date(s.starts_at).getTime() + s.duration_min * 60_000 > now) ??
    null
  );
}

function hhmm(iso: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone: "Europe/Budapest",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/**
 * A mai napi jelzésem. `null` = nincs döntés (pl. "Talán") — ilyenkor töröljük,
 * különben a többiek tévesen azt látnák, hogy megyek.
 */
async function writeDaily(
  groupId: string,
  userId: string,
  entry: { going: true; startsAt: string } | { going: false; reason: string } | null
): Promise<string | null> {
  const supabase = await createClient();
  if (!entry) {
    const { error } = await supabase
      .from("daily_checkins")
      .delete()
      .eq("user_id", userId)
      .eq("day", todayHU());
    return error?.message ?? null;
  }

  const { error } = await supabase.from("daily_checkins").upsert(
    {
      user_id: userId,
      group_id: groupId,
      day: todayHU(),
      going: entry.going,
      reason: entry.going ? null : entry.reason,
      from_time: entry.going ? hhmm(entry.startsAt) : null,
      to_time: null,
    },
    { onConflict: "user_id,day" }
  );
  return error?.message ?? null;
}

/** Ha a szavazat a mai időpontra szól, a napi jelzést is hozzáigazítjuk. */
async function syncDailyWithVote(
  groupId: string,
  userId: string,
  sessionId: string,
  vote: Vote,
  reason: string | null
): Promise<string | null> {
  const live = await todaysLiveSession(groupId);
  if (!live || live.id !== sessionId) return null;
  return writeDaily(
    groupId,
    userId,
    vote === "yes"
      ? { going: true, startsAt: live.starts_at }
      : vote === "no"
        ? { going: false, reason: reason ?? "" }
        : null
  );
}

export type GoingResult =
  | { ok: true; sessionId: string; created: boolean }
  | { ok: false; error: string; needTime?: boolean };

export async function goingToday(input: { startsAt?: string }): Promise<GoingResult> {
  const crew = await getCrew();
  if (!crew.group) return { ok: false, error: "Előbb lépj be egy csoportba." };
  const supabase = await createClient();

  let session = await todaysLiveSession(crew.group.id);
  let created = false;

  if (!session) {
    if (!input.startsAt) {
      return { ok: false, needTime: true, error: "Hánykor mész?" };
    }
    const when = new Date(input.startsAt);
    if (Number.isNaN(when.getTime())) return { ok: false, error: "Érvénytelen időpont." };
    if (when.getTime() < Date.now() - 60_000) {
      return { ok: false, error: "Ez az időpont már elmúlt — válassz egy későbbit." };
    }
    if (dayOfHU(when) !== todayHU()) {
      return { ok: false, error: "A „Ma megyek” mára szól — másik napra a Tervben javasolj időpontot." };
    }

    const { data, error } = await supabase
      .from("sessions")
      .insert({
        group_id: crew.group.id,
        gym_id: crew.group.gym_id,
        starts_at: when.toISOString(),
        duration_min: 90,
        created_by: crew.userId,
        status: "proposed",
      })
      .select("id, starts_at, duration_min")
      .single();
    if (error) return { ok: false, error: error.message };
    session = data;
    created = true;
  }

  const { error: voteErr } = await supabase.from("session_votes").upsert(
    {
      session_id: session.id,
      user_id: crew.userId,
      vote: "yes",
      reason: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,user_id" }
  );
  if (voteErr) return { ok: false, error: voteErr.message };

  // A napi jelzés is megy — ettől kapják meg a többiek a napi kérdést.
  const dailyErr = await writeDaily(crew.group.id, crew.userId, {
    going: true,
    startsAt: session.starts_at,
  });
  if (dailyErr) return { ok: false, error: dailyErr };

  await syncStatus(session.id);
  refresh();
  return { ok: true, sessionId: session.id, created };
}

export async function notGoingToday(reason: string): Promise<Result> {
  const crew = await getCrew();
  if (!crew.group) return fail("Előbb lépj be egy csoportba.");

  const clean = reason.trim();
  if (clean.length < 3) return fail("Ha ma nem mész, írd le röviden, miért.");

  const dailyErr = await writeDaily(crew.group.id, crew.userId, { going: false, reason: clean });
  if (dailyErr) return fail(dailyErr);

  // Ha van mai időpont, arra is nemet mond — ugyanazzal az indokkal.
  const session = await todaysLiveSession(crew.group.id);
  if (session) {
    const supabase = await createClient();
    const { error: voteErr } = await supabase.from("session_votes").upsert(
      {
        session_id: session.id,
        user_id: crew.userId,
        vote: "no",
        reason: clean,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,user_id" }
    );
    if (voteErr) return fail(voteErr.message);
    await syncStatus(session.id);
  }

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
  await syncDailyWithVote(crew.group.id, crew.userId, data.id, "yes", null);

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
      reason: input.vote === "no" ? reason : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,user_id" }
  );

  if (error) return fail(error.message);

  const dailyErr = await syncDailyWithVote(
    crew.group.id,
    crew.userId,
    input.sessionId,
    input.vote,
    reason
  );
  if (dailyErr) return fail(dailyErr);

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
