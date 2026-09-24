"use client";

import { useState } from "react";
import { checkIn, deleteSession, setSessionGym, setSessionStatus } from "@/app/app/actions";
import { Avatar } from "@/components/avatar";
import { GymPicker } from "@/components/gym-picker";
import { Badge, ConfirmSheet, ErrorNote, Sheet, useAction } from "@/components/ui";
import { VoteControls } from "@/components/vote-controls";
import { formatWhen } from "@/lib/date";
import type { Gym, SessionVote, TrainingSession, Vote } from "@/lib/types";

type Member = { id: string; name: string; avatar: string | null };

export function SessionRow({
  session,
  me,
  isOwner,
  members,
  votes,
  gyms,
  arrived,
  past,
  defaultOpen,
}: {
  session: TrainingSession;
  me: string;
  isOwner: boolean;
  members: Member[];
  votes: SessionVote[];
  gyms: Gym[];
  arrived: string[];
  past?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [switching, setSwitching] = useState(false);
  const [pickedGym, setPickedGym] = useState<string | null>(session.gym_id);
  const [deleting, setDeleting] = useState(false);
  const { pending, error, run } = useAction();

  const myVote = (votes.find((v) => v.user_id === me)?.vote ?? null) as Vote | null;
  const gym = gyms.find((g) => g.id === session.gym_id) ?? null;
  const yes = votes.filter((v) => v.vote === "yes");
  const no = votes.filter((v) => v.vote === "no");
  const cancelled = session.status === "cancelled";

  return (
    // A lemondott időpont visszafogottabb, de a szövege ugyanúgy olvasható marad
    // (WCAG kontraszt): átlátszóság helyett szaggatott keret, halvány, áthúzott
    // időpont és szürke profilképek.
    <article
      className="card overflow-hidden"
      style={cancelled ? { borderStyle: "dashed", background: "transparent" } : undefined}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p
            className={`font-display text-lg font-bold leading-tight tabular-nums ${
              cancelled ? "text-muted line-through" : ""
            }`}
          >
            {formatWhen(session.starts_at)}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {gym?.name ?? "nincs terem"} · {session.duration_min} perc
            {session.note ? ` · ${session.note}` : ""}
          </p>
        </div>

        <div className={`flex shrink-0 -space-x-2 ${cancelled ? "grayscale" : ""}`}>
          {members.slice(0, 4).map((m) => {
            const v = votes.find((x) => x.user_id === m.id);
            return (
              <Avatar
                key={m.id}
                url={m.avatar}
                name={m.name}
                size={26}
                ring={
                  arrived.includes(m.id)
                    ? "#c8ff4d"
                    : v?.vote === "yes"
                      ? "#4ade80"
                      : v?.vote === "no"
                        ? "#f87171"
                        : "#262a31"
                }
              />
            );
          })}
        </div>

        <Badge
          tone={
            cancelled ? "no" : session.status === "confirmed" ? "yes" : past ? "muted" : "maybe"
          }
        >
          {cancelled
            ? "Lemondva"
            : session.status === "confirmed"
              ? past
                ? "Megvolt"
                : "Megerősítve"
              : past
                ? "Elmaradt"
                : `${yes.length}/${members.length}`}
        </Badge>
      </button>

      {open && (
        <div className="border-t border-line p-4">
          <div className="mb-4 space-y-2.5">
            {members.map((m) => {
              const v = votes.find((x) => x.user_id === m.id);
              const hasArrived = arrived.includes(m.id);
              return (
                <div key={m.id} className="flex items-start gap-3">
                  <Avatar url={m.avatar} name={m.name} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{m.name}</p>
                    {v?.reason && (
                      <p className={`text-xs ${v.vote === "no" ? "text-no/85" : "text-muted"}`}>
                        {v.reason}
                      </p>
                    )}
                  </div>
                  {hasArrived ? (
                    <Badge tone="accent">Beért</Badge>
                  ) : v ? (
                    <Badge tone={v.vote === "yes" ? "yes" : v.vote === "maybe" ? "maybe" : "no"}>
                      {v.vote === "yes" ? "Megy" : v.vote === "maybe" ? "Talán" : "Nem"}
                    </Badge>
                  ) : (
                    <Badge>Néma</Badge>
                  )}
                </div>
              );
            })}
          </div>

          {no.length > 0 && !past && (
            <p className="mb-3 rounded-ui bg-no/8 px-3 py-2 text-xs leading-relaxed text-no/90">
              {no.length === 1 ? "Egy nem" : `${no.length} nem`} érkezett. Nézd meg az indokot, és
              javasolj másik időpontot.
            </p>
          )}

          {!past && !cancelled && <VoteControls sessionId={session.id} myVote={myVote} compact />}

          <ErrorNote>{error}</ErrorNote>

          <div className="mt-3 flex flex-wrap gap-2">
            {past && session.status !== "cancelled" && !arrived.includes(me) && (
              <button
                className="btn btn-ghost px-3 py-2 text-xs"
                disabled={pending}
                onClick={() => run(() => checkIn({ sessionId: session.id, source: "manual" }))}
              >
                Ott voltam
              </button>
            )}
            {!past && !arrived.includes(me) && myVote === "yes" && (
              <button
                className="btn btn-ghost px-3 py-2 text-xs"
                disabled={pending}
                onClick={() => run(() => checkIn({ sessionId: session.id, source: "manual" }))}
              >
                Beértem
              </button>
            )}
            {isOwner && !past && (
              <button
                className="btn btn-ghost px-3 py-2 text-xs"
                onClick={() => setSwitching(true)}
              >
                Terem
              </button>
            )}
            {!past &&
              (cancelled ? (
                <button
                  className="btn btn-ghost px-3 py-2 text-xs"
                  disabled={pending}
                  onClick={() =>
                    run(() => setSessionStatus({ sessionId: session.id, status: "proposed" }))
                  }
                >
                  Mégis megtartjuk
                </button>
              ) : (
                <button
                  className="btn btn-ghost px-3 py-2 text-xs text-no"
                  disabled={pending}
                  onClick={() =>
                    run(() => setSessionStatus({ sessionId: session.id, status: "cancelled" }))
                  }
                >
                  Lemondom
                </button>
              ))}
            {(session.created_by === me || isOwner) && (
              <button
                className="btn btn-ghost ml-auto px-3 py-2 text-xs text-muted"
                disabled={pending}
                onClick={() => setDeleting(true)}
              >
                Törlés
              </button>
            )}
          </div>
        </div>
      )}

      <ConfirmSheet
        open={deleting}
        title="Törlöd ezt az időpontot?"
        body="A szavazatok is elvesznek. Ha csak elmarad, inkább mondd le."
        confirmLabel="Törlöm"
        danger
        pending={pending}
        onClose={() => setDeleting(false)}
        onConfirm={() => run(() => deleteSession(session.id), () => setDeleting(false))}
      />

      <Sheet open={switching} onClose={() => setSwitching(false)} title="Ehhez az edzéshez">
        <GymPicker gyms={gyms} value={pickedGym} onChange={setPickedGym} max={5} />
        <ErrorNote>{error}</ErrorNote>
        <button
          className="btn btn-primary mt-4 w-full"
          disabled={pending || !pickedGym}
          onClick={() =>
            run(() => setSessionGym({ sessionId: session.id, gymId: pickedGym! }), () =>
              setSwitching(false)
            )
          }
        >
          Terem beállítása
        </button>
      </Sheet>
    </article>
  );
}
