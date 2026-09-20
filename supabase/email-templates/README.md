# E-mail sablonok

Az app arculatához igazított levelek.

## ⚠️ Saját SMTP kell hozzá

A Supabase **csak saját SMTP beállítása után** engedi szerkeszteni a sablonokat —
addig a beépített, angol nyelvű gyári levelek mennek ki, és a szerkesztő mezői
csak olvashatók. Ez náluk szándékos: a közös levélküldőjükről különben bárki
küldhetne arculatos leveleket, ami adathalászatra hívna.

A beépített küldő ráadásul óránként pár levélre van korlátozva, és nem éles
használatra való — SMTP tehát előbb-utóbb úgyis kell.

**Ingyenes lehetőségek:** Resend (3000 levél/hó), Brevo (300/nap), Mailgun, SendGrid.
Resend esetén: `smtp.resend.com`, 465-ös port, felhasználó `resend`, jelszó az API kulcs.
Saját, igazolt domain nélkül a Resend csak a saját címedre enged küldeni.

## Beállítás (ha megvan az SMTP)

**Supabase Dashboard → Authentication → Emails** → a megfelelő fül → a HTML beillesztése.

| Fájl | Supabase sablon | Tárgy |
|---|---|---|
| `confirm-signup.html` | Confirm signup | Erősítsd meg a címed — GymCrew |
| `magic-link.html` | Magic Link | Belépési linked a GymCrew-hoz |
| `reset-password.html` | Reset Password | Új jelszó a GymCrew fiókodhoz |
| `change-email.html` | Change Email Address | Erősítsd meg az új e-mail címed |
| `invite.html` | Invite user | Meghívtak egy GymCrew csapatba |

A `{{ .ConfirmationURL }}` változót a Supabase tölti ki — ne írd át.

**Felépítés:** táblázatos elrendezés, minden stílus soron belül, semmi külső CSS
és kép. A súlyzó-logó háttérszínes táblacellákból van kirajzolva, mert azt
gyakorlatilag minden levelezőkliens helyesen jeleníti meg — az SVG-t a Gmail
például kiszűri.

**Szerkesztés után** a variánsokat a `confirm-signup.html`-ből érdemes
újragenerálni, hogy ne csússzanak szét.
