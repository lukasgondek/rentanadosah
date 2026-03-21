import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Target, ListChecks, MessageCircle } from "lucide-react";

export default function StrategyProspectLP() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Hero */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          Vaše osobní investiční nástěnka
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Klienti Akcelerátoru mají přístup k sekci Strategie — zápisy ze setkání,
          osobní akční plán a přímou linku na svého poradce. Vše na jednom místě.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Zápisy ze setkání</h3>
            <p className="text-sm text-muted-foreground">
              Kompletní záznamy z konzultací — co jsme probrali, co doporučujeme, na co si dát pozor.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ListChecks className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Akční kroky</h3>
            <p className="text-sm text-muted-foreground">
              Jasný seznam úkolů — co má udělat klient, co zajistí tým Realitního Rentiéra.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold">Přímé dotazy</h3>
            <p className="text-sm text-muted-foreground">
              Zapište si dotaz kdykoliv — probereme na další konzultaci. Urgentní? Máme SOS linku.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* VSL Video */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-center">
          Jak matematika nemovitostních investic skutečně funguje
        </h3>
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src="https://player.vimeo.com/video/1174315803?h=aa57f8b9d9&autoplay=0&title=0&byline=0&portrait=0&dnt=1"
            className="absolute inset-0 w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="VSL Matematika"
          />
        </div>
      </div>

      {/* CTA */}
      <div className="text-center space-y-4 pb-8">
        <p className="text-lg text-muted-foreground">
          Chcete mít vlastní investiční strategii na míru?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild className="text-base px-8">
            <a href="https://calendar.app.google/z8hCx823SKMcfb6S8" target="_blank" rel="noopener noreferrer">
              <Calendar className="mr-2 h-5 w-5" />
              Rezervovat konzultaci
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild className="text-base px-8">
            <a href="https://realitnirentier.cz/vsl/zaloha" target="_blank" rel="noopener noreferrer">
              Zjistit více
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
