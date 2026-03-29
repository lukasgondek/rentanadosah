import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function StrategyProspectLP() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Hero */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          Zjistěte, jak matematika nemovitostních investic skutečně funguje
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Podívejte se na video, kde vám ukážu konkrétní čísla — kolik potřebujete,
          jaký výnos očekávat a jak postavit portfolio, které vám generuje pasivní příjem.
        </p>
      </div>

      {/* VSL Video */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src="https://player.vimeo.com/video/1174315803?h=aa57f8b9d9&autoplay=0&title=0&byline=0&portrait=0&dnt=1"
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="VSL Matematika"
        />
      </div>

      {/* CTA */}
      <div className="text-center space-y-4 pb-8">
        <p className="text-lg text-muted-foreground">
          Chcete mít vlastní investiční strategii na míru?
        </p>
        <Button size="lg" asChild className="text-base px-8">
          <a href="https://realitnirentier.cz/vsl/zaloha" target="_blank" rel="noopener noreferrer">
            Chci zjistit více
            <ArrowRight className="ml-2 h-5 w-5" />
          </a>
        </Button>
      </div>
    </div>
  );
}
