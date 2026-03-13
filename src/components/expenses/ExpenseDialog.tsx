import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
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

export const ExpenseDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState<ExpenseFormData>({
    name: "",
    amount: undefined,
    frequency: "monthly",
    is_recurring: true,
  });

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

    const { error } = await supabase.from("expenses").insert({
      user_id: user.id,
      name: formData.name.trim() || "Bez názvu",
      amount: formData.amount,
      frequency: formData.frequency,
      is_recurring: formData.is_recurring,
    });

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Úspěch", description: "Výdaj byl přidán" });
    setOpen(false);
    setFormData({ name: "", amount: undefined, frequency: "monthly", is_recurring: true });
    onSuccess();
  };

  const monthlyEquivalent =
    formData.amount
      ? formData.frequency === "yearly"
        ? formData.amount / 12
        : formData.amount
      : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Přidat výdaj
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Přidat nový výdaj</DialogTitle>
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
            <Input
              type="number"
              value={formData.amount ?? ""}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value ? parseFloat(e.target.value) : undefined })}
              placeholder="5000"
              min="0"
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit">Přidat</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
