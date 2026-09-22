"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { checkIn } from "@/app/app/actions";
import { Avatar } from "@/components/avatar";
import { Badge, EmptyState, ErrorNote, SectionTitle, useAction } from "@/components/ui";
import { useLiveLocation, type LocationState } from "@/lib/use-live-location";
import { countdown, formatWhen } from "@/lib/date";
import { LOCATOR_LEAD_MIN, LOCATOR_TAIL_MIN, etaMinutes, formatDistance } from "@/lib/geo";
import type { LivePing, Vote } from "@/lib/types";

const MapCanvas = dynamic(() => import("@/components/map-canvas"), {
  ssr: false,
  loading: () => (
    <div className="h-[60vh] max-h-[560px] min-h-[320px] animate-pulse rounded-2xl border border-line bg-surface" />
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
  // Percenként frissítjük az időablakot (bekapcsol-e már a lokátor).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const minsToStart = session ? (new Date(session.startsAt).getTime() - now) / 60_000 : null;
  const inWindow =
    session !== null &&
    session.status !== "cancelled" &&
    minsToStart !== null &&
    minsToStart <= LOCATOR_LEAD_MIN &&
    minsToStart > -LOCATOR_TAIL_MIN;

  // Csak az osztja meg a helyzetét, aki "Megyek"-et szavazott.
  const shouldShare = inWindow && session?.myVote === "yes";

  // Stabil objektumok: ha minden rendernél új készülne, a térkép újraigazodna.
  const gymPoint = useMemo(
    () => (gym ? { lat: gym.lat, lng: gym.lng } : null),
    [gym?.lat, gym?.lng] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const gymForMap = useMemo(
    () => (gym ? { name: gym.name, lat: gym.lat, lng: gym.lng } : null),
    [gym?.name, gym?.lat, gym?.lng] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const live = useLiveLocation({
    subscribe: inWindow,
    share: shouldShare,
    groupId,
    me,
    myName,
    myAvatar,
    gym: gymPoint,
    sessionId: session?.id ?? null,
  });

  const people = useMemo<LivePing[]>(
    () => [
      ...(live.mine && shouldShare ? [{ ...live.mine, userId: "me", name: `${myName} (te)` }] : []),
      ...live.others,
    ],
    [live.mine, live.others, shouldShare, myName]
  );

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Ki merre jár?</h1>
        <p className="mt-1 text-sm text-muted">
          {gym ? gym.name : "Nincs kiválasztva terem"}
          {session && ` · ${formatWhen(session.startsAt)}`}
        </p>
      </header>

      {/* --- Állapot ------------------------------------------------- */}
      {!session ? (
        <EmptyState
          title="Nincs betervezett edzés"
          body={`A lokátor edzés előtt ${LOCATOR_LEAD_MIN} perccel kapcsol be magától.`}
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
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted">
            {minsToStart !== null && minsToStart > 0 ? (
              <>
                A lokátor{" "}
                <span className="font-semibold tabular-nums text-fg">{countdown(session.startsAt)}</span> múlva
                magától bekapcsol (edzés előtt {LOCATOR_LEAD_MIN} perccel).
              </>
            ) : (
              "Az edzés véget ért, a helymegosztás leállt."
            )}
          </p>
        </div>
      )}

      {/* Az engedélyt érdemes előre megadni, hogy edzés előtt ne kelljen vele bajlódni. */}
      <PermissionCard live={live} />

      <MapCanvas gym={gymForMap} people={people} />

      {/* --- Résztvevők ----------------------------------------------- */}
      <section className="pb-4">
        <SectionTitle>A csapat</SectionTitle>
        <div className="card divide-y divide-line">
          {members.map((m) => {
            const ping = m.id === me ? (shouldShare ? live.mine : null) : live.others.find((p) => p.userId === m.id);
            const hasArrived = arrived.includes(m.id) || !!ping?.arrived;

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
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {hasArrived
                      ? "Beért a terembe"
                      : ping
                        ? `${formatDistance(ping.distanceM)} · kb. ${etaMinutes(ping.distanceM)} perc`
                        : inWindow
                          ? "Nem osztja meg a helyzetét"
                          : "A lokátor még nem él"}
                  </p>
                </div>
                {hasArrived ? (
                  <Badge tone="accent">Ott van</Badge>
                ) : ping ? (
                  <Badge tone="yes">Úton</Badge>
                ) : (
                  <Badge>Még nem</Badge>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
          A helyzeted csak a csoporttársaidnak, csak az edzés előtti {LOCATOR_LEAD_MIN} percben és
          csak akkor látszik, ha „Megyek"-et szavaztál. A terembe érve magától leáll. Tartsd
          nyitva az appot, mert lezárt telefonon a böngésző nem küld helyzetet.
        </p>
      </section>
    </div>
  );
}

/** Engedély-állapot és -kérés. Mindig látszik, hogy előre meg lehessen adni. */
function PermissionCard({ live }: { live: LocationState }) {
  if (live.permission === "granted") return null;

  if (live.permission === "unsupported") {
    return (
      <div className="card p-4 text-sm leading-relaxed text-muted">
        Ez a böngésző nem tud helyzetet megosztani. Nyisd meg az oldalt Safariban vagy
        Chrome-ban, mert a Messenger és az Instagram beépített böngészője sokszor letiltja.
      </div>
    );
  }

  if (live.permission === "denied") {
    return (
      <div className="card space-y-2 border-no/30 p-4 text-sm leading-relaxed">
        <p className="font-semibold text-no">A helymegosztás le van tiltva</p>
        <p className="text-muted">
          <span className="font-semibold text-fg">iPhone:</span> Beállítások → Adatvédelem és
          biztonság → Helymeghatározás → Safari-webhelyek → „Az app használata közben".
        </p>
        <p className="text-muted">
          <span className="font-semibold text-fg">Android:</span> a címsor melletti lakat ikon →
          Engedélyek → Hely → Engedélyezés.
        </p>
        <button className="btn btn-ghost mt-1 w-full" onClick={live.requestPermission}>
          Beállítottam, próbáld újra
        </button>
      </div>
    );
  }

  // "prompt" vagy "unknown": még nem kérdeztük meg.
  return (
    <div className="card flex items-center gap-4 border-accent/30 bg-accent/5 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Engedélyezd a helymegosztást</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          Most csak engedélyt kérünk. Helyzetet csak edzés előtt küldünk, és csak ha jössz.
        </p>
      </div>
      <button className="btn btn-primary shrink-0 px-4 text-sm" onClick={live.requestPermission}>
        Engedélyezem
      </button>
    </div>
  );
}

function LocatorBanner({
  live,
  shouldShare,
  sessionId,
}: {
  live: LocationState;
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
        <p className="text-sm font-semibold text-accent">Beértél, a helymegosztás leállt 💪</p>
      </div>
    );
  }

  if (live.status === "denied" || live.status === "error") {
    return (
      <div className="card p-4">
        <p className="text-sm font-semibold">{live.error}</p>
        <button
          className="btn btn-ghost mt-3 w-full"
          disabled={pending}
          onClick={() => run(() => checkIn({ sessionId, source: "manual" }))}
        >
          Beértem, jelzem kézzel
        </button>
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
