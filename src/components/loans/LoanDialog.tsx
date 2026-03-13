import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculateAnnuity, formatNumber, formatCurrency } from "@/lib/utils";

/** Safely parse a numeric input value — returns undefined for empty/NaN */
const parseNum = (val: string): number | undefined => {
  if (!val || val.trim() === "") return undefined;
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
};

interface CollateralOption {
  id: string;
  label: string;
  estimatedValue: number;
  type: "property" | "unit";
}

interface CollateralEntry {
  sourceId: string; // property_id or unit_id or "" for manual
  sourceType: "property" | "unit" | "manual";
  amount: string;
  label: string; // for display
}

interface LoanDialogProps {
  onSuccess: () => void;
  editData?: any;
}

export const LoanDialog = ({ onSuccess, editData }: LoanDialogProps) => {
  const [open, setOpen] = useState(!!editData);
  const { toast } = useToast();
  const [isPaymentManual, setIsPaymentManual] = useState(!!editData?.monthly_payment);
  const [collateralOptions, setCollateralOptions] = useState<CollateralOption[]>([]);
  const [collaterals, setCollaterals] = useState<CollateralEntry[]>([]);
  const [manualCollateral, setManualCollateral] = useState(editData?.collateral_location || "");

  const [formData, setFormData] = useState({
    name: editData?.name || "",
    original_amount: editData?.original_amount?.toString() || "",
    remaining_principal: editData?.remaining_principal?.toString() || "",
    interest_rate: editData?.interest_rate?.toString() || "",
    term_months: editData ? Math.round(editData.term_months / 12).toString() : "",
    monthly_payment: editData?.monthly_payment?.toString() || "",
    ltv_percent: editData?.ltv_percent?.toString() || "",
    bank_name: editData?.bank_name || "",
  });

  // Fetch collateral options (properties + cadastrally separated units)
  useEffect(() => {
    const fetchCollateralOptions = async () => {
      // Fetch all properties
      const { data: props } = await supabase
        .from("properties")
        .select("id, identifier, estimated_value, property_type")
        .order("created_at", { ascending: false });

      const options: CollateralOption[] = [];

      for (const p of props || []) {
        if (p.property_type === "single" || !p.property_type) {
          // Single unit property — available as collateral
          options.push({
            id: `prop_${p.id}`,
            label: p.identifier,
            estimatedValue: p.estimated_value,
            type: "property",
          });
        }
        // For multi-unit: whole building as collateral option
        options.push({
          id: `prop_${p.id}`,
          label: p.property_type === "multi" ? `${p.identifier} (celá nemovitost)` : p.identifier,
          estimatedValue: p.estimated_value,
          type: "property",
        });
      }

      // Fetch cadastrally separated units
      const { data: units } = await supabase
        .from("property_units")
        .select("id, name, estimated_value, property_id, is_cadastrally_separated")
        .eq("is_cadastrally_separated", true);

      for (const u of units || []) {
        if (u.estimated_value) {
          const parentProp = (props || []).find((p: any) => p.id === u.property_id);
          const parentLabel = parentProp?.identifier || "";
          options.push({
            id: `unit_${u.id}`,
            label: `${parentLabel} → ${u.name}`,
            estimatedValue: u.estimated_value,
            type: "unit",
          });
        }
      }

      // Deduplicate: for single properties, they got added twice (once as single, once as generic)
      // Fix: only add multi-unit properties as "celá nemovitost"
      const deduped = options.filter((opt, idx, arr) => {
        return arr.findIndex((o) => o.id === opt.id && o.label === opt.label) === idx;
      });

      setCollateralOptions(deduped);

      // Load existing collaterals if editing
      if (editData?.id) {
        const { data: existingCollaterals } = await supabase
          .from("loan_collaterals")
          .select("*")
          .eq("loan_id", editData.id);

        if (existingCollaterals && existingCollaterals.length > 0) {
          const loaded: CollateralEntry[] = existingCollaterals.map((c: any) => {
            if (c.property_unit_id) {
              const opt = deduped.find((o) => o.id === `unit_${c.property_unit_id}`);
              return {
                sourceId: `unit_${c.property_unit_id}`,
                sourceType: "unit" as const,
                amount: c.collateral_amount?.toString() || "",
                label: opt?.label || "Jednotka",
              };
            } else if (c.property_id) {
              const opt = deduped.find((o) => o.id === `prop_${c.property_id}`);
              return {
                sourceId: `prop_${c.property_id}`,
                sourceType: "property" as const,
                amount: c.collateral_amount?.toString() || "",
                label: opt?.label || "Nemovitost",
              };
            }
            return {
              sourceId: "",
              sourceType: "manual" as const,
              amount: c.collateral_amount?.toString() || "",
              label: "",
            };
          });
          setCollaterals(loaded);
        } else if (editData?.collateral_location) {
          // Legacy: use collateral_location text
          setManualCollateral(editData.collateral_location);
        }
      }
    };
    fetchCollateralOptions();
  }, [editData]);

  // Auto-calculate monthly payment
  useEffect(() => {
    if (isPaymentManual) return;
    const amount = parseNum(formData.original_amount);
    const rate = parseNum(formData.interest_rate);
    const termYears = parseNum(formData.term_months);
    if (amount && amount > 0 && rate !== undefined && termYears && termYears > 0) {
      const payment = calculateAnnuity(amount, rate, termYears * 12);
      setFormData((prev) => ({ ...prev, monthly_payment: Math.round(payment).toString() }));
    }
  }, [formData.original_amount, formData.interest_rate, formData.term_months, isPaymentManual]);

  const addCollateral = () => {
    setCollaterals([...collaterals, { sourceId: "", sourceType: "manual", amount: "", label: "" }]);
  };

  const removeCollateral = (index: number) => {
    setCollaterals(collaterals.filter((_, i) => i !== index));
  };

  const updateCollateral = (index: number, sourceId: string) => {
    const newCollaterals = [...collaterals];
    if (sourceId === "manual") {
      newCollaterals[index] = { ...newCollaterals[index], sourceId: "", sourceType: "manual", label: "" };
    } else {
      const opt = collateralOptions.find((o) => o.id === sourceId);
      if (opt) {
        newCollaterals[index] = {
          ...newCollaterals[index],
          sourceId,
          sourceType: opt.type,
          label: opt.label,
          amount: newCollaterals[index].amount || opt.estimatedValue.toString(),
        };
      }
    }
    setCollaterals(newCollaterals);
  };

  const updateCollateralAmount = (index: number, amount: string) => {
    const newCollaterals = [...collaterals];
    newCollaterals[index] = { ...newCollaterals[index], amount };
    setCollaterals(newCollaterals);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const showError = (msg: string) => {
      toast({ title: "Chyba validace", description: msg, variant: "destructive" });
    };

    const amount = parseNum(formData.original_amount);
    const remaining = parseNum(formData.remaining_principal);
    const rate = parseNum(formData.interest_rate);
    const termYears = parseNum(formData.term_months);
    const payment = parseNum(formData.monthly_payment);

    if (!amount || amount <= 0) { showError("Vyplňte původní výši úvěru"); return; }
    if (remaining === undefined || remaining < 0) { showError("Vyplňte zbývající dluh"); return; }
    if (rate === undefined || rate < 0) { showError("Vyplňte úrokovou sazbu"); return; }
    if (!termYears || termYears <= 0) { showError("Vyplňte dobu splácení"); return; }
    if (!payment || payment <= 0) { showError("Vyplňte měsíční splátku"); return; }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Chyba", description: "Musíte být přihlášeni", variant: "destructive" });
      return;
    }

    // Build collateral location string for display
    const collateralLabels = collaterals
      .filter((c) => c.sourceId || c.label)
      .map((c) => c.label)
      .join(", ");

    const dataToSave = {
      user_id: user.id,
      name: formData.name?.trim() || "Úvěr",
      original_amount: amount,
      remaining_principal: remaining,
      interest_rate: rate,
      term_months: termYears * 12,
      monthly_payment: payment,
      ltv_percent: parseNum(formData.ltv_percent) ?? null,
      collateral_location: collateralLabels || manualCollateral || null,
      bank_name: formData.bank_name || null,
      is_forecast: false,
    };

    let loanId = editData?.id;
    let error;

    if (editData) {
      ({ error } = await supabase.from("loans").update(dataToSave).eq("id", editData.id));
    } else {
      const { data: newLoan, error: insertError } = await supabase
        .from("loans")
        .insert(dataToSave)
        .select("id")
        .single();
      error = insertError;
      loanId = newLoan?.id;
    }

    if (error) {
      toast({
        title: "Chyba",
        description: editData ? "Nepodařilo se upravit úvěr" : "Nepodařilo se přidat úvěr",
        variant: "destructive",
      });
      return;
    }

    // Save collaterals to junction table
    if (loanId) {
      // Clear old collateral records
      await supabase.from("loan_collaterals").delete().eq("loan_id", loanId);

      // Also clear old property.loan_id links (backwards compat)
      await supabase.from("properties").update({ loan_id: null }).eq("loan_id", loanId);

      // Insert new collateral records
      const collateralRecords = collaterals
        .filter((c) => c.sourceId && (parseNum(c.amount) || 0) > 0)
        .map((c) => {
          const realId = c.sourceId.replace(/^(prop_|unit_)/, "");
          return {
            loan_id: loanId!,
            property_id: c.sourceType === "property" ? realId : null,
            property_unit_id: c.sourceType === "unit" ? realId : null,
            collateral_amount: parseNum(c.amount) || 0,
          };
        });

      if (collateralRecords.length > 0) {
        await supabase.from("loan_collaterals").insert(collateralRecords);
      }

      // Also update property.loan_id for first property collateral (backwards compat)
      const firstPropCollateral = collaterals.find((c) => c.sourceType === "property" && c.sourceId);
      if (firstPropCollateral) {
        const propId = firstPropCollateral.sourceId.replace("prop_", "");
        await supabase.from("properties").update({ loan_id: loanId }).eq("id", propId);
      }
    }

    toast({
      title: "Úspěch",
      description: editData ? "Úvěr byl upraven" : "Úvěr byl přidán",
    });

    setFormData({
      name: "", original_amount: "", remaining_principal: "",
      interest_rate: "", term_months: "", monthly_payment: "",
      ltv_percent: "", bank_name: "",
    });
    setCollaterals([]);
    setManualCollateral("");
    setOpen(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!editData && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Přidat úvěr
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Upravit úvěr" : "Přidat úvěr"}</DialogTitle>
          <DialogDescription>Vyplňte informace o vašem úvěru</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Název</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Např. Hypotéka na byt"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Původní výše úvěru (Kč)</Label>
              <Input type="number" value={formData.original_amount}
                onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })}
                placeholder="3000000" required />
            </div>
            <div className="space-y-2">
              <Label>Zbývající dluh (Kč)</Label>
              <Input type="number" value={formData.remaining_principal}
                onChange={(e) => setFormData({ ...formData, remaining_principal: e.target.value })}
                placeholder="2500000" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Úroková sazba (%)</Label>
              <Input type="number" step="0.01" value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                placeholder="4.5" required />
            </div>
            <div className="space-y-2">
              <Label>Doba splácení (roky)</Label>
              <Input type="number" value={formData.term_months}
                onChange={(e) => setFormData({ ...formData, term_months: e.target.value })}
                placeholder="25" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Měsíční splátka (Kč)</Label>
              <Input type="number" value={formData.monthly_payment}
                onChange={(e) => {
                  setIsPaymentManual(true);
                  setFormData({ ...formData, monthly_payment: e.target.value });
                }}
                placeholder="18000" required />
              {!isPaymentManual && formData.monthly_payment && (
                <p className="text-xs text-muted-foreground">
                  Automatický výpočet ({formatNumber(parseNum(formData.monthly_payment) || 0)} Kč). Můžete přepsat.
                </p>
              )}
              {isPaymentManual && formData.original_amount && formData.interest_rate && formData.term_months && (
                <button type="button" className="text-xs text-blue-500 hover:underline"
                  onClick={() => setIsPaymentManual(false)}>Přepočítat automaticky</button>
              )}
            </div>
            <div className="space-y-2">
              <Label>LTV (%) <span className="text-muted-foreground font-normal">— nepovinné</span></Label>
              <Input type="number" step="0.01" value={formData.ltv_percent}
                onChange={(e) => setFormData({ ...formData, ltv_percent: e.target.value })}
                placeholder="75" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Banka</Label>
            <Input value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              placeholder="Např. Česká spořitelna" />
          </div>

          {/* Collaterals section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Zástavy</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCollateral}>
                <Plus className="mr-1 h-3 w-3" />
                Přidat zástavu
              </Button>
            </div>

            {collaterals.length === 0 && (
              <div className="space-y-2">
                <Input
                  value={manualCollateral}
                  onChange={(e) => setManualCollateral(e.target.value)}
                  placeholder="Umístění zástavy (nepovinné) nebo přidejte zástavu tlačítkem výše"
                  className="text-sm"
                />
              </div>
            )}

            {collaterals.map((col, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Select
                    value={col.sourceId || "manual"}
                    onValueChange={(v) => updateCollateral(idx, v)}
                  >
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue placeholder="Vyberte nemovitost" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Jiná (ruční zápis)</SelectItem>
                      {collateralOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label} ({formatCurrency(opt.estimatedValue)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => removeCollateral(idx)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive flex-shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Výše zástavy (Kč)</Label>
                  <Input type="number" value={col.amount}
                    onChange={(e) => updateCollateralAmount(idx, e.target.value)}
                    placeholder="3000000" className="h-8 text-sm" />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Zrušit</Button>
            <Button type="submit">{editData ? "Uložit změny" : "Přidat úvěr"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
