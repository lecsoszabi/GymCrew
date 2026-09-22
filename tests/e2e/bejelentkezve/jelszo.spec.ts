import { expect, test } from "@playwright/test";

/*
 * Az új jelszó oldal bejelentkezve, élesben.
 *
 * FONTOS: ez a teszt soha nem küldhet el érvényes új jelszót — a tesztfiók
 * jelszavát nem változtathatjuk meg. Biztosíték: a jelszó-módosító hívást
 * (PUT /auth/v1/user) a hálózaton is elvágjuk, és ellenőrizzük, hogy nem is
 * indult el.
 */

test("az új jelszó oldal betölt, és a hibás kitöltést helyben megfogja", async ({ page }) => {
  let modositas = 0;
  await page.route("**/auth/v1/user**", (route) => {
    if (route.request().method() === "PUT") {
      modositas++;
      return route.abort();
    }
    return route.continue();
  });

  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "Új jelszó" })).toBeVisible();

  const hiba = page.locator('p[role="alert"]');
  const mentes = page.getByRole("button", { name: "Mentem az új jelszót" });

  await page.getByLabel("Új jelszó").fill("rovid");
  await page.getByLabel("Még egyszer").fill("rovid");
  await mentes.click();
  await expect(hiba).toContainText("legalább 8 karakter");

  await page.getByLabel("Új jelszó").fill("eleg-hosszu-egy");
  await page.getByLabel("Még egyszer").fill("eleg-hosszu-ketto");
  await mentes.click();
  await expect(hiba).toContainText("nem egyezik");

  expect(modositas).toBe(0);
});
