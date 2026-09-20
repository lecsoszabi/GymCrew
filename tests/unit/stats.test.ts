import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { memberStats, weeklySeries } from "@/lib/stats";
import { weekdayIndex } from "@/lib/date";
import type { CheckIn } from "@/lib/types";

const DAY = 86_400_000;

/**
 * Rögzített órajel. A sorozat- és heti számítások héthatárokhoz igazodnak,
 * ezért valós órával a teszt aszerint bukna vagy menne át, hogy a hét melyik
 * napján futtatod. 2026-06-17 egy szerda: a hét közepe, így mindkét irányban
 * van hely a hétfői határig.
 */
const MOST = new Date(2026, 5, 17, 12, 0, 0);

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(MOST);
});
afterAll(() => {
  vi.useRealTimers();
});

function checkIn(userId: string, daysAgo: number, hour = 18): CheckIn {
  const d = new Date(MOST.getTime() - daysAgo * DAY);
  d.setHours(hour, 0, 0, 0);
  return {
    id: `${userId}-${daysAgo}`,
    session_id: null,
    user_id: userId,
    gym_id: null,
    arrived_at: d.toISOString(),
    source: "auto",
  };
}

describe("a rögzített órajel tényleg szerdán áll", () => {
  it("MOST szerda (0 = hétfő)", () => {
    expect(weekdayIndex(MOST)).toBe(2);
  });
});

describe("memberStats", () => {
  it("üres előzményre nullákat ad, nem omlik össze", () => {
    const s = memberStats([], "szabi");
    expect(s.total).toBe(0);
    expect(s.streakWeeks).toBe(0);
    expect(s.lastVisit).toBeNull();
    expect(s.favoriteHour).toBeNull();
  });

  it("csak a saját edzéseket számolja", () => {
    const rows = [checkIn("szabi", 1), checkIn("szabi", 3), checkIn("kristof", 2)];
    expect(memberStats(rows, "szabi").total).toBe(2);
    expect(memberStats(rows, "kristof").total).toBe(1);
  });

  it("a 7 és 30 napos ablakot helyesen vágja", () => {
    const rows = [checkIn("szabi", 1), checkIn("szabi", 10), checkIn("szabi", 60)];
    const s = memberStats(rows, "szabi");
    expect(s.last7).toBe(1);
    expect(s.last30).toBe(2);
    expect(s.total).toBe(3);
  });

  it("a legutóbbi látogatás a legfrissebb", () => {
    const rows = [checkIn("szabi", 9), checkIn("szabi", 2), checkIn("szabi", 40)];
    const s = memberStats(rows, "szabi");
    expect(new Date(s.lastVisit!).getTime()).toBeGreaterThan(MOST.getTime() - 3 * DAY);
  });

  it("a kedvenc időpont a leggyakoribb óra", () => {
    const rows = [checkIn("szabi", 1, 19), checkIn("szabi", 3, 19), checkIn("szabi", 5, 7)];
    expect(memberStats(rows, "szabi").favoriteHour).toBe(19);
  });

  it("a napok eloszlása összeadva kiadja az összeset", () => {
    const rows = [checkIn("szabi", 1), checkIn("szabi", 4), checkIn("szabi", 9)];
    const s = memberStats(rows, "szabi");
    expect(s.weekdayCounts).toHaveLength(7);
    expect(s.weekdayCounts.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it("három egymást követő hétből hármas sorozat lesz", () => {
    // Szerdáról nézve: ma, egy hete, két hete — mind külön hét.
    const rows = [checkIn("szabi", 0), checkIn("szabi", 7), checkIn("szabi", 14)];
    expect(memberStats(rows, "szabi").streakWeeks).toBe(3);
  });

  it("a sorozat megszakad, ha kimarad egy hét", () => {
    // Ezen a héten és három hete — a köztes két hét üres.
    const rows = [checkIn("szabi", 0), checkIn("szabi", 21)];
    expect(memberStats(rows, "szabi").streakWeeks).toBe(1);
  });

  it("a futó hét üressége még nem töri meg a sorozatot", () => {
    // Ezen a héten semmi, de az előző kettőben igen — a sorozat él.
    const rows = [checkIn("szabi", 7), checkIn("szabi", 14)];
    expect(memberStats(rows, "szabi").streakWeeks).toBe(2);
  });

  it("csak régi edzésnél nincs sorozat", () => {
    const rows = [checkIn("szabi", 60)];
    expect(memberStats(rows, "szabi").streakWeeks).toBe(0);
  });
});

describe("weeklySeries", () => {
  it("a kért számú hetet adja vissza", () => {
    expect(weeklySeries([], ["szabi"], 8)).toHaveLength(8);
  });

  it("az utolsó oszlop a futó hét", () => {
    expect(weeklySeries([], ["szabi"], 4).at(-1)!.label).toBe("Most");
  });

  it("a tagonkénti bontás összege a heti összeg", () => {
    const rows = [checkIn("szabi", 1), checkIn("kristof", 1), checkIn("szabi", 2)];
    for (const b of weeklySeries(rows, ["szabi", "kristof"], 2)) {
      const sum = Object.values(b.counts).reduce((a, c) => a + c, 0);
      expect(sum).toBe(b.total);
    }
  });

  it("nem számol bele idegen felhasználót", () => {
    const rows = [checkIn("idegen", 1)];
    expect(weeklySeries(rows, ["szabi"], 2).reduce((a, b) => a + b.total, 0)).toBe(0);
  });

  it("a megfelelő hetekbe sorolja az edzéseket", () => {
    const rows = [checkIn("szabi", 0), checkIn("szabi", 7)];
    const bars = weeklySeries(rows, ["szabi"], 3);
    expect(bars.at(-1)!.total).toBe(1); // futó hét
    expect(bars.at(-2)!.total).toBe(1); // előző hét
    expect(bars.at(-3)!.total).toBe(0);
  });
});
