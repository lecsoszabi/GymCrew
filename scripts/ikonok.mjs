// Az ikonok és a levelek logója a logó egyetlen rajzából (src/lib/brand-shape.ts).
// Ha a logó változik, ezt kell újrafuttatni:  node scripts/ikonok.mjs
// A PNG-ket a Playwright böngészője rajzolja ki, így nem kell külön képszerkesztő.
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import {
  BADGE_SHIFT,
  CITY,
  INK,
  LIME,
  TILE,
  TILE_BORDER,
  TILE_RADIUS,
  dumbbellMarkup,
} from "../src/lib/brand-shape.ts";

// A SZEGED felirat betűje: ugyanaz a Barlow Condensed, mint az appban
// (a public/fonts fájljai, lásd scripts/betuk.mjs).
const FONT = "'Barlow Condensed'";
const FONT_FACES = ["latin", "latin-ext"]
  .map((subset) => {
    const data = readFileSync(`public/fonts/barlow-condensed-700-${subset}.woff2`).toString("base64");
    return `@font-face{font-family:'Barlow Condensed';font-weight:700;src:url(data:font/woff2;base64,${data}) format('woff2')}`;
  })
  .join("");
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${body}</svg>`;
const dumbbell = dumbbellMarkup({ detail: true, cutColor: TILE });

// Böngészőfül és telepített app: a csempe, középen a súlyzó, felirat nélkül.
const icon = svg(
  `<rect width="512" height="512" rx="${TILE_RADIUS}" fill="${TILE}"/>` +
    `<g transform="translate(0 56)">${dumbbell}</g>`
);

// Teljes kitöltés: az iOS és az Android maga vágja le a sarkokat. `scale` a biztonsági zónához.
const fullBleed = (scale) =>
  svg(
    `<rect width="512" height="512" fill="${TILE}"/>` +
      `<g transform="translate(256 256) scale(${scale}) translate(-256 -200)">${dumbbell}</g>`
  );

// A levelek logója: ugyanaz a csempe, mint a belépő oldalakon (BrandBadge), a levél hátterén.
const badge = svg(
  `<rect width="512" height="512" fill="${INK}"/>` +
    `<rect x="3" y="3" width="506" height="506" rx="${TILE_RADIUS}" fill="${TILE}" stroke="${TILE_BORDER}" stroke-width="6"/>` +
    `<g transform="translate(0 ${BADGE_SHIFT})">${dumbbell}</g>` +
    `<text x="${CITY.x}" y="${CITY.y}" text-anchor="middle" font-family="${FONT}" font-size="${CITY.size}"` +
    ` font-weight="${CITY.weight}" letter-spacing="${CITY.letterSpacing}" fill="${LIME}">${CITY.text}</text>`
);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function png(markup, size, out) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<!doctype html><html><head><style>${FONT_FACES}</style></head><body style="margin:0">${markup.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`
  );
  // Megvárjuk, hogy a SZEGED felirat betűje betöltődjön, különben tartalék betűvel rajzolna.
  await page.evaluate(() => document.fonts.load("700 62px 'Barlow Condensed'"));
  await page.locator("svg").screenshot({ path: out, omitBackground: true });
  console.log("✓", out);
}

// A Next a src/app/icon.svg-t magától belinkeli faviconnak; a public/-ban nem lehet ugyanilyen nevű.
writeFileSync("src/app/icon.svg", icon + "\n");
rmSync("public/icon.svg", { force: true });
console.log("✓ src/app/icon.svg");

await png(fullBleed(0.84), 180, "src/app/apple-icon.png");
await png(icon, 192, "public/icon-192.png");
await png(icon, 512, "public/icon-512.png");
await png(fullBleed(0.66), 512, "public/icon-maskable-512.png");
mkdirSync("public/email", { recursive: true });
await png(badge, 224, "public/email/logo.png");

await browser.close();
