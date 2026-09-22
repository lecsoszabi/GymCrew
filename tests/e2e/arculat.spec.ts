import { expect, type Page, test } from "@playwright/test";
import { hidratalva } from "./kozos";

/*
 * Egységes arculat a belépés előtti oldalakon: az új Dóm-súlyzós logó, a
 * belinkelt ikonok, és nincs em dash a látható szövegben.
 */

async function nincsEmDash(page: Page, hol: string) {
  const szoveg = await page.evaluate(() => document.body.innerText);
  expect(szoveg, hol).not.toContain("—");
}

test.describe("Egységes arculat", () => {
  test("a belépő oldalon a csempe-logó és a név fogad", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('[data-brand="badge"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "GymCrew Szeged" })).toBeVisible();
  });

  test("a favicon és a telefonos ikon be van linkelve, és betölt", async ({ page, request }) => {
    await page.goto("/login");
    for (const sel of ['link[rel="icon"]', 'link[rel="apple-touch-icon"]']) {
      const href = await page.locator(sel).first().getAttribute("href");
      expect(href, sel).toBeTruthy();
      expect((await request.get(href!)).status(), sel).toBe(200);
    }
  });

  test("a telepíthető app minden ikonja betölt", async ({ request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of manifest.icons) {
      expect((await request.get(icon.src)).status(), icon.src).toBe(200);
    }
  });

  test("a levelek logója bejelentkezés nélkül is elérhető", async ({ request }) => {
    const res = await request.get("/email/logo.png");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("image/png");
  });

  test("a belépés egyik állapotában sincs em dash", async ({ page }) => {
    await page.route("**/auth/v1/signup**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "x" }) })
    );
    await page.route("**/auth/v1/recover**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    );

    await page.goto("/login");
    await hidratalva(page);
    await nincsEmDash(page, "belépés");

    await page.getByRole("button", { name: "Regisztráció", exact: true }).first().click();
    await nincsEmDash(page, "regisztráció");
    await page.getByLabel("Neved").fill("Bence");
    await page.getByLabel("E-mail").fill("uj.tag@pelda.hu");
    await page.getByLabel("Jelszó").fill("eleg-hosszu-jelszo");
    await page.getByRole("checkbox").check();
    await page.locator("form").getByRole("button", { name: "Fiók létrehozása" }).click();
    await expect(page.getByLabel("Megerősítő kód")).toBeVisible();
    await nincsEmDash(page, "kódképernyő");

    await page.getByRole("button", { name: "Vissza a belépéshez" }).click();
    await page.getByRole("button", { name: "Elfelejtett jelszó?" }).click();
    await nincsEmDash(page, "elfelejtett jelszó");
    await page.getByLabel("E-mail").fill("uj.tag@pelda.hu");
    await page.getByRole("button", { name: "Kódot kérek" }).click();
    await expect(page.getByLabel("Megerősítő kód")).toBeVisible();
    await nincsEmDash(page, "jelszó-visszaállító kód");

    for (const hiba of ["expired", "invalid", "masik-bongeszo", "jelszo-link", "auth"]) {
      await page.goto(`/login?error=${hiba}`);
      await nincsEmDash(page, `linkhiba: ${hiba}`);
    }
  });
});
