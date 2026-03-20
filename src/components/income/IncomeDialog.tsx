import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { grossToNet, formatCurrency } from "@/lib/utils";

type IncomeCategory = "employment" | "self_employed_s7" | "rental_s9" | "business" | "other";
type OwnerType = "self" | "partner";
type ExpenseType = "flat_rate" | "real" | "pausalni_dan";
type OtherFrequency = "monthly" | "yearly";

interface IncomeFormData {
  category: IncomeCategory;
  ownerType: OwnerType;
  name: string;
  // Employment
  grossSalary?: number;
  netSalary?: number;
  // Self-employed § 7 & Rental § 9
  incomeAmount?: number;
  expenseType?: ExpenseType;
  expensePercentage?: number;
  realExpenses?: number;
  // Business
  businessIncome?: number;
  businessExpenses?: number;
  // Other
  otherAmount?: number;
  otherFrequency?: OtherFrequency;
}

/** Safely parse a numeric input value — returns undefined for empty/NaN */
const parseNum = (val: string): number | undefined => {
  if (!val || val.trim() === "") return undefined;
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
};

export interface IncomeEditData {
  id: string;
  category: string;
  owner_type: string;
  name: string;
  gross_salary?: number | null;
  net_salary?: number | null;
  income_amount?: number | null;
  expense_type?: string | null;
  expense_percentage?: number | null;
  real_expenses?: number | null;
  business_income?: number | null;
  business_expenses?: number | null;
  other_amount?: number | null;
  other_frequency?: string | null;
}

const editDataToFormData = (data: IncomeEditData): IncomeFormData => ({
  category: data.category as IncomeCategory,
  ownerType: data.owner_type as OwnerType,
  name: data.name || "",
  grossSalary: data.gross_salary ?? undefined,
  netSalary: data.net_salary ?? undefined,
  incomeAmount: data.income_amount ?? undefined,
  expenseType: (data.expense_type as ExpenseType) || "flat_rate",
  expensePercentage: data.expense_percentage ?? undefined,
  realExpenses: data.real_expenses ?? undefined,
  businessIncome: data.business_income ?? undefined,
  businessExpenses: data.business_expenses ?? undefined,
  otherAmount: data.other_amount ?? undefined,
  otherFrequency: (data.other_frequency as OtherFrequency) || "monthly",
});

const defaultFormData: IncomeFormData = {
  category: "employment",
  ownerType: "self",
  name: "",
  expenseType: "flat_rate",
  otherFrequency: "monthly",
};

