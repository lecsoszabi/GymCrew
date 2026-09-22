import { expect, type Page, test } from "@playwright/test";
import { hidratalva } from "./kozos";

/**
 * Elfelejtett jelszó: e-mail → kód a levélben → új jelszó oldal. A Supabase
 * hívásait elfogjuk, így levél nem megy ki, és egyetlen jelszó sem változik.
 */

const uzenet = (page: Page) => page.locator('p[role="alert"]');
const kodMezo = (page: Page) => page.getByLabel("Megerősítő kód");
const elfelejtett = (page: Page) => page.getByRole("button", { name: "Elfelejtett jelszó?" });

const munkamenet = {
  access_token: "teszt-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "teszt-refresh-token",
  user: { id: "00000000-0000-4000-8000-000000000004", email: "valaki@pelda.hu", role: "authenticated" },
};

async function levelMegy(page: Page) {
  await page.route("**/auth/v1/recover**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
  );
}

async function kodotKer(page: Page, email = "valaki@pelda.hu") {
  await elfelejtett(page).click();
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Kódot kérek" }).click();
}

test.describe("Elfelejtett jelszó", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await hidratalva(page);
  });

  test("belépésnél kínálja, regisztrációnál nem", async ({ page }) => {
    await expect(elfelejtett(page)).toBeVisible();
    await page.getByRole("button", { name: "Regisztráció", exact: true }).first().click();
    await expect(elfelejtett(page)).toBeHidden();
  });

  test("a már beírt címet átviszi, és kódot kér rá", async ({ page }) => {
    let kertUrl = "";
    let torzs: string | null = null;
    await page.route("**/auth/v1/recover**", async (route) => {
      kertUrl = route.request().url();
      torzs = route.request().postData();
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.getByLabel("E-mail").fill("valaki@pelda.hu");
    await elfelejtett(page).click();
    await expect(page.getByLabel("E-mail")).toHaveValue("valaki@pelda.hu");
    await page.getByRole("button", { name: "Kódot kérek" }).click();

    await expect(page.getByRole("heading", { name: "Nézd meg a postádat" })).toBeVisible();
    // Nem árulja el, van-e ilyen fiók.
    await expect(page.getByText("Ha van fiókod ezzel a címmel")).toBeVisible();
    expect(JSON.parse(torzs!)).toMatchObject({ email: "valaki@pelda.hu" });
    // Ha valaki mégis a levél linkjét nyitja meg, az új jelszó oldalára érjen.
    expect(decodeURIComponent(kertUrl)).toContain("/auth/callback?next=/reset-password");
  });

  test("a kóddal belép, és az új jelszó oldalára visz", async ({ page }) => {
    await levelMegy(page);
    let torzs: string | null = null;
    await page.route("**/auth/v1/verify**", async (route) => {
      torzs = route.request().postData();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(munkamenet) });
    });

    await kodotKer(page);
    await kodMezo(page).fill("12345678");
    const tovabb = page.waitForRequest((r) => new URL(r.url()).pathname === "/reset-password");
    await page.getByRole("button", { name: "Tovább az új jelszóhoz" }).click();

    await tovabb;
    expect(JSON.parse(torzs!)).toMatchObject({ email: "valaki@pelda.hu", token: "12345678", type: "recovery" });
  });

  test("hibás kódra magyarul szól, és ott marad", async ({ page }) => {
    await levelMegy(page);
    await page.route("**/auth/v1/verify**", (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" }),
      })
    );

    await kodotKer(page);
    await kodMezo(page).fill("00000000");
    await page.getByRole("button", { name: "Tovább az új jelszóhoz" }).click();

    await expect(uzenet(page)).toContainText("Hibás vagy lejárt kód");
    await expect(kodMezo(page)).toBeVisible();
  });

  test("túl gyakori kérésnél megmondja, meddig kell várni", async ({ page }) => {
    await page.route("**/auth/v1/recover**", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          code: 429,
          error_code: "over_email_send_rate_limit",
          msg: "For security purposes, you can only request this after 37 seconds.",
        }),
      })
    );

    await kodotKer(page);
    await expect(uzenet(page)).toContainText("37 másodperc");
  });

  test("vissza lehet lépni a belépéshez", async ({ page }) => {
    await elfelejtett(page).click();
    await page.getByRole("button", { name: "Vissza a belépéshez" }).click();
    await expect(page.getByLabel("Jelszó")).toBeVisible();
  });
});

test.describe("Új jelszó oldal", () => {
  test("bejelentkezés nélkül a loginra visz", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page).toHaveURL(/\/login\?next=%2Freset-password/);
  });

  test("elrontott jelszó-visszaállító link után kódot lehet kérni", async ({ page }) => {
    await page.goto("/auth/callback?next=/reset-password&error=access_denied&error_code=otp_expired");
    await expect(page).toHaveURL(/error=jelszo-link/);
    await hidratalva(page);
    await expect(uzenet(page)).toContainText("jelszó-visszaállító link");
    // Itt nem regisztrációs kód kell.
    await expect(page.getByRole("button", { name: /megerősítő kódot/i })).toHaveCount(0);

    await page.getByRole("button", { name: "Kérek jelszó-visszaállító kódot" }).click();
    await expect(page.getByRole("heading", { name: "Elfelejtett jelszó" })).toBeVisible();
  });
});
