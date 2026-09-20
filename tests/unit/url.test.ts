import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/url";

describe("safeNext — nyílt átirányítás elleni szűrő", () => {
  it("saját útvonalat átenged", () => {
    expect(safeNext("/app/plan")).toBe("/app/plan");
    expect(safeNext("/app?tab=2")).toBe("/app?tab=2");
  });

  it("hiányzó értékre a gyökeret adja", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext("")).toBe("/");
  });

  it("abszolút címet elvet", () => {
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("http://evil.com")).toBe("/");
  });

  it("protokoll-relatív címet elvet", () => {
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("//evil.com/app")).toBe("/");
  });

  it("a visszaperjeles trükköt is elvet", () => {
    expect(safeNext("/\\evil.com")).toBe("/");
  });

  it("nem sémás szöveget elvet", () => {
    expect(safeNext("evil.com")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
  });
});
