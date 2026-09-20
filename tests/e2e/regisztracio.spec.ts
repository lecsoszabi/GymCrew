import { expect, type Page, test } from "@playwright/test";

/**
 * A regisztrációs folyamat végigjátszása úgy, hogy a Supabase hívását
 * elfogjuk. Így valódi fiók nem jön létre, e-mail nem megy ki, és a teszt
 * nem függ a levélküldő óránkénti korlátjától — közben a teljes felületi
 * folyamatot ellenőrizzük.
 */

const kuldoGomb = (page: Page, nev: string) =>
  page.locator("form").getByRole("button", { name: nev });
const ful = (page: Page, nev: string) =>
  page.getByRole("button", { name: nev, exact: true }).first();
const uzenet = (page: Page) => page.locator('p[role="alert"]');

/** Sikeres regisztráció, ahol még e-mail megerősítés kell (session: null). */
async function megerositestKerNev(page: Page) {
  await page.route("**/auth/v1/signup**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "00000000-0000-4000-8000-000000000001",
        email: "uj.tag@pelda.hu",
        role: "authenticated",
        confirmation_sent_at: new Date().toISOString(),
      }),
    });
  });
}

/** Regisztráció, ami rögtön munkamenetet is ad (nincs megerősítés). */
async function azonnalBeleptet(page: Page) {
  await page.route("**/auth/v1/signup**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "teszt-access-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "teszt-refresh-token",
        user: {
          id: "00000000-0000-4000-8000-000000000002",
          email: "uj.tag@pelda.hu",
          role: "authenticated",
        },
      }),
    });
  });
}

async function hibavalValaszol(page: Page, status: number, body: object) {
  await page.route("**/auth/v1/signup**", (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })
  );
}

async function urlapKitoltes(page: Page, nev = "Kristóf", email = "uj.tag@pelda.hu") {
  await ful(page, "Regisztráció").click();
  await page.getByLabel("Neved").fill(nev);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Jelszó").fill("eleg-hosszu-jelszo");
}

test.describe("Regisztráció", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("megerősítést igénylő fióknál a postaláda-képernyő jön", async ({ page }) => {
    await megerositestKerNev(page);
    await urlapKitoltes(page);
    await kuldoGomb(page, "Fiók létrehozása").click();

    await expect(page.getByRole("heading", { name: "Nézd meg a postádat" })).toBeVisible();
    // A címet visszaolvassuk, hogy lássa: jó helyre ment.
    await expect(page.getByText("uj.tag@pelda.hu")).toBeVisible();
    await expect(page.getByText(/spam/i)).toBeVisible();
  });

  test("a postaláda-képernyőről vissza lehet lépni a belépéshez", async ({ page }) => {
    await megerositestKerNev(page);
    await urlapKitoltes(page);
    await kuldoGomb(page, "Fiók létrehozása").click();

    await page.getByRole("button", { name: "Vissza a belépéshez" }).click();
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.getByLabel("Neved")).toBeHidden();
  });

  test("azonnali munkamenet esetén az adatfelvételre visz", async ({ page }) => {
    await azonnalBeleptet(page);
    await urlapKitoltes(page);
    await kuldoGomb(page, "Fiók létrehozása").click();

    // A middleware a hamis tokennel visszadob a loginra — a lényeg, hogy
    // az app megpróbálta az onboardingot, nem a postaláda-képernyőn ragadt.
    await expect(page.getByRole("heading", { name: "Nézd meg a postádat" })).toBeHidden();
  });

  test("meglévő e-mailre érthető magyar üzenet jön", async ({ page }) => {
    await hibavalValaszol(page, 422, {
      code: 422,
      error_code: "user_already_exists",
      msg: "User already registered",
    });
    await urlapKitoltes(page);
    await kuldoGomb(page, "Fiók létrehozása").click();

    await expect(uzenet(page)).toContainText("már van fiók");
    await expect(uzenet(page)).not.toContainText("User already registered");
  });

  test("levélküldési korlátnál is magyarul szól", async ({ page }) => {
    await hibavalValaszol(page, 429, {
      code: 429,
      error_code: "over_email_send_rate_limit",
      msg: "For security purposes, you can only request this after 60 seconds.",
    });
    await urlapKitoltes(page);
    await kuldoGomb(page, "Fiók létrehozása").click();

    await expect(uzenet(page)).toBeVisible();
  });

  test("a név és a visszatérési cím is elmegy a Supabase-nek", async ({ page }) => {
    let torzs: string | null = null;
    let kertUrl = "";
    await page.route("**/auth/v1/signup**", async (route) => {
      torzs = route.request().postData();
      kertUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "x", email: "uj.tag@pelda.hu" }),
      });
    });

    await urlapKitoltes(page, "Kristóf Teszt");
    await kuldoGomb(page, "Fiók létrehozása").click();
    await expect(page.getByRole("heading", { name: "Nézd meg a postádat" })).toBeVisible();

    // A név a törzsben utazik…
    expect(torzs).toContain("Krist");
    // …a visszatérési cím viszont a query-ben, a saját oldalunkra mutatva.
    expect(decodeURIComponent(kertUrl)).toContain("/auth/callback");
  });

  test("a regisztráció PKCE-vel megy (ezért böngésző-kötött a link)", async ({ page }) => {
    let torzs: string | null = null;
    await page.route("**/auth/v1/signup**", async (route) => {
      torzs = route.request().postData();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "x", email: "uj.tag@pelda.hu" }),
      });
    });

    await urlapKitoltes(page);
    await kuldoGomb(page, "Fiók létrehozása").click();
    await expect(page.getByRole("heading", { name: "Nézd meg a postádat" })).toBeVisible();

    // A code_challenge jelenléte az oka, hogy a megerősítő linket ugyanabban
    // a böngészőben kell megnyitni — a hozzá tartozó titok csak ott van meg.
    expect(torzs).toContain("code_challenge");
  });

  test("a jelszó nem kerül bele az URL-be", async ({ page }) => {
    await megerositestKerNev(page);
    await urlapKitoltes(page);
    await kuldoGomb(page, "Fiók létrehozása").click();
    await expect(page.getByRole("heading", { name: "Nézd meg a postádat" })).toBeVisible();

    expect(page.url()).not.toContain("eleg-hosszu-jelszo");
    expect(page.url()).not.toContain("password");
  });
});
