import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface InvestmentDialogProps {
  onSuccess: () => void;
  editData?: any;
}

export const InvestmentDialog = ({ onSuccess, editData }: InvestmentDialogProps) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: editData?.name || "",
    type: editData?.type || "cash",
    amount: editData?.amount?.toString() || "",
    yearly_return_percent: editData?.yearly_return_percent?.toString() || "",
    liquidity_months: editData?.liquidity_months?.toString() || "",
    is_forecast: editData?.is_forecast || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate amount
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount < 0) {
      toast({
        title: "Chyba validace",
        description: "Vyplňte částku investice",
        variant: "destructive",
      });
      return;
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
      name: formData.name?.trim() || "Bez názvu",
      type: formData.type,
      amount: parseFloat(formData.amount),
      yearly_return_percent: formData.yearly_return_percent ? parseFloat(formData.yearly_return_percent) : null,
      liquidity_months: formData.liquidity_months ? parseInt(formData.liquidity_months) : null,
      is_forecast: formData.is_forecast,
    };

    let error;
    if (editData) {
      ({ error } = await supabase.from("investments").update(dataToSave).eq("id", editData.id));
    } else {
      ({ error } = await supabase.from("investments").insert(dataToSave));
    }

    if (error) {
      toast({
        title: "Chyba",
        description: editData ? "Nepodařilo se upravit investici" : "Nepodařilo se přidat investici",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Úspěch",
      description: editData ? "Investice byla upravena" : "Investice byla přidána",
    });

    setFormData({
      name: "",
      type: "cash",
      amount: "",
      yearly_return_percent: "",
      liquidity_months: "",
      is_forecast: false,
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
            Přidat investici
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Upravit investici" : "Přidat investici"}</DialogTitle>
          <DialogDescription>
            Vyplňte informace o vaší investici
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Typ investice</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Hotovost</SelectItem>
                  <SelectItem value="stocks">Akcie</SelectItem>
                  <SelectItem value="bonds">Dluhopisy</SelectItem>
                  <SelectItem value="crypto">Kryptoměny</SelectItem>
                  <SelectItem value="etf">ETF</SelectItem>
                  <SelectItem value="mutual_fund">Podílový fond</SelectItem>
                  <SelectItem value="other">Jiné</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Název</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Např. Spořicí účet"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Hodnota investice (Kč)</Label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="100000"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Roční zhodnocení (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.yearly_return_percent}
                onChange={(e) => setFormData({ ...formData, yearly_return_percent: e.target.value })}
                placeholder="5.0"
              />
            </div>

            <div className="space-y-2">
              <Label>Doba likvidace (měsíce)</Label>
              <Input
                type="number"
                value={formData.liquidity_months}
                onChange={(e) => setFormData({ ...formData, liquidity_months: e.target.value })}
                placeholder="3"
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
              Jedná se o plánovanou investici
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit">
              Přidat investici
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
