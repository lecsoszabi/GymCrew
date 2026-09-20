import { weekdayIndex } from "@/lib/date";
import type { CheckIn } from "@/lib/types";

const DAY = 86_400_000;
const WEEK = 7 * DAY;

export type MemberStats = {
  userId: string;
  total: number;
  last7: number;
  last30: number;
  lastVisit: string | null;
  streakWeeks: number;
  /** 0 = hétfő … 6 = vasárnap */
  weekdayCounts: number[];
  /** Az a napszak, amikor a legtöbbször edz. */
  favoriteHour: number | null;
};

/** A hét hétfői 00:00-ja ehhez az időponthoz. */
function weekStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - weekdayIndex(d));
  return d.getTime();
}

export function memberStats(checkIns: CheckIn[], userId: string): MemberStats {
  const mine = checkIns
    .filter((c) => c.user_id === userId)
    .sort((a, b) => +new Date(b.arrived_at) - +new Date(a.arrived_at));

  const now = Date.now();
  const weekdayCounts = Array(7).fill(0) as number[];
  const hourCounts = new Map<number, number>();

  for (const c of mine) {
    const d = new Date(c.arrived_at);
    weekdayCounts[weekdayIndex(d)]++;
    hourCounts.set(d.getHours(), (hourCounts.get(d.getHours()) ?? 0) + 1);
  }

  // Sorozat: hány egymást követő héten volt legalább egy edzés.
  const weeks = new Set(mine.map((c) => weekStart(+new Date(c.arrived_at))));
  let streak = 0;
  let cursor = weekStart(now);
  // A futó hét még nem "bukott el", ezért ha üres, a múlt héttől számolunk.
  if (!weeks.has(cursor)) cursor -= WEEK;
  while (weeks.has(cursor)) {
    streak++;
    cursor -= WEEK;
  }

  const favoriteHour =
    hourCounts.size > 0
      ? [...hourCounts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]
      : null;

  return {
    userId,
    total: mine.length,
    last7: mine.filter((c) => now - +new Date(c.arrived_at) < 7 * DAY).length,
    last30: mine.filter((c) => now - +new Date(c.arrived_at) < 30 * DAY).length,
    lastVisit: mine[0]?.arrived_at ?? null,
    streakWeeks: streak,
    weekdayCounts,
    favoriteHour,
  };
}

export type WeekBar = { label: string; start: number; counts: Record<string, number>; total: number };

/** Az utolsó N hét edzésszáma tagonként — az oszlopdiagramhoz. */
export function weeklySeries(checkIns: CheckIn[], memberIds: string[], weeks = 8): WeekBar[] {
  const thisWeek = weekStart(Date.now());
  const out: WeekBar[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const start = thisWeek - i * WEEK;
    const end = start + WEEK;
    const counts: Record<string, number> = {};
    let total = 0;

    for (const id of memberIds) counts[id] = 0;
    for (const c of checkIns) {
      const t = +new Date(c.arrived_at);
      if (t >= start && t < end && counts[c.user_id] !== undefined) {
        counts[c.user_id]++;
        total++;
      }
    }

    out.push({
      label:
        i === 0
          ? "Most"
          : new Intl.DateTimeFormat("hu-HU", { month: "numeric", day: "numeric" }).format(
              new Date(start)
            ),
      start,
      counts,
      total,
    });
  }

  return out;
}
