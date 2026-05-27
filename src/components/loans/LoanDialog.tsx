import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
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

interface NewPropFields {
  identifier: string;
  purchase_price: string;
  estimated_value: string;
  monthly_rent: string;
  monthly_expenses: string;
}

const emptyNewProp = (): NewPropFields => ({
  identifier: "",
  purchase_price: "",
  estimated_value: "",
  monthly_rent: "",
  monthly_expenses: "",
});

interface CollateralEntry {
  sourceId: string; // property_id or unit_id; "" dokud uživatel nevybere
  sourceType: "property" | "unit" | "new" | "";
  amount: string;
  label: string; // for display
  /** vyplněno jen když sourceType === "new" — nová nemovitost se vytvoří do portfolia */
  newProp?: NewPropFields;
}

interface LoanDialogProps {
  onSuccess: () => void;
  editData?: any;
  userId?: string;
}

export const LoanDialog = ({ onSuccess, editData, userId }: LoanDialogProps) => {
  const [open, setOpen] = useState(!!editData);
  const { toast } = useToast();
  const [isPaymentManual, setIsPaymentManual] = useState(!!editData?.monthly_payment);
  const [collateralOptions, setCollateralOptions] = useState<CollateralOption[]>([]);
  const [collaterals, setCollaterals] = useState<CollateralEntry[]>([]);

  const [formData, setFormData] = useState({
    name: editData?.name || "",
    original_amount: editData?.original_amount?.toString() || "",
    remaining_principal: editData?.remaining_principal?.toString() || "",
    interest_rate: editData?.interest_rate?.toString() || "",
    term_months: editData ? Math.round(editData.term_months / 12).toString() : "",
    monthly_payment: editData?.monthly_payment?.toString() || "",
    ltv_percent: editData?.ltv_percent?.toString() || "",
    bank_name: editData?.bank_name || "",
    rate_anniversary_date: editData?.rate_anniversary_date || "",
  });

  // Fetch collateral options (properties + cadastrally separated units)
  useEffect(() => {
    const fetchCollateralOptions = async () => {
      // Scope na konkrétního klienta — v admin režimu má admin RLS "vidí vše",
      // takže BEZ tohoto filtru by se nabízely nemovitosti všech klientů (datový únik).
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      if (!targetUserId) return;

      // Fetch properties klienta
      const { data: props } = await supabase
        .from("properties")
        .select("id, identifier, estimated_value, property_type")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      // Zástava = každá nemovitost jako JEDEN záznam (samostatná jednotka
      // i činžák). Navíc jednotky označené "Katastrálně odděleno" — ty jsou
      // právně samostatné a dají se zastavit zvlášť.
      const deduped: CollateralOption[] = (props || []).map((p) => ({
        id: `prop_${p.id}`,
        label: p.identifier,
        estimatedValue: p.estimated_value,
        type: "property" as const,
      }));

      const propIds = (props || []).map((p) => p.id);
      const identifierById = Object.fromEntries(
        (props || []).map((p: any) => [p.id, p.identifier])
      );

      // Katastrálně oddělené jednotky → samostatné položky v nabídce.
      // Zároveň lookup unit_id → property_id pro legacy zástavy.
      const unitParent: Record<string, string> = {};
      if (propIds.length) {
        const { data: units } = await supabase
          .from("property_units")
          .select("id, name, estimated_value, property_id, is_cadastrally_separated")
          .in("property_id", propIds);
        for (const u of units || []) {
          unitParent[u.id] = u.property_id;
          if (u.is_cadastrally_separated && u.estimated_value) {
            deduped.push({
              id: `unit_${u.id}`,
              label: `${identifierById[u.property_id] || ""} → ${u.name}`,
              estimatedValue: u.estimated_value,
              type: "unit" as const,
            });
          }
        }
      }

      setCollateralOptions(deduped);

      // Load existing collaterals if editing
      if (editData?.id) {
        const { data: existingCollaterals } = await supabase
          .from("loan_collaterals")
          .select("*")
          .eq("loan_id", editData.id);

        if (existingCollaterals && existingCollaterals.length > 0) {
          const loaded: CollateralEntry[] = existingCollaterals.map((c: any) => {
            // Katastrálně oddělená jednotka zůstane jednotkou (je v nabídce);
            // jinak nekatastrální jednotka → rodičovská nemovitost (činžák).
            if (c.property_unit_id) {
              const unitOpt = deduped.find((o) => o.id === `unit_${c.property_unit_id}`);
              if (unitOpt) {
                return {
                  sourceId: `unit_${c.property_unit_id}`,
                  sourceType: "unit" as const,
                  amount: c.collateral_amount?.toString() || "",
                  label: unitOpt.label,
                };
              }
            }
            const propId = c.property_id || (c.property_unit_id ? unitParent[c.property_unit_id] : null);
            if (propId) {
              const opt = deduped.find((o) => o.id === `prop_${propId}`);
              return {
                sourceId: `prop_${propId}`,
                sourceType: "property" as const,
                amount: c.collateral_amount?.toString() || "",
                label: opt?.label || "Nemovitost",
              };
            }
            return {
              sourceId: "",
              sourceType: "" as const,
              amount: c.collateral_amount?.toString() || "",
              label: "",
            };
          });
          setCollaterals(loaded);
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

  // Rozpad hypoteční platby — stejná logika jako "Údaje o úvěru" v plánovacím
  // módu. Měsíční úrok = úrok z celé jistiny v 1. měsíci. Průměrný měsíční úrok
  // za celou dobu je nižší (úrok klesá jak se jistina splácí):
  // Σ úroků = splátka×měsíce − jistina; průměr = Σ / měsíce.
  const loanCalc = (() => {
    const loanAmount = parseNum(formData.original_amount) || 0;
    const ratePct = parseNum(formData.interest_rate) ?? 0;
    const termMonths = (parseNum(formData.term_months) || 0) * 12;
    const monthlyRate = ratePct / 100 / 12;
    const effectivePayment = parseNum(formData.monthly_payment) || 0;
    const monthlyInterest = loanAmount * monthlyRate;
    const principalPayment = effectivePayment > 0 ? effectivePayment - monthlyInterest : 0;
    const avgMonthlyInterest =
      termMonths > 0 && effectivePayment > 0
        ? (effectivePayment * termMonths - loanAmount) / termMonths
        : 0;
    return { monthlyInterest, principalPayment, avgMonthlyInterest };
  })();

  const addCollateral = () => {
    setCollaterals([...collaterals, { sourceId: "", sourceType: "", amount: "", label: "" }]);
    // Zajištěný úvěr musí mít LTV — předvyplň 80 %, klient může změnit.
    setFormData((prev) => (prev.ltv_percent ? prev : { ...prev, ltv_percent: "80" }));
  };

  const removeCollateral = (index: number) => {
    setCollaterals(collaterals.filter((_, i) => i !== index));
  };

  const updateCollateral = (index: number, sourceId: string) => {
    const newCollaterals = [...collaterals];
    if (sourceId === "new") {
      newCollaterals[index] = { ...newCollaterals[index], sourceId: "", sourceType: "new", label: "", newProp: emptyNewProp() };
    } else {
      const opt = collateralOptions.find((o) => o.id === sourceId);
      if (opt) {
        newCollaterals[index] = {
          ...newCollaterals[index],
          sourceId,
          sourceType: opt.type,
          label: opt.label,
          amount: newCollaterals[index].amount || opt.estimatedValue.toString(),
          newProp: undefined,
        };
      }
    }
    setCollaterals(newCollaterals);
  };


  // C2: editace polí nové nemovitosti přímo v řádku zástavy
  const updateCollateralNewProp = (index: number, field: keyof NewPropFields, value: string) => {
    const newCollaterals = [...collaterals];
    const cur = newCollaterals[index];
    const np = { ...(cur.newProp || emptyNewProp()), [field]: value };
    // Předvyplň výši zástavy odhadní hodnotou (dokud ji uživatel ručně nepřepsal)
    const amount =
      field === "estimated_value" && (!cur.amount || cur.amount === cur.newProp?.estimated_value)
        ? value
        : cur.amount;
    newCollaterals[index] = { ...cur, newProp: np, label: np.identifier, amount };
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
    if (!amount || amount <= 0) { showError("Vyplňte původní výši úvěru"); return; }
    if (remaining === undefined || remaining < 0) { showError("Vyplňte zbývající dluh"); return; }
    if (rate === undefined || rate < 0) { showError("Vyplňte úrokovou sazbu"); return; }
    if (!termYears || termYears <= 0) { showError("Vyplňte dobu splácení"); return; }

    // Měsíční splátka není povinná — když ji uživatel nevyplní, dopočítáme
    // anuitu z výše úvěru, sazby a doby (DB sloupec je NOT NULL).
    const payment =
      parseNum(formData.monthly_payment) ??
      Math.round(calculateAnnuity(amount, rate, termYears * 12));

    // C2: validace nových nemovitostí (vytvoří se do portfolia)
    for (const c of collaterals) {
      if (c.sourceType !== "new") continue;
      const np = c.newProp;
      if (!np?.identifier?.trim()) { showError("U nové nemovitosti vyplňte identifikátor"); return; }
      if (!parseNum(np.purchase_price) || (parseNum(np.purchase_price) ?? 0) <= 0) {
        showError(`U nové nemovitosti „${np.identifier}" vyplňte kupní cenu`); return;
      }
      if (!parseNum(np.estimated_value) || (parseNum(np.estimated_value) ?? 0) <= 0) {
        showError(`U nové nemovitosti „${np.identifier}" vyplňte odhadní hodnotu`); return;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Chyba", description: "Musíte být přihlášeni", variant: "destructive" });
      return;
    }
    const targetUserId = userId || user.id;

    // Build collateral location string for display (z vybraných/nových nemovitostí)
    const collateralLabels = collaterals
      .filter((c) => c.label)
      .map((c) => c.label)
      .join(", ");

    // Zajištěný úvěr (má zástavu) MUSÍ mít LTV — default 80 % (pro výpočet
    // "volné zástavy" u nemovitosti). Nezajištěný úvěr LTV nepotřebuje.
    const hasCollateral = collaterals.some(
      (c) => (c.sourceId && (c.sourceType === "property" || c.sourceType === "unit")) || c.sourceType === "new"
    );
    const ltvValue = hasCollateral
      ? (parseNum(formData.ltv_percent) ?? 80)
      : (parseNum(formData.ltv_percent) ?? null);

    const dataToSave = {
      user_id: targetUserId,
      name: formData.name?.trim() || "Úvěr",
      original_amount: amount,
      remaining_principal: remaining,
      interest_rate: rate,
      term_months: termYears * 12,
      monthly_payment: payment,
      ltv_percent: ltvValue,
      collateral_location: collateralLabels || null,
      bank_name: formData.bank_name || null,
      rate_anniversary_date: formData.rate_anniversary_date || null,
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
      // C2: nejdřív vytvoř nové nemovitosti do portfolia klienta a převeď je
      // na běžné property zástavy (propíše se mezi nemovitosti).
      const resolved: CollateralEntry[] = [];
      for (const c of collaterals) {
        if (c.sourceType === "new" && c.newProp) {
          const np = c.newProp;
          const { data: createdProp, error: propErr } = await supabase
            .from("properties")
            .insert({
              user_id: targetUserId,
              identifier: np.identifier.trim(),
              purchase_price: parseNum(np.purchase_price)!,
              estimated_value: parseNum(np.estimated_value)!,
              monthly_rent: parseNum(np.monthly_rent) ?? null,
              monthly_expenses: parseNum(np.monthly_expenses) ?? null,
              property_type: "single",
              is_forecast: false,
              loan_id: loanId,
            })
            .select("id")
            .single();
          if (propErr || !createdProp) {
            toast({
              title: "Varování",
              description: `Nemovitost „${np.identifier}" se nepodařilo vytvořit — zástava nebyla uložena.`,
              variant: "destructive",
            });
            continue;
          }
          resolved.push({
            ...c,
            sourceId: `prop_${createdProp.id}`,
            sourceType: "property",
            label: np.identifier,
            amount: c.amount || np.estimated_value,
            newProp: undefined,
          });
        } else {
          resolved.push(c);
        }
      }

      // Clear old collateral records
      await supabase.from("loan_collaterals").delete().eq("loan_id", loanId);

      // Also clear old property.loan_id links (backwards compat)
      await supabase.from("properties").update({ loan_id: null }).eq("loan_id", loanId);

      // Insert new collateral records (jen property/unit). Pole "výše zástavy"
      // už není — částku odvozujeme z výše úvěru (collateral_amount slouží jen
      // informativně, volná zástava se počítá z jistiny/LTV úvěru).
      const collateralRecords = resolved
        .filter((c) => c.sourceId && (c.sourceType === "property" || c.sourceType === "unit"))
        .map((c) => {
          const realId = c.sourceId.replace(/^(prop_|unit_)/, "");
          return {
            loan_id: loanId!,
            property_id: c.sourceType === "property" ? realId : null,
            property_unit_id: c.sourceType === "unit" ? realId : null,
            collateral_amount: parseNum(c.amount) || amount,
          };
        });

      if (collateralRecords.length > 0) {
        await supabase.from("loan_collaterals").insert(collateralRecords);
      }

      // Obousměrné propsání: všechny property zástavy propoj zpět na úvěr
      // (PropertiesTab pak v sloupci "Úvěr" ukáže název úvěru).
      const propIds = resolved
        .filter((c) => c.sourceType === "property" && c.sourceId)
        .map((c) => c.sourceId.replace("prop_", ""));
      if (propIds.length > 0) {
        await supabase.from("properties").update({ loan_id: loanId }).in("id", propIds);
      }
    }

    toast({
      title: "Úspěch",
      description: editData ? "Úvěr byl upraven" : "Úvěr byl přidán",
    });

    setFormData({
      name: "", original_amount: "", remaining_principal: "",
      interest_rate: "", term_months: "", monthly_payment: "",
      ltv_percent: "", bank_name: "", rate_anniversary_date: "",
    });
    setCollaterals([]);
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
              <FormattedNumberInput value={formData.original_amount}
                onValueChange={(v) => setFormData({ ...formData, original_amount: v })}
                placeholder="3.000.000" required />
            </div>
            <div className="space-y-2">
              <Label>Zbývající dluh (Kč)</Label>
              <FormattedNumberInput value={formData.remaining_principal}
                onValueChange={(v) => setFormData({ ...formData, remaining_principal: v })}
                placeholder="2.500.000" required />
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
              <Label>Měsíční splátka (Kč) <span className="text-muted-foreground font-normal">— dopočítá se sama</span></Label>
              <FormattedNumberInput value={formData.monthly_payment}
                onValueChange={(v) => {
                  setIsPaymentManual(true);
                  setFormData({ ...formData, monthly_payment: v });
                }}
                placeholder="18.000" />
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
              <Label>LTV (%)</Label>
              <Input type="number" step="0.01" value={formData.ltv_percent}
                onChange={(e) => setFormData({ ...formData, ltv_percent: e.target.value })}
                placeholder="80" />
            </div>
          </div>

          {/* Rozpad splátky — počítá se automaticky (jako v plánovacím módu) */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Měsíční úrok — 1. měsíc (Kč)</Label>
              <Input value={formatNumber(loanCalc.monthlyInterest)} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Splátka jistiny (Kč)</Label>
              <Input value={formatNumber(loanCalc.principalPayment)} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Průměrný měsíční úrok — celá doba (Kč)</Label>
              <Input value={formatNumber(loanCalc.avgMonthlyInterest)} disabled className="bg-muted" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Banka</Label>
              <Input value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Např. Česká spořitelna" />
            </div>
            <div className="space-y-2">
              <Label>
                Výročí úrokové sazby
                <span className="text-muted-foreground font-normal"> — nepovinné</span>
              </Label>
              <Input
                type="date"
                value={formData.rate_anniversary_date}
                onChange={(e) => setFormData({ ...formData, rate_anniversary_date: e.target.value })}
              />
            </div>
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

            {collaterals.map((col, idx) => (
              <div key={idx} className="border rounded-lg p-3 space-y-2 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Select
                    value={col.sourceType === "new" ? "new" : (col.sourceId || undefined)}
                    onValueChange={(v) => updateCollateral(idx, v)}
                  >
                    <SelectTrigger className="flex-1 h-8 text-sm">
                      <SelectValue placeholder="Vyberte nemovitost" />
                    </SelectTrigger>
                    <SelectContent>
                      {collateralOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label} ({formatCurrency(opt.estimatedValue)})
                        </SelectItem>
                      ))}
                      <SelectItem value="new">➕ Nová nemovitost (přidá se do portfolia)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="sm"
                    onClick={() => removeCollateral(idx)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive flex-shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* C2: nová nemovitost — vytvoří se do portfolia klienta */}
                {col.sourceType === "new" && col.newProp && (
                  <div className="space-y-2 rounded-md border border-dashed p-2">
                    <p className="text-xs text-muted-foreground">
                      Tato nemovitost se automaticky přidá do portfolia klienta.
                    </p>
                    <Input
                      value={col.newProp.identifier}
                      onChange={(e) => updateCollateralNewProp(idx, "identifier", e.target.value)}
                      placeholder="Identifikátor (např. Praha 2, Vinohrady, Slezská)"
                      className="h-8 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Kupní cena (Kč)</Label>
                        <FormattedNumberInput value={col.newProp.purchase_price}
                          onValueChange={(v) => updateCollateralNewProp(idx, "purchase_price", v)}
                          placeholder="5.000.000" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Odhadní hodnota (Kč)</Label>
                        <FormattedNumberInput value={col.newProp.estimated_value}
                          onValueChange={(v) => updateCollateralNewProp(idx, "estimated_value", v)}
                          placeholder="5.500.000" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Měsíční nájem (Kč)</Label>
                        <FormattedNumberInput value={col.newProp.monthly_rent}
                          onValueChange={(v) => updateCollateralNewProp(idx, "monthly_rent", v)}
                          placeholder="25.000" className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Měsíční výdaje (Kč)</Label>
                        <FormattedNumberInput value={col.newProp.monthly_expenses}
                          onValueChange={(v) => updateCollateralNewProp(idx, "monthly_expenses", v)}
                          placeholder="5.000" className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                )}
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
