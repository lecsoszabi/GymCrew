"use client";

import { useEffect, useMemo } from "react";
import { WEEKDAYS, minutesToTime, weekdayIndex } from "@/lib/date";

const HONAPOK = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];

/** Egy nap a következő hétből, helyi idő szerint. */
export type DayOption = { key: string; top: string; bottom: string };

function ymd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nextDays(count = 7, now = new Date()): DayOption[] {
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const top = i === 0 ? "Ma" : i === 1 ? "Holnap" : WEEKDAYS[weekdayIndex(d)];
    return { key: ymd(d), top, bottom: `${HONAPOK[d.getMonth()]} ${d.getDate()}.` };
  });
}

/** 06:00-tól 22:30-ig, félóránként. */
export const TIME_OPTIONS = Array.from({ length: 34 }, (_, i) => 6 * 60 + i * 30);

/** Az adott napon választható időpontok — ma csak a legalább 15 perccel későbbiek. */
export function timesFor(dayKey: string, now: Date = new Date()): number[] {
  if (dayKey !== ymd(now)) return TIME_OPTIONS;
  const earliest = now.getHours() * 60 + now.getMinutes() + 15;
  return TIME_OPTIONS.filter((t) => t >= earliest);
}

/** A választott nap + perc → ISO időbélyeg (helyi idő szerint). */
export function composeISO(dayKey: string, minutes: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0).toISOString();
}

/** ISO → { nap, perc } — a percet a legközelebbi félórára kerekítve. */
export function splitISO(iso: string): { day: string; minutes: number } {
  const dt = new Date(iso);
  const raw = dt.getHours() * 60 + dt.getMinutes();
  const minutes = Math.min(22 * 60 + 30, Math.max(6 * 60, Math.round(raw / 30) * 30));
  return { day: ymd(dt), minutes };
}

/**
 * Nap- és időválasztó telefonra. A `datetime-local` mező iPhone-on nehézkes
 * volt, és múltbeli időpontot is engedett; itt ma csak a jövőbeli időpontok
 * választhatók.
 */
export function WhenPicker({
  day,
  minutes,
  onChange,
  now = new Date(),
  todayOnly,
}: {
  day: string;
  minutes: number;
  onChange: (next: { day: string; minutes: number }) => void;
  now?: Date;
  /** Csak a mai nap: a napválasztó elrejtve, csak az idő látszik. */
  todayOnly?: boolean;
}) {
  const days = useMemo(() => nextDays(7, now), [now]);
  const todayKey = days[0].key;
  const times = timesFor(day, now);

  // Ha a kiválasztott időpont közben elmúlt (pl. sokáig nyitva maradt a lap),
  // a legkorábbi érvényesre igazítunk — különben múltbeli időpont menne el.
  useEffect(() => {
    if (times.length > 0 && !times.includes(minutes)) onChange({ day, minutes: times[0] });
  }, [day, minutes, times, onChange]);

  return (
    <div>
      {!todayOnly && <p className="label">Melyik nap?</p>}
      <div className={`-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 ${todayOnly ? "hidden" : ""}`}>
        {days.map((d) => {
          const on = d.key === day;
          const disabled = d.key === todayKey && timesFor(todayKey, now).length === 0;
          return (
            <button
              key={d.key}
              type="button"
              disabled={disabled}
              onClick={() => {
                // Ha a mai napra váltva a kiválasztott idő már elmúlt, a legkorábbira ugrunk.
                const nextTimes = timesFor(d.key, now);
                const nextMinutes = nextTimes.includes(minutes) ? minutes : (nextTimes[0] ?? minutes);
                onChange({ day: d.key, minutes: nextMinutes });
              }}
              aria-pressed={on}
              className={`flex min-w-[76px] shrink-0 flex-col items-center rounded-ui border px-3 py-2.5 transition disabled:opacity-35 ${
                on ? "border-accent bg-accent text-ink" : "border-line bg-surface-2 text-fg"
              }`}
            >
              <span className="text-sm font-bold">{d.top}</span>
              <span className={`text-[11px] ${on ? "text-ink/70" : "text-muted"}`}>{d.bottom}</span>
            </button>
          );
        })}
      </div>

      {/* Mai módban a lap címe már kérdezi ("Hánykor mész ma?") — a felirat csak a képernyőolvasónak kell. */}
      <label className={todayOnly ? "sr-only" : "label mt-4"} htmlFor="when-time">
        Hánykor?
      </label>
      {times.length > 0 ? (
        <select
          id="when-time"
          className="field"
          value={times.includes(minutes) ? minutes : times[0]}
          onChange={(e) => onChange({ day, minutes: Number(e.target.value) })}
        >
          {times.map((t) => (
            <option key={t} value={t}>
              {minutesToTime(t)}
            </option>
          ))}
        </select>
      ) : (
        <p className="rounded-ui bg-surface-2 px-4 py-3 text-sm text-muted">
          {todayOnly
            ? "Mára már késő új időponthoz. Holnapra a Tervben javasolhatsz."
            : "Mára már késő. Válassz egy másik napot."}
        </p>
      )}
    </div>
  );
}
