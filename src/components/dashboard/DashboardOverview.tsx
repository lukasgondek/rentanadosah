import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  description?: string;
  icon: React.ElementType;
  trend?: "up" | "down";
}

const MetricCard = ({ title, value, change, description, icon: Icon, trend }: MetricCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="p-2 bg-primary/10 rounded-full">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className={cn(
            "text-xs flex items-center gap-1 mt-1",
            trend === "up" ? "text-success" : "text-destructive"
          )}>
            {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {change > 0 ? "+" : ""}{change.toFixed(1)}%
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

const formatCzk = (amount: number) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(amount);

const DashboardOverview = ({ userId: viewUserId }: { userId?: string | null } = {}) => {
  const [incomeSummary, setIncomeSummary] = useState({
    employment: 0,
    selfEmployed: 0,
    rental: 0,
    business: 0,
    other: 0,
    total: 0,
  });
  const [expenseSummary, setExpenseSummary] = useState({
    regular: 0,
    irregular: 0,
    total: 0,
  });
  const [netWorth, setNetWorth] = useState(0);
  const [monthlyLoanPayments, setMonthlyLoanPayments] = useState(0);
  const [monthlyCashflow, setMonthlyCashflow] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const targetUserId = viewUserId || user.id;

      // 1. Income sources
      const { data: incomeData, error: incomeError } = await supabase
        .from("income_sources")
        .select("type, monthly_amount")
        .eq("user_id", targetUserId);

      if (incomeError) {
        toast({ title: "Chyba", description: "Nepodařilo se načíst příjmy", variant: "destructive" });
        return;
      }

      const income = incomeData || [];
      const employment = income.filter(i => i.type === "salary").reduce((s, i) => s + (i.monthly_amount || 0), 0);
      const selfEmployed = income.filter(i => i.type === "self_employed").reduce((s, i) => s + (i.monthly_amount || 0), 0);
      const rental = income.filter(i => i.type === "rental").reduce((s, i) => s + (i.monthly_amount || 0), 0);
      const business = income.filter(i => i.type === "business").reduce((s, i) => s + (i.monthly_amount || 0), 0);
      const other = income.filter(i => i.type === "other").reduce((s, i) => s + (i.monthly_amount || 0), 0);
      const totalIncome = employment + selfEmployed + rental + business + other;

      setIncomeSummary({ employment, selfEmployed, rental, business, other, total: totalIncome });

      // 2. Expenses
      const { data: expenseData } = await supabase
        .from("expenses")
        .select("amount, is_recurring, frequency")
        .eq("user_id", targetUserId);

      const expenses = expenseData || [];
      const toMonthly = (e: { amount: number; frequency?: string | null }) =>
        e.frequency === "yearly" ? (e.amount || 0) / 12 : (e.amount || 0);
      const regular = expenses.filter(e => e.is_recurring).reduce((s, e) => s + toMonthly(e), 0);
      const irregular = expenses.filter(e => !e.is_recurring).reduce((s, e) => s + toMonthly(e), 0);
      setExpenseSummary({ regular, irregular, total: regular + irregular });

      // 3. Loans — monthly payments + remaining principal
      const { data: loanData } = await supabase
        .from("loans")
        .select("monthly_payment, remaining_principal")
        .eq("user_id", targetUserId)
        .not("is_forecast", "eq", true);

      const loans = loanData || [];
      const totalLoanPayments = loans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
      const totalLoanDebt = loans.reduce((s, l) => s + (l.remaining_principal || 0), 0);
      setMonthlyLoanPayments(totalLoanPayments);

      // 4. Investments — current value
      const { data: investmentData } = await supabase
        .from("investments")
        .select("amount, yearly_return_percent")
        .eq("user_id", targetUserId)
        .not("is_forecast", "eq", true);

      const investments = investmentData || [];
      const totalInvestments = investments.reduce((s, i) => s + (i.amount || 0), 0);

      // 5. Properties — estimated value + monthly cashflow
      const { data: propertyData } = await supabase
        .from("properties")
        .select("estimated_value, monthly_rent, monthly_expenses")
        .eq("user_id", targetUserId)
        .not("is_forecast", "eq", true);

      const properties = propertyData || [];
      const totalPropertyValue = properties.reduce((s, p) => s + (p.estimated_value || 0), 0);
      const netPropertyIncome = properties.reduce(
        (s, p) => s + (p.monthly_rent || 0) - (p.monthly_expenses || 0), 0
      );

      // Net Worth = investments + property values - loan debts
      const calculatedNetWorth = totalInvestments + totalPropertyValue - totalLoanDebt;
      setNetWorth(calculatedNetWorth);

      // Monthly Cashflow = income + net property income - loan payments - personal expenses
      const cashflow = totalIncome + netPropertyIncome - totalLoanPayments - (regular + irregular);
      setMonthlyCashflow(cashflow);
    };

    fetchAllData();
  }, [viewUserId]);

  const netWorth5yr = netWorth + monthlyCashflow * 60;
  const netWorth10yr = netWorth + monthlyCashflow * 120;

  const cashflowTrend = monthlyCashflow >= 0 ? "up" : "down";
  const nw5yrChange = netWorth > 0 ? ((netWorth5yr - netWorth) / netWorth) * 100 : 0;
  const nw10yrChange = netWorth > 0 ? ((netWorth10yr - netWorth) / netWorth) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Přehled vašich financí a investic
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Měsíční cashflow"
          value={formatCzk(monthlyCashflow)}
          trend={cashflowTrend}
          description="Příjmy − výdaje − splátky"
          icon={Wallet}
        />
        <MetricCard
          title="Celkový majetek (Net Worth)"
          value={formatCzk(netWorth)}
          description="Investice + nemovitosti − dluhy"
          icon={DollarSign}
        />
        <MetricCard
          title="Net Worth za 5 let"
          value={formatCzk(netWorth5yr)}
          change={nw5yrChange}
          trend={netWorth5yr >= netWorth ? "up" : "down"}
          description="Odhad při aktuálním cashflow"
          icon={TrendingUp}
        />
        <MetricCard
          title="Net Worth za 10 let"
          value={formatCzk(netWorth10yr)}
          change={nw10yrChange}
          trend={netWorth10yr >= netWorth ? "up" : "down"}
          description="Odhad při aktuálním cashflow"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shrnutí příjmů</CardTitle>
            <CardDescription>Vaše měsíční příjmy podle typu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Zaměstnanecký</span>
                <span className="font-medium">{formatCzk(incomeSummary.employment)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">OSVČ</span>
                <span className="font-medium">{formatCzk(incomeSummary.selfEmployed)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Realitní</span>
                <span className="font-medium">{formatCzk(incomeSummary.rental)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Firemní</span>
                <span className="font-medium">{formatCzk(incomeSummary.business)}</span>
              </div>
              {incomeSummary.other > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Ostatní</span>
                  <span className="font-medium">{formatCzk(incomeSummary.other)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-medium">Celkem měsíčně</span>
                <span className="font-bold">{formatCzk(incomeSummary.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shrnutí výdajů</CardTitle>
            <CardDescription>Vaše měsíční náklady</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Pravidelné výdaje</span>
                <span className="font-medium">{formatCzk(expenseSummary.regular)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Nepravidelné výdaje</span>
                <span className="font-medium">{formatCzk(expenseSummary.irregular)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Splátky úvěrů</span>
                <span className="font-medium">{formatCzk(monthlyLoanPayments)}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-medium">Celkem měsíčně</span>
                <span className="font-bold">{formatCzk(expenseSummary.total + monthlyLoanPayments)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {incomeSummary.total === 0 && netWorth === 0 && (
        <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle>Začněte vyplňovat své údaje</CardTitle>
            <CardDescription>
              Pro zobrazení přesných výpočtů a prognóz prosím vyplňte své příjmy, výdaje, investice, úvěry a nemovitosti v příslušných sekcích.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

export default DashboardOverview;
