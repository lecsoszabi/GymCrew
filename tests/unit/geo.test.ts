import { describe, expect, it } from "vitest";
import {
  ARRIVAL_RADIUS_M,
  LOCATOR_LEAD_MIN,
  SZEGED_CENTER,
  distanceMeters,
  etaMinutes,
  formatDistance,
} from "@/lib/geo";

// Valós szegedi pontok a seedből.
const CEDRUS = { lat: 46.257473, lng: 20.130532 };
const IZOMETRIA = { lat: 46.255918, lng: 20.147599 };

describe("distanceMeters", () => {
  it("azonos pontra nullát ad", () => {
    expect(distanceMeters(CEDRUS, CEDRUS)).toBe(0);
  });

  it("két szegedi kondi távolsága a valós nagyságrendbe esik", () => {
    const d = distanceMeters(CEDRUS, IZOMETRIA);
    // Légvonalban nagyjából 1,3 km.
    expect(d).toBeGreaterThan(1100);
    expect(d).toBeLessThan(1500);
  });

  it("szimmetrikus", () => {
    expect(distanceMeters(CEDRUS, IZOMETRIA)).toBe(distanceMeters(IZOMETRIA, CEDRUS));
  });

  it("ismert távolságot pontosan számol (1 fok szélesség ≈ 111 km)", () => {
    const d = distanceMeters({ lat: 46, lng: 20 }, { lat: 47, lng: 20 });
    expect(d).toBeGreaterThan(111_000);
    expect(d).toBeLessThan(111_500);
  });
});

describe("geofence — mikor számít beérkezésnek", () => {
  it("a terem tőszomszédsága beérkezés", () => {
    // Kb. 50 méterrel odébb.
    const near = { lat: CEDRUS.lat + 0.00045, lng: CEDRUS.lng };
    expect(distanceMeters(near, CEDRUS)).toBeLessThanOrEqual(ARRIVAL_RADIUS_M);
  });

  it("300 méter már nem az", () => {
    const far = { lat: CEDRUS.lat + 0.0027, lng: CEDRUS.lng };
    expect(distanceMeters(far, CEDRUS)).toBeGreaterThan(ARRIVAL_RADIUS_M);
  });

  it("a másik kondi nem számít beérkezésnek", () => {
    expect(distanceMeters(IZOMETRIA, CEDRUS)).toBeGreaterThan(ARRIVAL_RADIUS_M);
  });
});

describe("formatDistance", () => {
  it("méterben marad 1 km alatt", () => {
    expect(formatDistance(850)).toBe("850 m");
  });
  it("kilométerre vált felette", () => {
    expect(formatDistance(1500)).toBe("1.5 km");
  });
  it("hiányzó értéket jelöl", () => {
    expect(formatDistance(null)).toBe("–");
  });
});

describe("etaMinutes", () => {
  it("közeli pontra is legalább egy percet mond", () => {
    expect(etaMinutes(10)).toBe(1);
  });
  it("a távolsággal arányosan nő", () => {
    const a = etaMinutes(850)!;
    const b = etaMinutes(1700)!;
    expect(b).toBeGreaterThan(a);
  });
  it("hiányzó távolságra null", () => {
    expect(etaMinutes(null)).toBeNull();
  });
});

describe("állandók", () => {
  it("a lokátor fél órával előbb kapcsol be", () => {
    expect(LOCATOR_LEAD_MIN).toBe(30);
  });
  it("Szeged központja a városban van", () => {
    expect(SZEGED_CENTER.lat).toBeCloseTo(46.25, 1);
    expect(SZEGED_CENTER.lng).toBeCloseTo(20.14, 1);
  });
});
