import { describe, expect, it } from "vitest";
import { commonSlots, nextDateForWeekday, minutesToTime, timeToMinutes } from "@/lib/date";
import type { Availability } from "@/lib/types";

/** Rövidítés a ráérés-sorok gyártásához. */
function slot(user_id: string, weekday: number, from: string, to: string): Availability {
  return {
    id: `${user_id}-${weekday}-${from}`,
    user_id,
    weekday,
    start_min: timeToMinutes(from),
    end_min: timeToMinutes(to),
  };
}

describe("commonSlots — mikor jó MINDENKINEK", () => {
  it("két ember átfedő sávjából a metszetet adja", () => {
    const rows = [
      slot("anna", 0, "16:00", "20:00"),
      slot("bence", 0, "18:00", "22:00"),
    ];
    const out = commonSlots(rows, ["anna", "bence"]);
    expect(out).toHaveLength(1);
    expect(minutesToTime(out[0].start)).toBe("18:00");
    expect(minutesToTime(out[0].end)).toBe("20:00");
  });

  it("nem ad vissza sávot, ha nincs átfedés", () => {
    const rows = [
      slot("anna", 0, "06:00", "09:00"),
      slot("bence", 0, "18:00", "22:00"),
    ];
    expect(commonSlots(rows, ["anna", "bence"])).toHaveLength(0);
  });

  it("kihagyja a túl rövid átfedést (alapból 60 perc alatt)", () => {
    const rows = [
      slot("anna", 2, "17:00", "18:30"),
      slot("bence", 2, "18:00", "21:00"),
    ];
    // Az átfedés csak 30 perc.
    expect(commonSlots(rows, ["anna", "bence"])).toHaveLength(0);
    // Rövidebb minimummal viszont már jó.
    expect(commonSlots(rows, ["anna", "bence"], 30)).toHaveLength(1);
  });

  it("aki nem adott meg semmit, az kiejti az egész napot", () => {
    const rows = [slot("anna", 0, "16:00", "20:00")];
    expect(commonSlots(rows, ["anna", "bence"])).toHaveLength(0);
  });

  it("egy emberen belül összevonja az egymásba érő sávokat", () => {
    const rows = [
      slot("anna", 3, "16:00", "18:00"),
      slot("anna", 3, "17:30", "21:00"),
      slot("bence", 3, "16:30", "20:30"),
    ];
    const out = commonSlots(rows, ["anna", "bence"]);
    expect(out).toHaveLength(1);
    expect(minutesToTime(out[0].start)).toBe("16:30");
    expect(minutesToTime(out[0].end)).toBe("20:30");
  });

  it("három embernél is helyes a metszet", () => {
    const rows = [
      slot("a", 4, "15:00", "21:00"),
      slot("b", 4, "16:00", "20:00"),
      slot("c", 4, "17:00", "19:00"),
    ];
    const out = commonSlots(rows, ["a", "b", "c"]);
    expect(out).toHaveLength(1);
    expect(minutesToTime(out[0].start)).toBe("17:00");
    expect(minutesToTime(out[0].end)).toBe("19:00");
  });

  it("naponként külön számol", () => {
    const rows = [
      slot("anna", 0, "17:00", "20:00"),
      slot("bence", 0, "17:00", "20:00"),
      slot("anna", 5, "09:00", "12:00"),
      slot("bence", 5, "10:00", "13:00"),
    ];
    const out = commonSlots(rows, ["anna", "bence"]);
    expect(out.map((s) => s.weekday)).toEqual([0, 5]);
  });

  it("üres taglistára üreset ad, nem omlik össze", () => {
    expect(commonSlots([], [])).toEqual([]);
  });
});

describe("nextDateForWeekday", () => {
  it("mindig a jövőbe mutat", () => {
    for (let wd = 0; wd < 7; wd++) {
      const iso = nextDateForWeekday(wd, 18 * 60);
      expect(new Date(iso).getTime()).toBeGreaterThan(Date.now());
    }
  });

  it("a kért hétköznapra és órára esik", () => {
    const iso = nextDateForWeekday(2, 19 * 60 + 30);
    const d = new Date(iso);
    expect((d.getDay() + 6) % 7).toBe(2);
    expect(d.getHours()).toBe(19);
    expect(d.getMinutes()).toBe(30);
  });
});
