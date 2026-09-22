import { expect, type Locator, type Page, test } from "@playwright/test";

/*
 * Görgetés-animációk telefonon (WebKit, mint az iPhone): a szakaszok
 * görgetésre úsznak be, de a betöltéskor látható rész azonnal teljesen
 * látszik, a lap alján minden előjön, és a felugró lapot semmilyen
 * animáció nem teheti áttetszővé.
 */

/** Az alsó menü fölötti rész alja (a CSS view() alsó beljebb-húzásával egyezik). */
const ALSO_MENU = 72;

const atlatszosag = (el: Locator) => el.evaluate((e) => Number(getComputedStyle(e).opacity));

/** A lap előbb a betöltés-csontvázat mutatja; a mérés csak a valódi tartalmon ér valamit. */
async function megnyit(page: Page, ut: string) {
  await page.goto(ut);
  await expect(page.locator("main section").first()).toBeVisible();
}

test("a betöltéskor látható szakasz rögtön teljesen látszik", async ({ page }) => {
  await megnyit(page, "/app/stats");
  const elso = page.locator("main section").first();
  expect(await elso.evaluate((e) => getComputedStyle(e).animationName)).toBe("reveal-up");
  expect(await atlatszosag(elso)).toBe(1);
});

test("görgetés közben beúszik, a lap alján minden teljesen látszik", async ({ page }) => {
  await megnyit(page, "/app/stats");
  const lathatoAlja = await page.evaluate((m) => window.innerHeight - m, ALSO_MENU);

  // Az első szakasz, ami betöltéskor még a képen kívül van.
  const szakaszok = page.locator("main section");
  const tetejek = await szakaszok.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
  const index = tetejek.findIndex((t) => t > lathatoAlja + 10);
  test.skip(index < 0, "Ezen a képernyőn minden szakasz elfér, nincs mit görgetni.");
  const lent = szakaszok.nth(index);
  expect(await atlatszosag(lent)).toBeLessThan(0.1);

  // Félig beúsztatva: 45 pixelre a 90-es tartományból.
  await lent.evaluate((e, alja) => window.scrollBy(0, e.getBoundingClientRect().top - (alja - 45)), lathatoAlja);
  await expect.poll(() => atlatszosag(lent)).toBeGreaterThan(0.2);
  expect(await atlatszosag(lent)).toBeLessThan(0.8);

  // A fejléc görgetéskor árnyékot kap.
  const fejlec = page.locator("header[data-scroll-header]");
  expect(await fejlec.evaluate((e) => getComputedStyle(e).boxShadow)).not.toBe("none");

  // A lap aljára görgetve az utolsó szakasz is teljesen látszik.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(() => atlatszosag(szakaszok.last())).toBeGreaterThan(0.97);
});

test("aki kevesebb mozgást kér, annak nincs görgetés-animáció", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await megnyit(page, "/app/stats");
  const szakaszok = page.locator("main section");
  const nevek = await szakaszok.evaluateAll((els) => els.map((e) => getComputedStyle(e).animationName));
  expect(new Set(nevek)).toEqual(new Set(["none"]));
  expect(await atlatszosag(szakaszok.last())).toBe(1);
});

test("a felugró lap a <body> alatt van, a szakaszok animációja nem érinti", async ({ page }) => {
  await megnyit(page, "/app/plan");
  await page.getByRole("button", { name: "+ Új" }).click();
  const lap = page.getByRole("dialog");
  await expect(lap).toBeVisible();
  expect(await lap.evaluate((e) => e.closest("main") === null && e.closest("section") === null)).toBe(true);
  // A lap saját, rövid beúszása után teljesen fedő.
  await expect.poll(() => atlatszosag(lap)).toBe(1);
});
