# gymcrew.hu — domain és levélküldés

Ez a fájl azt tartja nyilván, mit kell beállítani, amikor a domain DNS-zónája
feléled. Addig semmit nem tudunk bevinni: a `gymcrew.hu` be van jegyezve
(2026-09-20), de **nincs névszervere**, tehát a zóna nem létezik.

Ellenőrzés bármikor:

```bash
dig +short gymcrew.hu NS
```

Amíg üres a válasz, várni kell.

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
| `A` | `@` (vagy üres) | `76.76.21.21` | maga az oldal |
| `CNAME` | `www` | `cname.vercel-dns.com` | www-s változat |

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
