import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, CheckCircle2, ExternalLink } from "lucide-react";
import FunnelPageShell from "@/components/strategy/FunnelPageShell";
import { FUNNEL } from "@/lib/funnelConfig";
import { funnelEvents } from "@/lib/tracking";

/**
 * Stránka pro ARR-kvalifikované uživatele: rezervace strategického callu zdarma.
 * Google Calendar embed + fallback přímý odkaz (kdyby iframe blokoval X-Frame-Options).
 */
export default function Rezervace() {
  useEffect(() => {
    funnelEvents.ctaClicked("rezervace_view");
  }, []);

  // Google appointment short-link → embed varianta (gv=true). Když iframe nepustí,
  // funguje tlačítko níže.
  const embedUrl = `${FUNNEL.calendarUrl}`;

  return (
    <FunnelPageShell>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-800">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">Vaše situace odpovídá Akcelerátoru</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Rezervujte si strategický call — zdarma
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Na 90 minut se podíváme na vaše čísla a sestavíme konkrétní plán, jak se přes
            nemovitosti dostat k pasivnímu příjmu. Vyberte si termín, který vám sedí.
          </p>
        </div>

        {/* Calendar embed */}
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <iframe
            src={embedUrl}
            title="Rezervace termínu"
            className="w-full"
            style={{ height: 640, border: 0 }}
          />
        </div>

        {/* Fallback link */}
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Nenačítá se kalendář? Otevřete rezervaci v novém okně:
          </p>
          <Button asChild variant="outline">
            <a
              href={FUNNEL.calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => funnelEvents.arrCallBooked()}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Otevřít rezervaci termínu
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </FunnelPageShell>
  );
}
