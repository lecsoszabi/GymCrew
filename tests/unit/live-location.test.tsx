// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";

/*
 * A lokátor-hook egy szimulált telefonon.
 *
 * A valódi telefon a watchPosition() hívásra azonnal visszaad egy tárolt
 * pozíciót, ezért ha a hook minden rendernél újraindítja a figyelést, abból
 * végtelen ciklus lesz. A javítás előtt ez a teszt 300 ms alatt 62 újraindítást
 * mért — ez ölte meg a böngészőt.
 */

const sent: unknown[] = [];
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: () => {
      const ch = {
        on: () => ch,
        subscribe: (cb?: (s: string) => void) => {
          cb?.("SUBSCRIBED");
          return ch;
        },
        send: (msg: unknown) => {
          sent.push(msg);
          return Promise.resolve("ok");
        },
      };
      return ch;
    },
    removeChannel: () => undefined,
  }),
}));
vi.mock("@/app/app/actions", () => ({ checkIn: vi.fn(async () => ({ ok: true })) }));

import { MIN_MOVE_M, useLiveLocation } from "@/lib/use-live-location";

let watchCalls = 0;
let clearCalls = 0;
let currentCalls = 0;
let pushPosition: ((lat: number, lng: number) => void) | null = null;

/** Egy pozíció, ahogy a böngésző adja. */
function fix(lat: number, lng: number): GeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy: 12,
      heading: null,
      altitude: null,
      altitudeAccuracy: null,
      speed: null,
    },
    timestamp: Date.now(),
  } as GeolocationPosition;
}

beforeEach(() => {
  watchCalls = 0;
  clearCalls = 0;
  currentCalls = 0;
  pushPosition = null;
  sent.length = 0;
  Object.defineProperty(globalThis.navigator, "geolocation", {
    configurable: true,
    value: {
      watchPosition: (success: PositionCallback) => {
        watchCalls++;
        pushPosition = (lat, lng) => success(fix(lat, lng));
        // Mint a valódi telefon: a tárolt pozíció azonnal megjön.
        // Biztonsági fék, ha a hook mégis ciklusba kerülne.
        if (watchCalls < 60) queueMicrotask(() => success(fix(46.26, 20.14)));
        return watchCalls;
      },
      clearWatch: () => {
        clearCalls++;
      },
      getCurrentPosition: (success: PositionCallback) => {
        currentCalls++;
        success(fix(46.26, 20.14));
      },
    },
  });
});

afterEach(() => cleanup());

let renders = 0;
let lastState: ReturnType<typeof useLiveLocation> | null = null;

/** Pontosan úgy hívja a hookot, ahogy a térképoldal: soron belüli gym objektummal. */
function Harness({ subscribe, share }: { subscribe: boolean; share: boolean }) {
  renders++;
  const live = useLiveLocation({
    subscribe,
    share,
    groupId: "csoport-1",
    me: "en",
    myName: "Teszt",
    myAvatar: null,
    gym: { lat: 46.2575, lng: 20.1305 },
    sessionId: "edzes-1",
  });
  lastState = live;
  return <div>{live.status}</div>;
}

async function wait(ms: number) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

describe("useLiveLocation — telefonon", () => {
  it("egyszer indítja a helyfigyelést, nem minden rendernél újra", async () => {
    render(<Harness subscribe share />);
    await wait(300);
    expect(watchCalls).toBe(1);
    expect(clearCalls).toBe(0);
    expect(lastState?.status).toBe("sharing");
  });

  it("a szülő újrarajzolása sem indítja újra a figyelést", async () => {
    const { rerender } = render(<Harness subscribe share />);
    await wait(50);
    for (let i = 0; i < 10; i++) rerender(<Harness subscribe share />);
    await wait(50);
    expect(watchCalls).toBe(1);
  });

  it("aki nem jön, annak a helyzetét nem figyeli és nem küldi el", async () => {
    // Fogadja mások helyzetét, de a sajátját nem osztja meg.
    render(<Harness subscribe share={false} />);
    await wait(200);
    expect(watchCalls).toBe(0);
    expect(sent).toHaveLength(0);
    expect(lastState?.mine).toBeNull();
  });

  it("kikapcsolva egyáltalán nem kér helyzetet", async () => {
    render(<Harness subscribe={false} share={false} />);
    await wait(100);
    expect(watchCalls).toBe(0);
  });

  it("a GPS helyben remegése nem rajzolja újra a képernyőt", async () => {
    render(<Harness subscribe share />);
    await wait(50);
    const before = renders;
    const shownBefore = lastState?.mine;

    // 20 apró ugrás, mind jóval a küszöb alatt (kb. 1–3 méter).
    for (let i = 0; i < 20; i++) {
      await act(async () => pushPosition?.(46.26 + (i % 3) * 0.00001, 20.14));
    }
    expect(lastState?.mine).toBe(shownBefore);
    expect(renders - before).toBeLessThan(3);
  });

  it("valódi elmozdulásnál viszont frissül", async () => {
    render(<Harness subscribe share />);
    await wait(50);
    const shownBefore = lastState?.mine;
    // Kb. 55 méter észak felé — jóval a küszöb fölött.
    await act(async () => pushPosition?.(46.2605, 20.14));
    expect(lastState?.mine).not.toBe(shownBefore);
    expect(MIN_MOVE_M).toBeLessThan(55);
  });

  it("koppintásra engedélyt kér", async () => {
    render(<Harness subscribe share={false} />);
    await wait(20);
    await act(async () => lastState?.requestPermission());
    expect(currentCalls).toBe(1);
    expect(lastState?.permission).toBe("granted");
  });
});
