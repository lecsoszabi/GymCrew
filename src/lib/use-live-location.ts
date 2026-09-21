"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { checkIn } from "@/app/app/actions";
import { ARRIVAL_RADIUS_M, distanceMeters } from "@/lib/geo";
import type { LivePing } from "@/lib/types";

const PING_INTERVAL_MS = 10_000;
const STALE_AFTER_MS = 75_000;
/** A GPS egy helyben állva is "remeg" pár métert — ennyi alatt nem rajzolunk újra. */
export const MIN_MOVE_M = 8;
/** De ennyi időnként mindenképp frissítünk, hogy a pontosság is látszódjon. */
export const MAX_QUIET_MS = 15_000;

/** Szegedet bőven lefedő koordináta-határok — ezen kívül nem rajzolunk. */
const LAT_RANGE = [45.5, 47.0] as const;
const LNG_RANGE = [19.3, 21.0] as const;

function finite(n: unknown, min: number, max: number): number | null {
  return typeof n === "number" && Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** Ellenőrzött LivePing, vagy null, ha az üzenet nem értelmes. */
function sanitizePing(raw: unknown): LivePing | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;

  const userId = typeof p.userId === "string" ? p.userId.slice(0, 64) : null;
  const lat = finite(p.lat, LAT_RANGE[0], LAT_RANGE[1]);
  const lng = finite(p.lng, LNG_RANGE[0], LNG_RANGE[1]);
  if (!userId || lat === null || lng === null) return null;

  const avatar =
    typeof p.avatar === "string" && /^https:\/\//.test(p.avatar) ? p.avatar.slice(0, 500) : null;

  return {
    userId,
    name: typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 40) : "Ismeretlen",
    avatar,
    lat,
    lng,
    accuracy: finite(p.accuracy, 0, 100_000) ?? 0,
    heading: finite(p.heading, 0, 360),
    distanceM: finite(p.distanceM, 0, 1_000_000),
    arrived: p.arrived === true,
    at: finite(p.at, 0, Number.MAX_SAFE_INTEGER) ?? Date.now(),
  };
}

export type Permission = "unknown" | "prompt" | "granted" | "denied" | "unsupported";

export type LocationState = {
  /** A csoporttársak legfrissebb pozíciói (a sajátom nélkül). */
  others: LivePing[];
  /** A saját pozícióm — csak ha épp megosztom. */
  mine: LivePing | null;
  status: "off" | "asking" | "sharing" | "denied" | "error";
  /** A böngésző helyengedélye, ha le tudjuk kérdezni. */
  permission: Permission;
  error: string | null;
  arrived: boolean;
  /**
   * Engedélykérés koppintásra. Telefonon a rendszer-ablak csak felhasználói
   * gesztusra jön fel megbízhatóan, ezért ezt gombhoz kötjük.
   */
  requestPermission: () => void;
};

/**
 * Élő helymegosztás a csoport privát broadcast csatornáján.
 *
 * Két külön kapcsoló:
 *  - `subscribe`: a csoporttársak pozícióinak fogadása (az edzés előtti ablakban)
 *  - `share`: a SAJÁT pozícióm figyelése és elküldése — csak ha "Megyek"-et
 *    szavaztam. Aki nem jön, annak a helyzete nem megy ki.
 *
 * A pozíciók nem kerülnek adatbázisba: elillanó üzenetek. Adatbázisba egyedül a
 * megérkezés ténye kerül.
 */
