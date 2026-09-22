import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { kisCelpontok } from "../kozos";

/*
 * UI/UX alapok minden bejelentkezett oldalon, telefonon: akadálymentesség
 * (axe, WCAG 2.1 AA) és 44 px-es koppintási célpontok; a felugró lap
 * billentyűzettel is kezelhető. Semmit nem küldünk el.
 */
test.use({ reducedMotion: "reduce" });

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

for (const ut of ["/app", "/app/plan", "/app/map", "/app/stats", "/app/group", "/app/profile", "/reset-password"]) {
  test(`${ut}: akadálymentes, és minden koppintható elem legalább 44 px`, async ({ page }) => {
    await page.goto(ut);
    // A betöltés-csontváz után a valódi tartalom.
    await expect(page.locator("main h1").first()).toBeVisible();
    await page.waitForLoadState("networkidle");

    const axe = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    expect(await kisCelpontok(page)).toEqual([]);
  });
}

test("a felugró lap Escape-re bezárul, és a fókusz visszatér a gombra", async ({ page }) => {
  await page.goto("/app/plan");
  const uj = page.getByRole("button", { name: "+ Új" });
  // Billentyűzettel, ahogy egy billentyűzetes felhasználó nyitja (a Safari
  // egérkattintásra nem fókuszál gombot, ott nincs mit visszaadni).
  await uj.focus();
  await page.keyboard.press("Enter");
  const lap = page.getByRole("dialog");
  await expect(lap).toBeVisible();
  // Nyitáskor a fókusz a lapon van, nem a mögötte lévő oldalon.
  expect(await lap.evaluate((e) => e.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(lap).toBeHidden();
  await expect(uj).toBeFocused();
});
