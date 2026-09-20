# gymcrew.hu — domain és levélküldés

## Állapot (2026-09-21)

**A DNS-rekordok fel vannak véve Rackhoston, és a névszerverről ellenőrizve
helyesek.** Ami hiányzik: a `.hu` nyilvántartás még nem delegálta a domaint a
Rackhost névszervereire, ezért kívülről nem oldódik fel. Ez a bejegyzés
várakozási ideje — nincs rá ráhatásunk, csak idő kérdése.

| Rekord | Típus | Érték | Állapot |
|---|---|---|---|
| `gymcrew.hu` | A | `216.198.79.1` | ✅ |
| `www.gymcrew.hu` | A | `216.198.79.1` | ✅ |
| `resend._domainkey` | TXT | DKIM kulcs (218 karakter, egyezik) | ✅ |
| `rsend` | CNAME | `rsend-euw1.forge.rmta.net` | ✅ |
| `send` | CNAME | `send.forge.rmta.net` | ✅ |
| `_dmarc` | TXT | `v=DMARC1; p=none;` | ✅ |

Ellenőrzés kívülről (amíg üres, a delegálás nincs kész):

```bash
dig +short gymcrew.hu NS
```

Ellenőrzés a névszervertől közvetlenül (ez már most működik):

```bash
dig @ns1.dns24.hu +short gymcrew.hu A
dig @ns1.dns24.hu +short resend._domainkey.gymcrew.hu TXT
```

### Mi jön, ha a delegálás feléled

1. **Resend → Verify** — a rekordok már a helyükön vannak, azonnal át kell mennie
2. **Vercel** → a `gymcrew.hu` „Invalid Configuration" állapota magától „Valid"-ra vált
3. **Supabase SMTP** beállítása (lentebb) — az API kulcsot neked kell beírnod
4. Utána bemásolom a magyar e-mail sablonokat
5. Végül az app átállítása az új címre (lentebb)

---

## 1. Hová kerüljenek a rekordok?

A domain **Rackhoston** van. A rekordok mindig oda mennek, ahol a DNS-zónát
kezeled — két lehetőség:

### A) DNS marad Rackhoston — *ajánlott*

Rackhost ügyfélfiók → a domain → **DNS beállítások / DNS zóna szerkesztése**.
Ide kerül mind a hat rekord: a Resend négy rekordja (lentebb) **és** a
weboldalhoz tartozó kettő:

| Típus | Név | Tartalom | Mire jó |
|---|---|---|---|
| `A` | `@` (vagy üres) | `216.198.79.1` | maga az oldal |
| `A` | `www` | `216.198.79.1` | www-s változat |

> A Vercel a pontos értékeket kiírja, amikor a projektnél hozzáadod a domaint
> (**Settings → Domains → Add**). Ha eltér a fentitől, **a Vercel kiírását
> kövesd** — ezek az értékek időnként változnak.

### B) Névszerverek átállítása a Vercelre

Rackhoston csak a névszervereket írod át arra, amit a Vercel megad, és onnantól
minden DNS-rekordot a Vercelen kezelsz. Kevesebb helyen kell nyúlkálni, cserébe
a Rackhost DNS-kezelője kikerül a képből.

---

## 2. Resend rekordok

A Resend EU-s régiót adott (`euw1`), ami Magyarországhoz közel van — jó.

### DKIM — a feladó hitelesítése

| Típus | Név | TTL |
|---|---|---|
| `TXT` | `resend._domainkey` | Auto |

Tartalom (egyetlen sor, szóköz nélkül):

```
p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCmfjwIKNaUGJdBC5vCzMvMImKMlV7lJSfU9DlMgTRGosEb/qLTWtRGfdCtBZG+gza3MHLekQmY5aWsqoVkdClbpPUqNl9QXg5Gbrlm1GZYuo+9xJR6TK2TAVhN4QXluivHoJo7BP3cIglOzm6XT878/H+GFPWQzoPkcCDC3K+4HQIDAQAB
```

### SPF — a küldés engedélyezése

| Típus | Név | Tartalom | TTL |
|---|---|---|---|
| `CNAME` | `rsend` | `rsend-euw1.forge.rmta.net` | Auto |
| `CNAME` | `send` | `send.forge.rmta.net` | Auto |

### DMARC — nem kötelező, de ajánlott

| Típus | Név | Tartalom | TTL |
|---|---|---|---|
| `TXT` | `_dmarc` | `v=DMARC1; p=none;` | Auto |

> **Névformátum:** a legtöbb szolgáltatónál a fenti rövid nevet kell megadni
> (`resend._domainkey`). Van, ahol a teljes nevet kéri
> (`resend._domainkey.gymcrew.hu`). Ha a rekord felvétele után a név
> `resend._domainkey.gymcrew.hu.gymcrew.hu` lesz, akkor a rövidet kellett volna.

Miután bevitted: Resend → a domain oldalán **„I've added the records"**, majd
**Verify**. A terjedés általában percek, ritkán órák.

---

## 3. Supabase SMTP

Csak a domain hitelesítése **után**. Supabase → **Authentication → Emails →
SMTP Settings**:

| Mező | Érték |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | **a Resend API kulcsod** |
| Sender email | `noreply@gymcrew.hu` |
| Sender name | `GymCrew Szeged` |

Az API kulcsot a Resend → **API Keys** alatt hozod létre. A kulcs titok: ne
tedd a repóba és ne oszd meg.

---

## 4. Ami ezután jön

Amint az SMTP él, a Supabase engedi szerkeszteni a leveleket, és bemásolhatók
a `supabase/email-templates/` alatti magyar, arculatos sablonok:

| Fájl | Supabase sablon |
|---|---|
| `confirm-signup.html` | Confirm signup |
| `magic-link.html` | Magic Link |
| `reset-password.html` | Reset Password |
| `change-email.html` | Change Email Address |
| `invite.html` | Invite user |

---

## 5. Az app átállítása az új címre

1. Vercel → **Settings → Environment Variables** → `NEXT_PUBLIC_SITE_URL` =
   `https://gymcrew.hu`, majd **Redeploy** (a `NEXT_PUBLIC_` változók a buildbe
   égnek)
2. Supabase → **Authentication → URL Configuration** → **Site URL** =
   `https://gymcrew.hu`

A visszairányítási címek közé a `https://gymcrew.hu/**` és a
`https://www.gymcrew.hu/**` **már fel van véve** — azzal nem lesz teendő.
