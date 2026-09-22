import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/*
 * Az egységes arculat szabályai a forráskódban: egyetlen, 4 px-es sarok
 * (`rounded-ui`), kör csak ott, ahol a forma jelent valamit (profilkép, élő
 * pötty), és nincs külön kódbetű: minden Barlow vagy Barlow Condensed.
 */

function fajlok(dir: string): string[] {
  return readdirSync(dir).flatMap((nev) => {
    const ut = join(dir, nev);
    return statSync(ut).isDirectory() ? fajlok(ut) : /\.(tsx?|css)$/.test(nev) ? [ut] : [];
  });
}
const FORRAS = fajlok("src").map((ut) => ({ ut, kod: readFileSync(ut, "utf8") }));
const talalatok = (minta: RegExp) =>
  FORRAS.flatMap(({ ut, kod }) => (kod.match(minta) ?? []).map((m) => `${ut}: ${m}`));

describe("sarkok", () => {
  it("nincs régi, nagy lekerekítés (rounded-lg, -xl, -2xl, ...), csak rounded-ui", () => {
    expect(talalatok(/\brounded-(?:t-|b-|l-|r-)?(?:xs|sm|md|lg|xl|2xl|3xl|4xl)\b/g)).toEqual([]);
    expect(talalatok(/(?<![\w-])rounded(?![\w-])/g)).toEqual([]);
  });

  it("kör alakú csak a profilkép és az élő pötty lehet", () => {
    const korok = FORRAS.filter(({ kod }) => kod.includes("rounded-full")).map(({ ut }) => ut).sort();
    expect(korok).toEqual(
      [
        "src/app/app/layout.tsx", // a fejléc profilképének fókuszkerete
        "src/app/app/map/live-map.tsx", // élő pötty
        "src/components/avatar-uploader.tsx", // profilkép és a „+” jele
        "src/components/avatar.tsx",
        "src/components/brand.tsx", // a háttér fénykör
        "src/components/next-session-card.tsx", // élő pötty
      ].sort()
    );
  });

  it("a CSS segédosztályok a közös tokent használják", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/--radius-ui:\s*4px/);
    const sugarak = [...css.matchAll(/border-radius:\s*([^;]+);/g)].map((m) => m[1].trim());
    // A pulzáló gyűrű a kerek profilképet veszi körül, ezért kör.
    expect(sugarak.filter((r) => r !== "var(--radius-ui)")).toEqual(["9999px"]);
  });
});

describe("betűk", () => {
  it("nincs külön kódbetű (font-mono)", () => {
    expect(talalatok(/\bfont-mono\b/g)).toEqual([]);
  });

  it("a Barlow és a Barlow Condensed latin-ext készlettel töltődik be (ő, ű)", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout).toMatch(/Barlow\(\{[^}]*subsets: \["latin", "latin-ext"\]/);
    expect(layout).toMatch(/Barlow_Condensed\(\{[^}]*subsets: \["latin", "latin-ext"\]/);
  });
});
