"use client";

import { useEffect, useState } from "react";
import { goingToday, notGoingToday } from "@/app/app/actions";
import { Avatar } from "@/components/avatar";
import { ErrorNote, Sheet, useAction } from "@/components/ui";
import { WhenPicker, composeISO, nextDays, timesFor } from "@/components/when-picker";
import { formatTime } from "@/lib/date";

type Member = { id: string; name: string; avatar: string | null; going: boolean };

/**
 * A napi kérdés. Csak akkor jelenik meg, ha MÁS a csoportból már jelezte aznap,
 * hogy megy — és én még nem válaszoltam. A "nem"-hez itt is kötelező az indok.
 */
export function DailyPrompt({
  open,
  goingNames,
  members,
  todaySession,
}: {
  open: boolean;
  goingNames: string[];
  members: Member[];
  todaySession: { startsAt: string; gymName: string | null } | null;
}) {
  const [visible, setVisible] = useState(open);
  const [mounted, setMounted] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [day, setDay] = useState("");
  const [minutes, setMinutes] = useState(18 * 60);
  const { pending, error, run } = useAction();

  // Csak a böngészőben jelenik meg: az időválasztó a telefon órájából dolgozik,
  // a szerver (UTC) mást számolna, és a kettő összeakadna.
  useEffect(() => {
    setDay(nextDays(1)[0].key);
    setMounted(true);
  }, []);

  if (!visible || !mounted) return null;

  const tooLate = !todaySession && timesFor(day).length === 0;

  const who =
    goingNames.length === 1
      ? goingNames[0]
      : `${goingNames.slice(0, -1).join(", ")} és ${goingNames.at(-1)}`;
  const at = todaySession ? formatTime(todaySession.startsAt) : null;

  return (
    <Sheet open title="Szia! Ma kondizunk?">
      <p className="-mt-2 mb-4 text-sm leading-relaxed text-muted">
        <span className="font-semibold text-fg">{who}</span>{" "}
        {goingNames.length > 1 ? "mennek" : "megy"}
        {at ? (
          <>
            {" "}ma <span className="font-semibold text-fg">{at}</span>-kor
            {todaySession?.gymName ? ` a(z) ${todaySession.gymName} terembe` : ""}.
          </>
        ) : (
          " ma."
        )}{" "}
        Jössz?
      </p>

      <div className="mb-5 flex flex-wrap gap-2">
        {members.map((m) => (
          <span
            key={m.id}
            className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm ${
              m.going ? "border-yes/40 bg-yes/10" : "border-line bg-surface-2"
            }`}
          >
            <Avatar url={m.avatar} name={m.name} size={26} />
            <span className={m.going ? "font-semibold" : "text-muted"}>{m.name}</span>
          </span>
        ))}
      </div>

      {!declining ? (
        <>
          {/* Ha még nincs mai időpont, itt dől el, mikor. */}
          {!todaySession && (
            <div className="mb-4">
              <WhenPicker
                todayOnly
                day={day}
                minutes={minutes}
                onChange={(n) => {
                  setDay(n.day);
                  setMinutes(n.minutes);
                }}
              />
            </div>
          )}

          <ErrorNote>{error}</ErrorNote>

          <div className="mt-3 grid gap-2">
            <button
              className="btn btn-primary"
              disabled={pending || tooLate}
              onClick={() =>
                run(
                  async () => {
                    const r = await goingToday(
                      todaySession ? {} : { startsAt: composeISO(day, minutes) }
                    );
                    return r.ok ? { ok: true } : { ok: false, error: r.error };
                  },
                  () => setVisible(false)
                )
              }
            >
              {pending ? "Egy pillanat…" : at ? `Jövök ${at}-ra 💪` : "Ma megyek 💪"}
            </button>
            <button className="btn btn-ghost" disabled={pending} onClick={() => setDeclining(true)}>
              Ma nem tudok
            </button>
          </div>
        </>
      ) : (
        <>
          <label className="label" htmlFor="daily-reason">
            Miért nem jó ma? <span className="text-accent">*</span>
          </label>
          <textarea
            id="daily-reason"
            className="field min-h-24 resize-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Pl. túlórázom, vagy még fáj a lábam a keddi lábnaptól…"
            maxLength={300}
            autoFocus
          />
          <p className="mb-3 mt-1.5 text-xs text-muted">
            Az indok kötelező — a többiek így tudják, mire számítsanak.
          </p>

          <ErrorNote>{error}</ErrorNote>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="btn btn-ghost" disabled={pending} onClick={() => setDeclining(false)}>
              Vissza
            </button>
            <button
              className="btn btn-primary"
              disabled={pending || reason.trim().length < 3}
              onClick={() => run(() => notGoingToday(reason), () => setVisible(false))}
            >
              {pending ? "Küldés…" : "Küldés"}
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
