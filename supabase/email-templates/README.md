# E-mail sablonok

Az app arculatához igazított levelek. Beállítás:
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
