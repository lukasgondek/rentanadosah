import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";


/** Safely parse a numeric input value — returns undefined for empty/NaN */
const parseNum = (val: string): number | undefined => {
  if (!val || val.trim() === "") return undefined;
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
};

interface PropertyDialogProps {
  onSuccess: () => void;
  editData?: any;
}

export const PropertyDialog = ({ onSuccess, editData }: PropertyDialogProps) => {
  const [open, setOpen] = useState(!!editData);
  const { toast } = useToast();
  const [loans, setLoans] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    identifier: editData?.identifier || "",
    purchase_price: editData?.purchase_price?.toString() || "",
    estimated_value: editData?.estimated_value?.toString() || "",
    monthly_rent: editData?.monthly_rent?.toString() || "",
    monthly_expenses: editData?.monthly_expenses?.toString() || "",
    yearly_appreciation_percent: editData?.yearly_appreciation_percent?.toString() || "",
    loan_id: editData?.loan_id || "",
  });

  // Fetch user's loans for the "Propojit s úvěrem" select
  useEffect(() => {
    const fetchLoans = async () => {
      const { data } = await supabase
        .from("loans")
        .select("id, name, original_amount")
        .order("created_at", { ascending: false });
      setLoans(data || []);
    };
    fetchLoans();
  }, []);

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Chyba",
        description: "Musíte být přihlášeni",
        variant: "destructive",
      });
      return;
    }

    const dataToSave = {
      user_id: user.id,
      identifier: formData.identifier.trim(),
      purchase_price: purchasePrice,
      estimated_value: estimatedValue,
      monthly_rent: parseNum(formData.monthly_rent) ?? null,
      monthly_expenses: parseNum(formData.monthly_expenses) ?? null,
      yearly_appreciation_percent: parseNum(formData.yearly_appreciation_percent) ?? null,
      is_forecast: false,
      loan_id: formData.loan_id || null,
    };

    let error;
    if (editData) {
      ({ error } = await supabase.from("properties").update(dataToSave).eq("id", editData.id));
    } else {
      ({ error } = await supabase.from("properties").insert(dataToSave));
    }

    if (error) {
      toast({
        title: "Chyba",
        description: editData ? "Nepodařilo se upravit nemovitost" : "Nepodařilo se přidat nemovitost",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Úspěch",
      description: editData ? "Nemovitost byla upravena" : "Nemovitost byla přidána",
    });

    setFormData({
      identifier: "",
      purchase_price: "",
      estimated_value: "",
      monthly_rent: "",
      monthly_expenses: "",
      yearly_appreciation_percent: "",
      loan_id: "",
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
            Přidat nemovitost
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Upravit nemovitost" : "Přidat nemovitost"}</DialogTitle>
          <DialogDescription>
            Vyplňte informace o vaší nemovitosti
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Identifikátor nemovitosti</Label>
            <Input
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              placeholder="Např. Praha 2, Vinohrady, ul. Slezská"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kupní cena (Kč)</Label>
              <Input
                type="number"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                placeholder="5000000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Odhadní hodnota (Kč)</Label>
              <Input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                placeholder="5500000"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Měsíční nájem (Kč)</Label>
              <Input
                type="number"
                value={formData.monthly_rent}
                onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                placeholder="25000"
              />
            </div>

            <div className="space-y-2">
              <Label>Měsíční výdaje (Kč)</Label>
              <Input
                type="number"
                value={formData.monthly_expenses}
                onChange={(e) => setFormData({ ...formData, monthly_expenses: e.target.value })}
                placeholder="5000"
              />
            </div>
          </div>

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
                      {loan.name} ({new Intl.NumberFormat("cs-CZ").format(loan.original_amount)} Kč)
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
