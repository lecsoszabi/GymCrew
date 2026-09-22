import { DataItem, LegalPage, Section } from "@/components/legal-page";
import { CONSENT_COOKIE, OPERATOR } from "@/lib/legal";

export const metadata = { title: "Adatkezelési tájékoztató · GymCrew" };

const Mail = () => (
  <a href={`mailto:${OPERATOR.email}`} data-inline className="font-semibold text-accent underline underline-offset-2">
    {OPERATOR.email}
  </a>
);

export default function AdatvedelemPage() {
  return (
    <LegalPage
      title="Adatkezelési tájékoztató"
      intro={
        <p>
          Ez a tájékoztató leírja, milyen adatokat kezel a GymCrew (gymcrew.hu), miért, milyen
          jogalapon és mennyi ideig, kik férnek hozzájuk, és milyen jogaid vannak. Az Európai Unió
          általános adatvédelmi rendelete (GDPR) és az információs önrendelkezési jogról szóló
          2011. évi CXII. törvény (Infotv.) alapján készült.
        </p>
      }
    >
      <Section n={1} title="Az adatkezelő">
        <p>
          <strong>{OPERATOR.name}</strong> ({OPERATOR.kind}). Minden adatvédelmi kérdéssel és kéréssel
          ezen a címen érsz el: <Mail />.
        </p>
      </Section>

      <Section n={2} title="Milyen adatokat kezelünk, miért és meddig">
        <div className="space-y-3">
          <DataItem
            title="Fiók"
            what="E-mail cím, név, jelszó (a jelszót csak visszafejthetetlen, titkosított formában tároljuk)."
            why="A fiók létrehozása, a belépés, és hogy a csapattársaid felismerjenek."
            basis="A szolgáltatás nyújtása (GDPR 6. cikk (1) b) pont)."
            until="A fiókod törléséig."
          />
          <DataItem
            title="Profil"
            what="Profilkép, születési dátum, nem, edzéscél, edzettségi szint. Egyik sem kötelező."
            why="A profilod. A profilképedet a csapattársaid is látják, a többi adatot csak te."
            basis="A hozzájárulásod (GDPR 6. cikk (1) a) pont), amit a kitöltéssel adsz meg, és a mező törlésével bármikor visszavonhatsz."
            until="Amíg meg nem változtatod vagy nem törlöd, legkésőbb a fiókod törléséig."
          />
          <DataItem
            title="Testadatok"
            what="Magasság és testsúly (mindig csak a legutóbb megadott érték). Nem kötelezők."
            why="A saját statisztikáid (például a BMI). A csapattársaid felületén nem jelennek meg."
            basis="Egészségügyi adatnak minősülhetnek, ezért csak a kifejezett hozzájárulásoddal kezeljük (GDPR 9. cikk (2) a) pont): a kitöltéssel adod meg, és a törlésükkel bármikor visszavonhatod."
            until="Amíg nem törlöd őket, legkésőbb a fiókod törléséig."
          />
          <DataItem
            title="Csapat és edzések"
            what="Csapattagság, meghívók, edzésidőpontok, szavazatok (igen, talán, nem és a nem indoka), napi jelzések, heti ráérés, beérkezések."
            why="A közös edzésszervezés és a statisztikák. Ezeket a csapattársaid látják."
            basis="A szolgáltatás nyújtása (GDPR 6. cikk (1) b) pont)."
            until="A fiókod törléséig."
          />
          <DataItem
            title="Helyadat (lokátor)"
            what="A pontos helyzeted, csak ha a böngésződben engedélyezed, csak az edzés előtti fél órában, és csak ha „Megyek”-et szavaztál."
            why="Hogy a csapattársaid lássák, merre jársz, és jelezze, ha beértél a terembe. A helyzetedet élőben kapják meg: nem kerül adatbázisba. Csak a beérkezésed ideje tárolódik."
            basis="A hozzájárulásod (GDPR 6. cikk (1) a) pont), amit a böngésző engedélyével és a „Megyek” szavazattal adsz meg. Bármikor visszavonhatod: a böngészőben az engedély visszavonásával vagy a szavazat módosításával."
            until="A helyzeted nem tárolódik. A beérkezés ideje a fiókod törléséig."
          />
          <DataItem
            title="Levelek"
            what="Az e-mail címed és a megerősítő vagy jelszó-visszaállító kód."
            why="A regisztráció megerősítése és az elfelejtett jelszó pótlása."
            basis="A szolgáltatás nyújtása (GDPR 6. cikk (1) b) pont)."
            until="A kód egy óra után lejár; a kiküldés naplója a levelező szolgáltatónál rövid ideig marad meg."
          />
          <DataItem
            title="Technikai adatok"
            what="IP-cím, a böngésző típusa és az időpontok a szolgáltatók naplóiban."
            why="A biztonságos működés és a hibák felderítése."
            basis="Jogos érdek (GDPR 6. cikk (1) f) pont): a szolgáltatás és a fiókok védelme."
            until="A szolgáltatók naplózási idejéig, jellemzően néhány napig."
          />
        </div>
        <p>
          Az adataidat <strong>nem adjuk el</strong>, reklámra és profilalkotásra nem használjuk, és
          automatizált döntést sem hozunk rólad.
        </p>
      </Section>

      <Section n={3} title="Kik férnek hozzá az adatokhoz">
        <p>
          <strong>A csapattársaid</strong> a csapat közös adatait látják: a nevedet, a profilképedet,
          a szavazataidat és azok indokát, a napi jelzéseidet, a beérkezéseidet, és a lokátor
          idején a helyzetedet.
        </p>
        <p>A működéshez ezeket a szolgáltatókat (adatfeldolgozókat) vesszük igénybe:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Supabase Inc.</strong>: adatbázis, bejelentkezés, profilképek tárolása. Az adatok
            Frankfurtban, az Európai Unióban vannak.
          </li>
          <li>
            <strong>Vercel Inc.</strong>: a weboldal kiszolgálása. A szerverkód Frankfurtban, az
            Európai Unióban fut.
          </li>
          <li>
            <strong>Resend (Plus Five Five, Inc.)</strong>: a megerősítő és jelszó-visszaállító levelek
            kiküldése.
          </li>
          <li>
            <strong>OpenStreetMap Foundation</strong>: a térkép képei. A térkép betöltésekor a
            böngésződ közvetlenül tőlük tölti le a térképcsempéket, így megkapják az IP-címedet.
          </li>
        </ul>
        <p>
          A Supabase, a Vercel és a Resend amerikai vállalat. Az Egyesült Államokba kerülő adatokra
          az Európai Bizottság által elfogadott általános szerződési feltételek vagy az EU-USA
          adatvédelmi keretrendszer vonatkozik, az adott szolgáltató vállalása szerint. Az
          OpenStreetMap Foundation az Egyesült Királyságban működik, amelyre az Európai Bizottság
          megfelelőségi határozata vonatkozik.
        </p>
      </Section>

      <Section id="sutik" n={4} title="Sütik">
        <p>
          A GymCrew <strong>csak a működéshez feltétlenül szükséges sütiket</strong> használja.
          Ezekhez a jogszabály szerint nem kell hozzájárulás, de tájékoztatnunk kell róluk.
          Reklám-, követő- vagy statisztikai sütit nem használunk.
        </p>
        <div className="space-y-3">
          <div className="card p-4">
            <h3 className="font-mono text-sm font-semibold text-fg">sb-…-auth-token</h3>
            <p className="mt-1.5 text-sm text-muted">
              A bejelentkezésed: ettől maradsz belépve. Szükséges süti, a GymCrew saját sütije.
              Több részre bontva is tárolódhat. Legfeljebb 400 napig él, kijelentkezéskor
              törlődik.
            </p>
          </div>
          <div className="card p-4">
            <h3 className="font-mono text-sm font-semibold text-fg">sb-…-code-verifier</h3>
            <p className="mt-1.5 text-sm text-muted">
              A regisztráció és a jelszó-visszaállítás biztonsági kulcsa: ezzel ellenőrzi a
              bejelentkezés, hogy a folyamatot tényleg te kezdted. Szükséges süti, a GymCrew saját
              sütije. Egyszerre több is lehet belőle; a sikeres belépés után töröljük.
            </p>
          </div>
          <div className="card p-4">
            <h3 className="font-mono text-sm font-semibold text-fg">{CONSENT_COOKIE}</h3>
            <p className="mt-1.5 text-sm text-muted">
              Megjegyzi, hogy láttad ezt a süti-tájékoztatót, így nem jelenik meg újra. Szükséges
              süti, a GymCrew saját sütije. Egy évig él.
            </p>
          </div>
        </div>
        <p>
          A sütiket a böngésződben bármikor törölheted. Ha a bejelentkezés sütijét törlöd, újra be
          kell lépned.
        </p>
      </Section>

      <Section n={5} title="Jogaid">
        <p>Az adataiddal kapcsolatban ezeket kérheted tőlünk:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Hozzáférés:</strong> megmondjuk, milyen adatot kezelünk rólad, és másolatot adunk.</li>
          <li><strong>Helyesbítés:</strong> a pontatlan adatot kijavítjuk (a profilodban magad is megteheted).</li>
          <li><strong>Törlés:</strong> a fiókodat és minden hozzád kötődő adatot törlünk.</li>
          <li><strong>Korlátozás:</strong> bizonyos esetekben az adatkezelést felfüggesztjük.</li>
          <li><strong>Adathordozhatóság:</strong> az adataidat géppel olvasható formában kiadjuk.</li>
          <li><strong>Tiltakozás:</strong> a jogos érdeken alapuló adatkezelés ellen.</li>
          <li><strong>A hozzájárulás visszavonása</strong> bármikor; ez a korábbi adatkezelés jogszerűségét nem érinti.</li>
        </ul>
        <p>
          Írj a <Mail /> címre. Legkésőbb egy hónapon belül válaszolunk. A fiókod törlését is itt
          kérheted.
        </p>
        <p>
          Ha úgy érzed, megsértettük a jogaidat, panaszt tehetsz a{" "}
          <strong>Nemzeti Adatvédelmi és Információszabadság Hatóságnál</strong> (NAIH, 1055 Budapest,
          Falk Miksa utca 9–11., www.naih.hu, ugyfelszolgalat@naih.hu), vagy bírósághoz fordulhatsz.
        </p>
      </Section>

      <Section n={6} title="Biztonság">
        <p>
          A kapcsolat mindig titkosított (HTTPS). A jelszavakat csak visszafejthetetlen formában
          tároljuk. Az adatbázis soronként ellenőrzi, ki mihez férhet hozzá: egy csapat adatait csak a
          csapat tagjai látják.
        </p>
      </Section>

      <Section n={7} title="Korhatár">
        <p>
          A GymCrew-t 16 éves kortól lehet használni. 16 év alatt csak a szülő vagy a gondviselő
          hozzájárulásával.
        </p>
      </Section>

      <Section n={8} title="Változások">
        <p>
          Ha ez a tájékoztató lényegesen megváltozik, az appban jelezzük. A hatályos változat
          dátuma az oldal tetején áll.
        </p>
      </Section>
    </LegalPage>
  );
}
