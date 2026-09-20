import { expect, test } from "@playwright/test";

test.describe("Telefonbarát felület", () => {
  test("a belépő nem lóg ki oldalirányban", async ({ page }) => {
    await page.goto("/login");
    const tulcsordul = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(tulcsordul).toBe(false);
  });

  test("a beviteli mezők legalább 16px-es betűvel írnak (iOS nem zoomol)", async ({ page }) => {
    await page.goto("/login");
    const meret = await page
      .getByLabel("E-mail")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(meret).toBeGreaterThanOrEqual(16);
  });

  test("a gombok hüvelykujjal is eltalálhatók (min. 44px)", async ({ page }) => {
    await page.goto("/login");
    const gomb = page.getByRole("button", { name: "Belépés", exact: true }).nth(1);
    const doboz = await gomb.boundingBox();
    expect(doboz!.height).toBeGreaterThanOrEqual(44);
  });

  test("a PWA-manifest kiszolgálódik", async ({ request }) => {
    const valasz = await request.get("/manifest.webmanifest");
    expect(valasz.ok()).toBe(true);
    const manifest = await valasz.json();
    expect(manifest.name).toContain("GymCrew");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/app");
  });

  test("az ikon elérhető a kapun kívül is", async ({ request }) => {
    const valasz = await request.get("/icon.svg");
    expect(valasz.ok()).toBe(true);
    expect(valasz.headers()["content-type"]).toContain("svg");
  });

  test("a lap sötét témát jelez a böngészőnek", async ({ page }) => {
    await page.goto("/login");
    const temaSzin = await page
      .locator('meta[name="theme-color"]')
      .getAttribute("content");
    expect(temaSzin).toBeTruthy();
  });
});

test.describe("Akadálymentesség alapjai", () => {
  test("minden beviteli mezőnek van címkéje", async ({ page }) => {
    await page.goto("/login");
    const cimkezetlen = await page.evaluate(() => {
      const mezok = [...document.querySelectorAll("input:not([type=hidden])")];
      return mezok.filter((m) => {
        const id = m.getAttribute("id");
        const sajat = m.getAttribute("aria-label");
        return !sajat && (!id || !document.querySelector(`label[for="${id}"]`));
      }).length;
    });
    expect(cimkezetlen).toBe(0);
  });

  test("az oldal nyelve magyar", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "hu");
  });

  test("van egyetlen fő címsor", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  });
});
