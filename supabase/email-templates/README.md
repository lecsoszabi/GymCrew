# E-mail sablonok

Az app arculatához igazított levelek.

## ⚠️ Saját SMTP kell hozzá

A Supabase **csak saját SMTP beállítása után** engedi szerkeszteni a sablonokat,
addig a beépített, angol nyelvű gyári levelek mennek ki, és a szerkesztő mezői
csak olvashatók. Ez náluk szándékos: a közös levélküldőjükről különben bárki
küldhetne arculatos leveleket, ami adathalászatra hívna.

A beépített küldő ráadásul óránként pár levélre van korlátozva, és nem éles
használatra való, SMTP tehát előbb-utóbb úgyis kell.

**Ingyenes lehetőségek:** Resend (3000 levél/hó), Brevo (300/nap), Mailgun, SendGrid.
Resend esetén: `smtp.resend.com`, 465-ös port, felhasználó `resend`, jelszó az API kulcs.
Saját, igazolt domain nélkül a Resend csak a saját címedre enged küldeni.

## Beállítás (ha megvan az SMTP)

**Supabase Dashboard → Authentication → Emails** → a megfelelő fül → a HTML beillesztése.

| Fájl | Supabase sablon | Tárgy |
|---|---|---|
| `confirm-signup.html` | Confirm signup | A GymCrew megerősítő kódod |
| `magic-link.html` | Magic Link | Belépési linked a GymCrew-hoz |
| `reset-password.html` | Reset Password | A GymCrew jelszó-visszaállító kódod |
| `change-email.html` | Change Email Address | Erősítsd meg az új e-mail címed |
| `invite.html` | Invite user | Meghívtak egy GymCrew csapatba |

A `{{ .Token }}` és a `{{ .ConfirmationURL }}` változót a Supabase tölti ki, ne írd át.

**A regisztráció és az elfelejtett jelszó kóddal megy, nem linkkel.** A
`confirm-signup.html`-ben és a `reset-password.html`-ben csak a `{{ .Token }}`
van, link nincs: a link (PKCE miatt) csak abban a böngészőben
működne, ahol a regisztráció elkezdődött, és a levelezők linkellenőrzője még a
felhasználó előtt elhasználhatná. A kódot az app „Nézd meg a postádat”
képernyőjén kell beírni, bármelyik eszközről olvasható. Ugyanitt lehet új kódot
kérni, és aki kód nélkül próbál belépni, azt is ide viszi az app.

Beállítás hozzá (**Authentication → Sign In / Providers → Email**): az
*Email OTP Length* most 8: az app 6–10 jegyet elfogad, a levél pedig mindig
annyit mutat, amennyi be van állítva. Az *Email OTP Expiration* 3600 másodperc
(1 óra); ennél hosszabbra ne állítsd.

**Felépítés:** táblázatos elrendezés, a stílusok soron belül; a fejben csak a Barlow betűk
`@font-face` szabályai vannak (`https://gymcrew.hu/fonts/…`, `scripts/betuk.mjs`). A
sarkok 4 px-esek, mint az appban.
Egyetlen kép van benne, a logó: `https://gymcrew.hu/email/logo.png` (ugyanaz a csempe,
mint az app belépő oldalain; a `scripts/ikonok.mjs` rajzolja a logó közös rajzából).
Alatta a „GymCrew” név szövegként áll, így képek nélkül is olvasható a fejléc.

**Szerkesztés után** a variánsokat a `confirm-signup.html`-ből érdemes
újragenerálni, hogy ne csússzanak szét.
