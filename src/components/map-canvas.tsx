"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ARRIVAL_RADIUS_M, SZEGED_CENTER, formatDistance, etaMinutes } from "@/lib/geo";
import type { LivePing } from "@/lib/types";
import { BARE_VIEWBOX, INK, LIME, dumbbellMarkup } from "@/lib/brand-shape";

type GymPoint = { name: string; lat: number; lng: number } | null;

// ---------------------------------------------------------------------------
// Ikonok — gyorsítótárazva. Ha minden rendernél új ikon készülne, a Leaflet
// kicserélné a jelölő DOM-ját, és a pulzáló animáció újraindulna: ez látszott
// "remegésnek".
// ---------------------------------------------------------------------------

const iconCache = new Map<string, L.DivIcon>();

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function personIcon(p: LivePing, isMe: boolean) {
  const key = `${p.avatar ?? ""}|${initials(p.name)}|${p.arrived ? 1 : 0}|${isMe ? 1 : 0}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const border = p.arrived ? "#c8ff4d" : isMe ? "#f3f5f8" : "#4ade80";
  const inner = p.avatar
    ? `<img src="${escapeAttr(p.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover" />`
    : `<span style="font:700 13px/1 ui-sans-serif,system-ui;color:#8d949f">${escapeHtml(initials(p.name))}</span>`;

  const icon = L.divIcon({
    className: `crew-marker${p.arrived ? "" : " crew-pulse"}`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -25],
    html: `<div style="position:relative;width:44px;height:44px;border-radius:9999px;overflow:hidden;
      background:#1b1e24;border:2px solid ${border};display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 14px rgba(0,0,0,.55)">${inner}</div>`,
  });
  iconCache.set(key, icon);
  return icon;
}

let gymIconSingleton: L.DivIcon | null = null;
function gymIcon() {
  gymIconSingleton ??= L.divIcon({
    className: "crew-marker",
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -25],
    // Ugyanaz a Dóm-súlyzó, mint a logóban, sötéten a lime csempén.
    html: `<div style="width:44px;height:44px;border-radius:4px;background:${LIME};
      display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(200,255,77,.35)">
      <svg viewBox="${BARE_VIEWBOX}" width="32" height="27">${dumbbellMarkup({ detail: false, cutColor: LIME, color: INK })}</svg></div>`,
  });
  return gymIconSingleton;
}

// ---------------------------------------------------------------------------
// Nézet-igazítás
// ---------------------------------------------------------------------------

/**
 * A térkép csak akkor igazodik, ha **új résztvevő** jelenik meg — nem minden
 * pozíció-frissítésnél. Ha a felhasználó egyszer maga húzta vagy nagyította a
 * térképet, onnantól nem vesszük el tőle az irányítást.
 *
 * Korábban ez minden rendernél animált `fitBounds`-ot hívott, és a telefon GPS-e
 * másodpercenként frissít: a térkép folyamatosan ugrált.
 */
export function FitBounds({
  participantsKey,
  points,
}: {
  participantsKey: string;
  points: [number, number][];
}) {
  const map = useMap();
  const fittedKey = useRef<string | null>(null);
  const userMoved = useRef(false);
  // A saját igazításunk is zoomstart-ot vált ki — ezt nem szabad felhasználói
  // mozdulatnak venni, különben az első igazítás után soha többé nem igazodna.
  const programmatic = useRef(false);
  // A legfrissebb pontok ref-ben — a függőség csak a résztvevők halmaza.
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => {
    const onUser = () => {
      if (!programmatic.current) userMoved.current = true;
    };
    const onEnd = () => {
      programmatic.current = false;
    };
    map.on("dragstart", onUser);
    map.on("zoomstart", onUser);
    map.on("moveend", onEnd);
    return () => {
      map.off("dragstart", onUser);
      map.off("zoomstart", onUser);
      map.off("moveend", onEnd);
    };
  }, [map]);

  useEffect(() => {
    if (userMoved.current || fittedKey.current === participantsKey) return;
    const pts = pointsRef.current;
    if (pts.length === 0) return;

    // Az első igazítás animáció nélkül: betöltéskor nincs mit átúsztatni.
    const animate = fittedKey.current !== null;
    fittedKey.current = participantsKey;
    programmatic.current = true;

    if (pts.length === 1) {
      map.setView(pts[0], 15, { animate });
    } else {
      map.fitBounds(L.latLngBounds(pts).pad(0.25), { animate, maxZoom: 16 });
    }
  }, [map, participantsKey]);

  return null;
}

// ---------------------------------------------------------------------------

const PersonMarker = memo(function PersonMarker({ p, isMe }: { p: LivePing; isMe: boolean }) {
  const position = useMemo<[number, number]>(() => [p.lat, p.lng], [p.lat, p.lng]);
  return (
    <Marker position={position} icon={personIcon(p, isMe)} title={p.name} alt={p.name}>
      <Popup>
        <strong>{p.name}</strong>
        <br />
        {p.arrived
          ? "Már a teremben van."
          : `${formatDistance(p.distanceM)} · kb. ${etaMinutes(p.distanceM) ?? "?"} perc`}
      </Popup>
    </Marker>
  );
});

export default function MapCanvas({ gym, people }: { gym: GymPoint; people: LivePing[] }) {
  // A kezdőpont csak az első betöltésnél számít — utána a FitBounds vezet.
  const center = useMemo<[number, number]>(
    () => (gym ? [gym.lat, gym.lng] : [SZEGED_CENTER.lat, SZEGED_CENTER.lng]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const points = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = people.map((p) => [p.lat, p.lng]);
    if (gym) pts.push([gym.lat, gym.lng]);
    return pts;
  }, [people, gym]);

  // Csak a résztvevők halmaza — a pozíciójuk nem.
  const participantsKey = useMemo(
    () => [gym ? `${gym.lat},${gym.lng}` : "-", ...people.map((p) => p.userId).sort()].join("|"),
    [people, gym]
  );

  const gymPos = useMemo<[number, number] | null>(
    () => (gym ? [gym.lat, gym.lng] : null),
    [gym]
  );

  return (
    <div className="h-[60vh] max-h-[560px] min-h-[320px] overflow-hidden rounded-ui border border-line">
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        attributionControl
      >
        {/*
          OpenStreetMap-csempék, CSS-szel sötétítve (globals.css). A CARTO sötét
          csempéi API-kulcsot kérnek, és kulcs nélkül vízjellel jönnek.
        */}
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        {gym && gymPos && (
          <>
            <Circle
              center={gymPos}
              radius={ARRIVAL_RADIUS_M}
              pathOptions={{ color: "#c8ff4d", weight: 1, fillOpacity: 0.07 }}
            />
            <Marker position={gymPos} icon={gymIcon()} title={gym.name} alt={gym.name}>
              <Popup>
                <strong>{gym.name}</strong>
                <br />
                Ezen a körön belül számít beérkezésnek.
              </Popup>
            </Marker>
          </>
        )}

        {people.map((p) => (
          <PersonMarker key={p.userId} p={p} isMe={p.userId === "me"} />
        ))}

        <FitBounds participantsKey={participantsKey} points={points} />
      </MapContainer>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}
function escapeAttr(s: string) {
  return escapeHtml(s).replace(/`/g, "&#96;");
}
