import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InvestmentDialog } from "./InvestmentDialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const InvestmentsTab = () => {
  const [investments, setInvestments] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchInvestments = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("investments")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst investice",
        variant: "destructive",
      });
      return;
    }

    setInvestments(data || []);
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const totalValue = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const avgReturn = investments.length > 0
    ? investments.reduce((sum, inv) => sum + (inv.yearly_return_percent || 0), 0) / investments.length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Investice</h2>
        <p className="text-muted-foreground">
          Správa vašeho investičního portfolia
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Portfolio investic</CardTitle>
                <CardDescription>Hotovost, akcie, krypto a další</CardDescription>
              </div>
              <InvestmentDialog onSuccess={fetchInvestments} />
            </div>
          </CardHeader>
          <CardContent>
            {investments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Zatím nemáte žádné investice. Klikněte na tlačítko výše pro přidání.
              </div>
            ) : (
              <div className="space-y-3">
                {investments.map((investment) => (
                  <div key={investment.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{investment.name || investment.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {investment.yearly_return_percent && `${investment.yearly_return_percent}% ročně`}
                        {investment.is_forecast && <span className="ml-2 text-xs">(plán)</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{investment.amount.toLocaleString()} Kč</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Realitní multiplikátor</CardTitle>
            <CardDescription>Potenciál využití páky pro nemovitosti</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Volná hotovost:</span>
                <span className="font-medium">0 Kč</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">LTV 75% - možnost úvěru:</span>
                <span className="font-medium">0 Kč</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Průměrný měsíční příjem na 1M:</span>
                <span className="font-medium">0 Kč</span>
              </div>
              <div className="flex justify-between items-center border-t pt-3">
                <span className="font-medium">Zhodnocení vlastních peněz:</span>
                <span className="font-bold">0%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shrnutí investic</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Celková hodnota</div>
              <div className="text-2xl font-bold">{totalValue.toLocaleString()} Kč</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Průměrné zhodnocení</div>
              <div className="text-2xl font-bold">{avgReturn.toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Počet investic</div>
              <div className="text-2xl font-bold">{investments.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentsTab;
