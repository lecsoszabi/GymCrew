import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { hidratalva, kisCelpontok } from "./kozos";
import { CONSENT_COOKIE, LEGAL_VERSION, OPERATOR } from "../../src/lib/legal";

/*
 * Jogi oldalak, süti-tájékoztató és a feltételek elfogadása a regisztrációkor.
 * A Supabase-hívásokat elfogjuk: fiók nem jön létre, levél nem megy ki.
 */
test.use({ reducedMotion: "reduce" });

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const ok = (body: object) => (route: import("@playwright/test").Route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

async function akadalymentes(page: Page, hol: string) {
  const axe = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), hol).toEqual([]);
  expect(await kisCelpontok(page), `${hol}: 44 px alatti célpontok`).toEqual([]);
}

test.describe("Jogi oldalak", () => {
  for (const [ut, cim] of [
    ["/feltetelek", "Felhasználási feltételek"],
    ["/adatvedelem", "Adatkezelési tájékoztató"],
  ] as const) {
    test(`${ut}: bejelentkezés nélkül is olvasható, és benne van az üzemeltető`, async ({ page }) => {
      const valasz = await page.goto(ut);
      expect(valasz?.status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${ut}$`));
      await expect(page.getByRole("heading", { level: 1, name: cim })).toBeVisible();
      await expect(page.getByText(OPERATOR.name).first()).toBeVisible();
      await expect(page.getByRole("link", { name: OPERATOR.email }).first()).toHaveAttribute(
        "href",
        `mailto:${OPERATOR.email}`
      );
      expect(await page.evaluate(() => document.body.innerText)).not.toContain("—");
      await akadalymentes(page, ut);
    });
  }

  test("a tájékoztató minden sütit felsorol, amit az app beállít", async ({ page }) => {
    await page.goto("/adatvedelem");
    const sutik = page.locator("#sutik");
    for (const nev of ["sb-…-auth-token", "sb-…-code-verifier", CONSENT_COOKIE]) {
      await expect(sutik.getByRole("heading", { name: nev, exact: true })).toBeVisible();
    }
  });

  test("a belépő oldal aljáról mindkét dokumentum elérhető", async ({ page }) => {
    await page.goto("/login");
    const jogi = page.getByRole("navigation", { name: "Jogi dokumentumok" });
    await jogi.getByRole("link", { name: "Felhasználási feltételek", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Felhasználási feltételek" })).toBeVisible();
    await page.goto("/login");
    await jogi.getByRole("link", { name: "Adatkezelés", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Adatkezelési tájékoztató" })).toBeVisible();
  });
});

test.describe("Regisztráció: a feltételek elfogadása", () => {
  async function kitolt(page: Page) {
    await page.goto("/login");
    await hidratalva(page);
    await page.getByRole("button", { name: "Regisztráció", exact: true }).first().click();
    await page.getByLabel("Neved").fill("Bence");
    await page.getByLabel("E-mail").fill("uj.tag@pelda.hu");
    await page.getByLabel("Jelszó").fill("eleg-hosszu-jelszo");
  }

  test("elfogadás nélkül nem regisztrál, és a Supabase-hez sem megy kérés", async ({ page }) => {
    let kert = 0;
    await page.route("**/auth/v1/signup**", (route) => {
      kert++;
      return ok({ id: "x" })(route);
    });
    await kitolt(page);
    await page.locator("form").getByRole("button", { name: "Fiók létrehozása" }).click();
    await expect(page.locator('p[role="alert"]')).toContainText("fogadd el a Felhasználási feltételeket");
    expect(kert).toBe(0);
  });

  test("elfogadva a feltételek változata és az elfogadás ideje is elmentődik", async ({ page }) => {
    let torzs: { data?: Record<string, string> } | null = null;
    await page.route("**/auth/v1/signup**", async (route) => {
      torzs = route.request().postDataJSON();
      await ok({ id: "x", email: "uj.tag@pelda.hu" })(route);
    });
    await kitolt(page);
    await page.getByRole("checkbox", { name: /Elfogadom a Felhasználási feltételeket/ }).check();
    await page.locator("form").getByRole("button", { name: "Fiók létrehozása" }).click();
    await expect(page.getByRole("heading", { name: "Nézd meg a postádat" })).toBeVisible();

    expect(torzs!.data).toMatchObject({ display_name: "Bence", terms_version: LEGAL_VERSION });
    expect(Math.abs(Date.parse(torzs!.data!.terms_accepted_at) - Date.now())).toBeLessThan(60_000);
  });

  test("a pipa a látható négyzet körül is koppintható (44 px), hüvelykujjal is eltalálható", async ({
    page,
    isMobile,
  }) => {
    await kitolt(page);
    const negyzet = page.locator("form label span[aria-hidden]").first();
    await negyzet.evaluate((e) => e.scrollIntoView({ block: "center" }));
    const d = (await negyzet.boundingBox())!;
    const koppint = (x: number, y: number) => (isMobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
    // A 20 px-es négyzeten kívül, de a 44 px-es területen belül.
    await koppint(d.x - 8, d.y + d.height / 2);
    await expect(page.getByRole("checkbox")).toBeChecked();
  });

  test("a feltételek új lapon nyílnak, a kitöltött űrlap megmarad", async ({ page }) => {
    await kitolt(page);
    const [uj] = await Promise.all([
      page.context().waitForEvent("page"),
      page.locator("form").getByRole("link", { name: "Felhasználási feltételeket" }).click(),
    ]);
    await expect(uj.getByRole("heading", { level: 1, name: "Felhasználási feltételek" })).toBeVisible();
    await uj.close();
    await expect(page.getByLabel("Neved")).toHaveValue("Bence");
    // A címkében lévő linkre koppintva a jelölőnégyzet nem pipálódik be magától.
    await expect(page.getByRole("checkbox")).not.toBeChecked();
  });
});

test.describe("Süti-tájékoztató", () => {
  // Első látogatás: a böngésző még nem jegyezte meg, hogy látta.
  test.use({ storageState: { cookies: [], origins: [] } });

  const suti = (page: Page) => page.getByRole("region", { name: "Süti-tájékoztató" });

  test("első látogatáskor megjelenik, a Rendben elrejti, és egy évig nem jön újra", async ({ page, context }) => {
    // Sok oldalbetöltés: a fejlesztői szerveren, párhuzamos futásnál kell a nagyobb időkeret.
    test.slow();
    await page.goto("/login");
    await expect(suti(page)).toBeVisible();
    await akadalymentes(page, "süti-tájékoztató");

    await suti(page).getByRole("button", { name: "Rendben" }).click();
    await expect(suti(page)).toBeHidden();
    const c = (await context.cookies()).find((x) => x.name === CONSENT_COOKIE);
    expect(c?.value).toBe(LEGAL_VERSION);
    expect(c!.expires - Date.now() / 1000).toBeGreaterThan(360 * 86_400);

    await page.reload();
    await hidratalva(page);
    await expect(suti(page)).toBeHidden();
  });

  test("a Részletek a sütikről szóló részre visz", async ({ page }) => {
    await page.goto("/login");
    await suti(page).getByRole("link", { name: "Részletek" }).click();
    await expect(page).toHaveURL(/\/adatvedelem#sutik$/);
    await expect(page.getByRole("heading", { level: 2, name: /Sütik/ })).toBeInViewport();
  });

  test("ha a tájékoztató megváltozik, újra megjelenik", async ({ page, context }) => {
    await page.goto("/login");
    await context.addCookies([{ name: CONSENT_COOKIE, value: "2000-01-01", url: page.url() }]);
    await page.reload();
    await expect(suti(page)).toBeVisible();
  });

  test("csak szükséges sütik vannak, böngészőtárat nem használ", async ({ page, context }) => {
    // Sok oldalbetöltés: a fejlesztői szerveren, párhuzamos futásnál kell a nagyobb időkeret.
    test.slow();
    await page.route("**/auth/v1/signup**", ok({ id: "x", email: "uj.tag@pelda.hu" }));
    await page.goto("/login");
    await hidratalva(page);
    // Belépés előtt, elfogadás nélkül: egyetlen süti sincs.
    expect(await context.cookies()).toEqual([]);

    await suti(page).getByRole("button", { name: "Rendben" }).click();
    await page.getByRole("button", { name: "Regisztráció", exact: true }).first().click();
    await page.getByLabel("Neved").fill("Bence");
    await page.getByLabel("E-mail").fill("uj.tag@pelda.hu");
    await page.getByLabel("Jelszó").fill("eleg-hosszu-jelszo");
    await page.getByRole("checkbox").check();
    await page.locator("form").getByRole("button", { name: "Fiók létrehozása" }).click();
    await expect(page.getByLabel("Megerősítő kód")).toBeVisible();

    // Csak a tájékoztatóban felsorolt fajták: bejelentkezés, biztonsági kulcs, a tájékoztató sütije.
    const szukseges = new RegExp(`^(${CONSENT_COOKIE}|sb-[a-z0-9]+-auth-token(-.*code-verifier)?(\\.\\d+)?)$`);
    for (const c of await context.cookies()) expect(c.name).toMatch(szukseges);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  });
});
