# GymCrew Szeged — Teljes terv

> Közös kondizás-szervező app: csoport, időpont-egyeztetés kötelező indoklással,
> élő lokátor az edzés előtt fél órától, statisztikák. Mobilra optimalizálva.

---

## 1. Mit kell tudnia (a kérésből lebontva)

| # | Követelmény | Megoldás |
|---|---|---|
| 1 | Bejelentkezés nélkül semmi nem elérhető, fekete háttér + login | `middleware.ts` route guard + dedikált fekete login oldal |
| 2 | Csoport létrehozás, meghívás, **1 ember = 1 csoport** | `profiles.group_id` (egyetlen oszlop → adatbázis szinten garantált) |
| 3 | Csoportfőnök válthat kondit | `groups.owner_id`, `groups.gym_id`, RLS: csak owner írhatja |
| 4 | Minden szegedi kondi | OSM-ből lekért valós lista (28 db), `gyms` tábla lat/lng-gel |
| 5 | Időpont megadása + szavazás | `sessions` + `session_votes` |
| 6 | Nem-re **kötelező indok** | DB CHECK constraint + UI validáció (nem lehet megkerülni) |
| 7 | "Mikor jó mindkettőnknek" | `availability` heti sáv + átfedés-számítás → javasolt idősávok |
| 8 | Napi kérdés belépéskor, **csak ha már valaki jelezte** | `daily_checkins` tábla + feltételes modal |
| 9 | Lokátor edzés előtt 30 perccel | Supabase Realtime broadcast + Leaflet térkép, auto-start/stop |
| 10 | …amíg be nem érünk a kondiba | 150 m-es geofence → `check_ins` írás, broadcast leáll |
| 11 | Statisztikák (ki mikor megy / volt) | `check_ins` + `sessions` aggregáció, ranglista, streak |
| 12 | Profilkép | Supabase Storage `avatars` bucket |
| 13 | Testadatok regisztrációkor | `profiles`: magasság, súly, szül. dátum, nem, cél, szint |
| 14 | Telefonbarát + PC-n is jó | Mobile-first Tailwind, alul tab-bar mobilon / oldalsáv desktopon |
| 15 | Vercel ingyenes tier | Next.js + Supabase free — nincs saját szerver, nincs cron, nincs websocket-host |

---

## 2. Tech stack és miért

```
Next.js 15 (App Router, Server Actions)  →  Vercel Hobby-n natívan fut
TypeScript + Tailwind CSS v4             →  gyors, kis bundle
Supabase (free tier)                     →  Postgres + Auth + Storage + Realtime EGYBEN
Leaflet + OpenStreetMap                  →  térkép API-kulcs és számlázás nélkül
```

**Miért Supabase?** A lokátorhoz élő kapcsolat kell. A Vercel ingyenes csomagon nem
futtatható tartós WebSocket szerver (serverless függvények másodpercek alatt leállnak). A Supabase
Realtime ezt kiszolgálja, és ugyanaz az ingyenes projekt adja az auth-ot, a Postgres-t és a
profilképek tárolását is. Egy szolgáltató, nulla forint.

**Ingyenes keretek (bőven elég 2–10 főre):**
- Vercel Hobby: 100 GB sávszél / hó
- Supabase Free: 500 MB DB, 1 GB storage, 200 egyidejű realtime kapcsolat, 2M üzenet/hó
- Lokátor-számítás: 5 fő × 10 mp-enként × 30 perc = ~900 üzenet / edzés → havi ~20 edzésnél 18k üzenet. A limit 2 millió.

**Költségoptimalizálás:** a pozíciókat **nem írjuk adatbázisba**, csak broadcast-oljuk
(elillanó üzenet). DB-be csak a megérkezés ténye kerül. Így a DB nem hízik és a write-limit sem téma.

---

## 3. Adatmodell

```
profiles          id(=auth.users), display_name, avatar_url, group_id→groups,
                  height_cm, weight_kg, birth_date, sex, goal, experience_level,
                  last_prompt_date
groups            id, name, invite_code(6 kar.), owner_id→profiles, gym_id→gyms
group_invites     id, group_id, invited_email, invited_by, status(pending/accepted/declined)
gyms              id, name, address, lat, lng, osm_id           ← 28 valós szegedi kondi
sessions          id, group_id, gym_id, starts_at, duration_min, created_by,
                  status(proposed|confirmed|cancelled|done), note
session_votes     session_id, user_id, vote(yes|no|maybe), reason
                  ▸ CHECK: vote='no' → reason kötelező, min. 3 karakter
availability      user_id, weekday(0–6), start_min, end_min      ← "mikor jó nekem"
daily_checkins    user_id, group_id, day, going, from_time, to_time, reason
                  ▸ UNIQUE(user_id, day)
check_ins         id, session_id, user_id, arrived_at, source(auto|manual)
```

