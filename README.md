# GymCrew Szeged

Közös kondizás-szervező app. Megbeszélitek, mikor mentek, mindenki szavaz
(a *nem*hez kötelező indok), és az edzés előtt fél órával bekapcsol egy
lokátor, amin látjátok egymást a térképen, amíg be nem értek a terembe.

**28 valódi szegedi konditerem** van benne (OpenStreetMap-ből), a csoport
főnöke bármikor válthat köztük.

---

## Mit tud

| | |
|---|---|
| 🔒 **Zárt** | Bejelentkezés nélkül semmi nem érhető el, fekete login képernyő fogad |
| ✉️ **Regisztráció kóddal** | A levélben egyszer használható kód jön, nem link: bármelyik eszközön beírható, a levelező linkellenőrzője sem használja el |
| 🔑 **Elfelejtett jelszó** | Ugyanígy kóddal: e-mail cím → kód a levélben → új jelszó |
| 👥 **Csoport** | Meghívókód vagy e-mailes meghívó. Egy ember egyszerre **egy** csoport tagja |
| 🏋️ **Terem** | A 28 szegedi kondi közül a **csoport főnöke** választ, edzésenként is felülírható |
| 🗓️ **Időpont** | Bárki javasol, mindenki szavaz: Igen / Talán / **Nem + kötelező indok** |
| 🤝 **Közös sáv** | Mindenki megadja a heti ráérését → az app kiszámolja, **mikor jó mindenkinek** |
| ☀️ **Ma megyek** | Egy gomb a kezdőlapon: megadod, hánykor, és mai edzés lesz belőle, a többiek szavazhatnak rá |
| 🔔 **Napi kérdés** | Belépéskor rákérdez, de **csak ha aznap már jelezte valaki**, hogy megy |
| 📍 **Lokátor** | T−30 perctől él, 150 m-en belül automatikus beérkezés, utána magától leáll |
| 📊 **Statok** | Heti oszlopok, ranglista, sorozat, kedvenc napok, beérkezés-napló |
| 🤳 **Profil** | Profilkép + testadatok (magasság, súly, BMI, cél, szint) |
| 📱 **Mobilra** | Alsó tab-bar telefonon, oldalsáv gépen. PWA-ként a kezdőképernyőre tehető |
| ✨ **Finom mozgás** | A szakaszok görgetésre beúsznak, a fejléc árnyékot kap. Tiszta CSS, JavaScript nélkül; aki kevesebb mozgást kér, annak nincs |

---

## Telepítés 5 lépésben

### 1. Supabase projekt (ingyenes)

