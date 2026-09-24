import { expect, test as setup } from "@playwright/test";
import { MUNKAMENET_A } from "./munkamenet";
import { TESZTFIOK_MINTA, fiokNeve } from "./segedek";
import { CONSENT_COOKIE, LEGAL_VERSION } from "../../../src/lib/legal";

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
  // Csak tesztfiókkal: különben a tesztek valaki valódi csapatában hoznának
  // létre és törölnének időpontokat.
  const nev = await fiokNeve(context);
  expect(
    nev,
    `a mentett munkamenet nem tesztfiókhoz tartozik („${nev}”), lépj be a tesztfiókkal: node scripts/teszt-belepes.mjs a`
  ).toMatch(TESZTFIOK_MINTA);
  // A süti-tájékoztató ne takarja a tesztelt felületet.
  const url = new URL(page.url());
  await context.addCookies([
    { name: CONSENT_COOKIE, value: LEGAL_VERSION, domain: url.hostname, path: "/", sameSite: "Lax" },
  ]);
  await context.storageState({ path: MUNKAMENET_A });
});
