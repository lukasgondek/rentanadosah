import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";

const loanValidationSchema = z.object({
  name: z.string().trim().max(200, "Název je příliš dlouhý").optional(),
  original_amount: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká"),
  remaining_principal: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká"),
  interest_rate: z.number().min(0, "Úroková sazba nemůže být záporná").max(100, "Úroková sazba je příliš vysoká"),
  term_months: z.number().min(1, "Doba splácení musí být alespoň 1 měsíc").max(600, "Doba splácení je příliš dlouhá"),
  monthly_payment: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká"),
  ltv_percent: z.number().min(0, "LTV nemůže být záporné").max(100, "LTV nemůže být vyšší než 100").optional(),
});

export const LoanDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    original_amount: "",
    remaining_principal: "",
    interest_rate: "",
    term_months: "",
    monthly_payment: "",
    ltv_percent: "",
    collateral_location: "",
    bank_name: "",
    is_forecast: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validationData = {
        name: formData.name || undefined,
        original_amount: parseFloat(formData.original_amount),
        remaining_principal: parseFloat(formData.remaining_principal),
        interest_rate: parseFloat(formData.interest_rate),
        term_months: parseInt(formData.term_months),
        monthly_payment: parseFloat(formData.monthly_payment),
        ltv_percent: formData.ltv_percent ? parseFloat(formData.ltv_percent) : undefined,
      };

      loanValidationSchema.parse(validationData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Chyba validace",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Chyba",
        description: "Musíte být přihlášeni",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("loans").insert({
      user_id: user.id,
      name: formData.name?.trim() || "Úvěr",
      original_amount: parseFloat(formData.original_amount),
      remaining_principal: parseFloat(formData.remaining_principal),
      interest_rate: parseFloat(formData.interest_rate),
      term_months: parseInt(formData.term_months),
      monthly_payment: parseFloat(formData.monthly_payment),
      ltv_percent: formData.ltv_percent ? parseFloat(formData.ltv_percent) : null,
      collateral_location: formData.collateral_location || null,
      bank_name: formData.bank_name || null,
      is_forecast: formData.is_forecast,
    });

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat úvěr",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Úspěch",
      description: "Úvěr byl přidán",
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
      is_forecast: false,
    });
    setOpen(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Přidat úvěr
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Přidat úvěr</DialogTitle>
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
              <Label>Doba splácení (měsíce)</Label>
              <Input
                type="number"
                value={formData.term_months}
                onChange={(e) => setFormData({ ...formData, term_months: e.target.value })}
                placeholder="240"
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
                onChange={(e) => setFormData({ ...formData, monthly_payment: e.target.value })}
                placeholder="18000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>LTV (%)</Label>
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
              <Label>Zástava (adresa)</Label>
              <Input
                value={formData.collateral_location}
                onChange={(e) => setFormData({ ...formData, collateral_location: e.target.value })}
                placeholder="Praha 2, Vinohrady"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_forecast"
              checked={formData.is_forecast}
              onCheckedChange={(checked) => setFormData({ ...formData, is_forecast: checked as boolean })}
            />
            <Label htmlFor="is_forecast" className="text-sm font-normal cursor-pointer">
              Jedná se o plánovaný úvěr
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit">
              Přidat úvěr
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
