import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatNumber as fmtNum, calculateAnnuity } from "@/lib/utils";

/** Safely parse a numeric input value — returns undefined for empty/NaN */
const parseNum = (val: string): number | undefined => {
  if (!val || val.trim() === "") return undefined;
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
};

interface PlannedInvestmentDialogProps {
  onSuccess: () => void;
  editData?: any;
}

export const PlannedInvestmentDialog = ({ onSuccess, editData }: PlannedInvestmentDialogProps) => {
  const [open, setOpen] = useState(!!editData);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    property_identifier: editData?.property_identifier || "",
    purchase_price: editData?.purchase_price?.toString() || "",
    estimated_value: editData?.estimated_value?.toString() || "",
    monthly_rent: editData?.monthly_rent?.toString() || "",
    monthly_expenses: editData?.monthly_expenses?.toString() || "",
    appreciation_percent: editData?.appreciation_percent?.toString() || "5",
    rent_growth_percent: editData?.rent_growth_percent?.toString() || "5",
    loan_amount: editData?.loan_amount?.toString() || "",
    interest_rate: editData?.interest_rate?.toString() || "",
    ltv_percent: editData?.ltv_percent?.toString() || "",
    term_months: editData ? Math.round(editData.term_months / 12).toString() : "",
  });

  const [currentDashboardCashflow, setCurrentDashboardCashflow] = useState(0);

  const [calculations, setCalculations] = useState({
    cashflow: 0,
    monthly_payment: 0,
    monthly_interest: 0,
    principal_payment: 0,
    net_annual_rent_profit: 0,
    annual_appreciation_profit: 0,
    net_annual_profit: 0,
    net_profit_5_years: 0,
    net_profit_10_years: 0,
    current_cashflow_impact: 0,
    cashflow_after_transaction: 0,
    cash_remaining: 0,
  });

  useEffect(() => {
    if (editData) {
      setOpen(true);
    }
  }, [editData]);

  // Fetch actual current cashflow from DB
  useEffect(() => {
    const fetchCashflow = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Parallel fetch income, expenses, loans
      const [incomeRes, expensesRes, loansRes] = await Promise.all([
        supabase.from("income_sources").select("monthly_amount").eq("user_id", user.id),
        supabase.from("expenses").select("amount").eq("user_id", user.id),
        supabase.from("loans").select("monthly_payment").eq("user_id", user.id).eq("is_forecast", false),
      ]);

      const totalIncome = (incomeRes.data || []).reduce((sum, i) => sum + (i.monthly_amount || 0), 0);
      const totalExpenses = (expensesRes.data || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalLoanPayments = (loansRes.data || []).reduce((sum, l) => sum + (l.monthly_payment || 0), 0);

      setCurrentDashboardCashflow(totalIncome - totalExpenses - totalLoanPayments);
    };
    fetchCashflow();
  }, []);

  // Calculate all derived values
  useEffect(() => {
    const monthlyRent = parseFloat(formData.monthly_rent) || 0;
    const monthlyExpenses = parseFloat(formData.monthly_expenses) || 0;
    const loanAmount = parseFloat(formData.loan_amount) || 0;
    const interestRate = parseFloat(formData.interest_rate) || 0;
    const termYears = parseFloat(formData.term_months) || 0;
    const purchasePrice = parseFloat(formData.purchase_price) || 0;
    const estimatedValue = parseFloat(formData.estimated_value) || 0;
    const appreciationPercent = parseFloat(formData.appreciation_percent) || 5;
    const rentGrowthPercent = parseFloat(formData.rent_growth_percent) || 5;

    // Cashflow
    const cashflow = monthlyRent - monthlyExpenses;

    // Monthly payment calculation (annuity formula)
    const monthlyRate = interestRate / 100 / 12;
    const termMonths = termYears * 12;
    let monthlyPayment = 0;
    if (loanAmount > 0 && monthlyRate > 0 && termMonths > 0) {
      monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
    }

    // Monthly interest and principal
    const monthlyInterest = loanAmount * monthlyRate;
    const principalPayment = monthlyPayment - monthlyInterest;

    // Net annual rent profit (cashflow - interest)
    const netAnnualRentProfit = (cashflow * 12) - (monthlyInterest * 12);

    // Annual appreciation profit
    const annualAppreciationProfit = estimatedValue * (appreciationPercent / 100);

    // Net annual profit
    const netAnnualProfit = netAnnualRentProfit + annualAppreciationProfit;

    // 5-year profit calculation with compound growth
    let profit5Years = 0;
    let currentRent = monthlyRent;
    let currentValue = estimatedValue;
    let remainingPrincipal = loanAmount;

    for (let year = 1; year <= 5; year++) {
      // Rent grows each year
      currentRent = currentRent * (1 + rentGrowthPercent / 100);
      const yearCashflow = (currentRent - monthlyExpenses) * 12;

      // Interest decreases as principal is paid down (0.14% monthly reduction approximation)
      const yearlyInterest = remainingPrincipal * (interestRate / 100);
      remainingPrincipal = remainingPrincipal * (1 - 0.0014 * 12); // 0.14% monthly reduction

      // Property value appreciation
      currentValue = currentValue * (1 + appreciationPercent / 100);
      const yearAppreciation = currentValue * (appreciationPercent / 100);

      profit5Years += yearCashflow - yearlyInterest + yearAppreciation;
    }

    // 10-year profit calculation
    let profit10Years = profit5Years; // Start from 5-year result
    currentRent = monthlyRent * Math.pow(1 + rentGrowthPercent / 100, 5); // Start from year 6
    currentValue = estimatedValue * Math.pow(1 + appreciationPercent / 100, 5);
    remainingPrincipal = loanAmount * Math.pow(1 - 0.0014 * 12, 5);

    for (let year = 6; year <= 10; year++) {
      currentRent = currentRent * (1 + rentGrowthPercent / 100);
      const yearCashflow = (currentRent - monthlyExpenses) * 12;

      const yearlyInterest = remainingPrincipal * (interestRate / 100);
      remainingPrincipal = remainingPrincipal * (1 - 0.0014 * 12);

      currentValue = currentValue * (1 + appreciationPercent / 100);
      const yearAppreciation = currentValue * (appreciationPercent / 100);

      profit10Years += yearCashflow - yearlyInterest + yearAppreciation;
    }

    const currentCashflowImpact = cashflow - monthlyPayment;
    const cashflowAfterTransaction = currentDashboardCashflow + currentCashflowImpact;

    // Cash remaining: when loan > purchase price
    const cashRemaining = loanAmount > purchasePrice ? loanAmount - purchasePrice : 0;

    setCalculations({
      cashflow,
      monthly_payment: monthlyPayment,
      monthly_interest: monthlyInterest,
      principal_payment: principalPayment,
      net_annual_rent_profit: netAnnualRentProfit,
      annual_appreciation_profit: annualAppreciationProfit,
      net_annual_profit: netAnnualProfit,
      net_profit_5_years: profit5Years,
      net_profit_10_years: profit10Years,
      current_cashflow_impact: currentCashflowImpact,
      cashflow_after_transaction: cashflowAfterTransaction,
      cash_remaining: cashRemaining,
    });
  }, [formData, currentDashboardCashflow]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const showError = (msg: string) => {
      toast({ title: "Chyba validace", description: msg, variant: "destructive" });
    };

    if (!formData.property_identifier.trim()) { showError("Vyplňte identifikátor nemovitosti"); return; }
    const purchasePrice = parseNum(formData.purchase_price);
    const estimatedValue = parseNum(formData.estimated_value);
    const monthlyRent = parseNum(formData.monthly_rent);
    const monthlyExpenses = parseNum(formData.monthly_expenses);
    const loanAmount = parseNum(formData.loan_amount);
    const interestRate = parseNum(formData.interest_rate);
    const termYears = parseNum(formData.term_months);

    if (!purchasePrice || purchasePrice <= 0) { showError("Vyplňte kupní cenu"); return; }
    if (!estimatedValue || estimatedValue <= 0) { showError("Vyplňte odhadní cenu"); return; }
    if (monthlyRent === undefined || monthlyRent < 0) { showError("Vyplňte měsíční nájem"); return; }
    if (monthlyExpenses === undefined || monthlyExpenses < 0) { showError("Vyplňte měsíční výdaje"); return; }
    if (!loanAmount || loanAmount <= 0) { showError("Vyplňte výši úvěru"); return; }
    if (interestRate === undefined || interestRate < 0) { showError("Vyplňte úrokovou sazbu"); return; }
    if (!termYears || termYears <= 0) { showError("Vyplňte dobu splatnosti"); return; }

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
      property_identifier: formData.property_identifier.trim(),
      purchase_price: purchasePrice,
      estimated_value: estimatedValue,
      monthly_rent: monthlyRent,
      monthly_expenses: monthlyExpenses,
      appreciation_percent: parseNum(formData.appreciation_percent) ?? 5,
      rent_growth_percent: parseNum(formData.rent_growth_percent) ?? 5,
      loan_amount: loanAmount,
      interest_rate: interestRate,
      ltv_percent: parseNum(formData.ltv_percent) ?? null,
      term_months: termYears * 12,
    };

    let error;
    if (editData) {
      ({ error } = await supabase.from("planned_investments").update(dataToSave).eq("id", editData.id));
    } else {
      ({ error } = await supabase.from("planned_investments").insert(dataToSave));
    }

    if (error) {
      toast({
        title: "Chyba",
        description: editData ? "Nepodařilo se upravit plánovanou investici" : "Nepodařilo se přidat plánovanou investici",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Úspěch",
      description: editData ? "Plánovaná investice byla upravena" : "Plánovaná investice byla přidána",
    });

    setFormData({
      property_identifier: "",
      purchase_price: "",
      estimated_value: "",
      monthly_rent: "",
      monthly_expenses: "",
      appreciation_percent: "5",
      rent_growth_percent: "5",
      loan_amount: "",
      interest_rate: "",
      ltv_percent: "",
      term_months: "",
    });
    setOpen(false);
    onSuccess();
  };

  const formatNumber = fmtNum;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!editData && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Přidat plánovanou investici
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Upravit plánovanou investici" : "Přidat plánovanou investici"}</DialogTitle>
          <DialogDescription>
            Vyplňte informace o plánované investici a systém vypočítá očekávané výnosy
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Údaje o nemovitosti</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Identifikátor nemovitosti *</Label>
                <Input
                  value={formData.property_identifier}
                  onChange={(e) => setFormData({ ...formData, property_identifier: e.target.value })}
                  placeholder="Např. Praha 2, Vinohrady"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Kupní cena (Kč) *</Label>
                <FormattedNumberInput
                  value={formData.purchase_price}
                  onValueChange={(v) => setFormData({ ...formData, purchase_price: v })}
                  placeholder="5.000.000"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Odhadní cena (Kč) *</Label>
                <FormattedNumberInput
                  value={formData.estimated_value}
                  onValueChange={(v) => setFormData({ ...formData, estimated_value: v })}
                  placeholder="5.200.000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Měsíční nájem (Kč) *</Label>
                <FormattedNumberInput
                  value={formData.monthly_rent}
                  onValueChange={(v) => setFormData({ ...formData, monthly_rent: v })}
                  placeholder="25.000"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Měsíční výdaje (Kč) *</Label>
                <FormattedNumberInput
                  value={formData.monthly_expenses}
                  onValueChange={(v) => setFormData({ ...formData, monthly_expenses: v })}
                  placeholder="5.000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Cashflow (Kč)</Label>
                <Input
                  value={formatNumber(calculations.cashflow)}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pravděpodobné zhodnocení (% ročně)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.appreciation_percent}
                  onChange={(e) => setFormData({ ...formData, appreciation_percent: e.target.value })}
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label>Pravděpodobný růst nájmu (% ročně)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.rent_growth_percent}
                  onChange={(e) => setFormData({ ...formData, rent_growth_percent: e.target.value })}
                  placeholder="5"
                />
              </div>
            </div>
          </div>

          {/* Loan Details */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-semibold text-lg">Údaje o úvěru</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Výše úvěru (Kč) *</Label>
                <FormattedNumberInput
                  value={formData.loan_amount}
                  onValueChange={(v) => setFormData({ ...formData, loan_amount: v })}
                  placeholder="4.000.000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Úroková sazba (%) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.interest_rate}
                  onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                  placeholder="4.5"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>LTV (%) <span className="text-muted-foreground font-normal">— nepovinné</span></Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.ltv_percent}
                  onChange={(e) => setFormData({ ...formData, ltv_percent: e.target.value })}
                  placeholder="80"
                />
              </div>
              <div className="space-y-2">
                <Label>Doba splatnosti (roky) *</Label>
                <Input
                  type="number"
                  value={formData.term_months}
                  onChange={(e) => setFormData({ ...formData, term_months: e.target.value })}
                  placeholder="25"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Měsíční splátka (Kč)</Label>
                <Input
                  value={formatNumber(calculations.monthly_payment)}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Měsíční úrok (Kč)</Label>
                <Input
                  value={formatNumber(calculations.monthly_interest)}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Splátka jistiny (Kč)</Label>
                <Input
                  value={formatNumber(calculations.principal_payment)}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
          </div>

          {/* Calculated Results */}
          <div className="space-y-4 border-t pt-4 bg-muted/30 p-4 rounded-lg">
            <h3 className="font-semibold text-lg">Vypočítané výsledky</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Čistý roční zisk na nájmech (Kč)</Label>
                <Input
                  value={formatNumber(calculations.net_annual_rent_profit)}
                  disabled
                  className="bg-background font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label>Roční zisk na nárůstu hodnoty (Kč)</Label>
                <Input
                  value={formatNumber(calculations.annual_appreciation_profit)}
                  disabled
                  className="bg-background font-semibold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-primary">ČISTÝ ROČNÍ ZISK (Kč)</Label>
              <Input
                value={formatNumber(calculations.net_annual_profit)}
                disabled
                className="bg-primary/10 font-bold text-lg text-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Čistý zisk za 5 let (Kč)</Label>
                <Input
                  value={formatNumber(calculations.net_profit_5_years)}
                  disabled
                  className="bg-background font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label>Čistý zisk za 10 let (Kč)</Label>
                <Input
                  value={formatNumber(calculations.net_profit_10_years)}
                  disabled
                  className="bg-background font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aktuální dopad na osobní měsíční cashflow (Kč)</Label>
                <Input
                  value={formatNumber(calculations.current_cashflow_impact)}
                  disabled
                  className="bg-background font-semibold"
                />
              </div>
              <div className="space-y-2">
                <Label>Měsíční cashflow po transakci (Kč)</Label>
                <Input
                  value={formatNumber(calculations.cashflow_after_transaction)}
                  disabled
                  className={`font-semibold ${calculations.cashflow_after_transaction < 0 ? "bg-red-50 text-red-600" : "bg-background"}`}
                />
              </div>
            </div>

            {calculations.cashflow_after_transaction < 0 && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                ⚠️ Záporný cashflow po transakci. Vaše hotovostní rezerva vystačí přibližně na{" "}
                <strong>
                  {Math.abs(calculations.cashflow_after_transaction) > 0
                    ? "potřebné krytí"
                    : "0"
                  }
                </strong>
                {" "}— doporučujeme zvážit vyšší příjem nebo nižší splátku.
              </div>
            )}

            {calculations.cash_remaining > 0 && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
                💰 Úvěr je vyšší než kupní cena — v hotovosti zůstane{" "}
                <strong>{formatNumber(calculations.cash_remaining)} Kč</strong>.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit">
              {editData ? "Uložit změny" : "Přidat investici"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