1. [supabase.com](https://supabase.com) → **New project**
2. Régiónak válaszd a **Frankfurt (eu-central-1)**-et, ez van legközelebb Szegedhez
3. Jegyezd fel a megadott adatbázis-jelszót

### 2. Adatbázis feltöltése

A Supabase felületén **SQL Editor** → **New query**, és futtasd le ebben a sorrendben:

1. `supabase/schema.sql`: táblák, jogosultságok, függvények
2. `supabase/seed_gyms.sql`: a 28 szegedi kondi

A séma a profilkép-tárolót (`avatars` bucket) is létrehozza. Ha a Storage
policy-kat kihagyta volna (a futtatás végén `NOTICE`-ként jelzi), hozd létre
kézzel: **Storage** → **New bucket** → név: `avatars`, **Public** bekapcsolva.

### 3. Kulcsok bemásolása

**Project Settings → API**, majd a projekt gyökerében:

```bash
cp .env.example .env.local
```

Töltsd ki:

```
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> Az `anon` kulcs nyilvános, nyugodtan mehet a böngészőbe, az adatokat a
> Row Level Security védi, nem a kulcs titkossága. A `service_role` kulcsot
> viszont **soha** ne tedd ide.

### 4. Indítás

```bash
npm install && npm run dev
```

Nyisd meg a [http://localhost:3000](http://localhost:3000) címet.

### 5. Ketten kipróbálni

1. Regisztrálj, töltsd ki az adataid, hozz létre csapatot, válassz termet
2. A **Csapat** fülön másold ki a 6 jegyű kódot
3. A barátod regisztrál (másik böngészőben vagy telefonon), és belép a kóddal

**Tipp az első próbához:** a Supabase **Authentication → Providers → Email**
alatt kapcsold ki a *Confirm email*-t, így nem kell visszaigazoló levelekre várni.

---

## Kirakás Vercelre (ingyenes)

```bash
git init && git add -A && git commit -m "GymCrew Szeged"
gh repo create gymcrew-szeged --private --source=. --push
```

> Élesben: **https://gymcrew.hu**

1. [vercel.com/new](https://vercel.com/new) → importáld a repót
2. **Environment Variables**: vidd be ugyanazt a három értéket, mint a
   `.env.local`-ban. A `NEXT_PUBLIC_SITE_URL` a végleges címed legyen.
3. **Deploy**

> **Két buktató, amibe mi is belefutottunk:**
>
> - A `NEXT_PUBLIC_` kezdetű változók a **build során égnek bele** a kódba.
>   Ha utólag adod hozzá őket, **újra kell deployolni**, enélkül az app
>   továbbra is a „Még nincs beállítva a Supabase" képernyőt mutatja, és azt
>   hinnéd, rossz az érték.
> - Ellenőrizd a **Settings → Git** alatt, hogy a projekt tényleg ehhez a
>   repóhoz van kötve. Ha a Vercel importáláskor külön repót hozott létre,
>   az egy pillanatképet deployol, és a későbbi munkád soha nem kerül ki.
4. Supabase → **Authentication → URL Configuration**: a *Site URL* és a
   *Redirect URLs* közé vedd fel a Vercel-címedet és a sajátodat is
   (`https://sajatdomain.hu/auth/callback`)

### Sebesség: a szerver Frankfurtban fut

A `vercel.json` a szerverkódot a `fra1` (Frankfurt) régióba teszi, a Supabase
adatbázis mellé. Enélkül a Vercel Washingtonban futtatná, és minden oldalbetöltés
több kört menne az Atlanti-óceánon át. Tabváltáskor a `src/app/app/loading.tsx`
csontváza azonnal megjelenik, amíg a szerver válaszol.

### Saját domain

Vercel → a projekt → **Settings → Domains** → **Add**. A Vercel kiírja a
beállítandó DNS rekordokat (`A` vagy `CNAME`), ezeket a domain-szolgáltatódnál
kell megadni. Az SSL tanúsítvány automatikus. Utána **ne felejtsd el** a
Supabase Redirect URL-eket is átírni az új címre.

### Belefér az ingyenes keretbe?

Igen, bőven. Néhány fős csapatnál:

| | Ingyenes keret | Amit használtok |
|---|---|---|
| Vercel sávszélesség | 100 GB / hó | ~ 0,1 GB |
| Supabase adatbázis | 500 MB | néhány MB évekig |
| Supabase tárhely | 1 GB | profilképenként ~30 KB |
| Realtime üzenetek | 2 000 000 / hó | ~20 000 (havi 20 edzésnél) |

A lokátor pozíciói **nem kerülnek adatbázisba**: elillanó broadcast üzenetek,
amelyek csak addig élnek, amíg nyitva van az app. Adatbázisba egyedül a
megérkezés ténye kerül.

---

## Arculat

A logó egyetlen rajza a `src/lib/brand-shape.ts`-ben van: klasszikus súlyzó, a két
nagy belső tárcsa a szegedi Dóm két tornya. Ebből rajzol az app
(`src/components/brand.tsx`: csempe SZEGED felirattal a belépő oldalakon, kis logó a
fejlécben), és ebből készül a favicon, az iPhone- és Android-ikon meg a levelek
logója is. Ha a rajz változik:

```bash
node scripts/ikonok.mjs
```

---

## Tesztek

Három réteg, mind futtatható egy paranccsal:

```bash
npm test          # egységtesztek + böngészős E2E
npm run test:unit # csak a logika (gyors, ~0,2 mp)
npm run test:e2e  # csak a böngészős
npm run test:db   # adatbázis + RLS szabályok
```

| Réteg | Mit fed le | Darab |
|---|---|---|
| **Egység** (Vitest) | A „mindenkinek jó" idősáv-metszet, távolság és geofence, statisztika (sorozat, heti bontás), átirányítás-szűrő, a mai edzés kiválasztása budapesti idő szerint (óraátállítással), időválasztó, a lokátor nem indul újra minden rendernél, a térkép nem igazodik minden GPS-jelre, a belépési hibák magyarul, az e-mail sablonok egységessége | 108 |
| **E2E** (Playwright) | Beléptető kapu, belépés, regisztráció, megerősítés kóddal, elfelejtett jelszó, megerősítő link, biztonsági fejlécek, mobil-ergonómia, akadálymentesség, egységes logó és ikonok, nincs em dash: asztali Chrome és iPhone Safari profilon | 140 |
| **Bejelentkezve** (Playwright, élesben) | Minden oldal telefonon (nincs kilógás, nincs konzolhiba, egységes fejléc), alsó menü, a „Ma megyek" folyamat, térkép szimulált GPS-szel (nem pörög, nem ugrál, iPhone-on is sötét), új jelszó oldal (jelszót soha nem módosít), görgetés-animáció (azonnal látható felső rész, kevesebb mozgás, felugró lap) | 22 |
| **Adatbázis** | Egy ember = egy csoport, kötelező indok, RLS-elszigetelés, teremváltás jogosultsága, öröklés, napi jelzés törlése | 49 |

**Amire figyelj:** az E2E a regisztrációt a Supabase-hívás elfogásával játssza
végig, ezért **nem hoz létre valódi fiókot** és nem küld e-mailt. Így a teszt
nem fogyasztja a levélküldő óránkénti keretét, és bármikor újrafuttatható.

Első futtatás előtt kell a böngésző:

```bash
npx playwright install chromium webkit
```

Az adatbázis-teszt egy eldobható, beágyazott Postgres-t indít, nem kell hozzá
Docker, és nem nyúl az éles Supabase projekthez.

### Bejelentkezett tesztek (élesben, tesztfiókkal)

Egyszer be kell lépni a tesztfiókkal a megnyíló ablakban. A szkript a jelszót
nem látja és nem tárolja, csak a munkamenetet menti el:

```bash
node scripts/teszt-belepes.mjs a
```

Utána bármikor futtatható:

```bash
npx playwright test --project=bejelentkezve --workers=1
```

- A tesztfiók **külön tesztcsapatban** legyen: a tesztek időpontot hoznak létre
  és törölnek, de csak a sajátjukat.
- A munkamenet a `tests/e2e/.auth/` mappában van. **Tokent tartalmaz**: gitignore-olva,
  ne oszd meg. Minden futás elején megújul és visszamentődik, így nem jár le.

## Adatbázis-teszt

A séma és az üzleti szabályok ellenőrizhetők egy eldobható, beágyazott
Postgres-en, nem kell hozzá Docker és nem nyúl a Supabase projektedhez:

```bash
npm run test:db
```

49 ellenőrzés fut le: hogy egy ember tényleg csak egy csoportban lehet, hogy a
*nem* indok nélkül elbukik, hogy a kívülálló nem lát bele a csoportba, hogy a
termet csak a főnök válthatja, és hogy a főnök kilépésekor a csapat öröklődik.

---

## Biztonság

Az app publikus repóban van, ezért a védelem nem a kód titkosságára épül.

**Ami véd:**

| Réteg | Mit csinál |
|---|---|
| Middleware-kapu | Bejelentkezés nélkül minden útvonal a login oldalra terel |
| Kétszeres ellenőrzés | Minden szerver-művelet külön is ellenőrzi a belépést, nem bízik a middleware-ben |
| Row Level Security | Mind a 9 táblán. A csoportodon kívül semmit nem látsz |
| Adatbázis-triggerek | A csoporttagságot és az edzés kényes mezőit közvetlen írással sem lehet átállítani |
| Kötelező indok | A *nem* indoka `CHECK` constraint, az API-t megkerülve sem hagyható ki |
| Biztonsági fejlécek | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, HSTS |
| `Permissions-Policy` | Helyzetlekérést csak a saját oldal kérhet; kamera, mikrofon, fizetés tiltva |
| Átirányítás-szűrés | A `?next=` paraméter csak oldalon belüli útvonal lehet, nem vihető idegen oldalra |
| Broadcast-ellenőrzés | A csatornán érkező pozíciókat validáljuk (koordináta-határ, hossz, `https://` avatar), mielőtt a térképre kerülnek |
| Tárhely-korlát | Profilkép max. 2 MB, csak JPEG/PNG/WebP, és csak a saját mappádba |

**Amit tudni érdemes:**

- Az `anon` kulcs szándékosan nyilvános: nem hozzáférést ad, csak azonosítja a
  projektet. Az adatokat az RLS védi. A `service_role` kulcsot **soha** ne tedd
  a kódba vagy a `.env.local`-ba.
- Nincs alkalmazásszintű rate limit. A bejelentkezést a Supabase korlátozza;
  néhány fős csapatnál ez elég.
- Ha a `realtime.messages` házirendek nem jönnek létre (a séma `NOTICE`-ként
  jelzi), a lokátor sima csatornára esik vissza. Ilyenkor a csatornát a csoport
  UUID-ja védi, amit kívülálló nem tud lekérdezni, de a szigorúbb védelemhez
  érdemes a házirendeket létrehozni.
- A `npm run test:db` 49 ellenőrzése pont ezeket a szabályokat feszegeti:
  megpróbál más csoportjába belátni, indok nélkül nemet mondani, nem-főnökként
  termet váltani. Mind el kell bukjon.

---

## Adatvédelem, ami beépítve van

- **Helyzet:** csak a csoporttársak látják, csak az edzés előtti 30 percben, és
  csak akkor, ha „Megyek"-et szavaztál. A terembe érve magától leáll.
- **Row Level Security** minden táblán: a csoportod adatain kívül semmit nem
  látsz. A tagságot közvetlen írással sem lehet átírni, csak ellenőrzött
  adatbázis-függvényeken keresztül.
- **Testadatok:** csak te és a csoporttársaid látjátok.

---

## Felépítés

```
src/
  app/
    login/           fekete beléptető kapu
    onboarding/      profilkép + testadatok
    app/             maga az alkalmazás (mind auth mögött)
      page.tsx       Ma: mai edzés vagy „Ma megyek", napi kérdés, következő edzés
      plan/          időpontok, szavazás, közös idősávok
      map/           élő lokátor Leaflet térképen
      stats/         statisztikák
      group/         csapat, meghívók, teremváltás
      profile/       saját adatok
    auth/            visszairányítás, kijelentkezés
  components/        újrahasznált UI elemek
  lib/
    supabase/        kliens, szerver, middleware (a kapu)
    date.ts          magyar formázás + a közös idősávok számítása
    geo.ts           távolság, geofence, ETA
    stats.ts         statisztika-számítás
    use-live-location.ts   élő helymegosztás
supabase/
  schema.sql         táblák + RLS + függvények
  seed_gyms.sql      28 szegedi kondi
  test/              adatbázis-teszt
```

## Új kondi felvétele

Egyetlen sor az SQL Editorban:

```sql
insert into public.gyms (name, address, lat, lng)
values ('Új Konditerem', 'Kossuth Lajos sugárút 1', 46.2530, 20.1414);
```

---

A kondik adatai az [OpenStreetMap](https://www.openstreetmap.org/copyright)-ről
származnak (ODbL licenc), a térkép csempéit is az OSM szolgáltatja.