**Biztonság:** minden táblán Row Level Security. Alapszabály: *csak a saját csoportod
adatait látod.* A pozíciódat csak a csoporttagok, és csak az aktív ablakban.

---

## 4. Képernyők

| Route | Mit csinál |
|---|---|
| `/login` | Fekete képernyő, e-mail+jelszó, regisztráció. Ezen kívül semmi nem érhető el. |
| `/onboarding` | Profilkép feltöltés + testadatok (magasság, súly, szül. dátum, nem, cél, szint) |
| `/app` | Kezdőlap: felül a „Ma" (mai edzés kártyája, vagy „Ma megyek / Ma nem"), alatta a következő edzés, napi modal |
| `/app/plan` | Időpont javaslat, szavazás (igen / talán / nem+indok), átfedés-javaslatok |
| `/app/map` | Élő térkép — lokátor, ETA, megérkezés-jelzés |
| `/app/group` | Csoport kezelés, meghívók, kondiváltás (csak főnök), tagok |
| `/app/stats` | Statok: havi darabszám, streak, ranglista, kedvenc nap/idősáv, előzmények |
| `/app/profile` | Saját adatok, testadat-napló, kijelentkezés |

**Navigáció:** mobilon alsó tab-bar (5 ikon, hüvelykujjal elérhető), ≥768px-en bal oldalsáv.

---

## 5. A lokátor pontos működése

```
T-30 perc ─────────────────────► T ──────────► megérkezés
   │                              │                │
   ├ auto-start: geolokáció       ├ térkép él      ├ 150 m-en belül?
   ├ broadcast 10 mp-enként       │                ├ check_in írás
   └ csak a csoport látja         │                └ broadcast STOP
```

- Csak akkor indul, ha van **megerősített** edzés és a user **igennel** szavazott.
- Böngésző engedélyt kér — megtagadható, akkor csak a többieket látod.
- Ablakon kívül a térkép a kondit mutatja, pozíciók nélkül. Nincs 0–24 követés.
- Megérkezés után a pötty "beért" állapotba vált és a megosztás leáll.

---

## 6. Napi kérdés logikája

```
belépéskor:
  van csoportom?                           nem → kihagy
  válaszoltam már ma?                      igen → kihagy
  jelezte MÁS a csoportból ma, hogy megy?  nem  → kihagy   ◄ a kért feltétel
  → modal: "Szia! Bence ma 18:00-kor megy. Jössz?"
     [Jövök 18:00-ra] [Ma nem tudok] → nem esetén kötelező indok
```

Aki elsőként akar menni, a kezdőlap „Ma megyek" gombjával jelez — ez indítja a láncot.
A „Ma megyek" mindig **időpontot** is jelent: ha még nincs mai, rákérdez, hánykor, és
létrehozza (a lokátor csak időponthoz tud bekapcsolni). Visszafelé is él a kapcsolat: a mai
időpontra adott szavazat a napi jelzést is átírja (Igen → megy, Nem → indokkal kihagyja,
Talán → nincs döntés), így a kezdőlap, a napi kérdés és a kártya mindig ugyanazt mutatja.

---

## 7. Időpont-egyeztetés

1. Bárki javasol időpontot (nap + óra + hossz).
2. Mindenki szavaz: **Igen / Talán / Nem**. A *Nem*hez kötelező indok (adatbázis kényszeríti).
3. A kártya mutatja: ki mit szavazott, és a nem-ek indokát.
4. Ha mindenki igen → állapot **megerősítve**, és bekapcsol a T-30 lokátor.
5. **„Mindenkinek jó" javaslatok:** a heti `availability` sávok metszetéből az app
   kiszámolja a közös szabad idősávokat, és egy kattintással javasolható időpontot ajánl.

---

## 8. Végrehajtási sorrend

1. Projekt scaffold, függőségek, Tailwind, alap layout
2. SQL séma + RLS + 28 szegedi kondi seed
3. Supabase kliensek, middleware auth-gate
4. Login (fekete) + regisztráció + onboarding testadatokkal + avatar upload
5. Csoport: létrehozás, invite-kód, meghívók, kondiváltás
6. Dashboard + napi modal + „Ma megyek"
7. Időpontok + szavazás + kötelező indok + átfedés-számítás
8. Térkép + realtime lokátor + geofence
9. Statisztikák
10. Mobil nav, PWA manifest, build-ellenőrzés
11. README: Supabase + Vercel + domain lépésről lépésre

---

## 9. Amit neked kell megtenned (nem automatizálható)

- Supabase projekt létrehozása (ingyenes) → 2 kulcs bemásolása `.env.local`-ba
- `supabase/schema.sql` és `seed_gyms.sql` lefuttatása az SQL Editorban
- `avatars` storage bucket létrehozása (a séma leírja)
- Vercel: GitHub repo importálása + ugyanaz a 2 env változó
- Domain rákötése a Vercel Domains fülön

Minden lépés parancsról parancsra a `README.md`-ben.
