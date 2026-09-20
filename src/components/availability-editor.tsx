"use client";

import { useState } from "react";
import { saveAvailability } from "@/app/app/actions";
import { ErrorNote, useAction } from "@/components/ui";
import { WEEKDAYS, minutesToTime, timeToMinutes } from "@/lib/date";
import type { Availability } from "@/lib/types";

type Range = { start: number; end: number };

/**
 * Heti ráérés-szerkesztő. Ebből számolja az app, hogy mikor jó MINDENKINEK.
 */
export function AvailabilityEditor({
  initial,
  onSaved,
}: {
  initial: Availability[];
  onSaved?: () => void;
}) {
  const [days, setDays] = useState<Range[][]>(() => {
    const out: Range[][] = Array.from({ length: 7 }, () => []);
    for (const a of initial) out[a.weekday]?.push({ start: a.start_min, end: a.end_min });
    for (const d of out) d.sort((x, y) => x.start - y.start);
    return out;
  });
  const { pending, error, run } = useAction();

  function update(day: number, next: Range[]) {
    setDays((prev) => prev.map((d, i) => (i === day ? next : d)));
  }

  const hasAny = days.some((d) => d.length > 0);

  return (
    <div>
      <p className="-mt-2 mb-4 text-sm leading-relaxed text-muted">
        Jelöld be, mely napokon mikor tudsz menni. A többiekével összevetve az app kiírja a
        közös idősávokat.
      </p>

      <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-0.5">
        {WEEKDAYS.map((label, day) => {
          const ranges = days[day];
          const on = ranges.length > 0;

          return (
            <div
              key={day}
              className={`rounded-xl border p-3 transition ${
                on ? "border-accent/35 bg-accent/5" : "border-line bg-surface-2"
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => update(day, on ? [] : [{ start: 17 * 60, end: 20 * 60 }])}
                  className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition ${
                    on ? "bg-accent" : "bg-line"
                  }`}
                  role="switch"
                  aria-checked={on}
                  aria-label={`${label} ráérés`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-ink transition ${on ? "translate-x-5" : ""}`}
                  />
                </button>
                <span className="flex-1 text-sm font-semibold">{label}</span>
                {on && (
                  <button
                    onClick={() =>
                      update(day, [...ranges, { start: 8 * 60, end: 10 * 60 }].sort((a, b) => a.start - b.start))
                    }
                    className="text-xs font-semibold text-accent"
                  >
                    + sáv
                  </button>
                )}
              </div>

              {on && (
                <div className="mt-3 space-y-2">
                  {ranges.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="time"
                        className="field flex-1 py-2 text-sm"
                        value={minutesToTime(r.start)}
                        onChange={(e) =>
                          update(
                            day,
                            ranges.map((x, j) =>
                              j === i ? { ...x, start: timeToMinutes(e.target.value) } : x
                            )
                          )
                        }
                        aria-label={`${label} kezdés`}
                      />
                      <span className="text-muted">–</span>
                      <input
                        type="time"
                        className="field flex-1 py-2 text-sm"
                        value={minutesToTime(r.end)}
                        onChange={(e) =>
                          update(
                            day,
                            ranges.map((x, j) =>
                              j === i ? { ...x, end: timeToMinutes(e.target.value) } : x
                            )
                          )
                        }
                        aria-label={`${label} vége`}
                      />
                      {ranges.length > 1 && (
                        <button
                          onClick={() => update(day, ranges.filter((_, j) => j !== i))}
                          className="px-1 text-sm text-no"
                          aria-label="Sáv törlése"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {ranges.some((r) => r.end <= r.start) && (
                    <p className="text-xs text-no">A vége legyen későbbi, mint a kezdés.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ErrorNote>{error}</ErrorNote>

      <button
        className="btn btn-primary mt-4 w-full"
        disabled={pending || days.some((d) => d.some((r) => r.end <= r.start))}
        onClick={() =>
          run(
            () =>
              saveAvailability(
                days.flatMap((ranges, weekday) =>
                  ranges.map((r) => ({ weekday, start_min: r.start, end_min: r.end }))
                )
              ),
            onSaved
          )
        }
      >
        {pending ? "Mentés…" : hasAny ? "Mentés" : "Mentés (nincs megadva sáv)"}
      </button>
    </div>
  );
}
