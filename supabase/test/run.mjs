import EmbeddedPostgres from "embedded-postgres";
import { readFileSync } from "node:fs";
import path from "node:path";

const PROJ = process.argv[2] ?? "../..";
const HERE = process.argv[3] ?? ".";

const pg = new EmbeddedPostgres({
  databaseDir: path.join(HERE, "pgdata"),
  user: "postgres",
  password: "postgres",
  port: 55432,
  persistent: false,
  onLog: () => {},
  onError: () => {},
});

let pass = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) { pass++; console.log(`  ✓ ${name}`); }
  else { failures.push(`${name}${detail ? " — " + detail : ""}`); console.log(`  ✗ ${name} ${detail}`); }
}

/** Egy lekérdezés "authenticated" szerepben, adott user JWT-jével. */
async function asUser(client, user, fn) {
  await client.query("begin");
  await client.query("set local role authenticated");
  await client.query(`set local request.jwt.claims = '${JSON.stringify({ sub: user.id, email: user.email })}'`);
  try {
    const out = await fn();
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback");
    throw e;
  }
}

/** Olvasás adott user nevében; hiba esetén null, hogy a teszt fusson tovább. */
async function tryAs(client, user, sql, params) {
  try { return await asUser(client, user, () => client.query(sql, params)); }
  catch { return null; }
}

/** Sikeres futást VÁRUNK; ha hibázik, az bukás. */
async function expectOk(client, user, name, sql, params) {
  try {
    const r = await asUser(client, user, () => client.query(sql, params));
    check(name, true);
    return r;
  } catch (e) {
    check(name, false, e.message.split("\n")[0]);
    return null;
  }
}

/** Hibát VÁRUNK; ha átmegy, az bukás. */
async function expectFail(client, user, name, sql, params, mustContain) {
  try {
    await asUser(client, user, () => client.query(sql, params));
    check(name, false, "a műveletnek el kellett volna hasalnia");
  } catch (e) {
    const msg = e.message;
    check(name, !mustContain || msg.includes(mustContain), mustContain ? `üzenet: ${msg.split("\n")[0]}` : "");
  }
}

