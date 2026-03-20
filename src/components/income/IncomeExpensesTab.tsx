import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { IncomeDialog } from "./IncomeDialog";
import { IncomeTable } from "./IncomeTable";
import { ExpenseDialog } from "@/components/expenses/ExpenseDialog";
import { ExpenseTable } from "@/components/expenses/ExpenseTable";
import { formatCurrency } from "@/lib/utils";

interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency: string | null;
  is_recurring: boolean | null;
}

const IncomeExpensesTab = ({ userId: viewUserId, isAdmin = false }: { userId?: string | null; isAdmin?: boolean } = {}) => {
  const [incomeSources, setIncomeSources] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const readOnly = !!viewUserId && !isAdmin;

  const fetchIncomeSources = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const targetUserId = viewUserId || user.id;

    const { data, error } = await supabase
      .from("income_sources")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setIncomeSources(data);
    }
  };

  const fetchExpenses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const targetUserId = viewUserId || user.id;

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setExpenses(data as Expense[]);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchIncomeSources(), fetchExpenses()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [viewUserId]);

  const selfIncome = incomeSources.filter(i => i.owner_type === "self");
  const partnerIncome = incomeSources.filter(i => i.owner_type === "partner");

  const calculateTotalMonthly = (sources: any[]) => {
    return sources.reduce((sum, income) => sum + (income.monthly_amount || 0), 0);
  };

  const calculateTotalYearly = (sources: any[]) => {
    return sources.reduce((sum, income) => sum + (income.yearly_amount || (income.monthly_amount || 0) * 12), 0);
  };

  const totalMonthlyExpenses = expenses.reduce((sum, e) => {
    const monthly = e.frequency === "yearly" ? e.amount / 12 : e.amount;
    return sum + monthly;
  }, 0);

  const totalMonthlyIncome = calculateTotalMonthly(incomeSources);
  const monthlyCashflow = totalMonthlyIncome - totalMonthlyExpenses;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Příjmy & Výdaje</h2>
        <p className="text-muted-foreground">
          Spravujte své příjmy a výdaje podle daňových kategorií
        </p>
      </div>

      {!loading && (incomeSources.length > 0 || expenses.length > 0) && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Příjmy celkem/měs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalMonthlyIncome)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Výdaje celkem/měs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {formatCurrency(totalMonthlyExpenses)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cashflow/měs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${monthlyCashflow >= 0 ? "text-green-600" : "text-red-500"}`}>
                {monthlyCashflow >= 0 ? "+" : ""}{formatCurrency(monthlyCashflow)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
                {!readOnly && <IncomeDialog onSuccess={fetchIncomeSources} userId={viewUserId || undefined} />}
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
                    <span className="font-bold text-lg">{formatCurrency(calculateTotalMonthly(selfIncome))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Roční příjem celkem:</span>
                    <span className="font-bold text-lg">{formatCurrency(calculateTotalYearly(selfIncome))}</span>
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
                    <span className="font-bold text-lg">{formatCurrency(calculateTotalMonthly(partnerIncome))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Roční příjem celkem:</span>
                    <span className="font-bold text-lg">{formatCurrency(calculateTotalYearly(partnerIncome))}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pravidelné výdaje</CardTitle>
                  <CardDescription>Měsíční a roční náklady</CardDescription>
                </div>
                {!readOnly && <ExpenseDialog onSuccess={fetchExpenses} userId={viewUserId || undefined} />}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Načítání...</div>
              ) : (
                <ExpenseTable expenses={expenses} onDelete={fetchExpenses} />
              )}
            </CardContent>
          </Card>

          {!loading && expenses.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Shrnutí výdajů</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Měsíční výdaje celkem:</span>
                      <span className="font-bold text-lg text-red-500">
                        {formatCurrency(totalMonthlyExpenses)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Roční výdaje celkem:</span>
                      <span className="font-bold text-lg">
                        {formatCurrency(totalMonthlyExpenses * 12)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Počet výdajů:</span>
                      <span className="font-bold">{expenses.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cashflow</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Příjmy/měs:</span>
                      <span className="font-bold text-green-600">
                        +{formatCurrency(totalMonthlyIncome)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Výdaje/měs:</span>
                      <span className="font-bold text-red-500">
                        -{formatCurrency(totalMonthlyExpenses)}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-center">
                      <span className="text-sm font-semibold">Čistý cashflow/měs:</span>
                      <span className={`font-bold text-lg ${monthlyCashflow >= 0 ? "text-green-600" : "text-red-500"}`}>
                        {monthlyCashflow >= 0 ? "+" : ""}{formatCurrency(monthlyCashflow)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IncomeExpensesTab;
