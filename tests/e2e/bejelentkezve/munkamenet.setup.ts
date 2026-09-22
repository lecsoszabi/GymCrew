import { expect, test as setup } from "@playwright/test";
import { MUNKAMENET_A } from "./munkamenet";

/*
 * Minden futás elején egy oldalbetöltés, ami szükség esetén megújítja a
 * munkamenetet — a friss sütiket visszamentjük. A Supabase a frissítő tokent
 * csak egyszer engedi felhasználni: ha minden teszt a régi fájlból indulna,
 * a második megújítás kiléptetné a tesztfiókot.
 */
setup("munkamenet frissítése", async ({ page, context }) => {
  await page.goto("/app");
  await expect(
    page,
    "lejárt a mentett munkamenet — futtasd: node scripts/teszt-belepes.mjs a"
  ).not.toHaveURL(/\/login/);
  await context.storageState({ path: MUNKAMENET_A });
});
