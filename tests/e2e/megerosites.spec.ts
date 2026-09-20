import { expect, test } from "@playwright/test";

const uzenet = (page: import("@playwright/test").Page) => page.locator('p[role="alert"]');

test.describe("Megerősítő link visszatérése", () => {
  test("paraméter nélküli callback nem enged be senkit", async ({ page }) => {
    await page.goto("/auth/callback");
    await expect(page).toHaveURL(/\/login\?error=/);
  });

  test("hamis kóddal sem lehet bejutni", async ({ page }) => {
    await page.goto("/auth/callback?code=hamisitott-kod-12345");
    await expect(page).toHaveURL(/\/login\?error=/);
    // Nem a védett appban kötünk ki.
    await expect(page).not.toHaveURL(/\/app/);
  });

  test("hamis token_hash sem enged be", async ({ page }) => {
    await page.goto("/auth/callback?token_hash=hamis&type=signup");
    await expect(page).toHaveURL(/\/login\?error=/);
  });

  test("a Supabase lejárati hibáját átveszi", async ({ page }) => {
    await page.goto("/auth/callback?error=access_denied&error_code=otp_expired");
    await expect(page).toHaveURL(/error=expired/);
    await expect(uzenet(page)).toContainText("lejárt");
  });

  test("lejárt linknél új linket lehet kérni", async ({ page }) => {
    await page.goto("/login?error=expired");
    await expect(uzenet(page)).toContainText("lejárt");
    // Az e-mail kitöltésével a gomb aktívvá válik.
    const gomb = page.getByRole("button", { name: /új link/i });
    await expect(gomb).toBeDisabled();
    await page.getByLabel("E-mail").fill("valaki@pelda.hu");
    await expect(gomb).toBeEnabled();
  });

  test("másik böngésző esetén értelmes magyarázat jön", async ({ page }) => {
    await page.goto("/login?error=masik-bongeszo");
    await expect(uzenet(page)).toContainText(/böngésző/);
    // Itt nincs értelme új linket kérni, ezért nem is ajánljuk.
    await expect(page.getByRole("button", { name: /új link/i })).toHaveCount(0);
  });

  test("ismeretlen hibakódra is van érthető üzenet", async ({ page }) => {
    await page.goto("/login?error=valami-ismeretlen");
    await expect(uzenet(page)).toBeVisible();
  });

  test("a nyílt átirányítás a callbackben sem működik", async ({ page }) => {
    await page.goto("/auth/callback?next=https://evil.example.com");
    // A next szűrve van, a saját oldalon maradunk.
    expect(new URL(page.url()).hostname).toMatch(/localhost|127\.0\.0\.1/);
  });
});
