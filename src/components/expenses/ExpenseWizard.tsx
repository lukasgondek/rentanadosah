import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

type Frequency = "monthly" | "yearly";

/**
 * Typické osobní výdaje českého investora.
 * `placeholder` = orientační průměr v jednotce dané `defaultFreq`.
 * (Dovolená = roční placeholder 50k, nájem = měsíční 15k atd.)
 */
const PRESET_EXPENSES: { name: string; placeholder: number; defaultFreq: Frequency }[] = [
  { name: "Nájem / hypotéka (bydlení)", placeholder: 15000, defaultFreq: "monthly" },
  { name: "Energie a poplatky (SVJ, voda, plyn, elektřina)", placeholder: 5000, defaultFreq: "monthly" },
  { name: "Potraviny", placeholder: 10000, defaultFreq: "monthly" },
  { name: "Doprava (PHM, MHD, leasing)", placeholder: 5000, defaultFreq: "monthly" },
  { name: "Pojištění (auto, zdraví, životko, domácnost)", placeholder: 30000, defaultFreq: "yearly" },
  { name: "Telefon, internet, předplatná", placeholder: 2000, defaultFreq: "monthly" },
  { name: "Dovolené, koníčky, restaurace", placeholder: 60000, defaultFreq: "yearly" },
  { name: "Děti, vzdělání, sport", placeholder: 4000, defaultFreq: "monthly" },
  { name: "Zdraví, lékaři, lékárna", placeholder: 1500, defaultFreq: "monthly" },
  { name: "Oblečení, drogerie, domácnost", placeholder: 2000, defaultFreq: "monthly" },
];

const UNPLANNED_PRESET = { name: "Průměr neplánovaných výdajů", placeholder: 3000, defaultFreq: "monthly" as Frequency };

interface Row {
  name: string;
  value: string; // input as string for FormattedNumberInput
  placeholder: number; // v jednotce 'freq' (per-row)
  freq: Frequency; // měsíčně / ročně PER ŘÁDEK
  /** true = z PRESET_EXPENSES, false = ručně přidaný klientem */
  preset: boolean;
}

const buildInitialRows = (): Row[] => [
  ...PRESET_EXPENSES.map((p) => ({
    name: p.name,
    value: "",
    placeholder: p.placeholder,
    freq: p.defaultFreq,
    preset: true,
  })),
  { name: UNPLANNED_PRESET.name, value: "", placeholder: UNPLANNED_PRESET.placeholder, freq: UNPLANNED_PRESET.defaultFreq, preset: true },
];

interface ExpenseWizardProps {
  onSuccess: () => void;
  userId?: string;
}

export const ExpenseWizard = ({ onSuccess, userId }: ExpenseWizardProps) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(buildInitialRows());
  // Rychlý mód: klient vyplní jen jednu souhrnnou částku místo položek.
  // Frekvence souhrnu: kterou z polí klient naposledy editoval.
  const [summaryOverride, setSummaryOverride] = useState<string>("");
  const [summaryOverrideFreq, setSummaryOverrideFreq] = useState<Frequency>("monthly");
  const { toast } = useToast();

  // Součet vyplněných položek v MĚSÍČNÍ jednotce (každý řádek se přepočítá
  // podle své vlastní frekvence).
  const itemsMonthlySum = useMemo(
    () =>
      rows.reduce((s, r) => {
        const v = parseFloat(r.value);
        if (isNaN(v) || v <= 0) return s;
        return s + (r.freq === "yearly" ? v / 12 : v);
      }, 0),
    [rows]
  );
  const itemsYearlySum = itemsMonthlySum * 12;

  const overrideNum = summaryOverride ? parseFloat(summaryOverride) : NaN;
  const hasOverride = !isNaN(overrideNum) && overrideNum > 0;
  const summaryMonthly = hasOverride
    ? summaryOverrideFreq === "yearly" ? overrideNum / 12 : overrideNum
    : itemsMonthlySum;
  const summaryYearly = hasOverride
    ? summaryOverrideFreq === "yearly" ? overrideNum : overrideNum * 12
    : itemsYearlySum;

  const updateRow = (idx: number, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, value } : r)));
    // Když klient začne vyplňovat položky, override nedává smysl → vyčistíme.
    if (value) setSummaryOverride("");
  };

  const updateRowFreq = (idx: number, freq: Frequency) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, freq } : r)));
  };

  const addCustomRow = () => {
    setRows((prev) => [...prev, { name: "", value: "", placeholder: 0, freq: "monthly", preset: false }]);
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
        name: summaryOverrideFreq === "yearly" ? "Souhrn ročních výdajů" : "Souhrn měsíčních výdajů",
        amount: overrideNum,
        frequency: summaryOverrideFreq,
        is_recurring: true,
      });
      if (error) {
        toast({ title: "Chyba", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Hotovo", description: "Souhrnný výdaj byl uložen" });
    } else {
      // Detailní mód: zapsat všechny vyplněné řádky najednou — KAŽDÝ se svou
      // vlastní frekvencí (dovolená yearly, nájem monthly atd.).
      const records = filledRows.map((r) => ({
        user_id: targetUserId,
        name: r.name.trim(),
        amount: parseFloat(r.value),
        frequency: r.freq,
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
          {/* Seznam položek — každá s vlastním MES/ROK přepínačem */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr,140px,90px,40px] gap-2 items-center pb-1 border-b text-xs text-muted-foreground">
              <span>Položka</span>
              <span className="text-right">Částka (Kč)</span>
              <span>Frekvence</span>
              <span />
            </div>
            {rows.map((row, idx) => (
              <div key={idx} className="grid grid-cols-[1fr,140px,90px,40px] gap-2 items-center">
                {row.preset ? (
                  <span className="text-sm">{row.name}</span>
                ) : (
                  <input
                    value={row.name}
                    onChange={(e) => renameRow(idx, e.target.value)}
                    placeholder="Název výdaje"
                    className="h-9 text-sm border rounded-md px-3 bg-background"
                  />
                )}
                <FormattedNumberInput
                  value={row.value}
                  onValueChange={(v) => updateRow(idx, v)}
                  placeholder={row.placeholder ? formatNumberPlain(row.placeholder) : "0"}
                  className="h-9 text-sm"
                />
                <select
                  value={row.freq}
                  onChange={(e) => updateRowFreq(idx, e.target.value as Frequency)}
                  className="h-9 text-sm border rounded-md px-2 bg-background"
                  title="Frekvence této položky"
                >
                  <option value="monthly">měs.</option>
                  <option value="yearly">ročně</option>
                </select>
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
            ))}

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
                    hasOverride && summaryOverrideFreq === "monthly"
                      ? summaryOverride
                      : summaryMonthly > 0
                        ? Math.round(summaryMonthly).toString()
                        : ""
                  }
                  onValueChange={(v) => {
                    setSummaryOverrideFreq("monthly");
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
                    hasOverride && summaryOverrideFreq === "yearly"
                      ? summaryOverride
                      : summaryYearly > 0
                        ? Math.round(summaryYearly).toString()
                        : ""
                  }
                  onValueChange={(v) => {
                    setSummaryOverrideFreq("yearly");
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
