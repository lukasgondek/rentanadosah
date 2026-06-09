import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import FunnelPageShell from "@/components/strategy/FunnelPageShell";
import { FUNNEL } from "@/lib/funnelConfig";
import { funnelEvents } from "@/lib/tracking";

/**
 * Prodejní stránka produktu "Strategie realitního rentiéra" (14 990 Kč)
 * pro uživatele, kteří nesplňují kritéria Akcelerátoru.
 *
 * TEXT je placeholder — CEO ho naplní zvlášť (viz
 * handoffs/SALES-PAGE-strategicka-konzultace-draft-2026-05-27.md).
 * Struktura sekcí drží, stačí přepsat obsah.
 */
export default function StrategickaKonzultace() {
  useEffect(() => {
    funnelEvents.consultationOffered();
  }, []);

  // ThriveCart embed: vlož skript jednou; thrivecart.js si najde div podle id.
  useEffect(() => {
    const id = FUNNEL.thrivecart.embeddableId;
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = FUNNEL.thrivecart.scriptSrc;
    s.id = id;
    document.body.appendChild(s);
  }, []);

  const priceFormatted = new Intl.NumberFormat("cs-CZ").format(FUNNEL.consultationPrice);

  return (
    <FunnelPageShell>
      <div className="max-w-3xl mx-auto space-y-12">
        {/* HERO — placeholder text */}
        <section className="text-center space-y-4">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider">
            {FUNNEL.consultationProductName}
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

        {/* CENA + CHECKOUT (ThriveCart product 37) */}
        <section>
          <Card className="p-8 space-y-6 border-accent/40">
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">
                {FUNNEL.consultationProductName}
              </p>
              <p className="text-4xl font-bold">{priceFormatted} Kč</p>
              <p className="text-sm text-muted-foreground">vč. DPH</p>
            </div>

            {/* ThriveCart embeddable — checkout se vyrenderuje sem */}
            <div
              data-thrivecart-account={FUNNEL.thrivecart.account}
              data-thrivecart-tpl="v2"
              data-thrivecart-product={FUNNEL.thrivecart.product}
              className="thrivecart-embeddable"
              data-thrivecart-embeddable={FUNNEL.thrivecart.embeddableId}
            />

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
