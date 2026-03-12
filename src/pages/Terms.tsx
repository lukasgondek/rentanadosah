import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="max-w-3xl mx-auto py-8">
        <Link to="/auth">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zpět na přihlášení
          </Button>
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Podmínky používání a ochrana osobních údajů</h1>
            <p className="text-muted-foreground">
              Kalkulačka REALITNÍHO RENTIÉRA® — kalkulacka.realitnirentier.cz
            </p>
            <p className="text-sm text-muted-foreground">
              Platné od 12. 3. 2026
            </p>
          </div>

          {/* 1. Provozovatel */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold border-b pb-2">1. Provozovatel aplikace</h2>
            <div className="space-y-1 text-sm">
              <p><strong>Obchodní název:</strong> Trenér svobody s.r.o.</p>
              <p><strong>IČO:</strong> 142 43 440</p>
              <p><strong>Sídlo:</strong> Velehradská 2340/7, Vinohrady, 130 00 Praha 3</p>
              <p><strong>Kontakt:</strong> podpora@realitnirentier.cz</p>
              <p><strong>Web:</strong> www.realitnirentier.cz</p>
              <p><strong>Odpovědná osoba:</strong> Lukáš Gondek, jednatel</p>
            </div>
          </section>

          {/* 2. Účel aplikace */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold border-b pb-2">2. Účel aplikace</h2>
            <p className="text-sm leading-relaxed">
              Kalkulačka REALITNÍHO RENTIÉRA® je profesionální nástroj pro strategické plánování
              a správu realitního investičního portfolia. Aplikace je přístupná výhradně klientům
              programu Akcelerátor Realitního Rentiéra jako součást poskytovaných služeb.
            </p>
          </section>

          {/* 3. Zpracovávané údaje */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold border-b pb-2">3. Jaké osobní údaje zpracováváme</h2>
            <p className="text-sm leading-relaxed">
              Při registraci a používání aplikace zpracováváme následující údaje:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              <li><strong>Registrační údaje:</strong> jméno, e-mailová adresa, heslo (uloženo v šifrované podobě)</li>
              <li><strong>Údaje o nemovitostech:</strong> informace o investičních nemovitostech, které do aplikace zadáte (adresy, ceny, výnosy, náklady)</li>
              <li><strong>Finanční údaje:</strong> příjmy, výdaje, úvěry a další finanční parametry zadané pro účely kalkulace</li>
              <li><strong>Technické údaje:</strong> IP adresa, typ prohlížeče, čas přístupu (automaticky pro zajištění bezpečnosti)</li>
            </ul>
          </section>

          {/* 4. Účely zpracování */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold border-b pb-2">4. Účely zpracování údajů</h2>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              <li>Poskytování služeb aplikace — výpočty, vizualizace, správa portfolia</li>
              <li>Ověření oprávnění přístupu (whitelist klientů)</li>
              <li>Personalizované konzultace v rámci programu Akcelerátor Realitního Rentiéra</li>
              <li>Zajištění bezpečnosti a prevence zneužití</li>
            </ul>
          </section>

          {/* 5. Kde jsou data uložena */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold border-b pb-2">5. Kde jsou vaše data uložena</h2>
            <p className="text-sm leading-relaxed">
              Vaše data jsou uložena v cloudové databázi <strong>Supabase</strong> (PostgreSQL),
              která běží na infrastruktuře <strong>Amazon Web Services (AWS)</strong> v regionu
              Evropské unie. Supabase je platforma s otevřeným zdrojovým kódem, která splňuje
              přísné bezpečnostní standardy.
            </p>
          </section>

          {/* 6. Zabezpečení */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold border-b pb-2">6. Jak jsou vaše data zabezpečena</h2>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              <li><strong>Šifrování při přenosu:</strong> veškerá komunikace probíhá přes HTTPS (TLS šifrování)</li>
              <li><strong>Šifrování v klidu:</strong> data jsou šifrována pomocí AES-256 na úrovni databáze</li>
              <li><strong>Hesla:</strong> ukládána výhradně v hashované podobě (bcrypt), nikdy v čitelné formě</li>
              <li><strong>Přístupová kontrola:</strong> Row Level Security (RLS) — každý uživatel vidí pouze svá vlastní data</li>
              <li><strong>Ověření přístupu:</strong> registrace je možná pouze pro předschválené e-mailové adresy</li>
            </ul>
          </section>

          {/* 7. Kdo má přístup */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold border-b pb-2">7. Kdo má přístup k vašim datům</h2>
            <p className="text-sm leading-relaxed">
              K vašim datům v aplikaci má přístup:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              <li>
                <strong>Vy</strong> — prostřednictvím svého uživatelského účtu
              </li>
              <li>
                <strong>Lukáš Gondek</strong> (jednatel Trenér svobody s.r.o.) — jako administrátor
                aplikace, a to výhradně za účelem poskytování personalizovaných konzultací
                a podpory v rámci programu Akcelerátor Realitního Rentiéra
              </li>
            </ul>
            <p className="text-sm leading-relaxed font-medium">
              Vaše data nebudou nikdy předána třetím stranám, prodána ani použita
              k jiným účelům, než je uvedeno v těchto podmínkách.
            </p>
          </section>

          {/* 8. Doba uchovávání */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold border-b pb-2">8. Doba uchovávání údajů</h2>
            <p className="text-sm leading-relaxed">
              Vaše údaje uchováváme po dobu trvání vašeho uživatelského účtu a vašeho
              členství v programu. Po ukončení spolupráce budou vaše data na požádání
              smazána, nejpozději do 30 dnů od doručení žádosti.
            </p>
          </section>

          {/* 9. Vaše práva */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold border-b pb-2">9. Vaše práva (dle GDPR)</h2>
            <p className="text-sm leading-relaxed">
              V souladu s Nařízením Evropského parlamentu a Rady (EU) 2016/679 (GDPR) máte právo na:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              <li><strong>Přístup</strong> — získat informace o tom, jaké vaše údaje zpracováváme</li>
              <li><strong>Opravu</strong> — požádat o opravu nepřesných údajů</li>
              <li><strong>Výmaz</strong> — požádat o smazání vašich údajů („právo být zapomenut")</li>
              <li><strong>Omezení zpracování</strong> — požádat o omezení způsobu zpracování</li>
              <li><strong>Přenositelnost</strong> — získat vaše údaje ve strojově čitelném formátu</li>
              <li><strong>Námitku</strong> — vznést námitku proti zpracování</li>
              <li><strong>Stížnost</strong> — podat stížnost u Úřadu pro ochranu osobních údajů (www.uoou.cz)</li>
            </ul>
            <p className="text-sm leading-relaxed">
              Pro uplatnění těchto práv nás kontaktujte na{" "}
              <a href="mailto:podpora@realitnirentier.cz" className="text-primary hover:underline">
                podpora@realitnirentier.cz
              </a>.
            </p>
          </section>

          {/* 10. Cookies */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold border-b pb-2">10. Cookies a lokální úložiště</h2>
            <p className="text-sm leading-relaxed">
              Aplikace používá pouze technicky nezbytné cookies a lokální úložiště prohlížeče
              pro zajištění přihlášení a funkčnosti aplikace. Nepoužíváme žádné reklamní,
              analytické ani sledovací cookies třetích stran.
            </p>
          </section>

          {/* 11. Změny podmínek */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold border-b pb-2">11. Změny podmínek</h2>
            <p className="text-sm leading-relaxed">
              Provozovatel si vyhrazuje právo tyto podmínky aktualizovat. O významných změnách
              budou uživatelé informováni prostřednictvím e-mailu nebo oznámení v aplikaci.
            </p>
          </section>

          {/* 12. Souhlas */}
          <section className="space-y-3">
            <h2 className="text-lg font-semibold border-b pb-2">12. Souhlas</h2>
            <p className="text-sm leading-relaxed">
              Registrací a zaškrtnutím políčka „Souhlasím s podmínkami používání a zpracováním
              osobních údajů" potvrzujete, že jste se s těmito podmínkami seznámili a souhlasíte
              s nimi.
            </p>
          </section>

          <div className="border-t pt-6 text-center">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Trenér svobody s.r.o. Všechna práva vyhrazena.
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/auth">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zpět na přihlášení
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Terms;
