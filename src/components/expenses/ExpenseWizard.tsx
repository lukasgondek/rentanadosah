import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

type Frequency = "monthly" | "yearly";

/**
 * Typické osobní výdaje českého investora.
 * Placeholder = orientační průměr v MĚSÍČNÍ částce (přepočítá se na roční × 12).
 * Reálná hodnota se ukládá v té frekvenci, jakou má wizard zvolenou.
 */
const PRESET_EXPENSES: { name: string; monthlyPlaceholder: number }[] = [
  { name: "Nájem / hypotéka (bydlení)", monthlyPlaceholder: 15000 },
  { name: "Energie a poplatky (SVJ, voda, plyn, elektřina)", monthlyPlaceholder: 5000 },
  { name: "Potraviny", monthlyPlaceholder: 10000 },
  { name: "Doprava (PHM, MHD, leasing)", monthlyPlaceholder: 5000 },
  { name: "Pojištění (auto, zdraví, životko, domácnost)", monthlyPlaceholder: 3000 },
  { name: "Telefon, internet, předplatná", monthlyPlaceholder: 2000 },
  { name: "Dovolené, koníčky, restaurace", monthlyPlaceholder: 5000 },
  { name: "Děti, vzdělání, sport", monthlyPlaceholder: 4000 },
  { name: "Zdraví, lékaři, lékárna", monthlyPlaceholder: 1500 },
  { name: "Oblečení, drogerie, domácnost", monthlyPlaceholder: 2000 },
];

const UNPLANNED_PLACEHOLDER = 3000;

interface Row {
  name: string;
  value: string; // input as string for FormattedNumberInput
  placeholder: number; // měsíční placeholder
  /** true = z PRESET_EXPENSES, false = ručně přidaný klientem */
  preset: boolean;
}

const buildInitialRows = (): Row[] => [
  ...PRESET_EXPENSES.map((p) => ({ name: p.name, value: "", placeholder: p.monthlyPlaceholder, preset: true })),
  { name: "Průměr neplánovaných výdajů", value: "", placeholder: UNPLANNED_PLACEHOLDER, preset: true },
];

interface ExpenseWizardProps {
  onSuccess: () => void;
  userId?: string;
}

