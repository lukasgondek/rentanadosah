import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

type IncomeCategory = "employment" | "self_employed_s7" | "rental_s9" | "business" | "other";
type OwnerType = "self" | "partner";
type ExpenseType = "flat_rate" | "real";
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

const incomeValidationSchema = z.object({
  name: z.string().trim().max(200, "Název je příliš dlouhý").optional(),
  grossSalary: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká").optional(),
  netSalary: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká").optional(),
  incomeAmount: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká").optional(),
  expensePercentage: z.number().min(0, "Procento nemůže být záporné").max(100, "Procento nemůže být vyšší než 100").optional(),
  realExpenses: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká").optional(),
  businessIncome: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká").optional(),
  businessExpenses: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká").optional(),
  otherAmount: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká").optional(),
});

export const IncomeDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState<IncomeFormData>({
    category: "employment",
    ownerType: "self",
    name: "",
    expenseType: "flat_rate",
    otherFrequency: "monthly",
  });

  const calculateTaxBase = () => {
    if (formData.category === "self_employed_s7" || formData.category === "rental_s9") {
      if (formData.expenseType === "flat_rate" && formData.incomeAmount && formData.expensePercentage) {
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
    
    // Validate form data
    try {
      incomeValidationSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ 
          title: "Chyba validace", 
          description: error.errors[0].message, 
          variant: "destructive" 
        });
        return;
      }
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Chyba", description: "Musíte být přihlášeni", variant: "destructive" });
      return;
    }

    const taxBase = calculateTaxBase();
    
    const { error } = await supabase.from("income_sources").insert({
      user_id: user.id,
      category: formData.category,
      owner_type: formData.ownerType,
      name: (formData.name?.trim() || "Bez názvu"),
      type: mapCategoryToType(formData.category),
      gross_salary: formData.grossSalary,
      net_salary: formData.netSalary,
      income_amount: formData.incomeAmount,
      expense_type: formData.expenseType,
      expense_percentage: formData.expensePercentage,
      real_expenses: formData.realExpenses,
      tax_base: taxBase,
      business_income: formData.businessIncome,
      business_expenses: formData.businessExpenses,
      business_tax_base: formData.category === "business" ? taxBase : null,
      other_amount: formData.otherAmount,
      other_frequency: formData.otherFrequency,
      monthly_amount:
        formData.category === "employment" ? formData.netSalary :
        formData.category === "self_employed_s7" ? (formData.incomeAmount || 0) / 12 :
        formData.category === "rental_s9" ? (formData.incomeAmount || 0) / 12 :
        formData.category === "business" ? ((formData.businessIncome || 0) - (formData.businessExpenses || 0)) / 12 :
        // "other"
        formData.otherFrequency === "yearly" && formData.otherAmount ? formData.otherAmount / 12 : formData.otherAmount,
      yearly_amount:
        formData.category === "employment" ? (formData.netSalary || 0) * 12 :
        formData.category === "self_employed_s7" ? (formData.incomeAmount || 0) :
        formData.category === "rental_s9" ? (formData.incomeAmount || 0) :
        formData.category === "business" ? ((formData.businessIncome || 0) - (formData.businessExpenses || 0)) :
        // "other"
        formData.otherFrequency === "monthly" ? (formData.otherAmount || 0) * 12 : formData.otherAmount,
    });

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Úspěch", description: "Příjem byl přidán" });
    setOpen(false);
    setFormData({
      category: "employment",
      ownerType: "self",
      name: "",
      expenseType: "flat_rate",
      otherFrequency: "monthly",
    });
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Přidat příjem
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Přidat nový příjem</DialogTitle>
          <DialogDescription>Vyplňte údaje o příjmu</DialogDescription>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hrubá mzda (Kč/měsíc)</Label>
                <Input
                  type="number"
                  value={formData.grossSalary || ""}
                  onChange={(e) => setFormData({ ...formData, grossSalary: parseFloat(e.target.value) })}
                  placeholder="50000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Čistá mzda (Kč/měsíc)</Label>
                <Input
                  type="number"
                  value={formData.netSalary || ""}
                  onChange={(e) => setFormData({ ...formData, netSalary: parseFloat(e.target.value) })}
                  placeholder="37500"
                  required
                />
              </div>
            </div>
          )}

          {(formData.category === "self_employed_s7" || formData.category === "rental_s9") && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Příjmy (Kč/rok)</Label>
                <Input
                  type="number"
                  value={formData.incomeAmount || ""}
                  onChange={(e) => setFormData({ ...formData, incomeAmount: parseFloat(e.target.value) })}
                  placeholder="100000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Typ výdajů</Label>
                <RadioGroup value={formData.expenseType} onValueChange={(v) => setFormData({ ...formData, expenseType: v as ExpenseType })}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flat_rate" id="flat_rate" />
                    <Label htmlFor="flat_rate">Uplatňuji paušál</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="real" id="real" />
                    <Label htmlFor="real">Vedu daňovou evidenci</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.expenseType === "flat_rate" && (
                <div className="space-y-2">
                  <Label>Výdaje (%)</Label>
                  <Input
                    type="number"
                    value={formData.expensePercentage || ""}
                    onChange={(e) => setFormData({ ...formData, expensePercentage: parseFloat(e.target.value) })}
                    placeholder="60"
                    max="100"
                    required
                  />
                  {formData.incomeAmount && formData.expensePercentage && (
                    <p className="text-sm text-muted-foreground">
                      Daňový základ: {(formData.incomeAmount * (1 - formData.expensePercentage / 100)).toLocaleString("cs-CZ")} Kč
                    </p>
                  )}
                </div>
              )}

              {formData.expenseType === "real" && (
                <div className="space-y-2">
                  <Label>Reálné výdaje (Kč/rok)</Label>
                  <Input
                    type="number"
                    value={formData.realExpenses || ""}
                    onChange={(e) => setFormData({ ...formData, realExpenses: parseFloat(e.target.value) })}
                    placeholder="36000"
                    required
                  />
                  {formData.incomeAmount && formData.realExpenses && (
                    <p className="text-sm text-muted-foreground">
                      Daňový základ: {(formData.incomeAmount - formData.realExpenses).toLocaleString("cs-CZ")} Kč
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
                <Input
                  type="number"
                  value={formData.businessIncome || ""}
                  onChange={(e) => setFormData({ ...formData, businessIncome: parseFloat(e.target.value) })}
                  placeholder="500000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Výdaje (Kč/rok)</Label>
                <Input
                  type="number"
                  value={formData.businessExpenses || ""}
                  onChange={(e) => setFormData({ ...formData, businessExpenses: parseFloat(e.target.value) })}
                  placeholder="300000"
                  required
                />
              </div>
              {formData.businessIncome && formData.businessExpenses && (
                <p className="text-sm text-muted-foreground">
                  Daňový základ: {(formData.businessIncome - formData.businessExpenses).toLocaleString("cs-CZ")} Kč
                </p>
              )}
            </div>
          )}

          {formData.category === "other" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Výše příjmu (Kč)</Label>
                <Input
                  type="number"
                  value={formData.otherAmount || ""}
                  onChange={(e) => setFormData({ ...formData, otherAmount: parseFloat(e.target.value) })}
                  placeholder="10000"
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
