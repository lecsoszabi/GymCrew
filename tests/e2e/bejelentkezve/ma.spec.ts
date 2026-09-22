import { expect, test, type Browser } from "@playwright/test";
import { MUNKAMENET_A } from "./munkamenet";
import { rest } from "./segedek";

/*
 * A kezdőlap fő művelete: "Ma megyek". Időpontot csinál belőle (arra kapcsol
 * be a lokátor), és a mai időpontra adott szavazat a napi jelzést is átírja —
 * hogy a kezdőlap, a napi kérdés és a kártya ugyanazt mondja.
 *
 * Csak a saját maga által létrehozott időpontot és a saját mai jelzését törli.
 */

test.describe.configure({ mode: "serial" });

const MA = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(new Date());

let groupId = "";
let userId = "";
let korabbiak = new Set<string>();

async function api(browser: Browser) {
  const context = await browser.newContext({ storageState: MUNKAMENET_A });
  const page = await context.newPage();
  await page.goto("/app");
  const r = await rest(context);
  return { ...r, close: () => context.close() };
}

const napiJelzes = async (browser: Browser) => {
  const a = await api(browser);
  const [sor] = await a.call("GET", `daily_checkins?select=going,reason,from_time&user_id=eq.${userId}&day=eq.${MA}`);
  await a.close();
  return sor ?? null;
};

test.beforeAll(async ({ browser }) => {
  const a = await api(browser);
  userId = a.userId;
  const [me] = await a.call("GET", `profiles?select=group_id&id=eq.${userId}`);
  if (!me?.group_id) throw new Error("A tesztfióknak csapatban kell lennie (külön tesztcsapatban!).");
  groupId = me.group_id;

  const sessions: { id: string; starts_at: string; duration_min: number; status: string }[] =
    await a.call("GET", `sessions?select=id,starts_at,duration_min,status&group_id=eq.${groupId}`);
  korabbiak = new Set(sessions.map((s) => s.id));

  const vanMai = sessions.some(
    (s) =>
      ["proposed", "confirmed"].includes(s.status) &&
      new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Budapest" }).format(new Date(s.starts_at)) === MA &&
      new Date(s.starts_at).getTime() + s.duration_min * 60_000 > Date.now()
  );
  test.skip(vanMai, "Már van mai időpont a tesztcsapatban — ezt a teszt nem bántja.");

  const most = new Date();
  test.skip(most.getHours() * 60 + most.getMinutes() + 15 > 22 * 60 + 30, "Mára már késő új időponthoz.");

  // Tiszta lap: a tesztfiók mai jelzése nélkül.
  await a.call("DELETE", `daily_checkins?user_id=eq.${userId}&day=eq.${MA}`);
  await a.close();
});

test.afterAll(async ({ browser }) => {
  if (!groupId) return;
  const a = await api(browser);
  const sessions: { id: string }[] = await a.call("GET", `sessions?select=id&group_id=eq.${groupId}`);
  const ujak = sessions.filter((s) => !korabbiak.has(s.id)).map((s) => s.id);
  if (ujak.length) await a.call("DELETE", `sessions?id=in.(${ujak.join(",")})`);
  await a.call("DELETE", `daily_checkins?user_id=eq.${userId}&day=eq.${MA}`);
  await a.close();
});

test("„Ma megyek” rákérdez az időpontra, és mai edzés lesz belőle", async ({ page, browser }) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Ma mész?" })).toBeVisible();

  await page.getByRole("button", { name: "Ma megyek" }).click();
  const lap = page.getByRole("dialog", { name: "Hánykor mész ma?" });
  await expect(lap).toBeVisible();

  // A legkorábbi választható időpont — a múltbeliek nincsenek a listában.
  const ido = lap.getByLabel("Hánykor?");
  const elso = await ido.locator("option").first().textContent();
  expect(elso).toMatch(/^\d{2}:\d{2}$/);
  await ido.selectOption({ index: 0 });
  await lap.getByRole("button", { name: "Megyek", exact: true }).click();

  // A kezdőlapon a "Ma" helyén most a mai edzés kártyája áll.
  await expect(page.getByRole("heading", { name: "Mai edzés" })).toBeVisible();
  await expect(page.getByText(`Ma ${elso}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Megyek", exact: true })).toHaveAttribute("data-on", "true");

  const jelzes = await napiJelzes(browser);
  expect(jelzes).toMatchObject({ going: true, reason: null });
  expect(jelzes.from_time.slice(0, 5)).toBe(elso);
});

test("a kártyán adott „Nem” a napi jelzést is átírja, indokkal", async ({ page, browser }) => {
  await page.goto("/app");
  await page.getByRole("button", { name: "Nem", exact: true }).click();
  const lap = page.getByRole("dialog", { name: "Miért nem jó ez az időpont?" });
  await lap.getByLabel("Miért nem jó ez az időpont?").fill("Teszt: ma mégsem érek rá");
  await lap.getByRole("button", { name: "Elküldöm" }).click();
  await expect(lap).toBeHidden();

  await expect(page.getByText("Teszt: ma mégsem érek rá")).toBeVisible();
  expect(await napiJelzes(browser)).toMatchObject({ going: false, reason: "Teszt: ma mégsem érek rá" });
});

test("a „Talán” törli a napi jelzést — nem mondjuk a többieknek, hogy megy", async ({ page, browser }) => {
  await page.goto("/app");
  await page.getByRole("button", { name: "Talán", exact: true }).click();
  await expect(page.getByRole("button", { name: "Talán", exact: true })).toHaveAttribute("data-on", "true");
  await expect.poll(() => napiJelzes(browser)).toBeNull();
});
