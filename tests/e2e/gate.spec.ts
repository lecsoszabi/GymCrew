import { expect, test } from "@playwright/test";

/**
 * A legfontosabb garancia: bejelentkezés nélkül SEMMI nem érhető el.
 * Ha ez elromlik, idegenek látnák a csoport adatait és a helyzeteteket.
 */
const VEDETT_UTVONALAK = [
  "/",
  "/app",
  "/app/plan",
  "/app/map",
  "/app/stats",
  "/app/group",
  "/app/profile",
  "/onboarding",
];

test.describe("Beléptető kapu", () => {
  for (const utvonal of VEDETT_UTVONALAK) {
    test(`${utvonal} bejelentkezés nélkül a loginra terel`, async ({ page }) => {
      await page.goto(utvonal);
      await expect(page).toHaveURL(/\/login/);
      await expect(page.getByRole("heading", { name: "GymCrew Szeged" })).toBeVisible();
    });
  }

  test("a védett oldal tartalmából semmi nem szivárog ki", async ({ page }) => {
    const valasz = await page.goto("/app/stats");
    const html = (await valasz?.text()) ?? "";
    // A statisztika-oldal jellemző szövegei nem jelenhetnek meg.
    expect(html).not.toContain("Ranglista");
    expect(html).not.toContain("Elmúlt 8 hét");
    expect(html).not.toContain("Melyik napokon");
  });

  test("a visszatérési útvonalat megjegyzi", async ({ page }) => {
    await page.goto("/app/plan");
    await expect(page).toHaveURL(/next=%2Fapp%2Fplan/);
  });

  test("ismeretlen útvonal is a kapun belül marad", async ({ page }) => {
    await page.goto("/nincs-ilyen-oldal");
    await expect(page).toHaveURL(/\/login/);
  });
});
