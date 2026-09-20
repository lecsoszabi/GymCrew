"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui";
import { VoteControls } from "@/components/vote-controls";
import { countdown, formatWhen } from "@/lib/date";
import { LOCATOR_LEAD_MIN } from "@/lib/geo";
import type { Gym, SessionVote, TrainingSession, Vote } from "@/lib/types";

type Member = { id: string; name: string; avatar: string | null };

export function NextSessionCard({
  session,
  gym,
  members,
  votes,
  me,
  arrived,
}: {
  session: TrainingSession;
  gym: Gym | null;
  members: Member[];
  votes: SessionVote[];
  me: string;
  arrived: string[];
}) {
  const [, tick] = useState(0);

  // Percenként újrarajzolunk, hogy a visszaszámláló éljen.
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const myVote = (votes.find((v) => v.user_id === me)?.vote ?? null) as Vote | null;
  const startMs = new Date(session.starts_at).getTime();
  const minsToStart = (startMs - Date.now()) / 60_000;
  const locatorOn = minsToStart <= LOCATOR_LEAD_MIN && minsToStart > -60;
  const yesCount = votes.filter((v) => v.vote === "yes").length;
  const allIn = yesCount === members.length && members.length > 0;

  return (
    <article className="card overflow-hidden">
      <div className="border-b border-line p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xl font-bold tracking-tight">{formatWhen(session.starts_at)}</p>
            <p className="mt-1 text-sm text-muted">
              {gym?.name ?? "nincs terem"} · {session.duration_min} perc
            </p>
          </div>
          <Badge tone={session.status === "confirmed" ? "yes" : session.status === "cancelled" ? "no" : "maybe"}>
            {session.status === "confirmed"
              ? "Megerősítve"
              : session.status === "cancelled"
                ? "Lemondva"
                : session.status === "done"
                  ? "Megvolt"
                  : "Egyeztetés"}
          </Badge>
        </div>

        {session.note && <p className="mt-3 text-sm text-muted">„{session.note}"</p>}

        <p className="mt-3 text-sm">
          {minsToStart > 0 ? (
            <>
              <span className="text-muted">Kezdésig</span>{" "}
              <span className="font-semibold text-accent">{countdown(session.starts_at)}</span>
            </>
          ) : (
            <span className="font-semibold text-accent">Most van</span>
          )}
        </p>
      </div>

      {locatorOn && session.status !== "cancelled" && (
        <Link
          href="/app/map"
          className="flex items-center gap-3 border-b border-line bg-accent/10 px-5 py-3.5 transition hover:bg-accent/15"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
          </span>
          <span className="min-w-0 flex-1 text-sm font-semibold text-accent">
            Lokátor bekapcsolva — nézd meg, ki merre jár
          </span>
          <span className="text-accent">→</span>
        </Link>
      )}

      <div className="p-5">
        <div className="mb-4 space-y-2.5">
          {members.map((m) => {
            const v = votes.find((x) => x.user_id === m.id);
            const hasArrived = arrived.includes(m.id);
            return (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar
                  url={m.avatar}
                  name={m.name}
                  size={32}
                  ring={
                    hasArrived
                      ? "#c8ff4d"
                      : v?.vote === "yes"
                        ? "#4ade80"
                        : v?.vote === "no"
                          ? "#f87171"
                          : undefined
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  {v?.vote === "no" && v.reason && (
                    <p className="truncate text-xs text-no/85">{v.reason}</p>
                  )}
                </div>
                {hasArrived ? (
                  <Badge tone="accent">Beért</Badge>
                ) : v ? (
                  <Badge tone={v.vote === "yes" ? "yes" : v.vote === "maybe" ? "maybe" : "no"}>
                    {v.vote === "yes" ? "Megy" : v.vote === "maybe" ? "Talán" : "Nem"}
                  </Badge>
                ) : (
                  <Badge>Nem szavazott</Badge>
                )}
              </div>
            );
          })}
        </div>

        {allIn && (
          <p className="mb-3 rounded-lg bg-yes/10 px-3 py-2 text-center text-xs font-semibold text-yes">
            Mindenki benne van 🎉
          </p>
        )}

        {session.status !== "cancelled" && (
          <VoteControls sessionId={session.id} myVote={myVote} />
        )}
      </div>
    </article>
  );
}
