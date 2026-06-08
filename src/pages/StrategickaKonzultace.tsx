import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import FunnelPageShell from "@/components/strategy/FunnelPageShell";
import { FUNNEL } from "@/lib/funnelConfig";
import { funnelEvents } from "@/lib/tracking";

/**
 * Prodejní stránka strategické konzultace (14 990 Kč) pro uživatele,
 * kteří nesplňují kritéria Akcelerátoru.
 *
 * TEXT je placeholder — CEO ho naplní zvlášť (viz
 * handoffs/SALES-PAGE-strategicka-konzultace-draft-2026-05-27.md).
 * Struktura sekcí drží, stačí přepsat obsah.
 */
export default function StrategickaKonzultace() {
  useEffect(() => {
    funnelEvents.consultationOffered();
  }, []);

  const priceFormatted = new Intl.NumberFormat("cs-CZ").format(FUNNEL.consultationPrice);

  return (
    <FunnelPageShell>
      <div className="max-w-3xl mx-auto space-y-12">
        {/* HERO — placeholder text */}
        <section className="text-center space-y-4">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider">
            Strategická konzultace
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            {/* TODO: nadpis ze sales page draftu */}
            Sestavíme vám osobní plán cesty k realitní rentě
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {/* TODO: podnadpis */}
            90 minut jeden na jednoho nad vašimi konkrétními čísly — odejdete s jasným
            dalším krokem, ne s obecnými radami.
          </p>
        </section>

        {/* CO ZÍSKÁTE — placeholder body */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-center">Co konkrétně získáte</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Analýzu vaší aktuální situace z kalkulačky",
              "Konkrétní plán dalších kroků na míru",
              "Odpovědi na vaše otázky k financování",
              "Jasno, jestli a jak má smysl jít dál",
            ].map((item) => (
              <div key={item} className="flex gap-3 p-4 rounded-lg border bg-card">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CENA + CHECKOUT */}
        <section>
          <Card className="p-8 text-center space-y-6 border-accent/40">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Cena</p>
              <p className="text-4xl font-bold">{priceFormatted} Kč</p>
              <p className="text-sm text-muted-foreground">vč. DPH</p>
            </div>

            {FUNNEL.consultationCheckoutUrl ? (
              <div className="rounded-lg overflow-hidden border">
                <iframe
                  src={FUNNEL.consultationCheckoutUrl}
                  title="Objednávka konzultace"
                  className="w-full"
                  style={{ height: 600, border: 0 }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <Button size="lg" className="text-base px-8" disabled>
                  Objednat konzultaci
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <p className="text-xs text-muted-foreground">
                  {/* Platební brána se připojí, jakmile bude produkt vytvořený */}
                  Platební brána se připravuje.
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              Bezpečná platba kartou
            </div>
          </Card>
        </section>

        {/* GARANCE / FAQ — placeholder */}
        <section className="text-center text-sm text-muted-foreground space-y-2">
          {/* TODO: garance + FAQ ze sales page draftu */}
          <p>Po objednávce vám pošleme odkaz na rezervaci termínu konzultace.</p>
        </section>
      </div>
    </FunnelPageShell>
  );
}
