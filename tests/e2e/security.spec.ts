import { expect, test } from "@playwright/test";

test.describe("Biztonsági fejlécek", () => {
  test("minden válasz viszi a védelmi fejléceket", async ({ page }) => {
    const valasz = await page.goto("/login");
    const fejlecek = valasz!.headers();

    expect(fejlecek["x-frame-options"]).toBe("DENY");
    expect(fejlecek["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(fejlecek["x-content-type-options"]).toBe("nosniff");
    expect(fejlecek["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("a helyzetlekérést csak a saját oldal kérheti", async ({ page }) => {
    const valasz = await page.goto("/login");
    const pp = valasz!.headers()["permissions-policy"] ?? "";
    expect(pp).toContain("geolocation=(self)");
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
  });

  test("az oldal nem ágyazható iframe-be", async ({ page }) => {
    const valasz = await page.goto("/login");
    // Két réteg is védi: a régi fejléc és a CSP.
    expect(valasz!.headers()["x-frame-options"]).toBe("DENY");
    expect(valasz!.headers()["content-security-policy"]).toContain("frame-ancestors");
  });

  test("idegen címre mutató next paraméter nem visz ki az oldalról", async ({ page }) => {
    await page.goto("/login?next=https://evil.example.com");
    // A lap a loginon marad, és sehol nem jelenik meg kifelé mutató hivatkozás.
    await expect(page).toHaveURL(/\/login/);
    const gonosz = page.locator('a[href*="evil.example.com"]');
    await expect(gonosz).toHaveCount(0);
  });

  test("a kijelentkezés csak POST-tal megy", async ({ request }) => {
    const valasz = await request.get("/auth/signout", { maxRedirects: 0 });
    // GET-re nem jelentkeztet ki senkit.
    expect(valasz.status()).toBeGreaterThanOrEqual(400);
  });
});
