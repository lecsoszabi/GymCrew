/** Két pont távolsága méterben (haversine). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Ekkora sugáron belül számít "beértem a kondiba"-nak. */
export const ARRIVAL_RADIUS_M = 150;

/** Ennyivel az edzés előtt kapcsol be a lokátor. */
export const LOCATOR_LEAD_MIN = 30;

/** Az edzés kezdete után ennyivel mindenképp leáll a megosztás. */
export const LOCATOR_TAIL_MIN = 30;

export function formatDistance(m: number | null): string {
  if (m == null) return "–";
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

/** Durva becslés gyalogos + városi közlekedésre: ~85 m/perc. */
export function etaMinutes(distanceM: number | null): number | null {
  if (distanceM == null) return null;
  return Math.max(1, Math.round(distanceM / 85));
}

/** Szeged központja — ide néz a térkép, ha még nincs jobb ötlete. */
export const SZEGED_CENTER = { lat: 46.253, lng: 20.1414 };
