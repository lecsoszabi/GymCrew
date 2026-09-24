/**
 * Tesztfiók munkamenetének mentése — jelszó nélkül.
 *
 * Megnyit egy böngészőablakot a gépeden. Oda TE lépsz be a tesztfiókkal; a
 * szkript csak megvárja, amíg bent vagy, és elmenti a munkamenetet (sütiket)
 * a tests/e2e/.auth/ mappába. A jelszót a szkript nem látja és nem tárolja.
 *
 *   node scripts/teszt-belepes.mjs a
 *   node scripts/teszt-belepes.mjs b
 *
 * A mentett fájl tokent tartalmaz: gitignore-olva van, ne oszd meg.
 *
 * Csak tesztfiókot ment el (a neve tartalmazza: „teszt”): a bejelentkezett
 * tesztek időpontokat hoznak létre és törölnek, a saját fiókodon ne fussanak.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { TESZTFIOK_MINTA, fiokNeve } from "../tests/e2e/bejelentkezve/segedek.ts";

const nev = process.argv[2];
if (!["a", "b"].includes(nev)) {
  console.error("Használat: node scripts/teszt-belepes.mjs a|b");
  process.exit(1);
}
const alap = process.env.E2E_BASE_URL ?? "https://gymcrew.hu";
const hova = `tests/e2e/.auth/${nev}.json`;

mkdirSync("tests/e2e/.auth", { recursive: true });
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
await page.goto(`${alap}/login`);

console.log(`\n→ Lépj be a megnyílt ablakban a(z) "${nev}" tesztfiókkal.`);
console.log("  Ha bent vagy, a szkript magától menti a munkamenetet. (Legfeljebb 5 perc.)\n");

await page.waitForURL((url) => url.pathname.startsWith("/app") || url.pathname.startsWith("/onboarding"), {
  timeout: 5 * 60_000,
});
const fiok = await fiokNeve(context);
if (!TESZTFIOK_MINTA.test(fiok)) {
  console.error(`✗ Ez nem tesztfiók („${fiok || "még nincs neve"}”), ezért nem mentettem el a munkamenetet.`);
  console.error("  A bejelentkezett tesztek időpontokat hoznak létre és törölnek, a saját fiókodon ne fussanak.");
  console.error(`  Futtasd újra, és lépj be a(z) "${nev}" tesztfiókkal.`);
  await browser.close();
  process.exit(1);
}
await context.storageState({ path: hova });
console.log(`✓ Munkamenet mentve: ${hova} (${fiok})`);
await browser.close();
