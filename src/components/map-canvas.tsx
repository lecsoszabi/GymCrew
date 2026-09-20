"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ARRIVAL_RADIUS_M, SZEGED_CENTER, formatDistance, etaMinutes } from "@/lib/geo";
import type { LivePing } from "@/lib/types";

type GymPoint = { name: string; lat: number; lng: number } | null;

/** Avatarból (vagy kezdőbetűből) rajzolt térkép-jelölő. */
function personIcon(p: LivePing, isMe: boolean) {
  const initials = p.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const border = p.arrived ? "#c8ff4d" : isMe ? "#f3f5f8" : "#4ade80";
  const inner = p.avatar
    ? `<img src="${escapeAttr(p.avatar)}" alt="" style="width:100%;height:100%;object-fit:cover" />`
    : `<span style="font:700 13px/1 ui-sans-serif,system-ui;color:#8d949f">${escapeHtml(initials)}</span>`;

  return L.divIcon({
    className: `crew-marker${p.arrived ? "" : " crew-pulse"}`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -22],
    html: `<div style="position:relative;width:38px;height:38px;border-radius:9999px;overflow:hidden;
      background:#1b1e24;border:2px solid ${border};display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 14px rgba(0,0,0,.55)">${inner}</div>`,
  });
}

function gymIcon() {
  return L.divIcon({
    className: "crew-marker",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
    html: `<div style="width:40px;height:40px;border-radius:12px;background:#c8ff4d;
      display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(200,255,77,.35)">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#0a0b0d" stroke-width="2.2" stroke-linecap="round">
        <path d="M6 12h12M4 9v6M2 10.5v3M20 9v6M22 10.5v3"/>
      </svg></div>`,
  });
}

/** A térkép mindig lássa a kondit és mindenkit, aki úton van. */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
      return;
    }
    map.fitBounds(L.latLngBounds(points).pad(0.25), { animate: true });
  }, [map, points]);

  return null;
}

export default function MapCanvas({
  gym,
  people,
  height = 380,
}: {
  gym: GymPoint;
  people: LivePing[];
  height?: number;
}) {
  const center: [number, number] = gym
    ? [gym.lat, gym.lng]
    : [SZEGED_CENTER.lat, SZEGED_CENTER.lng];

  const points = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = people.map((p) => [p.lat, p.lng]);
    if (gym) pts.push([gym.lat, gym.lng]);
    return pts;
  }, [people, gym]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line" style={{ height }}>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
        attributionControl
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        {gym && (
          <>
            <Circle
              center={[gym.lat, gym.lng]}
              radius={ARRIVAL_RADIUS_M}
              pathOptions={{ color: "#c8ff4d", weight: 1, fillOpacity: 0.07 }}
            />
            <Marker position={[gym.lat, gym.lng]} icon={gymIcon()}>
              <Popup>
                <strong>{gym.name}</strong>
                <br />
                Ezen a körön belül számít beérkezésnek.
              </Popup>
            </Marker>
          </>
        )}

        {people.map((p) => (
          <Marker key={p.userId} position={[p.lat, p.lng]} icon={personIcon(p, p.userId === "me")}>
            <Popup>
              <strong>{p.name}</strong>
              <br />
              {p.arrived
                ? "Már a teremben van."
                : `${formatDistance(p.distanceM)} · kb. ${etaMinutes(p.distanceM) ?? "?"} perc`}
            </Popup>
          </Marker>
        ))}

        <FitBounds points={points} />
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
