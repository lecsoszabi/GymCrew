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
