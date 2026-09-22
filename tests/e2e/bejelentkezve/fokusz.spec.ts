import { devices, expect, test } from "@playwright/test";

/*
 * Billentyűzettel végiglépkedve egy fókuszált elem sem kerülhet a ragadós
 * fejléc vagy a fix alsó menü alá (WCAG 2.4.11). Chromiumban, mert a Safari
 * (WebKit) alapból kihagyja a linkeket a Tab-bal.
 */
test.use({ ...devices["Pixel 7"], browserName: "chromium", reducedMotion: "reduce" });

for (const ut of ["/app", "/app/plan", "/app/group", "/app/profile"]) {
  test(`${ut}: a Tab-bal fókuszált elem mindig látható marad`, async ({ page }) => {
    await page.goto(ut);
    await expect(page.locator("main h1").first()).toBeVisible();

    const takart: string[] = [];
    let latott = 0;
    for (let i = 0; i < 45; i++) {
      await page.keyboard.press("Tab");
      const r = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        if (!a || a === document.body || a.closest("header, [data-bottom-nav]")) return null;
        const box = a.getBoundingClientRect();
        const menu = document.querySelector("[data-bottom-nav]")!.getBoundingClientRect();
        const fejlec = document.querySelector("header[data-scroll-header]")!.getBoundingClientRect();
        const nev = (a.getAttribute("aria-label") || a.textContent || a.tagName).trim().replace(/\s+/g, " ");
        return { nev: nev.slice(0, 40), top: box.top, bottom: box.bottom, menu: menu.top, fejlec: fejlec.bottom };
      });
      if (!r) continue;
      latott++;
      if (r.bottom > r.menu + 1 || r.top < r.fejlec - 1) {
        takart.push(`${r.nev} (${Math.round(r.top)}–${Math.round(r.bottom)} px; menü ${Math.round(r.menu)} px)`);
      }
    }
    expect(latott, "fókuszálható elemek").toBeGreaterThan(2);
    expect(takart).toEqual([]);
  });
}
