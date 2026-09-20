"use client";

import { useMemo, useState } from "react";
import { proposeSession } from "@/app/app/actions";
import { AvailabilityEditor } from "@/components/availability-editor";
import { SessionRow } from "@/components/session-row";
import { GymPicker } from "@/components/gym-picker";
import { EmptyState, ErrorNote, SectionTitle, Sheet, useAction } from "@/components/ui";
import {
  WEEKDAYS,
  minutesToTime,
  nextDateForWeekday,
  isoToLocalInput,
  type CommonSlot,
} from "@/lib/date";
import type { Availability, Gym, SessionVote, TrainingSession } from "@/lib/types";

type Member = { id: string; name: string; avatar: string | null };

export default function PlanClient({
  me,
  isOwner,
  groupGymId,
  gyms,
  members,
  sessions,
  votes,
  arrivals,
  myAvailability,
  availabilityByMember,
  commonSlots,
}: {
  me: string;
  isOwner: boolean;
  groupGymId: string | null;
  gyms: Gym[];
  members: Member[];
  sessions: TrainingSession[];
  votes: SessionVote[];
  arrivals: { sessionId: string; userId: string }[];
  myAvailability: Availability[];
  availabilityByMember: { id: string; count: number }[];
  commonSlots: CommonSlot[];
}) {
  const [proposing, setProposing] = useState(false);
  const [when, setWhen] = useState("");
  const [duration, setDuration] = useState(90);
  const [note, setNote] = useState("");
  const [gymId, setGymId] = useState<string | null>(groupGymId);
  const [showAvail, setShowAvail] = useState(false);
  const { pending, error, run } = useAction();

  const now = Date.now();
  const upcoming = useMemo(
    () =>
      sessions
        .filter((s) => new Date(s.starts_at).getTime() > now - 3_600_000)
        .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)),
    [sessions, now]
  );
  const past = useMemo(
    () =>
      sessions
        .filter((s) => new Date(s.starts_at).getTime() <= now - 3_600_000)
        .sort((a, b) => +new Date(b.starts_at) - +new Date(a.starts_at)),
    [sessions, now]
  );

  const silentMembers = availabilityByMember.filter((a) => a.count === 0);

  function openProposal(prefillISO?: string) {
    setWhen(isoToLocalInput(prefillISO ?? defaultNextSlot()));
    setProposing(true);
  }

  return (
    <div className="space-y-7">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mikor megyünk?</h1>
          <p className="mt-1 text-sm text-muted">
            Javasolj időpontot, a többiek szavaznak rá.
          </p>
        </div>
        <button className="btn btn-primary shrink-0 px-4" onClick={() => openProposal()}>
          + Új
        </button>
      </header>

      {/* --- Mindenkinek jó ------------------------------------------ */}
      <section>
        <SectionTitle
          action={
            <button className="text-xs font-semibold text-accent" onClick={() => setShowAvail(true)}>
              Mikor érek rá →
            </button>
          }
        >
          Mindenkinek jó lenne
        </SectionTitle>

        {commonSlots.length > 0 ? (
          <div className="space-y-2">
            {commonSlots.map((s, i) => (
              <button
                key={i}
                onClick={() => openProposal(nextDateForWeekday(s.weekday, s.start))}
                className="card flex w-full items-center gap-3 p-4 text-left transition hover:border-accent-dim"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-xs font-bold text-accent">
                  {WEEKDAYS[s.weekday].slice(0, 3)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {minutesToTime(s.start)} – {minutesToTime(s.end)}
                  </span>
                  <span className="block text-xs text-muted">
                    Mind a(z) {members.length} fő ráér
                  </span>
                </span>
                <span className="text-xs font-semibold text-accent">Javaslom</span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              silentMembers.length > 0
                ? "Még nem tudjuk, ki mikor ér rá"
                : "Nincs közös szabad sáv"
            }
            body={
              silentMembers.length > 0
                ? "Ha mindenki beállítja a heti ráérését, az app magától kiszámolja, mikor jó mindannyiótoknak."
                : "A megadott sávjaitok nem érnek össze legalább egy órára. Bővítsd a sajátodat, vagy javasolj kézzel időpontot."
            }
          >
            <button className="btn btn-ghost" onClick={() => setShowAvail(true)}>
              Beállítom, mikor érek rá
            </button>
          </EmptyState>
        )}
      </section>

      {/* --- Közelgő -------------------------------------------------- */}
      <section>
        <SectionTitle>Közelgő időpontok</SectionTitle>
        {upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                me={me}
                isOwner={isOwner}
                members={members}
                votes={votes.filter((v) => v.session_id === s.id)}
                gyms={gyms}
                arrived={arrivals.filter((a) => a.sessionId === s.id).map((a) => a.userId)}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="Nincs betervezve semmi" body="Javasolj egy időpontot a fenti + gombbal.">
            <button className="btn btn-primary" onClick={() => openProposal()}>
              Időpontot javaslok
            </button>
          </EmptyState>
        )}
      </section>

      {/* --- Korábbiak ------------------------------------------------ */}
      {past.length > 0 && (
        <section className="pb-4">
          <SectionTitle>Elmúlt két hét</SectionTitle>
          <div className="space-y-3">
            {past.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                me={me}
                isOwner={isOwner}
                members={members}
                votes={votes.filter((v) => v.session_id === s.id)}
                gyms={gyms}
                arrived={arrivals.filter((a) => a.sessionId === s.id).map((a) => a.userId)}
                past
              />
            ))}
          </div>
        </section>
      )}

      {/* --- Új időpont lap ------------------------------------------ */}
      <Sheet open={proposing} onClose={() => setProposing(false)} title="Új időpont">
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="when">
              Mikor?
            </label>
            <input
              id="when"
              type="datetime-local"
              className="field"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>

          <div>
            <p className="label">Meddig tart?</p>
            <div className="grid grid-cols-4 gap-2">
              {[45, 60, 90, 120].map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`btn ${duration === d ? "btn-primary" : "btn-ghost"} px-0 text-xs`}
                >
                  {d}p
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="note">
              Megjegyzés (nem kötelező)
            </label>
            <input
              id="note"
              className="field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Pl. láb + váll"
              maxLength={300}
            />
          </div>

          {isOwner && gyms.length > 0 && (
            <details className="rounded-xl border border-line bg-surface-2 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-muted">
                Másik terembe mennénk?
              </summary>
              <div className="mt-3">
                <GymPicker gyms={gyms} value={gymId} onChange={setGymId} max={5} />
              </div>
            </details>
          )}

          <ErrorNote>{error}</ErrorNote>

          <button
            className="btn btn-primary w-full"
            disabled={pending || !when}
            onClick={() =>
              run(
                () =>
                  proposeSession({
                    startsAt: new Date(when).toISOString(),
                    durationMin: duration,
                    note,
                    gymId,
                  }),
                () => {
                  setProposing(false);
                  setNote("");
                }
              )
            }
          >
            {pending ? "Küldés…" : "Javaslom ezt az időpontot"}
          </button>
        </div>
      </Sheet>

      {/* --- Ráérés-szerkesztő --------------------------------------- */}
      <Sheet open={showAvail} onClose={() => setShowAvail(false)} title="Mikor érek rá?">
        <AvailabilityEditor
          initial={myAvailability}
          onSaved={() => setShowAvail(false)}
        />
      </Sheet>
    </div>
  );
}

/** Alapértelmezett javaslat: a következő egész óra, de legalább 2 óra múlva. */
function defaultNextSlot(): string {
  const d = new Date(Date.now() + 2 * 3_600_000);
  d.setMinutes(0, 0, 0);
  if (d.getHours() < 6) d.setHours(18);
  return d.toISOString();
}
