import Link from "next/link";
import { LegalPage, Section } from "@/components/legal-page";
import { OPERATOR } from "@/lib/legal";

export const metadata = { title: "Felhasználási feltételek · GymCrew" };

const Mail = () => (
  <a href={`mailto:${OPERATOR.email}`} data-inline className="font-semibold text-accent underline underline-offset-2">
    {OPERATOR.email}
  </a>
);

export default function FeltetelekPage() {
  return (
    <LegalPage
      title="Felhasználási feltételek"
      intro={
        <p>
          Ezek a feltételek a GymCrew (gymcrew.hu) használatára vonatkoznak. A regisztrációkor
          elfogadod őket; kérjük, olvasd el figyelmesen. Az adataid kezeléséről az{" "}
          <Link href="/adatvedelem" data-inline className="font-semibold text-accent underline underline-offset-2">
            Adatkezelési tájékoztató
          </Link>{" "}
          szól.
        </p>
      }
    >
      <Section n={1} title="A szolgáltatás">
        <p>
          A GymCrew ingyenes webes alkalmazás, amellyel barátok közösen szervezhetik az edzéseiket:
          időpontot javasolhatnak és szavazhatnak rá, láthatják, ki mikor ér rá, az edzés előtt
          megoszthatják egymással a helyzetüket, és statisztikát láthatnak a közös edzésekről.
        </p>
        <p>
          Üzemeltető: <strong>{OPERATOR.name}</strong> ({OPERATOR.kind}), kapcsolat: <Mail />.
        </p>
      </Section>

      <Section n={2} title="Ki használhatja">
        <p>
          A GymCrew-t 16 éves kortól lehet használni, 16 év alatt csak a szülő vagy a gondviselő
          hozzájárulásával. Regisztrációkor a valós nevedet vagy egy felismerhető becenevet add meg,
          és olyan e-mail címet, amelyhez hozzáférsz.
        </p>
      </Section>

      <Section n={3} title="A fiókod">
        <p>
          Egy ember egy fiókot használjon. A jelszavadat tartsd titokban; ha úgy gondolod, más is
          hozzáférhetett, változtasd meg az „Elfelejtett jelszó?” funkcióval, és írj nekünk. A fiókoddal
          végzett műveletekért te felelsz.
        </p>
      </Section>

      <Section n={4} title="Csapatok">
        <p>
          Egyszerre egy csapat tagja lehetsz. Csapatba meghívókóddal vagy meghívóval lehet belépni. A
          csapat létrehozója a csapat főnöke: ő választja ki és váltja a csapat termét. A csapatból
          bármikor kiléphetsz; ha a főnök lép ki, a legrégebbi tag veszi át a csapatot.
        </p>
      </Section>

      <Section n={5} title="Amit feltöltesz és írsz">
        <p>
          A nevedet, a profilképedet, a szavazataidat és azok indokát a csapattársaid látják. Csak
          olyan képet és szöveget tölts fel, amelyhez jogod van, és amely nem sértő, nem megtévesztő
          és nem jogellenes. Mások személyes adatait ne tedd közzé az engedélyük nélkül.
        </p>
        <p>
          Ami a tiéd, az a tiéd marad: a feltöltött tartalmad használatára csak annyiban adsz
          engedélyt, amennyiben a szolgáltatás működéséhez szükséges (például hogy a csapattársaid
          lássák a profilképedet). Az ezeket a szabályokat sértő tartalmat eltávolíthatjuk.
        </p>
      </Section>

      <Section n={6} title="Helymegosztás">
        <p>
          A helyzeted megosztása önkéntes. Csak akkor működik, ha a böngésződben engedélyezed, és
          csak az edzés előtti fél órában, amíg be nem érsz a terembe. A helymeghatározás pontossága
          a telefonodon múlik, ezért a térkép tévedhet. Közlekedés közben ne a térképet nézd.
        </p>
      </Section>

      <Section n={7} title="Egészség">
        <p>
          A GymCrew nem ad orvosi vagy edzéstervezési tanácsot; a BMI és a többi statisztika csak
          tájékoztató jellegű. Az edzésre a saját felelősségedre mész: ha egészségügyi problémád
          van, kérd ki orvos véleményét.
        </p>
      </Section>

      <Section n={8} title="Rendelkezésre állás">
        <p>
          A GymCrew-t ingyen, a jelenlegi állapotában nyújtjuk. Igyekszünk, hogy mindig működjön, de
          nem ígérjük, hogy hibátlan vagy folyamatosan elérhető lesz. A funkciókat
          megváltoztathatjuk, és a szolgáltatást meg is szüntethetjük; ezt előre jelezzük az appban.
        </p>
      </Section>

      <Section n={9} title="Felelősség">
        <p>
          A jogszabályok által megengedett mértékben nem felelünk a szolgáltatás kieséséből vagy
          hibájából eredő kárért, a termek adatainak pontosságáért (ezek az OpenStreetMap
          adatbázisából származnak), és a külső szolgáltatók (például a térkép vagy a levelek
          kiküldése) hibáiért. Ez nem érinti a szándékos vagy súlyosan gondatlan károkozásért, illetve
          az életet, testi épséget vagy egészséget megkárosító szerződésszegésért való felelősséget.
        </p>
      </Section>

      <Section n={10} title="A fiók megszüntetése">
        <p>
          A fiókodat bármikor megszüntetheted: írj a <Mail /> címre, és törlünk minden hozzád kötődő
          adatot. Ha valaki súlyosan megsérti ezeket a feltételeket (például zaklat másokat vagy
          visszaél a szolgáltatással), a fiókját felfüggeszthetjük vagy megszüntethetjük.
        </p>
      </Section>

      <Section n={11} title="A feltételek módosítása">
        <p>
          Ha ezek a feltételek lényegesen megváltoznak, az appban jelezzük, mielőtt hatályba lépnek.
          Ha nem értesz egyet a változással, a fiókodat megszüntetheted.
        </p>
      </Section>

      <Section n={12} title="Irányadó jog">
        <p>
          A feltételekre a magyar jog az irányadó. Ha fogyasztóként használod a GymCrew-t, a lakóhelyed
          szerinti kötelező fogyasztóvédelmi szabályok is megilletnek. Vitás kérdésben először írj
          nekünk, igyekszünk megegyezni.
        </p>
      </Section>
    </LegalPage>
  );
}
