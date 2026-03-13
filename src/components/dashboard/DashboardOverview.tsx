import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TrendingUp, TrendingDown, Wallet, DollarSign, Download, FileText, FileSpreadsheet } from "lucide-react";
import { cn, formatCurrency, formatNumber, calculateAnnuity } from "@/lib/utils";
import { exportToPDF, exportToExcel, type ExportData } from "@/lib/export";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MetricCardProps {
  title: string;
  value: string;
  description?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}

const MetricCard = ({ title, value, description, icon: Icon, trend }: MetricCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="p-2 bg-primary/10 rounded-full">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn(
          "text-2xl font-bold",
          trend === "down" && "text-destructive"
        )}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

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
  const [loanPayments, setLoanPayments] = useState(0);
  const [netWorth, setNetWorth] = useState({
    current: 0,
    fiveYear: 0,
    tenYear: 0,
  });
  const [forecastSteps, setForecastSteps] = useState<any[]>([]);
  const rawDataRef = useRef<{
    incomeData: any[];
    expenseData: any[];
    loanData: any[];
    propertyData: any[];
    investmentData: any[];
  }>({ incomeData: [], expenseData: [], loanData: [], propertyData: [], investmentData: [] });
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const targetUserId = viewUserId || user.id;

      // Fetch all data in parallel
      const [incomeRes, expenseRes, loanRes, propertyRes, investmentRes, plannedRes] = await Promise.all([
        supabase.from("income_sources").select("*").eq("user_id", targetUserId),
        supabase.from("expenses").select("*").eq("user_id", targetUserId),
        supabase.from("loans").select("*").eq("user_id", targetUserId).eq("is_forecast", false),
        supabase.from("properties").select("*").eq("user_id", targetUserId).eq("is_forecast", false),
        supabase.from("investments").select("*").eq("user_id", targetUserId).eq("is_forecast", false),
        supabase.from("planned_investments").select("*").eq("user_id", targetUserId).order("created_at", { ascending: true }),
      ]);

      if (incomeRes.error || expenseRes.error || loanRes.error || propertyRes.error || investmentRes.error) {
        toast({
          title: "Chyba",
          description: "Nepodařilo se načíst data pro dashboard",
          variant: "destructive",
        });
        return;
      }

      const incomeData = incomeRes.data || [];
      const expenseData = expenseRes.data || [];
      const loanData = loanRes.data || [];
      const propertyData = propertyRes.data || [];
      const investmentData = investmentRes.data || [];

      // Store raw data for export
      rawDataRef.current = { incomeData, expenseData, loanData, propertyData, investmentData };

      // ── Income ──
      const employment = incomeData
        .filter(item => item.type === "salary")
        .reduce((sum, item) => sum + (item.monthly_amount || 0), 0);
      const selfEmployed = incomeData
        .filter(item => item.type === "self_employed")
        .reduce((sum, item) => sum + (item.monthly_amount || 0), 0);
      const rental = incomeData
        .filter(item => item.type === "rental")
        .reduce((sum, item) => sum + (item.monthly_amount || 0), 0);
      const business = incomeData
        .filter(item => item.type === "business")
        .reduce((sum, item) => sum + (item.monthly_amount || 0), 0);
      const other = incomeData
        .filter(item => item.type === "other")
        .reduce((sum, item) => sum + (item.monthly_amount || 0), 0);
      const totalIncome = employment + selfEmployed + rental + business + other;

      setIncomeSummary({ employment, selfEmployed, rental, business, other, total: totalIncome });

      // ── Expenses ──
      const toMonthly = (e: { amount?: number | null; frequency?: string | null; is_recurring?: boolean | null; monthly_amount?: number | null; yearly_amount?: number | null }) => {
        if (e.monthly_amount) return e.monthly_amount;
        if (e.yearly_amount) return e.yearly_amount / 12;
        if (e.frequency === "yearly") return (e.amount || 0) / 12;
        return e.amount || 0;
      };
      const regularExpenses = expenseData
        .filter(item => item.is_recurring || item.is_regular)
        .reduce((sum, item) => sum + toMonthly(item), 0);
      const irregularExpenses = expenseData
        .filter(item => !item.is_recurring && !item.is_regular)
        .reduce((sum, item) => sum + toMonthly(item), 0);
      const totalExpenses = regularExpenses + irregularExpenses;

      setExpenseSummary({ regular: regularExpenses, irregular: irregularExpenses, total: totalExpenses });

      // ── Loan payments ──
      const totalLoanPayments = loanData.reduce((sum, loan) => sum + (loan.monthly_payment || 0), 0);
      setLoanPayments(totalLoanPayments);

      // ── Net Worth ──
      const propertyValue = propertyData.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
      const investmentValue = investmentData.reduce((sum, i) => sum + (i.amount || 0), 0);
      const totalDebt = loanData.reduce((sum, l) => sum + (l.remaining_principal || 0), 0);
      const currentNetWorth = propertyValue + investmentValue - totalDebt;

      // 5/10 year projections
      const avgAppreciation = propertyData.length > 0
        ? propertyData.reduce((sum, p) => sum + (p.yearly_appreciation_percent || 3), 0) / propertyData.length
        : 3;
      const avgInvestReturn = investmentData.length > 0
        ? investmentData.reduce((sum, i) => sum + (i.yearly_return_percent || 0), 0) / investmentData.length
        : 0;

      // Simple compound projection
      const property5yr = propertyValue * Math.pow(1 + avgAppreciation / 100, 5);
      const invest5yr = investmentValue * Math.pow(1 + avgInvestReturn / 100, 5);
      // Approximate remaining debt after 5 years of payments
      const monthlyPrincipal = totalLoanPayments > 0 ? totalLoanPayments * 0.4 : 0; // rough estimate: ~40% of payment goes to principal
      const debt5yr = Math.max(0, totalDebt - monthlyPrincipal * 60);
      const fiveYearNetWorth = property5yr + invest5yr - debt5yr;

      const property10yr = propertyValue * Math.pow(1 + avgAppreciation / 100, 10);
      const invest10yr = investmentValue * Math.pow(1 + avgInvestReturn / 100, 10);
      const debt10yr = Math.max(0, totalDebt - monthlyPrincipal * 120);
      const tenYearNetWorth = property10yr + invest10yr - debt10yr;

      setNetWorth({ current: currentNetWorth, fiveYear: fiveYearNetWorth, tenYear: tenYearNetWorth });

      // ── Forecast: chain planned investments ──
      const plannedData = plannedRes.data || [];
      if (plannedData.length > 0) {
        let runningCashflow = totalIncome - totalExpenses - totalLoanPayments;
        let runningPropertyValue = propertyValue;
        let runningDebt = totalDebt;
        let runningInvestmentValue = investmentValue;

        const steps = plannedData.map((plan: any, index: number) => {
          const planMonthlyPayment = calculateAnnuity(plan.loan_amount || 0, plan.interest_rate || 0, plan.term_months || 300);
          const planCashflow = (plan.monthly_rent || 0) - (plan.monthly_expenses || 0);
          const cashflowImpact = planCashflow - planMonthlyPayment;

          runningCashflow += cashflowImpact;
          runningPropertyValue += (plan.estimated_value || 0);
          runningDebt += (plan.loan_amount || 0);

          const runningNetWorth = runningPropertyValue + runningInvestmentValue - runningDebt;

          return {
            step: index + 1,
            name: plan.property_identifier,
            cashflowImpact: Math.round(cashflowImpact),
            totalCashflow: Math.round(runningCashflow),
            netWorth: Math.round(runningNetWorth),
            newDebt: plan.loan_amount || 0,
            propertyValue: plan.estimated_value || 0,
          };
        });

        setForecastSteps(steps);
      }
    };

    fetchAllData();
  }, [viewUserId]);

  const monthlyCashflow = incomeSummary.total - expenseSummary.total - loanPayments;

  const toMonthlyExpense = (e: any): number => {
    if (e.monthly_amount) return e.monthly_amount;
    if (e.yearly_amount) return e.yearly_amount / 12;
    if (e.frequency === "yearly") return (e.amount || 0) / 12;
    return e.amount || 0;
  };

  const buildExportData = (): ExportData => {
    const { incomeData, expenseData, loanData, propertyData, investmentData } = rawDataRef.current;
    return {
      monthlyCashflow,
      netWorth: netWorth.current,
      netWorth5yr: netWorth.fiveYear,
      netWorth10yr: netWorth.tenYear,
      incomes: incomeData.map((i: any) => ({
        name: i.name || "Bez názvu",
        type: i.type || "other",
        monthlyAmount: i.monthly_amount || 0,
        yearlyAmount: i.yearly_amount || (i.monthly_amount ? i.monthly_amount * 12 : 0),
      })),
      expenses: expenseData.map((e: any) => ({
        name: e.name || "Bez názvu",
        monthlyAmount: toMonthlyExpense(e),
        isRecurring: !!(e.is_recurring || e.is_regular),
      })),
      loans: loanData.map((l: any) => ({
        name: l.name || "Bez názvu",
        bankName: l.bank_name || null,
        originalAmount: l.original_amount || 0,
        remainingPrincipal: l.remaining_principal || 0,
        monthlyPayment: l.monthly_payment || 0,
        interestRate: l.interest_rate || 0,
        termMonths: l.term_months || 0,
      })),
      properties: propertyData.map((p: any) => ({
        identifier: p.identifier || "Bez názvu",
        purchasePrice: p.purchase_price || 0,
        estimatedValue: p.estimated_value || 0,
        monthlyRent: p.monthly_rent || 0,
        monthlyExpenses: p.monthly_expenses || 0,
      })),
      investments: investmentData.map((i: any) => ({
        name: i.name || "Bez názvu",
        type: i.type || "other",
        amount: i.amount || 0,
        yearlyReturnPercent: i.yearly_return_percent || 0,
      })),
    };
  };

  const handleExport = (format: "pdf" | "excel") => {
    try {
      const data = buildExportData();
      if (format === "pdf") {
        exportToPDF(data);
      } else {
        exportToExcel(data);
      }
      toast({ title: "Export úspěšný", description: `Soubor byl stažen ve formátu ${format === "pdf" ? "PDF" : "Excel"}.` });
    } catch (error) {
      toast({ title: "Chyba exportu", description: "Nepodařilo se exportovat data.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Přehled vašich financí a investic
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportovat
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport("pdf")}>
              <FileText className="mr-2 h-4 w-4" />
              Stáhnout PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("excel")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Stáhnout Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Měsíční cashflow"
          value={formatCurrency(monthlyCashflow)}
          trend={monthlyCashflow >= 0 ? "up" : "down"}
          description="Příjmy − výdaje − splátky"
          icon={Wallet}
        />
        <MetricCard
          title="Celkový majetek (Net Worth)"
          value={formatCurrency(netWorth.current)}
          description="Nemovitosti + investice − dluhy"
          icon={DollarSign}
        />
        <MetricCard
          title="Net Worth za 5 let"
          value={formatCurrency(netWorth.fiveYear)}
          trend="up"
          description="Odhadovaná hodnota"
          icon={TrendingUp}
        />
        <MetricCard
          title="Net Worth za 10 let"
          value={formatCurrency(netWorth.tenYear)}
          trend="up"
          description="Odhadovaná hodnota"
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
                <span className="font-medium">{formatCurrency(incomeSummary.employment)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">OSVČ</span>
                <span className="font-medium">{formatCurrency(incomeSummary.selfEmployed)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Realitní</span>
                <span className="font-medium">{formatCurrency(incomeSummary.rental)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Firemní</span>
                <span className="font-medium">{formatCurrency(incomeSummary.business)}</span>
              </div>
              {incomeSummary.other > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Ostatní</span>
                  <span className="font-medium">{formatCurrency(incomeSummary.other)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-medium">Celkem měsíčně</span>
                <span className="font-bold">{formatCurrency(incomeSummary.total)}</span>
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
                <span className="font-medium">{formatCurrency(expenseSummary.regular)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Nepravidelné výdaje</span>
                <span className="font-medium">{formatCurrency(expenseSummary.irregular)}</span>
              </div>
              {loanPayments > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Splátky úvěrů</span>
                  <span className="font-medium">{formatCurrency(loanPayments)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-medium">Celkem měsíčně</span>
                <span className="font-bold">{formatCurrency(expenseSummary.total + loanPayments)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {forecastSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Prognóza po realizaci plánů</CardTitle>
            <CardDescription>
              Jak se změní vaše portfolio po každém plánovaném kroku
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Krok</TableHead>
                  <TableHead>Nemovitost</TableHead>
                  <TableHead className="text-right">Dopad na cashflow</TableHead>
                  <TableHead className="text-right">Celkový cashflow</TableHead>
                  <TableHead className="text-right">Celkový majetek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/30">
                  <TableCell className="font-medium">Aktuálně</TableCell>
                  <TableCell>—</TableCell>
                  <TableCell className="text-right">—</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(incomeSummary.total - expenseSummary.total - loanPayments)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(netWorth.current)}
                  </TableCell>
                </TableRow>
                {forecastSteps.map((step) => (
                  <TableRow key={step.step}>
                    <TableCell className="font-medium">Krok {step.step}</TableCell>
                    <TableCell>{step.name}</TableCell>
                    <TableCell className={cn(
                      "text-right",
                      step.cashflowImpact < 0 ? "text-destructive" : "text-green-600"
                    )}>
                      {step.cashflowImpact >= 0 ? "+" : ""}{formatCurrency(step.cashflowImpact)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-semibold",
                      step.totalCashflow < 0 && "text-destructive"
                    )}>
                      {formatCurrency(step.totalCashflow)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(step.netWorth)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {incomeSummary.total === 0 && netWorth.current === 0 && (
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
