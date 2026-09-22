"use client";

import { useState } from "react";
import { goingToday, notGoingToday } from "@/app/app/actions";
import { Avatar } from "@/components/avatar";
import { Badge, ErrorNote, Sheet, useAction } from "@/components/ui";
import { WhenPicker, composeISO, nextDays, timesFor } from "@/components/when-picker";
import type { DailyCheckin } from "@/lib/types";

type Member = { id: string; name: string; avatar: string | null };

/**
 * A mai állás, amíg nincs mai időpont. A "Ma megyek" rákérdez, hánykor, és
 * időpontot csinál belőle — arra a többiek szavazhatnak, és edzés előtt
 * bekapcsol a lokátor. (Ha már van mai időpont, a kezdőlap azt mutatja.)
 */
export function TodayBoard({
  me,
  members,
  checkins,
}: {
  me: string;
  members: Member[];
  checkins: DailyCheckin[];
}) {
  const [askTime, setAskTime] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [day, setDay] = useState("");
  const [minutes, setMinutes] = useState(18 * 60);
  const { pending, error, setError, run } = useAction();

  const mine = checkins.find((c) => c.user_id === me) ?? null;
  const tooLate = askTime && timesFor(day).length === 0;

  function openTime() {
    setError(null);
    // A napot megnyitáskor számoljuk: ha éjfélen át nyitva maradt a lap, ne a tegnapi legyen.
    setDay(nextDays(1)[0].key);
    setAskTime(true);
  }

  return (
    <div className="card divide-y divide-line">
      {members.map((m) => {
        const c = checkins.find((x) => x.user_id === m.id);
        return (
          <div key={m.id} className="flex items-center gap-3 p-4">
            <Avatar url={m.avatar} name={m.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {m.name}
                {m.id === me && <span className="ml-1.5 text-xs font-normal text-muted">(te)</span>}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted">
                {!c
                  ? "Még nem jelzett"
                  : c.going
                    ? c.from_time
                      ? `Megy · ${c.from_time.slice(0, 5)}`
                      : "Megy"
                    : c.reason}
              </p>
            </div>
            {c ? (
              <Badge tone={c.going ? "yes" : "no"}>{c.going ? "Megy" : "Kihagyja"}</Badge>
            ) : (
              <Badge>Még nem</Badge>
            )}
          </div>
        );
      })}

      <div className="p-4">
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-primary" disabled={pending} onClick={openTime}>
            Ma megyek
          </button>
          <button
            className={`btn btn-ghost ${mine && !mine.going ? "text-no" : ""}`}
            disabled={pending}
            onClick={() => {
              setError(null);
              setDeclining(true);
            }}
          >
            {mine && !mine.going ? "Kihagyom ✓" : "Ma nem"}
          </button>
        </div>
        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-muted">
          Ha mész, megadod, hánykor. A többiek szavazhatnak rá, és edzés előtt fél órával
          bekapcsol a lokátor.
        </p>
      </div>

      <Sheet open={askTime} onClose={() => setAskTime(false)} title="Hánykor mész ma?">
        {askTime && (
          <WhenPicker
            todayOnly
            day={day}
            minutes={minutes}
            onChange={(n) => {
              setDay(n.day);
              setMinutes(n.minutes);
            }}
          />
        )}
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={pending || tooLate}
          onClick={() =>
            run(
              async () => {
                const r = await goingToday({ startsAt: composeISO(day, minutes) });
                return r.ok ? { ok: true } : { ok: false, error: r.error };
              },
              () => setAskTime(false)
            )
          }
        >
          {pending ? "Egy pillanat…" : "Megyek"}
        </button>
        <p className="mt-2.5 text-center text-xs text-muted">
          A többiek látják, és szavazhatnak rá.
        </p>
      </Sheet>

      <Sheet open={declining} onClose={() => setDeclining(false)} title="Miért nem jó ma?">
        <textarea
          className="field min-h-24 resize-none"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Egy rövid indok kötelező…"
          aria-label="Miért nem jó ma?"
          maxLength={300}
          autoFocus
        />
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={pending || reason.trim().length < 3}
          onClick={() =>
            run(() => notGoingToday(reason), () => {
              setDeclining(false);
              setReason("");
            })
          }
        >
          {pending ? "Küldés…" : "Küldés"}
        </button>
      </Sheet>
    </div>
  );
}
