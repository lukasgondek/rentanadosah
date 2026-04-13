import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Lock, CheckCircle2, XCircle } from "lucide-react";

interface StrategyProspectLPProps {
  section?: "strategy" | "planning";
}

export default function StrategyProspectLP({ section = "strategy" }: StrategyProspectLPProps) {
  const badgeText = section === "planning"
    ? "Plánování investic je dostupné pro klienty Akcelerátoru"
    : "Strategie je dostupná pro klienty Akcelerátoru";

  return (
    <div className="space-y-8">
      {/* Badge */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-800">
          <Lock className="h-4 w-4" />
          <span className="text-sm font-medium">{badgeText}</span>
        </div>
      </div>

      {/* Webinar LP Content */}
      <div className="max-w-3xl mx-auto space-y-10 pb-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider">
            Webinar — Realitni Rentier
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-tight">
            Jak se i OSVČ a zaměstnanci s průměrným příjmem do 5 let osvobozují od závislosti na práci
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Zjistěte, jak funguje strategie „hypotečního perpetuum mobile" — a proč je klíčem k finanční svobodě přes nemovitosti.
          </p>
        </div>

        {/* Pro tebe / Není pro tebe */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-green-200 bg-green-50/50 p-6 space-y-3">
            <h3 className="font-semibold text-green-800">Pro tebe, když:</h3>
            <ul className="space-y-2">
              {[
                "Chceš budovat pasivní příjem z nemovitostí",
                "Jsi zaměstnanec nebo OSVČ s průměrným příjmem",
                "Chceš pochopit matematiku investic",
                "Hledáš systém, ne jednorázový tip",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-6 space-y-3">
            <h3 className="font-semibold text-red-800">Není pro tebe, když:</h3>
            <ul className="space-y-2">
              {[
                "Hledáš rychlé zbohatnutí přes noc",
                "Nechceš se vzdělávat a pracovat na sobě",
                "Nemáš trpělivost na 3–5letý plán",
                "Myslíš, že investice jsou jen pro bohaté",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Co se dozvíte */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-center">Co se na webináři dozvíte</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { emoji: "🔍", text: "3 chyby, které investory stojí desítky milionů — a jak se jim vyhnout" },
              { emoji: "🏗️", text: "Jak strukturovat hypotéky tak, aby vám banka říkala ANO znovu a znovu" },
              { emoji: "🏦", text: "Kód důvěryhodnosti — co přesně banka hodnotí a jak na tom zapracovat" },
              { emoji: "💰", text: "Jak z nemovitostí vytáhnout maximum zisku při minimálním riziku" },
            ].map((item) => (
              <div key={item.text} className="flex gap-3 p-4 rounded-lg border bg-card">
                <span className="text-2xl flex-shrink-0">{item.emoji}</span>
                <p className="text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4 py-4">
          <p className="text-lg font-medium">
            Podívejte se, co vám přinese spolupráce se mnou
          </p>
          <p className="text-muted-foreground">
            Na webináři vám ukážu konkrétní čísla, strategii a cestu, jak na to.
          </p>
          <Button size="lg" asChild className="text-base px-8">
            <a href="https://realitnirentier.cz/webinar" target="_blank" rel="noopener noreferrer">
              Chci realitní rentu
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
