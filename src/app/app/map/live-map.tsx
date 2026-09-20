"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { checkIn } from "@/app/app/actions";
import { Avatar } from "@/components/avatar";
import { Badge, EmptyState, ErrorNote, SectionTitle, useAction } from "@/components/ui";
import { useLiveLocation } from "@/lib/use-live-location";
import { countdown, formatWhen } from "@/lib/date";
import { LOCATOR_LEAD_MIN, LOCATOR_TAIL_MIN, etaMinutes, formatDistance } from "@/lib/geo";
import type { LivePing, Vote } from "@/lib/types";

const MapCanvas = dynamic(() => import("@/components/map-canvas"), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] animate-pulse rounded-2xl border border-line bg-surface" />
  ),
});

type Member = { id: string; name: string; avatar: string | null };

export default function LiveMap({
  groupId,
  me,
  myName,
  myAvatar,
  gym,
  session,
  members,
  arrived,
}: {
  groupId: string;
  me: string;
  myName: string;
  myAvatar: string | null;
  gym: { id: string; name: string; lat: number; lng: number } | null;
  session: { id: string; startsAt: string; status: string; myVote: Vote | null } | null;
  members: Member[];
  arrived: string[];
}) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 20_000);
    return () => clearInterval(id);
  }, []);

  const minsToStart = session ? (new Date(session.startsAt).getTime() - Date.now()) / 60_000 : null;

  const inWindow =
    session !== null &&
    session.status !== "cancelled" &&
    minsToStart !== null &&
    minsToStart <= LOCATOR_LEAD_MIN &&
    minsToStart > -LOCATOR_TAIL_MIN;

  // Csak akkor osztom meg a helyzetem, ha én is megyek.
  const shouldShare = inWindow && session?.myVote === "yes";

  const live = useLiveLocation({
    enabled: inWindow,
    groupId,
    me,
    myName,
    myAvatar,
    gym: gym ? { lat: gym.lat, lng: gym.lng } : null,
    sessionId: session?.id ?? null,
  });

  const people: LivePing[] = [
    ...(live.mine && shouldShare ? [{ ...live.mine, userId: "me", name: `${myName} (te)` }] : []),
    ...live.others,
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ki merre jár?</h1>
        <p className="mt-1 text-sm text-muted">
          {gym ? gym.name : "Nincs kiválasztva terem"}
          {session && ` · ${formatWhen(session.startsAt)}`}
        </p>
      </header>

      {/* --- Állapotsáv ---------------------------------------------- */}
      {!session ? (
        <EmptyState
          title="Nincs betervezett edzés"
          body="A lokátor akkor kapcsol be, ha van megbeszélt időpont — fél órával előtte."
        >
          <Link href="/app/plan" className="btn btn-primary">
            Időpontot javaslok
          </Link>
        </EmptyState>
      ) : inWindow ? (
        <LocatorBanner live={live} shouldShare={shouldShare} sessionId={session.id} />
      ) : (
        <div className="card flex items-center gap-3 p-4">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-line" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">A lokátor most ki van kapcsolva</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {minsToStart !== null && minsToStart > 0
                ? `Az edzés előtt ${LOCATOR_LEAD_MIN} perccel magától bekapcsol — addig ${countdown(session.startsAt)} van.`
                : "Az edzés véget ért, a helymegosztás leállt."}
            </p>
          </div>
        </div>
      )}

      <MapCanvas
        gym={gym ? { name: gym.name, lat: gym.lat, lng: gym.lng } : null}
        people={people}
        height={380}
      />

      {/* --- Résztvevők ---------------------------------------------- */}
      <section className="pb-4">
        <SectionTitle>A csapat</SectionTitle>
        <div className="card divide-y divide-line">
          {members.map((m) => {
            const ping = m.id === me ? live.mine : live.others.find((p) => p.userId === m.id);
            const hasArrived = arrived.includes(m.id) || ping?.arrived;

            return (
              <div key={m.id} className="flex items-center gap-3 p-4">
                <Avatar
                  url={m.avatar}
                  name={m.name}
                  size={38}
                  ring={hasArrived ? "#c8ff4d" : ping ? "#4ade80" : undefined}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {m.name}
                    {m.id === me && <span className="ml-1.5 text-xs font-normal text-muted">(te)</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {hasArrived
                      ? "Beért a terembe"
                      : ping
                        ? `${formatDistance(ping.distanceM)} · kb. ${etaMinutes(ping.distanceM)} perc`
                        : inWindow
                          ? "Nem osztja meg a helyzetét"
                          : "—"}
                  </p>
                </div>
                {hasArrived ? (
                  <Badge tone="accent">Ott van</Badge>
                ) : ping ? (
                  <Badge tone="yes">Úton</Badge>
                ) : (
                  <Badge>Offline</Badge>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
          A helyzeted csak a csoporttársaidnak, csak az edzés előtti {LOCATOR_LEAD_MIN} percben
          látszik, és a terembe érve magától leáll. Adatbázisba egyedül a megérkezés ténye kerül.
        </p>
      </section>
    </div>
  );
}

function LocatorBanner({
  live,
  shouldShare,
  sessionId,
}: {
  live: ReturnType<typeof useLiveLocation>;
  shouldShare: boolean;
  sessionId: string;
}) {
  const { pending, error, run } = useAction();

  if (!shouldShare) {
    return (
      <div className="card p-4">
        <p className="text-sm font-semibold">A lokátor él, de te nem osztod meg magad</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          A helyzeted csak akkor megy ki, ha „Megyek"-et szavaztál erre az edzésre. A többieket
          addig is látod a térképen.
        </p>
      </div>
    );
  }

  if (live.arrived) {
    return (
      <div className="card border-accent/40 bg-accent/8 p-4">
        <p className="text-sm font-semibold text-accent">Beértél — a helymegosztás leállt 💪</p>
        <p className="mt-1 text-xs text-muted">Jó edzést!</p>
      </div>
    );
  }

  if (live.status === "denied" || live.status === "error") {
    return (
      <div className="card p-4">
        <p className="text-sm font-semibold">{live.error}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-ghost px-3 py-2 text-xs" onClick={live.start}>
            Újra megpróbálom
          </button>
          <button
            className="btn btn-ghost px-3 py-2 text-xs"
            disabled={pending}
            onClick={() => run(() => checkIn({ sessionId, source: "manual" }))}
          >
            Beértem — jelzem kézzel
          </button>
        </div>
        <ErrorNote>{error}</ErrorNote>
      </div>
    );
  }

  return (
    <div className="card flex items-center gap-3 border-accent/30 bg-accent/8 p-4">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-accent">
          {live.status === "sharing" ? "Lokátor bekapcsolva" : "Helyzet meghatározása…"}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {live.mine?.distanceM != null
            ? `${formatDistance(live.mine.distanceM)} a teremtől · kb. ${etaMinutes(live.mine.distanceM)} perc`
            : "A csoportod látja, merre jársz."}
        </p>
      </div>
    </div>
  );
}
