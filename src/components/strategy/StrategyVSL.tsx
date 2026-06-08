import { useState } from "react";
import { PlayCircle, Film } from "lucide-react";
import StrategyCTA from "./StrategyCTA";
import { funnelEvents } from "@/lib/tracking";

interface StrategyVSLProps {
  /**
   * URL embed videa (YouTube / Vimeo). Když chybí, ukáže se placeholder
   * "video brzy" — funnel funguje i bez videa, CTA je pořád dole.
   */
  videoUrl?: string;
  /** Nadpis nad videem. */
  heading?: string;
  /** Podnadpis pod nadpisem. */
  subheading?: string;
  /** Text CTA tlačítka pod videem. */
  ctaLabel?: string;
  /** Kde komponenta je — pro tracking (dekovacka / strategy / planning). */
  where: string;
}

export default function StrategyVSL({
  videoUrl,
  heading = "Podívejte se, jak vám pomůžu k realitní rentě",
  subheading = "Pár minut, které vám ukážou konkrétní cestu — a co dělat hned teď.",
  ctaLabel,
  where,
}: StrategyVSLProps) {
  const [playing, setPlaying] = useState(false);

  const handlePlay = () => {
    funnelEvents.vslPlay();
    setPlaying(true);
  };

  // Autoplay až po kliknutí (gesto uživatele) → unmute, ať to projde mobil policy.
  const embedSrc = videoUrl
    ? `${videoUrl}${videoUrl.includes("?") ? "&" : "?"}autoplay=1`
    : undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-3">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{heading}</h2>
        <p className="text-muted-foreground">{subheading}</p>
      </div>

      {/* Video / placeholder — 16:9 responsivní */}
      <div className="relative w-full overflow-hidden rounded-xl border bg-muted shadow-sm aspect-video">
        {playing && embedSrc ? (
          <iframe
            src={embedSrc}
            title="VSL video"
            className="absolute inset-0 h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : videoUrl ? (
          <button
            onClick={handlePlay}
            className="group absolute inset-0 flex items-center justify-center bg-primary/5"
            aria-label="Přehrát video"
          >
            <PlayCircle className="h-20 w-20 text-accent transition-transform group-hover:scale-110" />
          </button>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Film className="h-12 w-12 opacity-40" />
            <p className="text-sm font-medium">Video už se finišuje — bude tu brzy.</p>
            <p className="text-xs">Mezitím můžete pokračovat rovnou na konzultaci níže.</p>
          </div>
        )}
      </div>

      {/* CTA pod videem */}
      <div className="flex justify-center pt-2">
        <StrategyCTA where={where} label={ctaLabel} />
      </div>
    </div>
  );
}
