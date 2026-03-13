import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

/** Safely parse a numeric input value — returns undefined for empty/NaN */
const parseNum = (val: string): number | undefined => {
  if (!val || val.trim() === "") return undefined;
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
};

interface PropertyUnit {
  id?: string;
  name: string;
  monthly_rent: string;
  monthly_expenses: string;
  is_cadastrally_separated: boolean;
  estimated_value: string;
}

const emptyUnit = (index: number): PropertyUnit => ({
  name: `Byt ${index}`,
  monthly_rent: "",
  monthly_expenses: "",
  is_cadastrally_separated: false,
  estimated_value: "",
});

interface PropertyDialogProps {
  onSuccess: () => void;
  editData?: any;
}

export const PropertyDialog = ({ onSuccess, editData }: PropertyDialogProps) => {
  const [open, setOpen] = useState(!!editData);
  const { toast } = useToast();
  const [loans, setLoans] = useState<any[]>([]);
  const [propertyType, setPropertyType] = useState<"single" | "multi">(
    editData?.property_type === "multi" ? "multi" : "single"
  );
  const [units, setUnits] = useState<PropertyUnit[]>([emptyUnit(1)]);

  const [formData, setFormData] = useState({
    identifier: editData?.identifier || "",
    purchase_price: editData?.purchase_price?.toString() || "",
    estimated_value: editData?.estimated_value?.toString() || "",
    monthly_rent: editData?.monthly_rent?.toString() || "",
    monthly_expenses: editData?.monthly_expenses?.toString() || "",
    yearly_appreciation_percent: editData?.yearly_appreciation_percent?.toString() || "",
    loan_id: editData?.loan_id || "",
  });

  // Fetch loans + existing units if editing
  useEffect(() => {
    const fetchData = async () => {
      const { data: loansData } = await supabase
        .from("loans")
        .select("id, name, original_amount")
        .order("created_at", { ascending: false });
      setLoans(loansData || []);

      // Load existing units for multi-unit property
      if (editData?.id && editData?.property_type === "multi") {
        const { data: unitsData } = await supabase
          .from("property_units")
          .select("*")
          .eq("property_id", editData.id)
          .order("created_at", { ascending: true });
        if (unitsData && unitsData.length > 0) {
          setUnits(
            unitsData.map((u: any) => ({
              id: u.id,
              name: u.name,
              monthly_rent: u.monthly_rent?.toString() || "",
              monthly_expenses: u.monthly_expenses?.toString() || "",
              is_cadastrally_separated: u.is_cadastrally_separated || false,
              estimated_value: u.estimated_value?.toString() || "",
            }))
          );
        }
      }
    };
    fetchData();
  }, [editData]);

  // Calculate totals for multi-unit
  const totalRent = units.reduce((sum, u) => sum + (parseNum(u.monthly_rent) || 0), 0);
  const totalExpenses = units.reduce((sum, u) => sum + (parseNum(u.monthly_expenses) || 0), 0);

  const addUnit = () => {
    setUnits([...units, emptyUnit(units.length + 1)]);
  };

  const removeUnit = (index: number) => {
    if (units.length <= 1) return;
    setUnits(units.filter((_, i) => i !== index));
  };

  const updateUnit = (index: number, field: keyof PropertyUnit, value: any) => {
    const newUnits = [...units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setUnits(newUnits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const showError = (msg: string) => {
      toast({ title: "Chyba validace", description: msg, variant: "destructive" });
    };

    if (!formData.identifier.trim()) { showError("Vyplňte identifikátor nemovitosti"); return; }
    const purchasePrice = parseNum(formData.purchase_price);
    const estimatedValue = parseNum(formData.estimated_value);
    if (!purchasePrice || purchasePrice <= 0) { showError("Vyplňte kupní cenu"); return; }
    if (!estimatedValue || estimatedValue <= 0) { showError("Vyplňte odhadní hodnotu"); return; }

    if (propertyType === "multi" && units.length === 0) {
      showError("Přidejte alespoň jednu jednotku");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Chyba", description: "Musíte být přihlášeni", variant: "destructive" });
      return;
    }

    const dataToSave = {
      user_id: user.id,
      identifier: formData.identifier.trim(),
      purchase_price: purchasePrice,
      estimated_value: estimatedValue,
      monthly_rent: propertyType === "multi" ? totalRent : (parseNum(formData.monthly_rent) ?? null),
      monthly_expenses: propertyType === "multi" ? totalExpenses : (parseNum(formData.monthly_expenses) ?? null),
      yearly_appreciation_percent: parseNum(formData.yearly_appreciation_percent) ?? null,
      is_forecast: false,
      loan_id: formData.loan_id || null,
      property_type: propertyType,
    };

    let propertyId = editData?.id;
    let error;

    if (editData) {
      ({ error } = await supabase.from("properties").update(dataToSave).eq("id", editData.id));
    } else {
      const { data: newProp, error: insertError } = await supabase
        .from("properties")
        .insert(dataToSave)
        .select("id")
        .single();
      error = insertError;
      propertyId = newProp?.id;
    }

    if (error) {
      toast({
        title: "Chyba",
        description: editData ? "Nepodařilo se upravit nemovitost" : "Nepodařilo se přidat nemovitost",
        variant: "destructive",
      });
      return;
    }

    // Save units for multi-unit properties
    if (propertyType === "multi" && propertyId) {
      // Delete existing units (simpler than diffing)
      if (editData) {
        await supabase.from("property_units").delete().eq("property_id", propertyId);
      }

      const unitsToInsert = units.map((u) => ({
        property_id: propertyId!,
        name: u.name || "Jednotka",
        monthly_rent: parseNum(u.monthly_rent) || 0,
        monthly_expenses: parseNum(u.monthly_expenses) || 0,
        is_cadastrally_separated: u.is_cadastrally_separated,
        estimated_value: u.is_cadastrally_separated ? (parseNum(u.estimated_value) ?? null) : null,
      }));

      const { error: unitsError } = await supabase.from("property_units").insert(unitsToInsert);
      if (unitsError) {
        toast({ title: "Varování", description: "Nemovitost uložena, ale jednotky se nepodařilo uložit." });
      }
    }

    toast({
      title: "Úspěch",
      description: editData ? "Nemovitost byla upravena" : "Nemovitost byla přidána",
    });

    // Reset
    setFormData({
      identifier: "", purchase_price: "", estimated_value: "",
      monthly_rent: "", monthly_expenses: "", yearly_appreciation_percent: "", loan_id: "",
    });
    setUnits([emptyUnit(1)]);
    setPropertyType("single");
    setOpen(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!editData && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Přidat nemovitost
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Upravit nemovitost" : "Přidat nemovitost"}</DialogTitle>
          <DialogDescription>Vyplňte informace o vaší nemovitosti</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property type toggle */}
          <Tabs
            value={propertyType}
            onValueChange={(v) => setPropertyType(v as "single" | "multi")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">Samostatná jednotka</TabsTrigger>
              <TabsTrigger value="multi">Více jednotek (činžák)</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label>Identifikátor nemovitosti</Label>
            <Input
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              placeholder={propertyType === "multi" ? "Např. Činžovní dům, Praha 5" : "Např. Praha 2, Vinohrady, ul. Slezská"}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kupní cena (Kč)</Label>
              <FormattedNumberInput
                value={formData.purchase_price}
                onValueChange={(v) => setFormData({ ...formData, purchase_price: v })}
                placeholder="5.000.000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Odhadní hodnota (Kč)</Label>
              <FormattedNumberInput
                value={formData.estimated_value}
                onValueChange={(v) => setFormData({ ...formData, estimated_value: v })}
                placeholder="5.500.000"
                required
              />
            </div>
          </div>

          {/* Single unit: rent & expenses on property level */}
          {propertyType === "single" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Měsíční nájem (Kč)</Label>
                <FormattedNumberInput
                  value={formData.monthly_rent}
                  onValueChange={(v) => setFormData({ ...formData, monthly_rent: v })}
                  placeholder="25.000"
                />
              </div>
              <div className="space-y-2">
                <Label>Měsíční výdaje (Kč)</Label>
                <FormattedNumberInput
                  value={formData.monthly_expenses}
                  onValueChange={(v) => setFormData({ ...formData, monthly_expenses: v })}
                  placeholder="5.000"
                />
              </div>
            </div>
          )}

          {/* Multi unit: sub-units section */}
          {propertyType === "multi" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Jednotky</Label>
                <Button type="button" variant="outline" size="sm" onClick={addUnit}>
                  <Plus className="mr-1 h-3 w-3" />
                  Přidat jednotku
                </Button>
              </div>

              <div className="space-y-3">
                {units.map((unit, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Input
                        value={unit.name}
                        onChange={(e) => updateUnit(idx, "name", e.target.value)}
                        className="max-w-[200px] h-7 text-sm font-medium"
                        placeholder={`Byt ${idx + 1}`}
                      />
                      {units.length > 1 && (
                        <Button
                          type="button" variant="ghost" size="sm"
                          onClick={() => removeUnit(idx)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nájem/měs (Kč)</Label>
                        <FormattedNumberInput
                          value={unit.monthly_rent}
                          onValueChange={(v) => updateUnit(idx, "monthly_rent", v)}
                          placeholder="15.000"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Náklady/měs (Kč)</Label>
                        <FormattedNumberInput
                          value={unit.monthly_expenses}
                          onValueChange={(v) => updateUnit(idx, "monthly_expenses", v)}
                          placeholder="3.000"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`cadastral-${idx}`}
                        checked={unit.is_cadastrally_separated}
                        onCheckedChange={(checked) => updateUnit(idx, "is_cadastrally_separated", !!checked)}
                      />
                      <Label htmlFor={`cadastral-${idx}`} className="text-sm font-normal cursor-pointer">
                        Katastrálně odděleno
                      </Label>
                    </div>

                    {unit.is_cadastrally_separated && (
                      <div className="space-y-1">
                        <Label className="text-xs">Odhadní hodnota jednotky (Kč)</Label>
                        <FormattedNumberInput
                          value={unit.estimated_value}
                          onValueChange={(v) => updateUnit(idx, "estimated_value", v)}
                          placeholder="2.500.000"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="flex gap-4 text-sm text-muted-foreground border-t pt-2">
                <span>Celkem nájem: <strong className="text-foreground">{formatCurrency(totalRent)}</strong>/měs</span>
                <span>Celkem náklady: <strong className="text-foreground">{formatCurrency(totalExpenses)}</strong>/měs</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Roční zhodnocení (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.yearly_appreciation_percent}
              onChange={(e) => setFormData({ ...formData, yearly_appreciation_percent: e.target.value })}
              placeholder="3.0"
            />
          </div>

          {loans.length > 0 && (
            <div className="space-y-2">
              <Label>Propojit s úvěrem <span className="text-muted-foreground font-normal">— nepovinné</span></Label>
              <Select
                value={formData.loan_id}
                onValueChange={(v) => setFormData({ ...formData, loan_id: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Žádný úvěr" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Žádný úvěr</SelectItem>
                  {loans.map((loan) => (
                    <SelectItem key={loan.id} value={loan.id}>
                      {loan.name} ({formatCurrency(loan.original_amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit">
              {editData ? "Uložit změny" : "Přidat nemovitost"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
