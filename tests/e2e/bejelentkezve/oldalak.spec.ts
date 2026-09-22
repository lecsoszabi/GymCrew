import { expect, test } from "@playwright/test";

/*
 * Minden bejelentkezett oldal telefonprofilon: betölt, nem lóg ki oldalra,
 * nincs konzolhiba, és az alsó menü minden eleme elérhető.
 */

const OLDALAK = [
  { path: "/app", cim: /Szia/ },
  { path: "/app/plan", cim: /Mikor megyünk\?/ },
  { path: "/app/map", cim: /Ki merre jár\?/ },
  { path: "/app/stats", cim: /Statok/ },
  { path: "/app/group", cim: /.+/ },
  { path: "/app/profile", cim: /Profil/ },
];

for (const o of OLDALAK) {
  test(`${o.path} — betölt, nem lóg ki, nincs konzolhiba`, async ({ page }) => {
    const hibak: string[] = [];
    page.on("pageerror", (e) => hibak.push(e.message));
    page.on("console", (m) => m.type() === "error" && hibak.push(m.text()));

    await page.goto(o.path);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(o.cim);

    const tul = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(tul, "vízszintes kilógás pixelben").toBeLessThanOrEqual(1);

    // A térkép-csempék betöltési hibái nem az app hibái — a többi igen.
    expect(hibak.filter((h) => !/basemaps\.cartocdn|tile/i.test(h))).toEqual([]);
  });
}

test("az alsó menüvel minden fő oldal elérhető", async ({ page }) => {
  await page.goto("/app");
  const nav = page.locator("nav").last();
  for (const [felirat, ut] of [
    ["Terv", "/app/plan"],
    ["Térkép", "/app/map"],
    ["Statok", "/app/stats"],
    ["Csapat", "/app/group"],
    ["Ma", "/app"],
  ] as const) {
    await nav.getByRole("link", { name: felirat, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${ut}$`));
  }
});

test("az alsó menü nem takarja el az oldal alját", async ({ page }) => {
  await page.goto("/app/profile");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const kilepes = page.getByRole("button", { name: "Kijelentkezés" });
  await expect(kilepes).toBeInViewport();
  const gomb = await kilepes.boundingBox();
  const menu = await page.locator("nav").last().boundingBox();
  expect(gomb!.y + gomb!.height).toBeLessThanOrEqual(menu!.y);
});
