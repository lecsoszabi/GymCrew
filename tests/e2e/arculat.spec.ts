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
    // Sok oldalbetöltés: a fejlesztői szerveren, párhuzamos futásnál kell a nagyobb időkeret.
    test.slow();
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

test.describe("Betűk és sarkok", () => {
  test("a szöveg Barlow, a címek Barlow Condensed", async ({ page }) => {
    await page.goto("/login");
    const [szoveg, cim] = await page.evaluate(() => [
      getComputedStyle(document.body).fontFamily,
      getComputedStyle(document.querySelector("h1")!).fontFamily,
    ]);
    expect(szoveg).toMatch(/Barlow/);
    expect(szoveg).not.toMatch(/Condensed/);
    expect(cim).toMatch(/Barlow.?Condensed/);
  });

  test("a magyar ő és ű is Barlow-val jelenik meg (a latin-ext készlet betöltődik)", async ({ page }) => {
    await page.goto("/adatvedelem"); // tele ő-vel és ű-vel
    await page.evaluate(() => document.fonts.ready);
    const kiterjesztett = await page.evaluate(() =>
      [...document.fonts]
        .filter((f) => /Barlow/.test(f.family) && /U\+0?100-0?2BA/i.test(f.unicodeRange))
        .map((f) => ({ family: f.family, status: f.status }))
    );
    expect(kiterjesztett.length).toBeGreaterThan(0);
    expect(kiterjesztett.some((f) => f.status === "loaded")).toBe(true);
  });

  test("a kártya, a gomb és a mező sarka 4 px", async ({ page }) => {
    await page.goto("/login");
    const sugar = (sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).borderRadius);
    expect(await sugar(".card")).toBe("4px");
    expect(await sugar("form .btn-primary")).toBe("4px");
    expect(await sugar("#email")).toBe("4px");
  });

  test("a levelek betűfájljai bejelentkezés nélkül is elérhetők, más domainről is", async ({ request }) => {
    for (const f of ["barlow-400-latin.woff2", "barlow-700-latin-ext.woff2", "barlow-condensed-700-latin.woff2"]) {
      const res = await request.get(`/fonts/${f}`);
      expect(res.status(), f).toBe(200);
      expect(res.headers()["content-type"], f).toContain("font/woff2");
      expect(res.headers()["access-control-allow-origin"], f).toBe("*");
    }
  });
});
