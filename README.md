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
| 🔒 **Zárt** | Bejelentkezés nélkül semmi nem érhető el — fekete login képernyő fogad |
| 👥 **Csoport** | Meghívókód vagy e-mailes meghívó. Egy ember egyszerre **egy** csoport tagja |
| 🏋️ **Terem** | A 28 szegedi kondi közül a **csoport főnöke** választ, edzésenként is felülírható |
| 🗓️ **Időpont** | Bárki javasol, mindenki szavaz: Igen / Talán / **Nem + kötelező indok** |
| 🤝 **Közös sáv** | Mindenki megadja a heti ráérését → az app kiszámolja, **mikor jó mindenkinek** |
| ☀️ **Napi kérdés** | Belépéskor rákérdez — de **csak ha aznap már jelezte valaki**, hogy megy |
| 📍 **Lokátor** | T−30 perctől él, 150 m-en belül automatikus beérkezés, utána magától leáll |
| 📊 **Statok** | Heti oszlopok, ranglista, sorozat, kedvenc napok, beérkezés-napló |
| 🤳 **Profil** | Profilkép + testadatok (magasság, súly, BMI, cél, szint) |
| 📱 **Mobilra** | Alsó tab-bar telefonon, oldalsáv gépen. PWA-ként a kezdőképernyőre tehető |

---

## Telepítés — 5 lépés

### 1. Supabase projekt (ingyenes)

1. [supabase.com](https://supabase.com) → **New project**
2. Régiónak válaszd a **Frankfurt (eu-central-1)**-et — ez van legközelebb Szegedhez
3. Jegyezd fel a megadott adatbázis-jelszót

### 2. Adatbázis feltöltése

A Supabase felületén **SQL Editor** → **New query**, és futtasd le ebben a sorrendben:

1. `supabase/schema.sql` — táblák, jogosultságok, függvények
2. `supabase/seed_gyms.sql` — a 28 szegedi kondi

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

> Az `anon` kulcs nyilvános, nyugodtan mehet a böngészőbe — az adatokat a
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
3. Kristóf regisztrál (másik böngészőben vagy telefonon), és belép a kóddal

**Tipp az első próbához:** a Supabase **Authentication → Providers → Email**
alatt kapcsold ki a *Confirm email*-t, így nem kell visszaigazoló levelekre várni.

---

## Kirakás Vercelre (ingyenes)

```bash
git init && git add -A && git commit -m "GymCrew Szeged"
gh repo create gymcrew-szeged --private --source=. --push
```

1. [vercel.com/new](https://vercel.com/new) → importáld a repót
2. **Environment Variables**: vidd be ugyanazt a három értéket, mint a
   `.env.local`-ban. A `NEXT_PUBLIC_SITE_URL` a végleges címed legyen.
3. **Deploy**
4. Supabase → **Authentication → URL Configuration**: a *Site URL* és a
   *Redirect URLs* közé vedd fel a Vercel-címedet és a sajátodat is
   (`https://sajatdomain.hu/auth/callback`)

### Saját domain

Vercel → a projekt → **Settings → Domains** → **Add**. A Vercel kiírja a
beállítandó DNS rekordokat (`A` vagy `CNAME`) — ezeket a domain-szolgáltatódnál
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

A lokátor pozíciói **nem kerülnek adatbázisba** — elillanó broadcast üzenetek,
amelyek csak addig élnek, amíg nyitva van az app. Adatbázisba egyedül a
megérkezés ténye kerül.

---

## Adatbázis-teszt

A séma és az üzleti szabályok ellenőrizhetők egy eldobható, beágyazott
Postgres-en — nem kell hozzá Docker és nem nyúl a Supabase projektedhez:

```bash
npm run test:db
```

39 ellenőrzés fut le: hogy egy ember tényleg csak egy csoportban lehet, hogy a
*nem* indok nélkül elbukik, hogy a kívülálló nem lát bele a csoportba, hogy a
termet csak a főnök válthatja, és hogy a főnök kilépésekor a csapat öröklődik.

---

## Adatvédelem, ami beépítve van

- **Helyzet:** csak a csoporttársak látják, csak az edzés előtti 30 percben, és
  csak akkor, ha „Megyek"-et szavaztál. A terembe érve magától leáll.
- **Row Level Security** minden táblán: a csoportod adatain kívül semmit nem
  látsz. A tagságot közvetlen írással sem lehet átírni — csak ellenőrzött
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
      page.tsx       Ma — napi kérdés, következő edzés, mai állás
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
