import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { calculateAnnuity, formatNumber } from "@/lib/utils";

/** Safely parse a numeric input value — returns undefined for empty/NaN */
const parseNum = (val: string): number | undefined => {
  if (!val || val.trim() === "") return undefined;
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
};

interface LoanDialogProps {
  onSuccess: () => void;
  editData?: any;
}

export const LoanDialog = ({ onSuccess, editData }: LoanDialogProps) => {
  const [open, setOpen] = useState(!!editData);
  const { toast } = useToast();
  const [isPaymentManual, setIsPaymentManual] = useState(!!editData?.monthly_payment);
  const [properties, setProperties] = useState<any[]>([]);
  const [collateralPropertyId, setCollateralPropertyId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: editData?.name || "",
    original_amount: editData?.original_amount?.toString() || "",
    remaining_principal: editData?.remaining_principal?.toString() || "",
    interest_rate: editData?.interest_rate?.toString() || "",
    term_months: editData ? Math.round(editData.term_months / 12).toString() : "",
    monthly_payment: editData?.monthly_payment?.toString() || "",
    ltv_percent: editData?.ltv_percent?.toString() || "",
    collateral_location: editData?.collateral_location || "",
    bank_name: editData?.bank_name || "",
  });

  // Fetch user's properties for collateral selection
  useEffect(() => {
    const fetchProperties = async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, identifier, estimated_value, loan_id")
        .order("created_at", { ascending: false });
      setProperties(data || []);

      // If editing, find which property references this loan
      if (editData?.id && data) {
        const linked = data.find((p: any) => p.loan_id === editData.id);
        if (linked) setCollateralPropertyId(linked.id);
      }
    };
    fetchProperties();
  }, [editData]);

  // Auto-calculate monthly payment when amount, rate, or term change
  useEffect(() => {
    if (isPaymentManual) return;
    const amount = parseNum(formData.original_amount);
    const rate = parseNum(formData.interest_rate);
    const termYears = parseNum(formData.term_months);
    if (amount && amount > 0 && rate !== undefined && termYears && termYears > 0) {
      const payment = calculateAnnuity(amount, rate, termYears * 12);
      setFormData(prev => ({ ...prev, monthly_payment: Math.round(payment).toString() }));
    }
  }, [formData.original_amount, formData.interest_rate, formData.term_months, isPaymentManual]);

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
      toast({
        title: "Chyba",
        description: "Musíte být přihlášeni",
        variant: "destructive",
      });
      return;
    }

    const ltvPercent = parseNum(formData.ltv_percent);

    const dataToSave = {
      user_id: user.id,
      name: formData.name?.trim() || "Úvěr",
      original_amount: amount,
      remaining_principal: remaining,
      interest_rate: rate,
      term_months: termYears * 12,
      monthly_payment: payment,
      ltv_percent: ltvPercent ?? null,
      collateral_location: formData.collateral_location || null,
      bank_name: formData.bank_name || null,
      is_forecast: false,
    };

    let error;
    if (editData) {
      ({ error } = await supabase.from("loans").update(dataToSave).eq("id", editData.id));
    } else {
      ({ error } = await supabase.from("loans").insert(dataToSave));
    }

    if (error) {
      toast({
        title: "Chyba",
        description: editData ? "Nepodařilo se upravit úvěr" : "Nepodařilo se přidat úvěr",
        variant: "destructive",
      });
      return;
    }

    // Link/unlink property collateral
    if (collateralPropertyId) {
      // Get the loan ID (for new loans, we need to fetch it)
      let loanId = editData?.id;
      if (!loanId) {
        // Fetch the just-created loan
        const { data: newLoan } = await supabase
          .from("loans")
          .select("id")
          .eq("user_id", user.id)
          .eq("name", dataToSave.name)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        loanId = newLoan?.id;
      }

      if (loanId) {
        // Clear old property links for this loan
        await supabase
          .from("properties")
          .update({ loan_id: null })
          .eq("loan_id", loanId);

        // Set new link
        await supabase
          .from("properties")
          .update({ loan_id: loanId })
          .eq("id", collateralPropertyId);
      }
    } else if (editData?.id) {
      // Clear any existing link
      await supabase
        .from("properties")
        .update({ loan_id: null })
        .eq("loan_id", editData.id);
    }

    toast({
      title: "Úspěch",
      description: editData ? "Úvěr byl upraven" : "Úvěr byl přidán",
    });

    setFormData({
      name: "",
      original_amount: "",
      remaining_principal: "",
      interest_rate: "",
      term_months: "",
      monthly_payment: "",
      ltv_percent: "",
      collateral_location: "",
      bank_name: "",
    });
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
          <DialogDescription>
            Vyplňte informace o vašem úvěru
          </DialogDescription>
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
              <Input
                type="number"
                value={formData.original_amount}
                onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })}
                placeholder="3000000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Zbývající dluh (Kč)</Label>
              <Input
                type="number"
                value={formData.remaining_principal}
                onChange={(e) => setFormData({ ...formData, remaining_principal: e.target.value })}
                placeholder="2500000"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Úroková sazba (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.interest_rate}
                onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                placeholder="4.5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Doba splácení (roky)</Label>
              <Input
                type="number"
                value={formData.term_months}
                onChange={(e) => setFormData({ ...formData, term_months: e.target.value })}
                placeholder="25"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Měsíční splátka (Kč)</Label>
              <Input
                type="number"
                value={formData.monthly_payment}
                onChange={(e) => {
                  setIsPaymentManual(true);
                  setFormData({ ...formData, monthly_payment: e.target.value });
                }}
                placeholder="18000"
                required
              />
              {!isPaymentManual && formData.monthly_payment && (
                <p className="text-xs text-muted-foreground">
                  Automatický výpočet annuitní splátky ({formatNumber(parseNum(formData.monthly_payment) || 0)} Kč). Můžete přepsat ručně.
                </p>
              )}
              {isPaymentManual && formData.original_amount && formData.interest_rate && formData.term_months && (
                <button
                  type="button"
                  className="text-xs text-blue-500 hover:underline"
                  onClick={() => setIsPaymentManual(false)}
                >
                  Přepočítat automaticky
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label>LTV (%) <span className="text-muted-foreground font-normal">— nepovinné</span></Label>
              <Input
                type="number"
                step="0.01"
                value={formData.ltv_percent}
                onChange={(e) => setFormData({ ...formData, ltv_percent: e.target.value })}
                placeholder="75"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Banka</Label>
              <Input
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Např. Česká spořitelna"
              />
            </div>

            <div className="space-y-2">
              <Label>Zástava</Label>
              {properties.length > 0 ? (
                <>
                  <Select
                    value={collateralPropertyId || "manual"}
                    onValueChange={(v) => {
                      if (v === "manual") {
                        setCollateralPropertyId("");
                        setFormData({ ...formData, collateral_location: "" });
                      } else {
                        setCollateralPropertyId(v);
                        const prop = properties.find((p) => p.id === v);
                        if (prop) {
                          setFormData({ ...formData, collateral_location: prop.identifier });
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte nemovitost" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Jiná (zadat ručně)</SelectItem>
                      {properties.map((prop) => (
                        <SelectItem key={prop.id} value={prop.id}>
                          {prop.identifier} ({new Intl.NumberFormat("cs-CZ").format(prop.estimated_value)} Kč)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!collateralPropertyId && (
                    <Input
                      value={formData.collateral_location}
                      onChange={(e) => setFormData({ ...formData, collateral_location: e.target.value })}
                      placeholder="Praha 2, Vinohrady"
                    />
                  )}
                </>
              ) : (
                <Input
                  value={formData.collateral_location}
                  onChange={(e) => setFormData({ ...formData, collateral_location: e.target.value })}
                  placeholder="Praha 2, Vinohrady"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit">
              {editData ? "Uložit změny" : "Přidat úvěr"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
