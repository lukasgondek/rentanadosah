import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

type Frequency = "monthly" | "yearly";

interface ExpenseFormData {
  name: string;
  amount: number | undefined;
  frequency: Frequency;
  is_recurring: boolean;
}

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId?: string;
  /** Pokud existuje, dialog edituje stávající záznam místo přidávání nového. */
  editData?: {
    id: string;
    name: string;
    amount: number;
    frequency: string | null;
    is_recurring: boolean | null;
  };
}

/**
 * Single-mode dialog: přidat NEBO upravit jeden výdaj.
 * Pro hromadné přidávání nového klienta viz ExpenseWizard.
 */
export const ExpenseDialog = ({ open, onOpenChange, onSuccess, userId, editData }: ExpenseDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ExpenseFormData>({
    name: "",
    amount: undefined,
    frequency: "monthly",
    is_recurring: true,
  });

  // Při otevření v edit režimu načti hodnoty existujícího záznamu.
  useEffect(() => {
    if (open && editData) {
      setFormData({
        name: editData.name || "",
        amount: editData.amount,
        frequency: (editData.frequency as Frequency) || "monthly",
        is_recurring: editData.is_recurring ?? true,
      });
    } else if (open && !editData) {
      setFormData({ name: "", amount: undefined, frequency: "monthly", is_recurring: true });
    }
  }, [open, editData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || formData.amount <= 0) {
      toast({ title: "Chyba", description: "Zadejte platnou částku", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Chyba", description: "Musíte být přihlášeni", variant: "destructive" });
      return;
    }

    const payload = {
      name: formData.name.trim() || "Bez názvu",
      amount: formData.amount,
      frequency: formData.frequency,
      is_recurring: formData.is_recurring,
    };

    const { error } = editData
      ? await supabase.from("expenses").update(payload).eq("id", editData.id)
      : await supabase.from("expenses").insert({ user_id: userId || user.id, ...payload });

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Úspěch", description: editData ? "Výdaj byl upraven" : "Výdaj byl přidán" });
    onOpenChange(false);
    onSuccess();
  };

  const monthlyEquivalent =
    formData.amount
      ? formData.frequency === "yearly"
        ? formData.amount / 12
        : formData.amount
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editData ? "Upravit výdaj" : "Přidat nový výdaj"}</DialogTitle>
          <DialogDescription>Zadejte pravidelný nebo jednorázový výdaj</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Název</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Např. Pojištění, nájem, leasing..."
            />
          </div>

          <div className="space-y-2">
            <Label>Výše výdaje (Kč)</Label>
            <FormattedNumberInput
              value={formData.amount?.toString() || ""}
              onValueChange={(v) => setFormData({ ...formData, amount: v ? parseFloat(v) : undefined })}
              placeholder="5.000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Frekvence</Label>
            <RadioGroup
              value={formData.frequency}
              onValueChange={(v) => setFormData({ ...formData, frequency: v as Frequency })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="freq-monthly" />
                <Label htmlFor="freq-monthly">Měsíčně</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yearly" id="freq-yearly" />
                <Label htmlFor="freq-yearly">Ročně</Label>
              </div>
            </RadioGroup>
          </div>

          {monthlyEquivalent !== null && formData.frequency === "yearly" && (
            <p className="text-sm text-muted-foreground">
              Měsíčně: {formatCurrency(monthlyEquivalent)}
            </p>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_recurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: !!checked })}
            />
            <Label htmlFor="is_recurring">Opakující se výdaj</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Zrušit
            </Button>
            <Button type="submit">{editData ? "Uložit změny" : "Přidat"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
