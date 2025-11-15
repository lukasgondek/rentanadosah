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

const propertyValidationSchema = z.object({
  identifier: z.string().trim().min(1, "Identifikátor je povinný").max(200, "Identifikátor je příliš dlouhý"),
  purchase_price: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká"),
  estimated_value: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká"),
  monthly_rent: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká").optional(),
  monthly_expenses: z.number().min(0, "Částka nemůže být záporná").max(999999999, "Částka je příliš vysoká").optional(),
  yearly_appreciation_percent: z.number().min(-100, "Procento nemůže být nižší než -100").max(1000, "Procento je příliš vysoké").optional(),
});

export const PropertyDialog = ({ onSuccess }: { onSuccess: () => void }) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    identifier: "",
    purchase_price: "",
    estimated_value: "",
    monthly_rent: "",
    monthly_expenses: "",
    yearly_appreciation_percent: "",
    is_forecast: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validationData = {
        identifier: formData.identifier,
        purchase_price: parseFloat(formData.purchase_price),
        estimated_value: parseFloat(formData.estimated_value),
        monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : undefined,
        monthly_expenses: formData.monthly_expenses ? parseFloat(formData.monthly_expenses) : undefined,
        yearly_appreciation_percent: formData.yearly_appreciation_percent ? parseFloat(formData.yearly_appreciation_percent) : undefined,
      };

      propertyValidationSchema.parse(validationData);
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

    const { error } = await supabase.from("properties").insert({
      user_id: user.id,
      identifier: formData.identifier,
      purchase_price: parseFloat(formData.purchase_price),
      estimated_value: parseFloat(formData.estimated_value),
      monthly_rent: formData.monthly_rent ? parseFloat(formData.monthly_rent) : null,
      monthly_expenses: formData.monthly_expenses ? parseFloat(formData.monthly_expenses) : null,
      yearly_appreciation_percent: formData.yearly_appreciation_percent ? parseFloat(formData.yearly_appreciation_percent) : null,
      is_forecast: formData.is_forecast,
    });

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se přidat nemovitost",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Úspěch",
      description: "Nemovitost byla přidána",
    });

    setFormData({
      identifier: "",
      purchase_price: "",
      estimated_value: "",
      monthly_rent: "",
      monthly_expenses: "",
      yearly_appreciation_percent: "",
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
          Přidat nemovitost
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Přidat nemovitost</DialogTitle>
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_forecast"
              checked={formData.is_forecast}
              onCheckedChange={(checked) => setFormData({ ...formData, is_forecast: checked as boolean })}
            />
            <Label htmlFor="is_forecast" className="text-sm font-normal cursor-pointer">
              Jedná se o plánovanou nemovitost
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit">
              Přidat nemovitost
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
