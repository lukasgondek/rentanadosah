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
  term_months: z.number().min(1, "Doba splácení musí být alespoň 1 rok").max(50, "Doba splácení je příliš dlouhá"),
  monthly_payment: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká"),
  ltv_percent: z.number().min(0, "LTV nemůže být záporné").max(100, "LTV nemůže být vyšší než 100").optional(),
});

interface LoanDialogProps {
  onSuccess: () => void;
  editData?: any;
}

export const LoanDialog = ({ onSuccess, editData }: LoanDialogProps) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
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

    const dataToSave = {
      user_id: user.id,
      name: formData.name?.trim() || "Úvěr",
      original_amount: parseFloat(formData.original_amount),
      remaining_principal: parseFloat(formData.remaining_principal),
      interest_rate: parseFloat(formData.interest_rate),
      term_months: parseInt(formData.term_months) * 12, // Convert years to months
      monthly_payment: parseFloat(formData.monthly_payment),
      ltv_percent: formData.ltv_percent ? parseFloat(formData.ltv_percent) : null,
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
