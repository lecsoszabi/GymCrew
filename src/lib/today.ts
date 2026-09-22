import { dayOfHU } from "@/lib/date";
import type { DailyCheckin, SessionVote, TrainingSession, Vote } from "@/lib/types";

const endMs = (s: TrainingSession) => new Date(s.starts_at).getTime() + s.duration_min * 60_000;
const isOpen = (s: TrainingSession) => s.status === "proposed" || s.status === "confirmed";
const byStart = (a: TrainingSession, b: TrainingSession) =>
  new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();

/**
 * A kezdőlap két időpontja: a mai, még véget nem ért (ha van), és az utána
 * következő. A "ma" Budapest szerint értendő, nem a szerver órája szerint.
 */
export function pickSessions(
  sessions: TrainingSession[],
  now: Date = new Date()
): { today: TrainingSession | null; next: TrainingSession | null } {
  const day = dayOfHU(now);
  const open = sessions.filter((s) => isOpen(s) && endMs(s) > now.getTime()).sort(byStart);
  const today = open.find((s) => dayOfHU(s.starts_at) === day) ?? null;
  const next = open.find((s) => s.id !== today?.id) ?? null;
  return { today, next };
}

export type DayState = Vote | "none";

/**
 * Ki mit mondott mára. A mai időpontra adott szavazat az erősebb; ha nincs,
 * a napi jelzés számít (pl. aki még az időpont előtt mondta, hogy ma nem jön).
 */
export function dayStatus(
  userId: string,
  todaySession: TrainingSession | null,
  votes: SessionVote[],
  checkins: DailyCheckin[]
): { state: DayState; reason: string | null } {
  const v = todaySession
    ? votes.find((x) => x.session_id === todaySession.id && x.user_id === userId)
    : undefined;
  if (v) return { state: v.vote, reason: v.reason };
  const c = checkins.find((x) => x.user_id === userId);
  if (c) return { state: c.going ? "yes" : "no", reason: c.reason };
  return { state: "none", reason: null };
}

/**
 * A mai időpont szavazatai, kiegészítve a napi jelzésekkel azoknál, akik még
 * nem szavaztak — hogy a kártyán ne "Nem szavazott" álljon annál, aki már
 * reggel megírta, hogy ma nem ér rá.
 */
export function votesWithDaily(
  session: TrainingSession,
  memberIds: string[],
  votes: SessionVote[],
  checkins: DailyCheckin[]
): SessionVote[] {
  const own = votes.filter((v) => v.session_id === session.id);
  const filled = memberIds.flatMap((id): SessionVote[] => {
    if (own.some((v) => v.user_id === id)) return [];
    const c = checkins.find((x) => x.user_id === id);
    if (!c) return [];
    return [
      {
        session_id: session.id,
        user_id: id,
        vote: c.going ? "yes" : "no",
        reason: c.going ? null : c.reason,
        updated_at: c.created_at,
      },
    ];
  });
  return [...own, ...filled];
}
