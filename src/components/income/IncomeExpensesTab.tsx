import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { IncomeDialog } from "./IncomeDialog";
import { IncomeTable } from "./IncomeTable";

const IncomeExpensesTab = () => {
  const [incomeSources, setIncomeSources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncomeSources = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setIncomeSources(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchIncomeSources();
  }, []);

  const selfIncome = incomeSources.filter(i => i.owner_type === "self");
  const partnerIncome = incomeSources.filter(i => i.owner_type === "partner");

  const calculateTotalMonthly = (sources: any[]) => {
    return sources.reduce((sum, income) => {
      if (income.category === "employment") {
        return sum + (income.net_salary || 0);
      } else if (income.category === "other") {
        const amount = income.other_amount || 0;
        return sum + (income.other_frequency === "yearly" ? amount / 12 : amount);
      }
      return sum;
    }, 0);
  };

  const calculateTotalYearly = (sources: any[]) => {
    return sources.reduce((sum, income) => {
      if (income.category === "employment") {
        return sum + (income.net_salary || 0) * 12;
      } else if (income.category === "other") {
        const amount = income.other_amount || 0;
        return sum + (income.other_frequency === "monthly" ? amount * 12 : amount);
      }
      return sum;
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Příjmy & Výdaje</h2>
        <p className="text-muted-foreground">
          Spravujte své příjmy a výdaje podle daňových kategorií
        </p>
      </div>

      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="income">Příjmy</TabsTrigger>
          <TabsTrigger value="expenses">Výdaje</TabsTrigger>
        </TabsList>
        
        <TabsContent value="income" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Přehled příjmů</CardTitle>
                  <CardDescription>Všechny kategorie příjmů pro vás i vašeho partnera</CardDescription>
                </div>
                <IncomeDialog onSuccess={fetchIncomeSources} />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Načítání...</div>
              ) : (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Moje příjmy</h3>
                    <IncomeTable incomeSources={selfIncome} onDelete={fetchIncomeSources} />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Finance životního partnera</h3>
                    <IncomeTable incomeSources={partnerIncome} onDelete={fetchIncomeSources} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Shrnutí - Já</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Měsíční příjem celkem:</span>
                    <span className="font-bold text-lg">{calculateTotalMonthly(selfIncome).toLocaleString("cs-CZ")} Kč</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Roční příjem celkem:</span>
                    <span className="font-bold text-lg">{calculateTotalYearly(selfIncome).toLocaleString("cs-CZ")} Kč</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shrnutí - Partner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Měsíční příjem celkem:</span>
                    <span className="font-bold text-lg">{calculateTotalMonthly(partnerIncome).toLocaleString("cs-CZ")} Kč</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Roční příjem celkem:</span>
                    <span className="font-bold text-lg">{calculateTotalYearly(partnerIncome).toLocaleString("cs-CZ")} Kč</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pravidelné výdaje</CardTitle>
              <CardDescription>Měsíční pravidelné náklady</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Zatím nemáte žádné výdaje. Funkce bude dostupná brzy.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IncomeExpensesTab;
