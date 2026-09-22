// A levelek és az ikonszkript betűfájljai, állandó néven a public/fonts alá.
// Az app maga a next/font-ot használja (src/app/layout.tsx); ezek a fájlok a
// levelezőknek kellenek (https://gymcrew.hu/fonts/...) és a logó SZEGED
// feliratának kirajzolásához. Ha a betűtípus változik:  node scripts/betuk.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "public/fonts";
// Kell a latin-ext is: abban van a magyar ő és ű.
const SUBSETS = ["latin", "latin-ext"];
const FONTS = [
  { family: "Barlow", slug: "barlow", weights: [400, 700] },
  { family: "Barlow Condensed", slug: "barlow-condensed", weights: [700] },
];
// Modern böngésző: így woff2-t ad az API.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

mkdirSync(OUT, { recursive: true });
const faces = [];

for (const { family, slug, weights } of FONTS) {
  const url = `https://fonts.googleapis.com/css2?family=${family.replaceAll(" ", "+")}:wght@${weights.join(";")}&display=swap`;
  const css = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
  // Blokkok: /* latin-ext */ @font-face { ... font-weight: 700; src: url(...) ...; unicode-range: ...; }
  for (const [, subset, body] of css.matchAll(/\/\* ([a-z-]+) \*\/\s*@font-face\s*\{([^}]*)\}/g)) {
    if (!SUBSETS.includes(subset)) continue;
    const weight = Number(/font-weight:\s*(\d+)/.exec(body)[1]);
    const src = /url\((https:[^)]+\.woff2)\)/.exec(body)[1];
    const range = /unicode-range:\s*([^;]+);/.exec(body)[1].trim();
    const file = `${slug}-${weight}-${subset}.woff2`;
    const data = Buffer.from(await (await fetch(src)).arrayBuffer());
    writeFileSync(`${OUT}/${file}`, data);
    faces.push({ family, weight, file, range });
    console.log(`✓ ${OUT}/${file} (${Math.round(data.length / 1024)} KB)`);
  }
}

// Kész @font-face szabályok: ezt másoljuk a levelek <style> blokkjába.
const facesCss = faces
  .map(
    (f) =>
      `@font-face { font-family: '${f.family}'; font-style: normal; font-weight: ${f.weight}; font-display: swap; ` +
      `src: url('https://gymcrew.hu/fonts/${f.file}') format('woff2'); unicode-range: ${f.range}; }`
  )
  .join("\n");
writeFileSync(`${OUT}/fonts.css`, facesCss + "\n");
console.log(`✓ ${OUT}/fonts.css (${faces.length} @font-face)`);

// A licenc: mindkét betűcsalád SIL Open Font License alatt van.
const ofl = await (await fetch("https://raw.githubusercontent.com/google/fonts/main/ofl/barlow/OFL.txt")).text();
writeFileSync(`${OUT}/OFL.txt`, ofl);
console.log(`✓ ${OUT}/OFL.txt`);
