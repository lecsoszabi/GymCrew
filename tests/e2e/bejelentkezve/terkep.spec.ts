import { expect, test } from "@playwright/test";
import { MUNKAMENET_A } from "./munkamenet";
import { fakePhoneGps, rest } from "./segedek";

/*
 * A térkép valódi böngészőben, telefonprofilon, szimulált GPS-szel.
 *
 * A javítás előtti hibák: a lokátor végtelen ciklusban indította újra a
 * helyfigyelést (ez ölte meg a böngészőt), a térkép pedig minden GPS-frissítésnél
 * újraigazította magát (ez volt a rángatás).
 */

test.describe.configure({ mode: "serial" });

let sessionId: string | null = null;

test.beforeAll(async ({ browser }) => {
  // A süti frissítéséhez előbb egy oldalbetöltés kell, utána a REST-hívás.
  const context = await browser.newContext({ storageState: MUNKAMENET_A });
  const page = await context.newPage();
  await page.goto("/app");
  const api = await rest(context);

  const [me] = await api.call("GET", `profiles?select=group_id&id=eq.${api.userId}`);
  if (!me?.group_id) throw new Error("A tesztfióknak csapatban kell lennie (külön tesztcsapatban!).");

  // Edzés pontosan 20 perc múlva — benne a lokátor 30 perces ablakában.
  const [session] = await api.call("POST", "sessions", {
    group_id: me.group_id,
    starts_at: new Date(Date.now() + 20 * 60_000).toISOString(),
    created_by: api.userId,
    status: "proposed",
  });
  sessionId = session.id;
  await api.call("POST", "session_votes", { session_id: sessionId, user_id: api.userId, vote: "yes" });

  await context.storageState({ path: MUNKAMENET_A });
  await context.close();
});

test.afterAll(async ({ browser }) => {
  if (!sessionId) return;
  const context = await browser.newContext({ storageState: MUNKAMENET_A });
  const page = await context.newPage();
  await page.goto("/app");
  const api = await rest(context);
  await api.call("DELETE", `sessions?id=eq.${sessionId}`);
  await context.storageState({ path: MUNKAMENET_A });
  await context.close();
});

test("a lokátor egyszer indítja a helyfigyelést, nem pörög ciklusban", async ({ page }) => {
  await fakePhoneGps(page);
  await page.goto("/app/map");
  await expect(page.getByText("Lokátor bekapcsolva")).toBeVisible({ timeout: 15_000 });

  // 4 másodperc alatt a szimulált GPS kb. 25-ször frissít.
  await page.waitForTimeout(4000);
  const gps = await page.evaluate(() => (window as unknown as { __gps: object }).__gps);
  expect(gps).toMatchObject({ watch: 1, clear: 0 });
  expect((gps as { updates: number }).updates).toBeGreaterThan(15);
});

test("a térkép nem ugrál a GPS-frissítésektől", async ({ page }) => {
  await fakePhoneGps(page);
  await page.goto("/app/map");
  await expect(page.getByText("Lokátor bekapcsolva")).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500); // az első igazítás lecsengése

  // A térkép-panel eltolása: ha újraigazítana, ez változna.
  const pan = () =>
    page.evaluate(() => (document.querySelector(".leaflet-map-pane") as HTMLElement)?.style.transform);
  const before = await pan();
  await page.waitForTimeout(3000); // kb. 20 GPS-frissítés
  expect(await pan()).toBe(before);
});

test("a böngésző közben is válaszol", async ({ page }) => {
  await fakePhoneGps(page);
  await page.goto("/app/map");
  await expect(page.getByText("Lokátor bekapcsolva")).toBeVisible({ timeout: 15_000 });

  // Ha a fő szál be lenne dugulva, ez a mérés elszállna.
  const lag = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const t0 = performance.now();
        setTimeout(() => resolve(performance.now() - t0 - 50), 50);
      })
  );
  expect(lag).toBeLessThan(200);
});

test("a térkép sötét, iPhone-on is", async ({ page }) => {
  // A WebKit a csempe-panelre tett sötétítő szűrőt nem rajzolta ki: iPhone-on
  // világos térkép volt a fekete appban. Itt a kirajzolt képet mérjük, nem a CSS-t.
  await page.goto("/app/map");
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible({ timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  const kep = await page.locator(".leaflet-container").screenshot({
    style: ".leaflet-marker-pane, .leaflet-overlay-pane, .leaflet-control-container { visibility: hidden; }",
  });

  const vaszon = await page.context().newPage();
  const fenyero = await vaszon.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let osszeg = 0;
    for (let i = 0; i < d.length; i += 4) osszeg += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return osszeg / (d.length / 4);
  }, kep.toString("base64"));
  await vaszon.close();

  // Világos OSM-csempékkel ~220 körül, sötétre fordítva ~60 körül.
  expect(fenyero).toBeLessThan(110);
});

test("a saját jelölőm látszik a térképen", async ({ page }) => {
  await fakePhoneGps(page);
  await page.goto("/app/map");
  await expect(page.getByText("Lokátor bekapcsolva")).toBeVisible({ timeout: 15_000 });
  // Terem + saját avatár.
  await expect(page.locator(".crew-marker")).toHaveCount(2, { timeout: 10_000 });
});
