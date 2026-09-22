import { expect, type Page, test } from "@playwright/test";
import { hidratalva } from "./kozos";

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

async function urlapKitoltes(page: Page, nev = "Bence", email = "uj.tag@pelda.hu") {
  await ful(page, "Regisztráció").click();
  await page.getByLabel("Neved").fill(nev);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Jelszó").fill("eleg-hosszu-jelszo");
}

test.describe("Regisztráció", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await hidratalva(page);
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
    const tovabb = page.waitForRequest((r) => new URL(r.url()).pathname === "/onboarding");
    await kuldoGomb(page, "Fiók létrehozása").click();

    // A middleware a hamis tokennel visszadob a loginra — a lényeg, hogy
    // az app az onboardingra indult, nem a postaláda-képernyőre.
    await tovabb;
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

    await urlapKitoltes(page, "Bence Teszt");
    await kuldoGomb(page, "Fiók létrehozása").click();
    await expect(page.getByRole("heading", { name: "Nézd meg a postádat" })).toBeVisible();

    // A név a törzsben utazik…
    expect(torzs).toContain("Bence");
    // …a visszatérési cím viszont a query-ben, a saját oldalunkra mutatva.
    expect(decodeURIComponent(kertUrl)).toContain("/auth/callback");
  });

  test("a regisztráció PKCE-vel megy (ezért kód a megerősítés, nem link)", async ({ page }) => {
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

    // A code_challenge miatt egy megerősítő link csak ugyanabban a böngészőben
    // léptetne be — ezért a levélben kód jön, azt bárhonnan be lehet írni.
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

/** A Supabase sikeres kódellenőrzése: rögtön munkamenetet ad. */
const munkamenet = {
  access_token: "teszt-access-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: "teszt-refresh-token",
  user: { id: "00000000-0000-4000-8000-000000000003", email: "uj.tag@pelda.hu", role: "authenticated" },
};

const kodMezo = (page: Page) => page.getByLabel("Megerősítő kód");

test.describe("Megerősítés kóddal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await hidratalva(page);
  });

  test("a levélben kapott kóddal megerősíti a címet, és továbblép", async ({ page }) => {
    await megerositestKerNev(page);
    let torzs: string | null = null;
    await page.route("**/auth/v1/verify**", async (route) => {
      torzs = route.request().postData();
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(munkamenet) });
    });

    await urlapKitoltes(page);
    await kuldoGomb(page, "Fiók létrehozása").click();
    await kodMezo(page).fill("123456");
    const tovabb = page.waitForRequest((r) => new URL(r.url()).pathname === "/onboarding");
    await page.getByRole("button", { name: "Megerősítem" }).click();

    // Az adatfelvételre indul (a hamis tokent ott a middleware visszadobja).
    await tovabb;
    expect(JSON.parse(torzs!)).toMatchObject({ email: "uj.tag@pelda.hu", token: "123456", type: "email" });
  });

  test("a kódmező csak számjegyet fogad, és hat jegy előtt nem küld", async ({ page }) => {
    await megerositestKerNev(page);
    await urlapKitoltes(page);
    await kuldoGomb(page, "Fiók létrehozása").click();

    const gomb = page.getByRole("button", { name: "Megerősítem" });
    await kodMezo(page).fill("12 3");
    await expect(kodMezo(page)).toHaveValue("123");
    await expect(gomb).toBeDisabled();
    // Beillesztve gyakran szóközzel, kötőjellel jön.
    await kodMezo(page).fill("123-456");
    await expect(kodMezo(page)).toHaveValue("123456");
    await expect(gomb).toBeEnabled();
    // A projekt 8 jegyű kódot küld (Supabase: Email OTP Length) — az is átmegy.
    await kodMezo(page).fill("1234 5678");
    await expect(kodMezo(page)).toHaveValue("12345678");
    await expect(gomb).toBeEnabled();
  });

  test("a kódmezőt a telefon kitöltheti a levélből", async ({ page }) => {
    await megerositestKerNev(page);
    await urlapKitoltes(page);
    await kuldoGomb(page, "Fiók létrehozása").click();

    await expect(kodMezo(page)).toHaveAttribute("autocomplete", "one-time-code");
    await expect(kodMezo(page)).toHaveAttribute("inputmode", "numeric");
  });

  test("hibás kódra magyarul szól", async ({ page }) => {
    await megerositestKerNev(page);
    // Pontosan így válaszol a Supabase rossz vagy lejárt kódra.
    await page.route("**/auth/v1/verify**", (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" }),
      })
    );

    await urlapKitoltes(page);
    await kuldoGomb(page, "Fiók létrehozása").click();
    await kodMezo(page).fill("000000");
    await page.getByRole("button", { name: "Megerősítem" }).click();

    await expect(uzenet(page)).toContainText("Hibás vagy lejárt kód");
    await expect(uzenet(page)).not.toContainText("Token");
    // Maradunk, hogy újra próbálhassa.
    await expect(kodMezo(page)).toBeVisible();
  });

  test("közvetlenül a regisztráció után az új kód kérése még vár", async ({ page }) => {
    await megerositestKerNev(page);
    await urlapKitoltes(page);
    await kuldoGomb(page, "Fiók létrehozása").click();

    await expect(page.getByRole("button", { name: /mp múlva/ })).toBeDisabled();
  });

  test("meg nem erősített címmel belépve a kódhoz visz, és új kódot lehet kérni", async ({ page }) => {
    await page.route("**/auth/v1/token**", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ code: 400, error_code: "email_not_confirmed", msg: "Email not confirmed" }),
      })
    );
    let kert: string | null = null;
    await page.route("**/auth/v1/resend**", async (route) => {
      kert = route.request().postData();
      await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });

    await page.getByLabel("E-mail").fill("uj.tag@pelda.hu");
    await page.getByLabel("Jelszó").fill("eleg-hosszu-jelszo");
    await kuldoGomb(page, "Belépés").click();

    await expect(page.getByRole("heading", { name: "Nézd meg a postádat" })).toBeVisible();
    await expect(page.getByText("még nem erősítetted meg")).toBeVisible();

    await page.getByRole("button", { name: "Új kódot kérek" }).click();
    await expect(page.getByText("Elküldtük az új kódot")).toBeVisible();
    expect(JSON.parse(kert!)).toMatchObject({ type: "signup", email: "uj.tag@pelda.hu" });
    // Utána egy percig nem lehet újra kérni.
    await expect(page.getByRole("button", { name: /mp múlva/ })).toBeDisabled();
  });
});
