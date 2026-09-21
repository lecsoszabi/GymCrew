// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TIME_OPTIONS, WhenPicker, composeISO, nextDays, splitISO } from "@/components/when-picker";

afterEach(() => cleanup());

// Szerda 14:10, helyi idő.
const NOW = new Date(2026, 8, 23, 14, 10);

describe("időpont-segédek", () => {
  it("összerakás és szétbontás oda-vissza ugyanaz", () => {
    const iso = composeISO("2026-09-24", 18 * 60 + 30);
    expect(splitISO(iso)).toEqual({ day: "2026-09-24", minutes: 18 * 60 + 30 });
  });

  it("a percet félórára kerekíti", () => {
    const iso = new Date(2026, 8, 24, 18, 20).toISOString();
    expect(splitISO(iso).minutes).toBe(18 * 60 + 30);
  });

  it("a hét napjai: Ma, Holnap, aztán napnevek", () => {
    const d = nextDays(7, NOW);
    expect(d.map((x) => x.top)).toEqual(["Ma", "Holnap", "Péntek", "Szombat", "Vasárnap", "Hétfő", "Kedd"]);
    expect(d[0].key).toBe("2026-09-23");
  });

  it("06:00 és 22:30 között félóránként kínál időpontot", () => {
    expect(TIME_OPTIONS[0]).toBe(6 * 60);
    expect(TIME_OPTIONS.at(-1)).toBe(22 * 60 + 30);
  });
});

describe("WhenPicker", () => {
  it("ma csak jövőbeli időpontot kínál", () => {
    render(<WhenPicker day="2026-09-23" minutes={18 * 60} onChange={() => {}} now={NOW} />);
    const opts = Array.from(screen.getByLabelText("Hánykor?").querySelectorAll("option")).map(
      (o) => o.textContent
    );
    // 14:10 + 15 perc után az első: 14:30.
    expect(opts[0]).toBe("14:30");
    expect(opts).not.toContain("14:00");
  });

  it("holnapra az egész napot kínálja", () => {
    render(<WhenPicker day="2026-09-24" minutes={18 * 60} onChange={() => {}} now={NOW} />);
    const first = screen.getByLabelText("Hánykor?").querySelector("option")?.textContent;
    expect(first).toBe("06:00");
  });

  it("ha a kiválasztott idő elmúlt, egy lépésben a legkorábbira igazít — nincs ciklus", () => {
    const onChange = vi.fn();
    render(<WhenPicker day="2026-09-23" minutes={9 * 60} onChange={onChange} now={NOW} />);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ day: "2026-09-23", minutes: 14 * 60 + 30 });
  });

  it("érvényes időnél nem hív feleslegesen", () => {
    const onChange = vi.fn();
    render(<WhenPicker day="2026-09-24" minutes={18 * 60} onChange={onChange} now={NOW} />);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("napváltásnál megtartja az időt, ha az ott is érvényes", () => {
    const onChange = vi.fn();
    render(<WhenPicker day="2026-09-24" minutes={18 * 60} onChange={onChange} now={NOW} />);
    fireEvent.click(screen.getByText("Péntek"));
    expect(onChange).toHaveBeenCalledWith({ day: "2026-09-25", minutes: 18 * 60 });
  });
});
