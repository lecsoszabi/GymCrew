import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";

/*
 * A Supabase-be feltöltött levelek forrása. Mind ugyanazt a fejlécet és
 * láblécet kapja, mint az app, és a kódos levelekben nincs link.
 */

const DIR = "supabase/email-templates";
const TEMPLATES = readdirSync(DIR).filter((f) => f.endsWith(".html")).sort();
const read = (name: string) => readFileSync(`${DIR}/${name}`, "utf8");

describe("e-mail sablonok", () => {
  it("mind az öt megvan", () => {
    expect(TEMPLATES).toEqual([
      "change-email.html",
      "confirm-signup.html",
      "invite.html",
      "magic-link.html",
      "reset-password.html",
    ]);
  });

  for (const name of TEMPLATES) {
    it(`${name}: a közös logó és név van a fejlécben, egységes a lábléc`, () => {
      const html = read(name);
      expect(html).toContain('src="https://gymcrew.hu/email/logo.png"');
      expect(html).toContain('alt="GymCrew Szeged"');
      expect(html).toMatch(/>\s*GymCrew\s*<\/div>/);
      expect(html).toContain("GymCrew · Szeged");
    });

    it(`${name}: nincs benne em dash és adatvédelmi mondat`, () => {
      const html = read(name);
      expect(html).not.toContain("—");
      expect(html).not.toMatch(/csoporttárs/);
    });
  }

  for (const name of TEMPLATES) {
    it(`${name}: Barlow betűk a gymcrew.hu-ról, 4 px-es sarkok`, () => {
      const html = read(name);
      const fajlok = [...html.matchAll(/url\('https:\/\/gymcrew\.hu\/fonts\/([^']+)'\)/g)].map((m) => m[1]);
      expect(fajlok.length).toBe(6);
      for (const f of fajlok) expect(existsSync(`public/fonts/${f}`), f).toBe(true);
      expect(html).toContain("font-family:'Barlow',");
      expect(html).toContain("font-family:'Barlow Condensed',");
      expect(html).not.toContain("SF Mono");
      const sugarak = [...html.matchAll(/border-radius:\s*([^;"]+)/g)].map((m) => m[1].trim());
      expect(new Set(sugarak)).toEqual(new Set(["4px"]));
    });
  }

  it.each(["confirm-signup.html", "reset-password.html"])("%s: kódot küld, linket nem", (name) => {
    const html = read(name);
    expect(html).toContain("{{ .Token }}");
    expect(html).not.toContain("{{ .ConfirmationURL }}");
  });

  it("a levelek logója megvan, és valódi PNG", () => {
    const png = readFileSync("public/email/logo.png");
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    // 2x felbontás a 112 pixeles megjelenítéshez
    expect(png.readUInt32BE(16)).toBe(224);
    expect(png.readUInt32BE(20)).toBe(224);
  });
});
