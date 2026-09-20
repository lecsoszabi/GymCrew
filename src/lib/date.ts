import type { Availability } from "@/lib/types";

export const TZ = "Europe/Budapest";

export const WEEKDAYS = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];
export const WEEKDAYS_SHORT = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

/** A mai nap YYYY-MM-DD formában, magyar idő szerint. */
export function todayHU(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());
}

/** 0 = hétfő … 6 = vasárnap (a JS 0 = vasárnap helyett). */
export function weekdayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

const dateFmt = new Intl.DateTimeFormat("hu-HU", {
  timeZone: TZ,
  month: "long",
  day: "numeric",
  weekday: "long",
});
const timeFmt = new Intl.DateTimeFormat("hu-HU", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});
const shortFmt = new Intl.DateTimeFormat("hu-HU", {
  timeZone: TZ,
  month: "short",
  day: "numeric",
});

export function formatDate(iso: string | Date): string {
  return dateFmt.format(new Date(iso));
}
export function formatTime(iso: string | Date): string {
  return timeFmt.format(new Date(iso));
}
export function formatShort(iso: string | Date): string {
  return shortFmt.format(new Date(iso));
}

/** "ma 18:30" / "holnap 07:00" / "okt. 3. 19:00" */
export function formatWhen(iso: string | Date): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(d);
  const today = todayHU();
  const tomorrow = new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(
    new Date(Date.now() + 86_400_000)
  );

  if (day === today) return `Ma ${formatTime(d)}`;
  if (day === tomorrow) return `Holnap ${formatTime(d)}`;
  return `${formatShort(d)} ${formatTime(d)}`;
}

/** Visszaszámláló szöveg: "2 óra 14 perc" */
export function countdown(to: string | Date): string {
  const ms = new Date(to).getTime() - Date.now();
  if (ms <= 0) return "most";
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;

  if (days > 0) return `${days} nap ${hours} óra`;
  if (hours > 0) return `${hours} óra ${mins} perc`;
  return `${mins} perc`;
}

/** A dátum-input (YYYY-MM-DDTHH:mm) értéke ISO timestamppé. */
export function localInputToISO(value: string): string {
  return new Date(value).toISOString();
}

/** ISO timestamp → datetime-local input értéke. */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// "Mikor jó MINDENKINEK" — a heti ráérések metszete
// ---------------------------------------------------------------------------

type Interval = { start: number; end: number };

function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end) last.end = Math.max(last.end, iv.end);
    else out.push({ ...iv });
  }
  return out;
}

function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const start = Math.max(a[i].start, b[j].start);
    const end = Math.min(a[i].end, b[j].end);
    if (end > start) out.push({ start, end });
    if (a[i].end < b[j].end) i++;
    else j++;
  }
  return out;
}

export type CommonSlot = { weekday: number; start: number; end: number };

/**
 * Azok az idősávok, amikor a megadott userek MINDEGYIKE ráér.
 * @param minLength a legrövidebb értelmes edzés hossza percben
 */
export function commonSlots(
  rows: Availability[],
  userIds: string[],
  minLength = 60
): CommonSlot[] {
  if (userIds.length === 0) return [];

  const result: CommonSlot[] = [];

  for (let weekday = 0; weekday < 7; weekday++) {
    let acc: Interval[] | null = null;

    for (const uid of userIds) {
      const mine = mergeIntervals(
        rows
          .filter((r) => r.user_id === uid && r.weekday === weekday)
          .map((r) => ({ start: r.start_min, end: r.end_min }))
      );
      if (mine.length === 0) {
        acc = [];
        break;
      }
      acc = acc === null ? mine : intersect(acc, mine);
      if (acc.length === 0) break;
    }

    for (const iv of acc ?? []) {
      if (iv.end - iv.start >= minLength) {
        result.push({ weekday, start: iv.start, end: iv.end });
      }
    }
  }

  return result;
}

/** A következő adott hét-napi dátum ISO stringje, adott perccel. */
export function nextDateForWeekday(weekday: number, startMin: number): string {
  const now = new Date();
  const todayIdx = weekdayIndex(now);
  let delta = (weekday - todayIdx + 7) % 7;

  const candidate = new Date(now);
  candidate.setDate(now.getDate() + delta);
  candidate.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

  if (candidate.getTime() <= now.getTime()) {
    delta += 7;
    candidate.setDate(candidate.getDate() + 7);
  }
  return candidate.toISOString();
}
