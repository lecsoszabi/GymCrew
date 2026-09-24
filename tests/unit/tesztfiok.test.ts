import { describe, expect, it } from "vitest";
import { TESZTFIOK_MINTA } from "../e2e/bejelentkezve/segedek";

/*
 * A bejelentkezett tesztek időpontokat hoznak létre és törölnek, ezért csak
 * tesztfiókkal indulhatnak (a belépő szkript és a munkamenet-beállítás is
 * ezzel a mintával ellenőriz). Egy valódi fiók nevére nem illeszkedhet.
 */
describe("tesztfiók felismerése a név alapján", () => {
  it.each(["claude teszt1", "Claude Teszt 2", "TESZTFIÓK"])("„%s” tesztfiók", (nev) => {
    expect(TESZTFIOK_MINTA.test(nev)).toBe(true);
  });

  it.each(["Kovács Anna", "Nagy Bence", ""])("„%s” nem tesztfiók", (nev) => {
    expect(TESZTFIOK_MINTA.test(nev)).toBe(false);
  });
});
