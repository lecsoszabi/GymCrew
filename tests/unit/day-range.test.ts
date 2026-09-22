import { describe, expect, it } from "vitest";
import { dayOfHU, dayRangeHU } from "@/lib/date";

describe("dayRangeHU — egy budapesti nap UTC-ben", () => {
  it("nyári időben (UTC+2)", () => {
    expect(dayRangeHU("2026-07-15")).toEqual({
      start: "2026-07-14T22:00:00.000Z",
      end: "2026-07-15T22:00:00.000Z",
    });
  });

  it("téli időben (UTC+1)", () => {
    expect(dayRangeHU("2026-01-15")).toEqual({
      start: "2026-01-14T23:00:00.000Z",
      end: "2026-01-15T23:00:00.000Z",
    });
  });

  it("tavaszi óraátállítás napja: 23 órás nap", () => {
    // 2026. március 29., vasárnap: 02:00 → 03:00
    const r = dayRangeHU("2026-03-29");
    expect(r.start).toBe("2026-03-28T23:00:00.000Z");
    expect(r.end).toBe("2026-03-29T22:00:00.000Z");
    expect((+new Date(r.end) - +new Date(r.start)) / 3_600_000).toBe(23);
  });

  it("őszi óraátállítás napja: 25 órás nap", () => {
    // 2026. október 25., vasárnap: 03:00 → 02:00
    const r = dayRangeHU("2026-10-25");
    expect(r.start).toBe("2026-10-24T22:00:00.000Z");
    expect(r.end).toBe("2026-10-25T23:00:00.000Z");
    expect((+new Date(r.end) - +new Date(r.start)) / 3_600_000).toBe(25);
  });

  it("a hónap utolsó napjáról átlép a következőre", () => {
    expect(dayRangeHU("2026-09-30").end).toBe("2026-09-30T22:00:00.000Z");
  });
});

describe("dayOfHU", () => {
  it("késő esti UTC-időpont Budapesten már a következő nap", () => {
    expect(dayOfHU("2026-09-22T22:30:00.000Z")).toBe("2026-09-23");
  });
  it("délután ugyanaz a nap", () => {
    expect(dayOfHU("2026-09-22T16:00:00.000Z")).toBe("2026-09-22");
  });
});
