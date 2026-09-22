import { expect, type Page, test } from "@playwright/test";
import { hidratalva } from "./kozos";

/**
 * Két "Belépés" feliratú gomb van: a fül és az űrlap küldő gombja.
 * A Next.js ráadásul saját role="alert" elemet tesz az oldalra, ezért
 * mindkettőt pontosan kell megcímezni.
 */
const kuldoGomb = (page: Page, nev: string) =>
  page.locator("form").getByRole("button", { name: nev });
const ful = (page: Page, nev: string) =>
  page.getByRole("button", { name: nev, exact: true }).first();
const uzenet = (page: Page) => page.locator('p[role="alert"]');

test.describe("Belépő képernyő", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await hidratalva(page);
  });

  test("fekete háttérrel és a két füllel fogad", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "GymCrew Szeged" })).toBeVisible();
    await expect(ful(page, "Belépés")).toBeVisible();
    await expect(ful(page, "Regisztráció")).toBeVisible();

    const hatter = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const [r, g, b] = hatter.match(/\d+/g)!.map(Number);
    expect(Math.max(r, g, b)).toBeLessThan(40);
  });

  test("belépéskor csak e-mail és jelszó kell", async ({ page }) => {
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel("Jelszó")).toBeVisible();
    await expect(page.getByLabel("Neved")).toBeHidden();
  });

  test("regisztrációra váltva megjelenik a név mező", async ({ page }) => {
    await ful(page, "Regisztráció").click();
    await expect(page.getByLabel("Neved")).toBeVisible();
    await expect(kuldoGomb(page, "Fiók létrehozása")).toBeVisible();
  });

  test("a jelszó mező rejtett", async ({ page }) => {
    await expect(page.getByLabel("Jelszó")).toHaveAttribute("type", "password");
  });

  test("üres űrlapot nem enged elküldeni", async ({ page }) => {
    await kuldoGomb(page, "Belépés").click();
    await expect(page).toHaveURL(/\/login/);
    // Az e-mail mező marad üres és érvénytelen — nem történt bejelentkezés.
    await expect(page.getByLabel("E-mail")).toHaveValue("");
  });

  test("hibás belépésre érthető magyar üzenet jön", async ({ page }) => {
    await page.getByLabel("E-mail").fill("nincs.ilyen.fiok@pelda.hu");
    await page.getByLabel("Jelszó").fill("rosszjelszo123");
    await kuldoGomb(page, "Belépés").click();

    await expect(uzenet(page)).toBeVisible({ timeout: 20_000 });
    await expect(uzenet(page)).not.toContainText("Invalid login credentials");
  });

  test("rövid jelszóval nem enged regisztrálni", async ({ page }) => {
    await ful(page, "Regisztráció").click();
    await page.getByLabel("Neved").fill("Teszt Elek");
    await page.getByLabel("E-mail").fill("teszt@pelda.hu");
    await page.getByLabel("Jelszó").fill("rovid");
    await kuldoGomb(page, "Fiók létrehozása").click();

    await expect(uzenet(page)).toContainText("8 karakter");
  });

  test("túl rövid névvel sem enged regisztrálni", async ({ page }) => {
    await ful(page, "Regisztráció").click();
    await page.getByLabel("Neved").fill("A");
    await page.getByLabel("E-mail").fill("teszt@pelda.hu");
    await page.getByLabel("Jelszó").fill("eleghosszujelszo");
    await kuldoGomb(page, "Fiók létrehozása").click();

    await expect(uzenet(page)).toContainText(/nevet|2 karakter/);
  });

  test("elrontott megerősítő link esetén elmagyarázza, mi történt", async ({ page }) => {
    await page.goto("/login?error=expired");
    await expect(uzenet(page)).toContainText("lejárt");
  });

  test("az adatvédelmi mondat nem ismétlődik a belépő oldalon (a térképnél van)", async ({ page }) => {
    await expect(page.getByText(/csoporttársaid/)).toHaveCount(0);
  });
});
