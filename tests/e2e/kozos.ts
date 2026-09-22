import type { Page } from "@playwright/test";

/**
 * Megvárja, hogy a React átvegye az űrlapot. Előtte egy kattintás még a
 * böngésző saját űrlapküldését indítaná (az újratölti az oldalt, és elveszik,
 * amit a teszt beírt) — fejlesztői módú WebKiten ez rendszeresen megtörtént.
 */
export async function hidratalva(page: Page) {
  await page.waitForFunction(() => {
    const form = document.querySelector("form");
    return !!form && Object.keys(form).some((k) => k.startsWith("__reactProps$"));
  });
}

/**
 * A 44 px-nél kisebb koppintási célpontok az oldalon (Apple HIG, WCAG 2.5.8).
 * A `.tap` osztályú kis szöveges linkeknél a ::after-rel megnövelt terület
 * számít. A térkép kötelező forrásmegjelölése (szövegbe ágyazott link) kivétel.
 */
export async function kisCelpontok(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [role="button"]')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 1 && r.height > 1 && getComputedStyle(el).visibility !== "hidden" && !el.closest(".leaflet-control-attribution");
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        let w = r.width;
        let h = r.height;
        if (el.classList.contains("tap")) {
          h = Math.max(h, parseFloat(getComputedStyle(el, "::after").height) || 0);
          w += 16;
        }
        const nev = (el.getAttribute("aria-label") || (el as HTMLElement).innerText || el.tagName).trim().replace(/\s+/g, " ");
        return { nev: nev.slice(0, 40), w: Math.round(w * 2) / 2, h: Math.round(h * 2) / 2 };
      })
      .filter((x) => x.w < 44 || x.h < 44)
  );
}