export const ExpenseWizard = ({ onSuccess, userId }: ExpenseWizardProps) => {
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [rows, setRows] = useState<Row[]>(buildInitialRows());
  // Rychlý mód: klient vyplní jen jednu souhrnnou částku místo položek.
  const [summaryOverride, setSummaryOverride] = useState<string>("");
  const { toast } = useToast();

  const toMonthly = (val: number) => (frequency === "yearly" ? val / 12 : val);
  const toYearly = (val: number) => (frequency === "yearly" ? val : val * 12);

  // Součet vyplněných položek (v rámci aktuální frekvence) — slouží jako
  // placeholder do souhrnných polí dole.
  const itemsSumInFreq = useMemo(
    () =>
      rows.reduce((s, r) => {
        const v = parseFloat(r.value);
        return s + (isNaN(v) ? 0 : v);
      }, 0),
    [rows]
  );
  const itemsMonthlySum = frequency === "yearly" ? itemsSumInFreq / 12 : itemsSumInFreq;
  const itemsYearlySum = frequency === "yearly" ? itemsSumInFreq : itemsSumInFreq * 12;

  const overrideNum = summaryOverride ? parseFloat(summaryOverride) : NaN;
  const hasOverride = !isNaN(overrideNum) && overrideNum > 0;
  const summaryMonthly = hasOverride
    ? frequency === "yearly" ? overrideNum / 12 : overrideNum
    : itemsMonthlySum;
  const summaryYearly = hasOverride
    ? frequency === "yearly" ? overrideNum : overrideNum * 12
    : itemsYearlySum;

  const updateRow = (idx: number, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, value } : r)));
    // Kdyz klient zacne vyplňovat položky, override nedává smysl → vyčistíme.
    if (value) setSummaryOverride("");
  };

  const addCustomRow = () => {
    setRows((prev) => [...prev, { name: "", value: "", placeholder: 0, preset: false }]);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const renameRow = (idx: number, name: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, name } : r)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Chyba", description: "Musíte být přihlášeni", variant: "destructive" });
      return;
    }
    const targetUserId = userId || user.id;

    // Sesbírej vyplněné položky
    const filledRows = rows.filter((r) => {
      const v = parseFloat(r.value);
      return !isNaN(v) && v > 0 && r.name.trim();
    });

    if (filledRows.length === 0 && !hasOverride) {
      toast({
        title: "Nic k uložení",
        description: "Vyplň aspoň jednu položku nebo souhrnnou částku.",
        variant: "destructive",
      });
      return;
    }

    // Rychlý mód: jen souhrnná částka → jeden řádek "Souhrn měsíčních výdajů"
    if (hasOverride && filledRows.length === 0) {
      const { error } = await supabase.from("expenses").insert({
        user_id: targetUserId,
        name: frequency === "yearly" ? "Souhrn ročních výdajů" : "Souhrn měsíčních výdajů",
        amount: overrideNum,
        frequency,
        is_recurring: true,
      });
      if (error) {
        toast({ title: "Chyba", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Hotovo", description: "Souhrnný výdaj byl uložen" });
    } else {
      // Detailní mód: zapsat všechny vyplněné řádky najednou
      const records = filledRows.map((r) => ({
        user_id: targetUserId,
        name: r.name.trim(),
        amount: parseFloat(r.value),
        frequency,
        is_recurring: true,
      }));
      const { error } = await supabase.from("expenses").insert(records);
      if (error) {
        toast({ title: "Chyba", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Hotovo", description: `Uloženo ${records.length} výdajů` });
    }

    setRows(buildInitialRows());
    setSummaryOverride("");
    setOpen(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Přidat výdaje
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Výdaje — kompletní setup</DialogTitle>
          <DialogDescription>
            Vyplň co utratíš v jednotlivých kategoriích. Nebo přeskoč seznam
            a dolů napiš jen jednu souhrnnou částku.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle MES / ROK */}
          <div className="space-y-2 rounded-md border p-3 bg-muted/30">
            <Label>V jaké frekvenci zadáváš čísla?</Label>
            <RadioGroup
              value={frequency}
              onValueChange={(v) => setFrequency(v as Frequency)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="wiz-monthly" />
                <Label htmlFor="wiz-monthly">Měsíčně</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yearly" id="wiz-yearly" />
                <Label htmlFor="wiz-yearly">Ročně</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Seznam položek */}
          <div className="space-y-2">
            {rows.map((row, idx) => {
              const placeholderInFreq = frequency === "yearly" ? row.placeholder * 12 : row.placeholder;
              return (
                <div key={idx} className="grid grid-cols-[1fr,140px,40px] gap-2 items-center">
                  {row.preset ? (
                    <span className="text-sm">{row.name}</span>
                  ) : (
                    <Input
                      value={row.name}
                      onChange={(e) => renameRow(idx, e.target.value)}
                      placeholder="Název výdaje"
                      className="h-9 text-sm"
                    />
                  )}
                  <FormattedNumberInput
                    value={row.value}
                    onValueChange={(v) => updateRow(idx, v)}
                    placeholder={row.placeholder ? formatNumberPlain(placeholderInFreq) : "0"}
                    className="h-9 text-sm"
                  />
                  {row.preset ? (
                    <span />
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRow(idx)}
                      className="h-9 w-9 text-destructive hover:text-destructive"
                      title="Smazat řádek"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}

            <Button type="button" variant="outline" size="sm" onClick={addCustomRow} className="mt-2">
              <Plus className="mr-1 h-3.5 w-3.5" />
              Přidat vlastní
            </Button>
          </div>

          {/* Souhrn dole — vždy MES + ROK najednou */}
          <div className="space-y-3 rounded-md border p-3 bg-primary/5 border-primary/20">
            <p className="text-xs text-muted-foreground">
              {hasOverride
                ? "Souhrnná částka přebíjí položky výše (rychlý mód)."
                : "Sečteno z položek nahoře. Můžeš jen přepsat jednu z hodnot — druhá se dopočítá."}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Měsíční výdaje celkem (Kč)</Label>
                <FormattedNumberInput
                  value={
                    hasOverride && frequency === "monthly"
                      ? summaryOverride
                      : summaryMonthly > 0
                        ? Math.round(summaryMonthly).toString()
                        : ""
                  }
                  onValueChange={(v) => {
                    setFrequency("monthly");
                    setSummaryOverride(v);
                  }}
                  placeholder={formatNumberPlain(summaryMonthly || 30000)}
                  className="h-10 font-semibold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Roční výdaje celkem (Kč)</Label>
                <FormattedNumberInput
                  value={
                    hasOverride && frequency === "yearly"
                      ? summaryOverride
                      : summaryYearly > 0
                        ? Math.round(summaryYearly).toString()
                        : ""
                  }
                  onValueChange={(v) => {
                    setFrequency("yearly");
                    setSummaryOverride(v);
                  }}
                  placeholder={formatNumberPlain(summaryYearly || 360000)}
                  className="h-10 font-semibold"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Měsíční = {formatCurrency(summaryMonthly)} · Roční = {formatCurrency(summaryYearly)}
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit">Uložit</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/** Plain "1234567" → "1.234.567" pro placeholdery (bez Kc). */
function formatNumberPlain(n: number): string {
  if (!n || n <= 0) return "";
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
