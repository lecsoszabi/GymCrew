import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { hidratalva, kisCelpontok } from "./kozos";

/*
 * UI/UX alapok a belépés előtti oldalakon: akadálymentesség (axe, WCAG 2.1
 * AA), 44 px-es koppintási célpontok, nagyítható oldal, megjeleníthető jelszó.
 * Animációk nélkül mérünk, hogy a végállapot számítson, ne egy közbülső képkocka.
 */
test.use({ reducedMotion: "reduce" });

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const ok = (body: object) => (route: import("@playwright/test").Route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

async function ellenoriz(page: Page, hol: string) {
  const axe = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), hol).toEqual([]);
  expect(await kisCelpontok(page), `${hol}: 44 px alatti célpontok`).toEqual([]);
}

test("a nagyítás nincs letiltva", async ({ page }) => {
  await page.goto("/login");
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).not.toMatch(/maximum-scale|user-scalable\s*=\s*(no|0)/);
});

test("a jelszó megjeleníthető, majd újra elrejthető", async ({ page }) => {
  await page.goto("/login");
  await hidratalva(page);
  const mezo = page.getByLabel("Jelszó");
  await mezo.fill("titkos-jelszo-123");
  const gomb = page.getByRole("button", { name: "Megjelenítés" });
  await expect(gomb).toHaveAttribute("aria-pressed", "false");
  await gomb.click();
  await expect(mezo).toHaveAttribute("type", "text");
  await expect(gomb).toHaveAttribute("aria-pressed", "true");
  await gomb.click();
  await expect(mezo).toHaveAttribute("type", "password");
});

test("a belépés minden állapota akadálymentes, és hüvelykujjal is jól koppintható", async ({ page }) => {
  await page.route("**/auth/v1/signup**", ok({ id: "x" }));
  await page.route("**/auth/v1/recover**", ok({}));
  await page.goto("/login");
  await hidratalva(page);
  await ellenoriz(page, "belépés");

  await page.getByRole("button", { name: "Regisztráció", exact: true }).first().click();
  await ellenoriz(page, "regisztráció");
  await page.getByLabel("Neved").fill("Bence");
  await page.getByLabel("E-mail").fill("uj.tag@pelda.hu");
  await page.getByLabel("Jelszó").fill("eleg-hosszu-jelszo");
  await page.getByRole("checkbox").check();
  await page.locator("form").getByRole("button", { name: "Fiók létrehozása" }).click();
  await expect(page.getByLabel("Megerősítő kód")).toBeVisible();
  await ellenoriz(page, "kódképernyő");

  await page.getByRole("button", { name: "Vissza a belépéshez" }).click();
  await page.getByRole("button", { name: "Elfelejtett jelszó?" }).click();
  await ellenoriz(page, "elfelejtett jelszó");

  await page.goto("/login?error=jelszo-link");
  await hidratalva(page);
  await ellenoriz(page, "linkhiba");
});
