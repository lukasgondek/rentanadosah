import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowRight, Loader2, CalendarCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkQualification, type QualificationResult } from "@/lib/qualificationGate";
import { funnelEvents } from "@/lib/tracking";

interface StrategyCTAProps {
  /** "button" = plné CTA pod videem/v tabu; "nav" = kompaktní pulzující pilulka do navigace. */
  variant?: "button" | "nav";
  /** Text tlačítka. */
  label?: string;
  /** Kde v UI tlačítko je — jen pro tracking (děkovačka / strategy / planning / nav). */
  where: string;
  className?: string;
}

const DEFAULT_LABEL = "Domluvit strategickou konzultaci";

export default function StrategyCTA({
  variant = "button",
  label = DEFAULT_LABEL,
  where,
  className,
}: StrategyCTAProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [incomplete, setIncomplete] = useState<string[] | null>(null);

  const handleClick = async () => {
    funnelEvents.ctaClicked(where);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const result: QualificationResult = await checkQualification(user.id);
      funnelEvents.qualificationComplete(
        result.status,
        "reason" in result ? result.reason : undefined,
      );

      switch (result.status) {
        case "incomplete":
          setIncomplete(result.missing);
          break;
        case "arr_qualified":
          navigate("/rezervace");
          break;
        case "consultation_only":
          navigate("/strategicka-konzultace");
          break;
      }
    } catch {
      // Při chybě brány nech uživatele radši na konzultační stránku,
      // ať se funnel nezasekne (konzervativní fallback).
      navigate("/strategicka-konzultace");
    } finally {
      setLoading(false);
    }
  };

  const goToCalculator = () => {
    setIncomplete(null);
    navigate("/?tab=income-expenses");
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={loading}
        size={variant === "nav" ? "sm" : "lg"}
        className={cn(
          "bg-accent text-accent-foreground hover:bg-accent/90 font-semibold",
          "animate-pulse-gold transition-transform hover:scale-[1.03]",
          variant === "button" && "text-base px-8",
          className,
        )}
      >
        {loading ? (
          <Loader2 className={cn("animate-spin", variant === "nav" ? "h-4 w-4" : "mr-2 h-5 w-5")} />
        ) : (
          <CalendarCheck className={variant === "nav" ? "mr-1.5 h-4 w-4" : "mr-2 h-5 w-5"} />
        )}
        <span>{label}</span>
        {variant === "button" && !loading && <ArrowRight className="ml-2 h-5 w-5" />}
      </Button>

      <Dialog open={incomplete !== null} onOpenChange={(o) => !o && setIncomplete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-accent" />
              Ještě nám pár věcí chybí
            </DialogTitle>
            <DialogDescription>
              Abychom vám mohli připravit smysluplnou strategii, potřebujeme v kalkulačce
              vyplnit vaši situaci. Chybí nám:
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 py-2">
            {(incomplete ?? []).map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 inline-block h-4 w-4 flex-shrink-0 rounded border border-accent" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button onClick={goToCalculator} className="w-full sm:w-auto">
              Doplnit v kalkulačce
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
