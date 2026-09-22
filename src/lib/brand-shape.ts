/**
 * A GymCrew logó rajza egy helyen: klasszikus súlyzó, amelynek két nagy belső
 * tárcsája a szegedi Dóm két tornya (csúcs, kereszt, toronyablak). Ebből rajzol
 * az app (src/components/brand.tsx), és ebből készülnek az ikonok meg a levél
 * logója is (scripts/ikonok.mjs), hogy mindenhol pontosan ugyanaz legyen.
 *
 * 512-es rács; a rajz a bal felét írja le, a jobb a tükörképe.
 */

export const LIME = "#c8ff4d";
export const TILE = "#131519";
export const TILE_BORDER = "#262a31";
export const INK = "#0a0b0d";

export type BrandShape =
  | { kind: "rect"; x: number; y: number; width: number; height: number; rx?: number; detail?: boolean; cut?: boolean }
  | { kind: "path"; d: string; detail?: boolean; cut?: boolean };

/** A súlyzó bal fele. `detail`: kis méreten elhagyható; `cut`: a csempe színével kivágott rész. */
export const HALF: BrandShape[] = [
  { kind: "rect", x: 62, y: 236, width: 16, height: 40, rx: 5 }, // végzáró
  { kind: "rect", x: 80, y: 196, width: 32, height: 120, rx: 10 }, // kis tárcsa
  // nagy tárcsa = a Dóm tornya, csúccsal
  { kind: "path", d: "M118 164 L147 74 L176 164 V352 a10 10 0 0 1 -10 10 H128 a10 10 0 0 1 -10 -10 Z" },
  { kind: "rect", x: 143, y: 38, width: 8, height: 40 }, // kereszt
  { kind: "rect", x: 134, y: 50, width: 26, height: 8 },
  { kind: "rect", x: 176, y: 226, width: 16, height: 60, rx: 4 }, // gallér
  { kind: "rect", x: 113, y: 158, width: 68, height: 12, rx: 3, detail: true }, // párkány
  { kind: "path", d: "M137 222 V198 a10 10 0 0 1 20 0 V222 Z", detail: true, cut: true }, // toronyablak
];

/** A rúd a két gallér között. */
export const BAR = { x: 192, y: 240, width: 128, height: 32 };

/** A súlyzó befoglaló doboza a rácson (a kereszt tetejétől a tárcsák aljáig). */
export const BOUNDS = { x: 62, y: 38, width: 388, height: 324 };

/** Csak a súlyzó, kis margóval: ezzel a viewBox-szal a rajz kitölti a helyét. */
export const BARE_VIEWBOX = `${BOUNDS.x - 8} ${BOUNDS.y - 8} ${BOUNDS.width + 16} ${BOUNDS.height + 16}`;

/**
 * A csempén a SZEGED felirat, Barlow Condensed betűvel. A betűköz fele miatt
 * kicsit jobbra tolva van középre; a szélessége a régi feliratéval egyezik.
 */
export const CITY = { text: "SZEGED", x: 265, y: 456, size: 62, weight: 700, letterSpacing: 18 };

/** A csempe sarka: a 112 px-es logón kb. 4 px, mint az app minden más sarka. */
export const TILE_RADIUS = 18;

/** A csempén a súlyzó eltolása, hogy alatta elférjen a felirat. */
export const BADGE_SHIFT = 16;

const attrs = (s: BrandShape) =>
  s.kind === "rect"
    ? `x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}"${s.rx ? ` rx="${s.rx}"` : ""}`
    : `d="${s.d}"`;

/** A súlyzó SVG-elemei szövegként (az ikonszkripthez). */
export function dumbbellMarkup({
  detail,
  cutColor,
  color = LIME,
}: {
  detail: boolean;
  cutColor: string;
  color?: string;
}) {
  const half = HALF.filter((s) => detail || !s.detail)
    .map((s) => `<${s.kind} ${attrs(s)}${s.cut ? ` fill="${cutColor}"` : ""}/>`)
    .join("");
  return (
    `<g fill="${color}">${half}` +
    `<g transform="translate(512 0) scale(-1 1)">${half}</g>` +
    `<rect x="${BAR.x}" y="${BAR.y}" width="${BAR.width}" height="${BAR.height}"/></g>`
  );
}