try {
  console.log("Postgres indítása…");
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("gymcrew");
  const client = pg.getPgClient("gymcrew");
  await client.connect();

  console.log("\n— Séma futtatása —");
  await client.query(readFileSync(path.join(HERE, "supabase-stub.sql"), "utf8"));
  await client.query(readFileSync(path.join(PROJ, "supabase/schema.sql"), "utf8"));
  check("schema.sql hibátlanul lefut", true);
  await client.query(readFileSync(path.join(PROJ, "supabase/seed_gyms.sql"), "utf8"));
  const gymCount = await client.query("select count(*)::int n from public.gyms");
  check(`seed_gyms.sql betölt ${gymCount.rows[0].n} kondit`, gymCount.rows[0].n === 28, `kapott: ${gymCount.rows[0].n}`);

  // A seed idempotens: kétszer futtatva sem duplikál.
  await client.query(readFileSync(path.join(PROJ, "supabase/seed_gyms.sql"), "utf8"));
  const again = await client.query("select count(*)::int n from public.gyms");
  check("a seed újrafuttatása nem duplikál", again.rows[0].n === 28, `kapott: ${again.rows[0].n}`);

  console.log("\n— Felhasználók —");
  const mk = async (email, name) => {
    const r = await client.query(
      `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id, email`,
      [email, JSON.stringify({ display_name: name })]
    );
    return r.rows[0];
  };
  const anna = await mk("anna@pelda.hu", "Anna");
  const bence = await mk("bence@pelda.hu", "Bence");
  const idegen = await mk("idegen@pelda.hu", "Idegen");

  const prof = await client.query("select id, display_name from public.profiles order by display_name");
  check("a regisztráció automatikusan profilt készít", prof.rows.length === 3, `${prof.rows.length} profil`);
  check("a profil a megadott nevet kapja", prof.rows.some(r => r.display_name === "Bence"));

  console.log("\n— Csoport —");
  const gym = await client.query("select id, name from public.gyms order by name limit 1");
  const gymId = gym.rows[0].id;

  const g = await expectOk(client, anna, "Anna csoportot hoz létre", "select public.create_group($1,$2) id", ["Vasgyúrók", gymId]);
  const groupId = g.rows[0].id;

  const code = (await client.query("select invite_code from public.groups where id=$1", [groupId])).rows[0].invite_code;
  check("a csoport 6 jegyű meghívókódot kap", /^[A-Z2-9]{6}$/.test(code), `kód: ${code}`);

  await expectFail(client, anna, "ugyanaz az ember nem hozhat létre második csoportot",
    "select public.create_group($1,$2)", ["Másik", gymId], "Már tagja vagy");

  await expectOk(client, bence, "Bence belép a kóddal", "select public.join_group_by_code($1)", [code]);

  await expectFail(client, bence, "egy ember egyszerre csak egy csoportban lehet",
    "select public.create_group($1,$2)", ["Harmadik", gymId], "Már tagja vagy");

  await expectFail(client, idegen, "rossz kóddal nem lehet belépni",
    "select public.join_group_by_code($1)", ["ZZZZZZ"], "Nincs ilyen meghívókód");

  await expectFail(client, bence, "a tagságot közvetlen UPDATE-tel nem lehet átírni",
    "update public.profiles set group_id = null where id = $1", [bence.id], "csoport-függvényeken keresztül");

  console.log("\n— Láthatóság (RLS) —");
  const seenByBence = await tryAs(client, bence, "select id from public.profiles");
  check("a csoporttárs látja a másikat", seenByBence?.rows.length === 2, `${seenByBence?.rows.length} profil`);

  const seenByIdegen = await tryAs(client, idegen, "select id from public.profiles");
  check("a kívülálló csak magát látja", seenByIdegen?.rows.length === 1, `${seenByIdegen?.rows.length} profil`);

  const groupsSeenByIdegen = await tryAs(client, idegen, "select id from public.groups");
  check("a kívülálló nem látja a csoportot", groupsSeenByIdegen?.rows.length === 0, groupsSeenByIdegen ? "" : "a lekérdezés elhasalt");

  console.log("\n— Terem váltása —");
  const gym2 = (await client.query("select id from public.gyms order by name offset 3 limit 1")).rows[0].id;
  // RLS-nél a tiltott UPDATE nem hibát dob, hanem egyszerűen nulla sort érint.
  const denied = await tryAs(client, bence, "update public.groups set gym_id=$1 where id=$2 returning id", [gym2, groupId]);
  check("nem-főnök nem válthat termet (0 sor módosul)", denied?.rows.length === 0, `${denied?.rows.length} sor módosult`);
  const stillOld = (await client.query("select gym_id from public.groups where id=$1", [groupId])).rows[0];
  check("a terem tényleg változatlan maradt", stillOld.gym_id === gymId);
  const sw = await expectOk(client, anna, "a főnök válthat termet",
    "update public.groups set gym_id=$1 where id=$2 returning id", [gym2, groupId]);
  check("a váltás tényleg megtörtént", sw?.rows.length === 1);

  console.log("\n— Időpont és szavazás —");
  const s = await expectOk(client, anna, "Anna időpontot javasol",
    `insert into public.sessions (group_id, gym_id, starts_at, created_by)
     values ($1,$2, now() + interval '2 days', $3) returning id`, [groupId, gym2, anna.id]);
  const sessionId = s.rows[0].id;

  await expectOk(client, anna, "igen szavazat indok nélkül is mehet",
    "insert into public.session_votes (session_id,user_id,vote) values ($1,$2,'yes')", [sessionId, anna.id]);

  await expectFail(client, bence, "NEM szavazat indok nélkül elutasítva",
    "insert into public.session_votes (session_id,user_id,vote) values ($1,$2,'no')", [sessionId, bence.id],
    "no_vote_needs_reason");

  await expectFail(client, bence, "a túl rövid indok sem elég",
    "insert into public.session_votes (session_id,user_id,vote,reason) values ($1,$2,'no','x')", [sessionId, bence.id],
    "no_vote_needs_reason");

  await expectOk(client, bence, "NEM szavazat rendes indokkal átmegy",
    "insert into public.session_votes (session_id,user_id,vote,reason) values ($1,$2,'no','Akkor még melóban vagyok')", [sessionId, bence.id]);

  await expectFail(client, bence, "más nevében nem lehet szavazni",
    "insert into public.session_votes (session_id,user_id,vote) values ($1,$2,'yes')", [sessionId, idegen.id]);

  await expectFail(client, idegen, "kívülálló nem lát rá az edzésre",
    "insert into public.session_votes (session_id,user_id,vote) values ($1,$2,'yes')", [sessionId, idegen.id]);

  console.log("\n— Az edzés kényes mezői —");
  const gym3 = (await client.query("select id from public.gyms order by name offset 5 limit 1")).rows[0].id;

  await expectFail(client, bence, "nem-főnök nem válthat termet az edzésen",
    "update public.sessions set gym_id=$1 where id=$2", [gym3, sessionId],
    "csak a csoport főnöke");

  await expectOk(client, anna, "a főnök válthat termet az edzésen",
    "update public.sessions set gym_id=$1 where id=$2", [gym3, sessionId]);

  await expectFail(client, anna, "az edzés nem tolható át másik csoportba",
    "update public.sessions set group_id=gen_random_uuid() where id=$1", [sessionId],
    "másik csoportba");

  await expectFail(client, bence, "az edzés készítője nem írható át",
    "update public.sessions set created_by=$1 where id=$2", [bence.id, sessionId],
    "készítője nem módosítható");

  await expectOk(client, bence, "a státusz viszont bármelyik tagtól jöhet",
    "update public.sessions set status='confirmed' where id=$1", [sessionId]);

  console.log("\n— Profilkép tárhely —");
  const bucket = (await client.query("select file_size_limit, allowed_mime_types from storage.buckets where id='avatars'")).rows[0];
  check("az avatars bucket 2 MB-ra korlátozott", Number(bucket?.file_size_limit) === 2097152, `kapott: ${bucket?.file_size_limit}`);
  check("csak képtípusok engedettek", Array.isArray(bucket?.allowed_mime_types) && bucket.allowed_mime_types.includes("image/jpeg") && !bucket.allowed_mime_types.includes("text/html"));

  console.log("\n— Napi jelzés —");
  await expectOk(client, anna, "„ma megyek” indok nélkül mehet",
    "insert into public.daily_checkins (user_id,group_id,going) values ($1,$2,true)", [anna.id, groupId]);

  await expectFail(client, bence, "„ma nem” indok nélkül elutasítva",
    "insert into public.daily_checkins (user_id,group_id,going) values ($1,$2,false)", [bence.id, groupId],
    "decline_needs_reason");

  await expectOk(client, bence, "„ma nem” indokkal átmegy",
    "insert into public.daily_checkins (user_id,group_id,going,reason) values ($1,$2,false,'Beteg vagyok')", [bence.id, groupId]);

  await expectFail(client, anna, "naponta csak egy jelzés fér el",
    "insert into public.daily_checkins (user_id,group_id,going) values ($1,$2,true)", [anna.id, groupId],
    "daily_checkins_user_id_day_key");

  const todays = await tryAs(client, bence, "select user_id, going from public.daily_checkins where day = (now() at time zone 'Europe/Budapest')::date");
  check("a csoport látja egymás mai jelzéseit", todays?.rows.length === 2, `${todays?.rows.length} sor`);

  // A "Talán" szavazat a saját napi jelzést törli — másét senki nem törölheti.
  const foreign = await tryAs(client, anna,
    "delete from public.daily_checkins where user_id = $1 returning id", [bence.id]);
  check("más napi jelzését nem lehet törölni", foreign?.rows.length === 0, `${foreign?.rows.length} sor törölve`);
  const own = await tryAs(client, bence,
    "delete from public.daily_checkins where user_id = $1 returning id", [bence.id]);
  check("a saját napi jelzés törölhető", own?.rows.length === 1, `${own?.rows.length} sor törölve`);
  await expectOk(client, bence, "törlés után újra lehet jelezni",
    "insert into public.daily_checkins (user_id,group_id,going,reason) values ($1,$2,false,'Beteg vagyok')", [bence.id, groupId]);

  console.log("\n— Meghívó —");
  await expectFail(client, bence, "nem-főnök nem hívhat meg senkit",
    "insert into public.group_invites (group_id,invited_email,invited_by) values ($1,'uj@pelda.hu',$2)", [groupId, bence.id]);
  await expectOk(client, anna, "a főnök meghívhat e-maillel",
    "insert into public.group_invites (group_id,invited_email,invited_by) values ($1,'idegen@pelda.hu',$2)", [groupId, anna.id]);
  const inv = await tryAs(client, idegen, "select id from public.group_invites");
  check("a meghívott látja a meghívóját", inv?.rows.length === 1, `${inv?.rows.length} sor`);

  console.log("\n— Kilépés és öröklés —");
  await expectOk(client, anna, "a főnök kilép", "select public.leave_group()", []);
  const owner = (await client.query("select owner_id from public.groups where id=$1", [groupId])).rows[0];
  check("a csoportot a maradó tag örökli", owner.owner_id === bence.id);
  const annaGroup = (await client.query("select group_id from public.profiles where id=$1", [anna.id])).rows[0];
  check("a kilépőnek nincs csoportja", annaGroup.group_id === null);

  await expectOk(client, bence, "az utolsó tag is kiléphet", "select public.leave_group()", []);
  const gone = await client.query("select count(*)::int n from public.groups where id=$1", [groupId]);
  check("az üresen maradt csoport törlődik", gone.rows[0].n === 0);

  console.log(`\n${"─".repeat(52)}`);
  if (failures.length === 0) {
    console.log(`MIND A ${pass} ELLENŐRZÉS ÁTMENT ✓`);
  } else {
    console.log(`${pass} átment, ${failures.length} BUKOTT:`);
    failures.forEach((f) => console.log(`  ✗ ${f}`));
  }
  await client.end();
  await pg.stop();
  process.exit(failures.length === 0 ? 0 : 1);
} catch (e) {
  console.error("\nVÉGZETES HIBA:", e.message);
  try { await pg.stop(); } catch {}
  process.exit(1);
}
