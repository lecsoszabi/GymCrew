import { describe, expect, it } from "vitest";
import { dayStatus, pickSessions, votesWithDaily } from "@/lib/today";
import type { DailyCheckin, SessionVote, TrainingSession } from "@/lib/types";

function session(id: string, startsAt: string, extra: Partial<TrainingSession> = {}): TrainingSession {
  return {
    id,
    group_id: "g",
    gym_id: null,
    starts_at: startsAt,
    duration_min: 90,
    created_by: "anna",
    status: "proposed",
    note: null,
    created_at: startsAt,
    ...extra,
  };
}

function vote(sessionId: string, userId: string, v: SessionVote["vote"], reason: string | null = null): SessionVote {
  return { session_id: sessionId, user_id: userId, vote: v, reason, updated_at: "2026-09-22T08:00:00Z" };
}

function daily(userId: string, going: boolean, reason: string | null = null): DailyCheckin {
  return {
    id: `d-${userId}`,
    user_id: userId,
    group_id: "g",
    day: "2026-09-22",
    going,
    from_time: going ? "18:00:00" : null,
    to_time: null,
    reason,
    created_at: "2026-09-22T07:00:00Z",
  };
}

// 2026. szept. 22., kedd, 14:00 Budapesten (nyári idő, UTC+2).
const NOW = new Date("2026-09-22T12:00:00Z");

describe("pickSessions", () => {
  it("a mai, még tartó időpontot és az utána következőt adja", () => {
    const { today, next } = pickSessions(
      [
        session("holnap", "2026-09-23T16:00:00Z"),
        session("ma", "2026-09-22T16:00:00Z"),
        session("tegnap", "2026-09-21T16:00:00Z"),
      ],
      NOW
    );
    expect(today?.id).toBe("ma");
    expect(next?.id).toBe("holnap");
  });

  it("a lemondott és a már véget ért mai időpont nem mai időpont", () => {
    const { today, next } = pickSessions(
      [
        session("reggel", "2026-09-22T05:00:00Z"), // 07:00–08:30, már vége
        session("lemondva", "2026-09-22T16:00:00Z", { status: "cancelled" }),
        session("pentek", "2026-09-25T16:00:00Z"),
      ],
      NOW
    );
    expect(today).toBeNull();
    expect(next?.id).toBe("pentek");
  });

  it("a most zajló edzés még mai időpont", () => {
    const { today } = pickSessions([session("most", "2026-09-22T11:30:00Z")], NOW);
    expect(today?.id).toBe("most");
  });

  it("éjfél után Budapesten már a következő nap számít, akkor is, ha UTC-ben még tegnap van", () => {
    // Budapesten 00:30 (szept. 23.), UTC-ben még szept. 22. 22:30.
    const late = new Date("2026-09-22T22:30:00Z");
    const { today } = pickSessions([session("szerda-reggel", "2026-09-23T05:00:00Z")], late);
    expect(today?.id).toBe("szerda-reggel");
  });
});

describe("dayStatus", () => {
  const today = session("ma", "2026-09-22T16:00:00Z");

  it("a mai szavazat erősebb a napi jelzésnél", () => {
    const s = dayStatus("bence", today, [vote("ma", "bence", "maybe")], [daily("bence", false, "beteg")]);
    expect(s).toEqual({ state: "maybe", reason: null });
  });

  it("szavazat nélkül a napi jelzés számít", () => {
    expect(dayStatus("bence", today, [], [daily("bence", false, "túlóra")])).toEqual({
      state: "no",
      reason: "túlóra",
    });
    expect(dayStatus("bence", null, [], [daily("bence", true)]).state).toBe("yes");
  });

  it("más időpontra adott szavazat nem mai válasz", () => {
    expect(dayStatus("bence", today, [vote("holnap", "bence", "yes")], []).state).toBe("none");
  });
});

describe("votesWithDaily", () => {
  it("a napi jelzéssel pótolja, aki még nem szavazott, a meglévő szavazatot nem írja felül", () => {
    const today = session("ma", "2026-09-22T16:00:00Z");
    const out = votesWithDaily(
      today,
      ["anna", "bence", "cili"],
      [vote("ma", "anna", "yes"), vote("holnap", "bence", "yes")],
      [daily("anna", false, "mégsem"), daily("bence", false, "túlóra")]
    );
    expect(out.find((v) => v.user_id === "anna")?.vote).toBe("yes");
    expect(out.find((v) => v.user_id === "bence")).toMatchObject({ vote: "no", reason: "túlóra" });
    expect(out.find((v) => v.user_id === "cili")).toBeUndefined();
    expect(out.every((v) => v.session_id === "ma")).toBe(true);
  });
});
