"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { checkIn } from "@/app/app/actions";
import { ARRIVAL_RADIUS_M, distanceMeters } from "@/lib/geo";
import type { LivePing } from "@/lib/types";

const PING_INTERVAL_MS = 10_000;
const STALE_AFTER_MS = 75_000;

export type LocationState = {
  /** A csoporttársak legfrissebb pozíciói (a sajátom nélkül). */
  others: LivePing[];
  /** A saját pozícióm, ha van engedély. */
  mine: LivePing | null;
  status: "off" | "asking" | "sharing" | "denied" | "error";
  error: string | null;
  arrived: boolean;
  /** Kézi indítás, ha a böngésző csak gesztusra ad engedélyt. */
  start: () => void;
};

/**
 * Élő helymegosztás a csoport privát broadcast csatornáján.
 *
 * A pozíciók NEM kerülnek adatbázisba: elillanó üzenetek, amelyek csak addig
 * élnek, amíg a másik fél nyitva tartja az appot. Adatbázisba egyedül a
 * megérkezés ténye kerül.
 */
export function useLiveLocation({
  enabled,
  groupId,
  me,
  myName,
  myAvatar,
  gym,
  sessionId,
}: {
  enabled: boolean;
  groupId: string | null;
  me: string;
  myName: string;
  myAvatar: string | null;
  gym: { lat: number; lng: number } | null;
  sessionId: string | null;
}): LocationState {
  const supabase = useMemo(() => createClient(), []);
  const [others, setOthers] = useState<Record<string, LivePing>>({});
  const [mine, setMine] = useState<LivePing | null>(null);
  const [status, setStatus] = useState<LocationState["status"]>("off");
  const [error, setError] = useState<string | null>(null);
  const [arrived, setArrived] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const latest = useRef<LivePing | null>(null);
  const watchId = useRef<number | null>(null);
  const checkedIn = useRef(false);
  const manualStart = useRef(false);

  // --- Csatorna: feliratkozás a csoport pozícióira -------------------------
  useEffect(() => {
    if (!enabled || !groupId) return;

    let cancelled = false;
    let usePrivate = true;

    function connect() {
      const channel = supabase.channel(`loc:${groupId}`, {
        config: { broadcast: { self: false }, private: usePrivate },
      });

      channel
        .on("broadcast", { event: "ping" }, ({ payload }) => {
          const p = payload as LivePing;
          if (!p?.userId || p.userId === me) return;
          setOthers((prev) => ({ ...prev, [p.userId]: p }));
        })
        .subscribe((state) => {
          if (cancelled) return;
          if (state === "SUBSCRIBED") setError(null);
          if (state === "CHANNEL_ERROR" && usePrivate) {
            // A privát csatorna házirendje nincs beállítva — visszaesünk a
            // sima csatornára (a csoport UUID-ja így is titkos marad).
            usePrivate = false;
            supabase.removeChannel(channel);
            connect();
          }
        });

      channelRef.current = channel;
    }

    connect();

    return () => {
      cancelled = true;
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [enabled, groupId, me, supabase]);

  // --- Elavult pozíciók kipucolása ----------------------------------------
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      setOthers((prev) => {
        const now = Date.now();
        const next = Object.fromEntries(
          Object.entries(prev).filter(([, p]) => now - p.at < STALE_AFTER_MS)
        );
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 15_000);
    return () => clearInterval(id);
  }, [enabled]);

  // --- Saját pozíció figyelése és szórása ---------------------------------
  const beginWatch = useCallback(() => {
    if (watchId.current !== null) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setError("Ez a böngésző nem tudja megosztani a helyzetedet.");
      return;
    }

    setStatus("asking");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const dist = gym ? distanceMeters(here, gym) : null;
        const isThere = dist !== null && dist <= ARRIVAL_RADIUS_M;

        const ping: LivePing = {
          userId: me,
          name: myName,
          avatar: myAvatar,
          lat: here.lat,
          lng: here.lng,
          accuracy: Math.round(pos.coords.accuracy),
          heading: pos.coords.heading ?? null,
          distanceM: dist,
          arrived: isThere,
          at: Date.now(),
        };

        latest.current = ping;
        setMine(ping);
        setStatus("sharing");

        if (isThere && !checkedIn.current) {
          checkedIn.current = true;
          setArrived(true);
          void checkIn({ sessionId, source: "auto" });
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setError("Nem adtál helymegosztási engedélyt. A többieket így is látod.");
        } else {
          setStatus("error");
          setError("Nem sikerült meghatározni a helyzetedet.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
    );
  }, [gym, me, myAvatar, myName, sessionId]);

  useEffect(() => {
    if (!enabled) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      setStatus("off");
      setMine(null);
      return;
    }

    beginWatch();

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [enabled, beginWatch]);

  // Megosztás 10 másodpercenként — megérkezés után leáll.
  useEffect(() => {
    if (!enabled) return;

    const id = setInterval(() => {
      const ping = latest.current;
      const channel = channelRef.current;
      if (!ping || !channel) return;
      if (ping.arrived && checkedIn.current) {
        // Egy utolsó "beértem" üzenet után nincs több szórás.
        void channel.send({ type: "broadcast", event: "ping", payload: ping });
        latest.current = null;
        return;
      }
      void channel.send({ type: "broadcast", event: "ping", payload: ping });
    }, PING_INTERVAL_MS);

    return () => clearInterval(id);
  }, [enabled]);

  const start = useCallback(() => {
    manualStart.current = true;
    checkedIn.current = false;
    beginWatch();
  }, [beginWatch]);

  return {
    others: Object.values(others).sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0)),
    mine,
    status,
    error,
    arrived,
    start,
  };
}
