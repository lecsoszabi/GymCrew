import { describe, expect, it } from "vitest";
import { retryAfterSeconds, translateAuthError } from "@/lib/auth-errors";

describe("translateAuthError", () => {
  it("a hibás vagy lejárt kódot magyarul mondja (így válaszol a Supabase)", () => {
    const hu = translateAuthError("Token has expired or is invalid");
    expect(hu).toContain("Hibás vagy lejárt kód");
    expect(hu).not.toMatch(/token/i);
  });

  it("az újrakérési várakozásnál megmondja, meddig kell várni", () => {
    expect(translateAuthError("For security purposes, you can only request this after 42 seconds.")).toBe(
      "Túl gyorsan kérted újra. 42 másodperc múlva próbáld megint."
    );
  });

  it("a levélküldési korlátot külön magyarázza", () => {
    expect(translateAuthError("Email rate limit exceeded")).toContain("több levelet");
  });

  it("a gyakori belépési hibák magyarul jönnek", () => {
    expect(translateAuthError("Invalid login credentials")).toBe("Hibás e-mail vagy jelszó.");
    expect(translateAuthError("User already registered")).toContain("már van fiók");
    expect(translateAuthError("Email not confirmed")).toContain("erősítsd meg");
  });

  it("ismeretlen üzenetet változatlanul hagy", () => {
    expect(translateAuthError("Valami egészen más")).toBe("Valami egészen más");
  });
});

describe("retryAfterSeconds", () => {
  it("kiolvassa a másodperceket, ha van", () => {
    expect(retryAfterSeconds("you can only request this after 60 seconds.")).toBe(60);
    expect(retryAfterSeconds("after 1 second")).toBe(1);
    expect(retryAfterSeconds("Email rate limit exceeded")).toBeNull();
  });
});
