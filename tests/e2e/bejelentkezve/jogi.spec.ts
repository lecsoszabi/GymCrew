import { expect, test } from "@playwright/test";
import { CONSENT_COOKIE } from "../../../src/lib/legal";

/*
 * Jogi dokumentumok és süti-tájékoztató bejelentkezve, telefonon. Semmit nem
 * küldünk el, és a mentett munkamenetet sem írjuk át.
 */
test.use({ reducedMotion: "reduce" });

test("a profil aljáról elérhetők a jogi dokumentumok, bejelentkezve is megnyílnak", async ({ page }) => {
  await page.goto("/app/profile");
  const jogi = page.getByRole("navigation", { name: "Jogi dokumentumok" });
  await jogi.getByRole("link", { name: "Adatkezelési tájékoztató" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Adatkezelési tájékoztató" })).toBeVisible();
  await page.goto("/feltetelek");
  await expect(page.getByRole("heading", { level: 1, name: "Felhasználási feltételek" })).toBeVisible();
});

test("első látogatáskor a süti-tájékoztató az alsó menü fölött van, és a menü használható marad", async ({
  page,
  context,
}) => {
  await context.clearCookies({ name: CONSENT_COOKIE });
  await page.goto("/app");
  const suti = page.getByRole("region", { name: "Süti-tájékoztató" });
  await expect(suti).toBeVisible();

  const menu = page.locator("[data-bottom-nav]");
  const [s, m] = await Promise.all([suti.boundingBox(), menu.boundingBox()]);
  expect(s!.y + s!.height, "a tájékoztató alja").toBeLessThanOrEqual(m!.y);

  await menu.getByRole("link", { name: "Terv", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/plan$/);
});
