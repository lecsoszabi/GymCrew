// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";

/*
 * A térkép nézet-igazítása. A hiba: minden pozíció-frissítésnél (telefonon
 * kb. másodpercenként) animált fitBounds futott, a térkép folyamatosan ugrált.
 */

type Handler = () => void;
const handlers = new Map<string, Set<Handler>>();
const calls = { fit: [] as { animate: boolean }[], setView: 0 };

function emit(event: string) {
  for (const h of handlers.get(event) ?? []) h();
}

const fakeMap = {
  on: (e: string, h: Handler) => {
    if (!handlers.has(e)) handlers.set(e, new Set());
    handlers.get(e)!.add(h);
  },
  off: (e: string, h: Handler) => {
    handlers.get(e)?.delete(h);
  },
  // Mint a valódi Leaflet: az igazítás maga is zoomstart + moveend eseményt vált ki.
  fitBounds: (_b: unknown, opts: { animate: boolean }) => {
    calls.fit.push({ animate: opts.animate });
    emit("zoomstart");
    emit("moveend");
  },
  setView: () => {
    calls.setView++;
    emit("zoomstart");
    emit("moveend");
  },
};

vi.mock("react-leaflet", () => ({
  useMap: () => fakeMap,
  MapContainer: () => null,
  TileLayer: () => null,
  Marker: () => null,
  Popup: () => null,
  Circle: () => null,
}));

import { FitBounds } from "@/components/map-canvas";

const GYM: [number, number] = [46.2575, 20.1305];

beforeEach(() => {
  handlers.clear();
  calls.fit.length = 0;
  calls.setView = 0;
});
afterEach(() => cleanup());

describe("FitBounds", () => {
  it("betöltéskor egyszer igazít, animáció nélkül", () => {
    render(<FitBounds participantsKey="gym|bence" points={[GYM, [46.26, 20.14]]} />);
    expect(calls.fit).toEqual([{ animate: false }]);
  });

  it("a pozíciók mozgásánál NEM igazít újra", () => {
    const { rerender } = render(
      <FitBounds participantsKey="gym|bence" points={[GYM, [46.26, 20.14]]} />
    );
    // 30 GPS-frissítés, ugyanazokkal a résztvevőkkel.
    for (let i = 0; i < 30; i++) {
      rerender(<FitBounds participantsKey="gym|bence" points={[GYM, [46.26 + i * 0.0002, 20.14]]} />);
    }
    expect(calls.fit).toHaveLength(1);
  });

  it("új résztvevőnél igazít — ekkor már animálva", () => {
    const { rerender } = render(
      <FitBounds participantsKey="gym|bence" points={[GYM, [46.26, 20.14]]} />
    );
    rerender(
      <FitBounds participantsKey="gym|bence|lili" points={[GYM, [46.26, 20.14], [46.25, 20.12]]} />
    );
    expect(calls.fit).toEqual([{ animate: false }, { animate: true }]);
  });

  it("a saját igazítás zoomja nem számít felhasználói mozdulatnak", () => {
    const { rerender } = render(
      <FitBounds participantsKey="gym|bence" points={[GYM, [46.26, 20.14]]} />
    );
    // Az első igazítás kiváltott egy zoomstart-ot — ennek ellenére új
    // résztvevőnél még igazítania kell.
    rerender(
      <FitBounds participantsKey="gym|bence|lili" points={[GYM, [46.26, 20.14], [46.25, 20.12]]} />
    );
    expect(calls.fit).toHaveLength(2);
  });

  it("ha a felhasználó elhúzta a térképet, többé nem veszi el tőle", () => {
    const { rerender } = render(
      <FitBounds participantsKey="gym|bence" points={[GYM, [46.26, 20.14]]} />
    );
    emit("dragstart");
    rerender(
      <FitBounds participantsKey="gym|bence|lili" points={[GYM, [46.26, 20.14], [46.25, 20.12]]} />
    );
    expect(calls.fit).toHaveLength(1);
  });

  it("ha a felhasználó belenagyított, akkor sem", () => {
    const { rerender } = render(
      <FitBounds participantsKey="gym|bence" points={[GYM, [46.26, 20.14]]} />
    );
    emit("zoomstart"); // két ujjas nagyítás
    rerender(
      <FitBounds participantsKey="gym|bence|lili" points={[GYM, [46.26, 20.14], [46.25, 20.12]]} />
    );
    expect(calls.fit).toHaveLength(1);
  });

  it("egyetlen pontnál (csak a terem) setView-t használ", () => {
    render(<FitBounds participantsKey="gym" points={[GYM]} />);
    expect(calls.setView).toBe(1);
    expect(calls.fit).toHaveLength(0);
  });
});