export function useLiveLocation({
  subscribe,
  share,
  groupId,
  me,
  myName,
  myAvatar,
  gym,
  sessionId,
}: {
  subscribe: boolean;
  share: boolean;
  groupId: string | null;
  me: string;
  myName: string;
  myAvatar: string | null;
  gym: { lat: number; lng: number } | null;
  sessionId: string | null;
}): LocationState {
  const supabase = useMemo(() => createClient(), []);
  const [othersById, setOthersById] = useState<Record<string, LivePing>>({});
  const [mine, setMine] = useState<LivePing | null>(null);
  const [status, setStatus] = useState<LocationState["status"]>("off");
  const [permission, setPermission] = useState<Permission>("unknown");
  const [error, setError] = useState<string | null>(null);
  const [arrived, setArrived] = useState(false);
  // Újrapróbálás a felhasználó kérésére (pl. engedély megadása után).
  const [attempt, setAttempt] = useState(0);

  // A változó bemeneteket ref-ben tartjuk, így a figyelést NEM kell újraindítani,
  // ha a szülő minden rendernél új objektumot ad át. Enélkül a figyelés minden
  // rendernél leállt és újraindult, és a telefon tárolt pozíciója azonnal újabb
  // rendert váltott ki — végtelen ciklus, ami megölte a böngészőt.
  const inputs = useRef({ me, myName, myAvatar, gym, sessionId });
  inputs.current = { me, myName, myAvatar, gym, sessionId };

  const channelRef = useRef<RealtimeChannel | null>(null);
  const latest = useRef<LivePing | null>(null);
  const lastShown = useRef<{ lat: number; lng: number; at: number; arrived: boolean } | null>(null);
  const checkedIn = useRef(false);

  // --- Engedély állapota --------------------------------------------------
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermission("unsupported");
      return;
    }
    const query = navigator.permissions?.query?.({ name: "geolocation" as PermissionName });
    if (!query) return;

    let active = true;
    let handle: PermissionStatus | null = null;
    query
      .then((s) => {
        if (!active) return;
        handle = s;
        setPermission(s.state as Permission);
        s.onchange = () => setPermission(s.state as Permission);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (handle) handle.onchange = null;
    };
  }, []);

  // --- Csatorna: a csoport pozícióinak fogadása --------------------------
  useEffect(() => {
    if (!subscribe || !groupId) return;

    let cancelled = false;
    let usePrivate = true;

    function connect() {
      const channel = supabase.channel(`loc:${groupId}`, {
        config: { broadcast: { self: false }, private: usePrivate },
      });

      channel
        .on("broadcast", { event: "ping" }, ({ payload }) => {
          const p = sanitizePing(payload);
          if (!p || p.userId === inputs.current.me) return;
          setOthersById((prev) => ({ ...prev, [p.userId]: p }));
        })
        .subscribe((state) => {
          if (cancelled) return;
          if (state === "CHANNEL_ERROR" && usePrivate) {
            // A privát csatorna házirendje nincs beállítva — sima csatorna.
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
  }, [subscribe, groupId, supabase]);

  // Elavult pozíciók kipucolása.
  useEffect(() => {
    if (!subscribe) return;
    const id = setInterval(() => {
      setOthersById((prev) => {
        const now = Date.now();
        const next = Object.fromEntries(
          Object.entries(prev).filter(([, p]) => now - p.at < STALE_AFTER_MS)
        );
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 15_000);
    return () => clearInterval(id);
  }, [subscribe]);

  // --- Saját pozíció ------------------------------------------------------
  const onPosition = useCallback((pos: GeolocationPosition) => {
    const { me, myName, myAvatar, gym, sessionId } = inputs.current;
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

    // A szórásra mindig a legfrissebb megy…
    latest.current = ping;
    setStatus("sharing");
    setPermission("granted");
    setError(null);

    // …a képernyő viszont csak érdemi elmozdulásnál frissül: a GPS egy helyben
    // állva is ugrál pár métert, és minden apró ugrás újrarajzolást jelentene.
    const prev = lastShown.current;
    const moved = prev ? distanceMeters(prev, here) : Infinity;
    const quietFor = prev ? ping.at - prev.at : Infinity;
    if (!prev || moved >= MIN_MOVE_M || quietFor >= MAX_QUIET_MS || prev.arrived !== isThere) {
      lastShown.current = { lat: here.lat, lng: here.lng, at: ping.at, arrived: isThere };
      setMine(ping);
    }

    if (isThere && !checkedIn.current) {
      checkedIn.current = true;
      setArrived(true);
      void checkIn({ sessionId, source: "auto" });
    }
  }, []);

  const onError = useCallback((err: GeolocationPositionError) => {
    if (err.code === err.PERMISSION_DENIED) {
      setStatus("denied");
      setPermission("denied");
      setError("A helymegosztás le van tiltva ennél az oldalnál.");
    } else {
      setStatus("error");
      setError("Nem sikerült meghatározni a helyzetedet. Próbáld a szabad ég alatt.");
    }
  }, []);

  // A figyelés CSAK a `share` kapcsolóra (és kézi újrapróbálásra) indul újra.
  useEffect(() => {
    if (!share) {
      setStatus("off");
      setMine(null);
      latest.current = null;
      lastShown.current = null;
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setPermission("unsupported");
      setError("Ez a böngésző nem tudja megosztani a helyzetedet.");
      return;
    }

    setStatus("asking");
    const id = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 5_000,
      timeout: 20_000,
    });
    return () => navigator.geolocation.clearWatch(id);
  }, [share, attempt, onPosition, onError]);

  // Szórás 10 másodpercenként — csak ha tényleg megosztok.
  useEffect(() => {
    if (!share) return;
    const id = setInterval(() => {
      const ping = latest.current;
      const channel = channelRef.current;
      if (!ping || !channel) return;
      void channel.send({ type: "broadcast", event: "ping", payload: ping });
      // A "beértem" után egy utolsó üzenet megy ki, aztán csend.
      if (ping.arrived && checkedIn.current) latest.current = null;
    }, PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [share]);

  const requestPermission = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermission("unsupported");
      return;
    }
    // Koppintásra kérünk egy pozíciót: ez hozza fel a rendszer engedélyablakát.
    navigator.geolocation.getCurrentPosition(
      () => {
        setPermission("granted");
        setError(null);
        setAttempt((n) => n + 1);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
          setError("A helymegosztás le van tiltva ennél az oldalnál.");
        } else {
          setError("Nem sikerült meghatározni a helyzetedet.");
        }
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 }
    );
  }, []);

  const others = useMemo(
    () => Object.values(othersById).sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0)),
    [othersById]
  );

  return { others, mine, status, permission, error, arrived, requestPermission };
}