export const IncomeDialog = ({ onSuccess, userId, editData, open: controlledOpen, onOpenChange }: {
  onSuccess: () => void;
  userId?: string;
  editData?: IncomeEditData;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const isEdit = !!editData;
  const { toast } = useToast();
  const [formData, setFormData] = useState<IncomeFormData>(
    editData ? editDataToFormData(editData) : defaultFormData
  );

  useEffect(() => {
    if (open && editData) {
      setFormData(editDataToFormData(editData));
    } else if (open && !editData) {
      setFormData(defaultFormData);
    }
  }, [open, editData]);

  // Paušální daň — 3 pásma (2024/2025)
  const PAUSALNI_PASMA = [
    { id: 1, maxPrijem: 1_000_000, mesicniPlatba: 7_498 },
    { id: 2, maxPrijem: 1_500_000, mesicniPlatba: 16_000 },
    { id: 3, maxPrijem: 2_000_000, mesicniPlatba: 26_000 },
  ];

  const getPausalnePasmo = (rocniPrijem: number) => {
    for (const pasmo of PAUSALNI_PASMA) {
      if (rocniPrijem <= pasmo.maxPrijem) return pasmo;
    }
    return null; // nad 2M — nelze použít
  };

  // Blízkost hranice pásma (pro UX warning)
  const getPasmoWarning = (rocniPrijem: number): string | null => {
    const thresholds = [1_000_000, 1_500_000, 2_000_000];
    for (const t of thresholds) {
      if (rocniPrijem > t * 0.98 && rocniPrijem <= t) {
        return `Jste blízko hranice ${formatCurrency(t)} — při překročení skočíte do vyššího pásma.`;
      }
      if (rocniPrijem > t && rocniPrijem <= t * 1.02) {
        const nizsiPasmo = PAUSALNI_PASMA.find(p => p.maxPrijem === t);
        const vyssiPasmo = PAUSALNI_PASMA.find(p => p.maxPrijem > t);
        if (nizsiPasmo && vyssiPasmo) {
          const rozdil = (vyssiPasmo.mesicniPlatba - nizsiPasmo.mesicniPlatba) * 12;
          return `Těsně nad hranicí ${formatCurrency(t)} — platíte o ${formatCurrency(rozdil)}/rok více. Zvažte optimalizaci příjmů.`;
        }
      }
    }
    return null;
  };

  const calculateTaxBase = () => {
    if (formData.category === "self_employed_s7" || formData.category === "rental_s9") {
      if (formData.expenseType === "pausalni_dan" && formData.incomeAmount) {
        const pasmo = getPausalnePasmo(formData.incomeAmount);
        if (!pasmo) return null; // nad 2M — nelze
        return formData.incomeAmount - pasmo.mesicniPlatba * 12;
      } else if (formData.expenseType === "flat_rate" && formData.incomeAmount && formData.expensePercentage) {
        return formData.incomeAmount * (1 - formData.expensePercentage / 100);
      } else if (formData.expenseType === "real" && formData.incomeAmount && formData.realExpenses) {
        return formData.incomeAmount - formData.realExpenses;
      }
    } else if (formData.category === "business" && formData.businessIncome && formData.businessExpenses) {
      return formData.businessIncome - formData.businessExpenses;
    }
    return null;
  };

  const mapCategoryToType = (category: IncomeCategory) => {
    switch (category) {
      case "employment":
        return "salary";
      case "self_employed_s7":
        return "self_employed";
      case "rental_s9":
        return "rental";
      case "business":
        return "business";
      default:
        return "other";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields based on category
    const showError = (msg: string) => {
      toast({ title: "Chyba validace", description: msg, variant: "destructive" });
    };

    if (formData.category === "employment") {
      if (!formData.grossSalary && !formData.netSalary) {
        showError("Vyplňte alespoň hrubou nebo čistou mzdu");
        return;
      }
    } else if (formData.category === "self_employed_s7" || formData.category === "rental_s9") {
      if (!formData.incomeAmount || formData.incomeAmount <= 0) {
        showError("Vyplňte roční příjmy");
        return;
      }
      if (formData.expenseType === "flat_rate" && (formData.expensePercentage === undefined || formData.expensePercentage < 0)) {
        showError("Vyplňte procento paušálních výdajů");
        return;
      }
      if (formData.expenseType === "real" && (!formData.realExpenses || formData.realExpenses < 0)) {
        showError("Vyplňte reálné výdaje");
        return;
      }
      if (formData.expenseType === "pausalni_dan" && formData.incomeAmount && formData.incomeAmount > 2_000_000) {
        showError("Paušální daň nelze použít při příjmech nad 2 000 000 Kč");
        return;
      }
    } else if (formData.category === "business") {
      if (!formData.businessIncome || formData.businessIncome <= 0) {
        showError("Vyplňte firemní příjmy");
        return;
      }
      if (formData.businessExpenses === undefined || formData.businessExpenses < 0) {
        showError("Vyplňte firemní výdaje");
        return;
      }
    } else if (formData.category === "other") {
      if (!formData.otherAmount || formData.otherAmount <= 0) {
        showError("Vyplňte částku příjmu");
        return;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Chyba", description: "Musíte být přihlášeni", variant: "destructive" });
      return;
    }

    const taxBase = calculateTaxBase();

    // Calculate monthly/yearly amounts safely
    let monthlyAmount: number | null = null;
    let yearlyAmount: number | null = null;

    if (formData.category === "employment" && formData.netSalary) {
      monthlyAmount = formData.netSalary;
      yearlyAmount = formData.netSalary * 12;
    } else if (formData.category === "other" && formData.otherAmount) {
      if (formData.otherFrequency === "yearly") {
        monthlyAmount = formData.otherAmount / 12;
        yearlyAmount = formData.otherAmount;
      } else {
        monthlyAmount = formData.otherAmount;
        yearlyAmount = formData.otherAmount * 12;
      }
    } else if ((formData.category === "self_employed_s7" || formData.category === "rental_s9") && taxBase) {
      monthlyAmount = taxBase / 12;
      yearlyAmount = taxBase;
    } else if (formData.category === "business" && taxBase) {
      monthlyAmount = taxBase / 12;
      yearlyAmount = taxBase;
    }

    const payload = {
      category: formData.category,
      owner_type: formData.ownerType,
      name: (formData.name?.trim() || "Bez názvu"),
      type: mapCategoryToType(formData.category),
      gross_salary: formData.grossSalary || null,
      net_salary: formData.netSalary || null,
      income_amount: formData.incomeAmount || null,
      expense_type: formData.expenseType,
      expense_percentage: formData.expenseType === "flat_rate" ? (formData.expensePercentage ?? null) : null,
      real_expenses: formData.expenseType === "real" ? (formData.realExpenses || null) : null,
      tax_base: taxBase,
      business_income: formData.businessIncome || null,
      business_expenses: formData.businessExpenses ?? null,
      business_tax_base: formData.category === "business" ? taxBase : null,
      other_amount: formData.otherAmount || null,
      other_frequency: formData.otherFrequency,
      monthly_amount: monthlyAmount,
      yearly_amount: yearlyAmount,
    };

    let error;
    if (isEdit && editData) {
      ({ error } = await supabase.from("income_sources").update(payload).eq("id", editData.id));
    } else {
      ({ error } = await supabase.from("income_sources").insert({ ...payload, user_id: userId || user.id }));
    }

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Úspěch", description: isEdit ? "Příjem byl upraven" : "Příjem byl přidán" });
    setOpen(false);
    setFormData(defaultFormData);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Přidat příjem
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Upravit příjem" : "Přidat nový příjem"}</DialogTitle>
          <DialogDescription>{isEdit ? "Upravte údaje o příjmu" : "Vyplňte údaje o příjmu"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategorie příjmu</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as IncomeCategory })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employment">Zaměstnání</SelectItem>
                  <SelectItem value="self_employed_s7">OSVČ § 7</SelectItem>
                  <SelectItem value="rental_s9">Příjmy z pronájmu § 9</SelectItem>
                  <SelectItem value="business">Firemní příjmy</SelectItem>
                  <SelectItem value="other">Jiné příjmy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pro koho</Label>
              <Select value={formData.ownerType} onValueChange={(v) => setFormData({ ...formData, ownerType: v as OwnerType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Já</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Název (nepovinné)</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Např. Hlavní zaměstnání"
            />
          </div>

          {formData.category === "employment" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hrubá mzda (Kč/měsíc)</Label>
                  <FormattedNumberInput
                    value={formData.grossSalary?.toString() || ""}
                    onValueChange={(v) => {
                      const gross = parseNum(v);
                      const updates: Partial<IncomeFormData> = { grossSalary: gross };
                      if (gross && gross > 0) {
                        updates.netSalary = grossToNet(gross);
                      }
                      setFormData({ ...formData, ...updates });
                    }}
                    placeholder="50.000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Čistá mzda (Kč/měsíc)</Label>
                  <FormattedNumberInput
                    value={formData.netSalary?.toString() || ""}
                    onValueChange={(v) => setFormData({ ...formData, netSalary: parseNum(v) })}
                    placeholder="37.500"
                  />
                </div>
              </div>
              {formData.grossSalary && formData.grossSalary > 0 && (
                <p className="text-xs text-muted-foreground">
                  Orientační výpočet čisté mzdy (bez slev na děti, invalidity apod.). Můžete přepsat ručně.
                </p>
              )}
            </div>
          )}

          {(formData.category === "self_employed_s7" || formData.category === "rental_s9") && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Příjmy (Kč/rok)</Label>
                <FormattedNumberInput
                  value={formData.incomeAmount?.toString() || ""}
                  onValueChange={(v) => setFormData({ ...formData, incomeAmount: parseNum(v) })}
                  placeholder="100.000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Typ výdajů</Label>
                <RadioGroup value={formData.expenseType} onValueChange={(v) => setFormData({ ...formData, expenseType: v as ExpenseType })}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flat_rate" id="flat_rate" />
                    <Label htmlFor="flat_rate">Uplatňuji výdaje paušálem</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="real" id="real" />
                    <Label htmlFor="real">Vedu daňovou evidenci</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pausalni_dan" id="pausalni_dan" />
                    <Label htmlFor="pausalni_dan">Jsem v režimu paušální daně</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.expenseType === "pausalni_dan" && (() => {
                const prijem = formData.incomeAmount || 0;
                const pasmo = prijem > 0 ? getPausalnePasmo(prijem) : null;
                const warning = prijem > 0 ? getPasmoWarning(prijem) : null;
                const nelze = prijem > 2_000_000;
                const nevyplati = pasmo && prijem > 0 && prijem < pasmo.mesicniPlatba * 12;

                return (
                  <div className="space-y-2">
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">Paušální daň (2024/2025)</p>
                      <table className="w-full text-xs mt-2">
                        <thead>
                          <tr className="border-b border-blue-200 dark:border-blue-800">
                            <th className="text-left py-1">Pásmo</th>
                            <th className="text-right py-1">Max. příjem</th>
                            <th className="text-right py-1">Měsíčně</th>
                            <th className="text-right py-1">Ročně</th>
                          </tr>
                        </thead>
                        <tbody>
                          {PAUSALNI_PASMA.map(p => (
                            <tr key={p.id} className={pasmo?.id === p.id ? "font-bold" : "opacity-70"}>
                              <td className="py-1">{p.id}. pásmo {pasmo?.id === p.id && "←"}</td>
                              <td className="text-right">{formatCurrency(p.maxPrijem)}</td>
                              <td className="text-right">{formatCurrency(p.mesicniPlatba)}</td>
                              <td className="text-right">{formatCurrency(p.mesicniPlatba * 12)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="mt-2 text-xs">Podmínky: neplátce DPH, bez zaměstnání, příjmy do 2 mil. Kč.</p>
                    </div>

                    {nelze && (
                      <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">
                        Příjem přesahuje 2 000 000 Kč — paušální daň nelze použít.
                      </div>
                    )}

                    {nevyplati && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-300">
                        Příjem je nižší než roční odvod — paušální daň se nemusí vyplatit.
                      </div>
                    )}

                    {warning && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-300">
                        {warning}
                      </div>
                    )}

                    {pasmo && prijem > 0 && !nelze && (
                      <div className="text-sm space-y-1">
                        <p><span className="text-muted-foreground">Pásmo:</span> <span className="font-medium">{pasmo.id}. pásmo</span></p>
                        <p><span className="text-muted-foreground">Měsíční odvod:</span> <span className="font-medium">{formatCurrency(pasmo.mesicniPlatba)}</span></p>
                        <p><span className="text-muted-foreground">Roční odvod:</span> <span className="font-medium">{formatCurrency(pasmo.mesicniPlatba * 12)}</span></p>
                        <p><span className="text-muted-foreground">Čistý příjem:</span> <span className="font-medium">{formatCurrency(prijem - pasmo.mesicniPlatba * 12)} / rok</span></p>
                        <p><span className="text-muted-foreground">Efektivní sazba:</span> <span className="font-medium">{((pasmo.mesicniPlatba * 12 / prijem) * 100).toFixed(1)} %</span></p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {formData.expenseType === "flat_rate" && (
                <div className="space-y-2">
                  <Label>Výdaje (%)</Label>
                  <Input
                    type="number"
                    value={formData.expensePercentage || ""}
                    onChange={(e) => setFormData({ ...formData, expensePercentage: parseNum(e.target.value) })}
                    placeholder="60"
                    max="100"
                    required
                  />
                  {formData.incomeAmount && formData.expensePercentage && (
                    <p className="text-sm text-muted-foreground">
                      Daňový základ: {formatCurrency(formData.incomeAmount * (1 - formData.expensePercentage / 100))}
                    </p>
                  )}
                </div>
              )}

              {formData.expenseType === "real" && (
                <div className="space-y-2">
                  <Label>Reálné výdaje (Kč/rok)</Label>
                  <FormattedNumberInput
                    value={formData.realExpenses?.toString() || ""}
                    onValueChange={(v) => setFormData({ ...formData, realExpenses: parseNum(v) })}
                    placeholder="36.000"
                    required
                  />
                  {formData.incomeAmount && formData.realExpenses && (
                    <p className="text-sm text-muted-foreground">
                      Daňový základ: {formatCurrency(formData.incomeAmount - formData.realExpenses)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {formData.category === "business" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Příjmy (Kč/rok)</Label>
                <FormattedNumberInput
                  value={formData.businessIncome?.toString() || ""}
                  onValueChange={(v) => setFormData({ ...formData, businessIncome: parseNum(v) })}
                  placeholder="500.000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Výdaje (Kč/rok)</Label>
                <FormattedNumberInput
                  value={formData.businessExpenses?.toString() || ""}
                  onValueChange={(v) => setFormData({ ...formData, businessExpenses: parseNum(v) })}
                  placeholder="300.000"
                  required
                />
              </div>
              {formData.businessIncome && formData.businessExpenses && (
                <p className="text-sm text-muted-foreground">
                  Daňový základ: {formatCurrency(formData.businessIncome - formData.businessExpenses)}
                </p>
              )}
            </div>
          )}

          {formData.category === "other" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Výše příjmu (Kč)</Label>
                <FormattedNumberInput
                  value={formData.otherAmount?.toString() || ""}
                  onValueChange={(v) => setFormData({ ...formData, otherAmount: parseNum(v) })}
                  placeholder="10.000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Frekvence</Label>
                <RadioGroup value={formData.otherFrequency} onValueChange={(v) => setFormData({ ...formData, otherFrequency: v as OtherFrequency })}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="monthly" id="monthly" />
                    <Label htmlFor="monthly">Měsíční</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yearly" id="yearly" />
                    <Label htmlFor="yearly">Roční</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit">
              Přidat
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
