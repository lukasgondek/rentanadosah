import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatNumber as fmtNum, calculateAnnuity, formatSupabaseError } from "@/lib/utils";

/** Safely parse a numeric input value — returns undefined for empty/NaN */
const parseNum = (val: string): number | undefined => {
  if (!val || val.trim() === "") return undefined;
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
};

interface PlannedInvestmentDialogProps {
  onSuccess: () => void;
  editData?: any;
  userId?: string;
}

export const PlannedInvestmentDialog = ({ onSuccess, editData, userId }: PlannedInvestmentDialogProps) => {
  const [open, setOpen] = useState(!!editData);
  const { toast } = useToast();

  // Nový dialog se otevře jako kompletní spočítaný příklad (5M Kč investice).
  // Uživatel hodnoty přepíše svými, nebo si jen prohlédne, jak by to vyšlo.
  const [formData, setFormData] = useState({
    property_identifier: editData?.property_identifier || "Praha 2, Vinohrady",
    purchase_price: editData?.purchase_price?.toString() || "5000000",
    estimated_value: editData?.estimated_value?.toString() || "5200000",
    monthly_rent: editData?.monthly_rent?.toString() || "25000",
    monthly_expenses: editData?.monthly_expenses?.toString() || "5000",
    appreciation_percent: editData?.appreciation_percent?.toString() || "5",
    rent_growth_percent: editData?.rent_growth_percent?.toString() || "5",
    loan_amount: editData?.loan_amount?.toString() || "4000000",
    interest_rate: editData?.interest_rate?.toString() || "4.5",
    ltv_percent: editData?.ltv_percent?.toString() || "80",
    term_months: editData ? Math.round(editData.term_months / 12).toString() : "25",
  });

  const [currentDashboardCashflow, setCurrentDashboardCashflow] = useState(0);
  // Refinancování: vybrané úvěry "zmizí" → jejich splátka se vrátí do cashflow
  const [availableLoans, setAvailableLoans] = useState<any[]>([]);
  const [refinancedLoanIds, setRefinancedLoanIds] = useState<string[]>([]);
  // Prodej nemovitosti: kazda prodavana ma rozhodnuti co s vazanym uverem
  const [availableProperties, setAvailableProperties] = useState<any[]>([]);
  const [soldPropertyIds, setSoldPropertyIds] = useState<string[]>([]);
  // propId -> 'payoff' (splatit uver z prodeje) | 'move' (presunout zastavu)
  const [loanActionByProp, setLoanActionByProp] = useState<Record<string, "payoff" | "move">>({});
  // propId -> cilova nemovitost pro presun zastavy (informativni)
  const [moveTargetByProp, setMoveTargetByProp] = useState<Record<string, string>>({});
  const [sellExpanded, setSellExpanded] = useState(false);
  const [buyExpanded, setBuyExpanded] = useState(false);
  const [financeExpanded, setFinanceExpanded] = useState(false);
  const [refiExpanded, setRefiExpanded] = useState(false);

  const [calculations, setCalculations] = useState({
    cashflow: 0,
    monthly_payment: 0,
    monthly_interest: 0,
    principal_payment: 0,
    avg_monthly_interest: 0,
    net_annual_rent_profit: 0,
    annual_appreciation_profit: 0,
    net_annual_profit: 0,
    net_profit_5_years: 0,
    net_profit_10_years: 0,
    current_cashflow_impact: 0,
    cashflow_after_transaction: 0,
    cash_remaining: 0,
    cash_after_transaction: 0,
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
      const targetId = userId || user.id;

      // Parallel fetch income, expenses, loans, properties, vazby
      const [incomeRes, expensesRes, loansRes, propsRes, lcRes] = await Promise.all([
        supabase.from("income_sources").select("monthly_amount").eq("user_id", targetId),
        supabase.from("expenses").select("amount").eq("user_id", targetId),
        supabase.from("loans").select("id, name, monthly_payment, remaining_principal").eq("user_id", targetId).eq("is_forecast", false),
        supabase.from("properties").select("id, identifier, estimated_value, monthly_rent, monthly_expenses, loan_id").eq("user_id", targetId).eq("is_forecast", false),
        supabase.from("loan_collaterals").select("property_id, loan_id"),
      ]);

      const totalIncome = (incomeRes.data || []).reduce((sum, i) => sum + (i.monthly_amount || 0), 0);
      const totalExpenses = (expensesRes.data || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalLoanPayments = (loansRes.data || []).reduce((sum, l) => sum + (l.monthly_payment || 0), 0);

      const loansList = loansRes.data || [];
      const loanById: Record<string, any> = Object.fromEntries(loansList.map((l: any) => [l.id, l]));

      // Pro každou nemovitost najdi vázané úvěry (loan_collaterals + legacy loan_id)
      const props = (propsRes.data || []).map((p: any) => {
        const fromJunction = (lcRes.data || [])
          .filter((r: any) => r.property_id === p.id)
          .map((r: any) => loanById[r.loan_id])
          .filter(Boolean);
        const legacy = p.loan_id && loanById[p.loan_id] ? [loanById[p.loan_id]] : [];
        const seen = new Set<string>();
        const boundLoans = [...fromJunction, ...legacy].filter((l: any) => {
          if (seen.has(l.id)) return false;
          seen.add(l.id);
          return true;
        });
        return { ...p, boundLoans };
      });

      setAvailableLoans(loansList);
      setAvailableProperties(props);
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

    // Monthly interest and principal (první měsíc — úrok z celé jistiny)
    const monthlyInterest = loanAmount * monthlyRate;
    const principalPayment = monthlyPayment - monthlyInterest;

    // Průměrný měsíční úrok za celou dobu úvěru — úrok klesá jak se splácí
    // jistina, takže celoživotní průměr je nižší než úrok v prvním měsíci.
    // Σ úroků = (splátka × počet měsíců) − jistina; průměr = Σ / počet měsíců.
    const avgMonthlyInterest =
      termMonths > 0 && monthlyPayment > 0
        ? (monthlyPayment * termMonths - loanAmount) / termMonths
        : 0;

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

    // Refinancované úvěry zmizí → jejich splátka už cashflow nezatěžuje.
    // currentDashboardCashflow má všechny splátky odečtené, proto je vrátíme.
    const refinancedPayments = availableLoans
      .filter((l) => refinancedLoanIds.includes(l.id))
      .reduce((sum, l) => sum + (l.monthly_payment || 0), 0);

    // Prodej nemovitostí: ubyde čistý nájem (rent − expenses) z cashflow;
    // při "splatit úvěr" se navíc uvolní splátka (cashflow) a z prodeje se
    // odečte zbývající jistina (hotovost). Při "přesunout" úvěr běží dál.
    let soldCashflowDelta = 0;
    let soldCashProceeds = 0;
    for (const p of availableProperties) {
      if (!soldPropertyIds.includes(p.id)) continue;
      soldCashflowDelta -= (p.monthly_rent || 0) - (p.monthly_expenses || 0);
      soldCashProceeds += p.estimated_value || 0;
      const action = loanActionByProp[p.id] || "payoff";
      if (action === "payoff") {
        for (const l of p.boundLoans || []) {
          soldCashflowDelta += l.monthly_payment || 0;
          soldCashProceeds -= l.remaining_principal || 0;
        }
      }
    }

    // Dopad CELÉ transakce na měsíční cashflow (nákup + refinanc + prodej),
    // ne jen nové nemovitosti — jinak je číslo zkreslené když plánuješ
    // např. jen prodej.
    const currentCashflowImpact =
      (cashflow - monthlyPayment) + refinancedPayments + soldCashflowDelta;
    const cashflowAfterTransaction = currentDashboardCashflow + currentCashflowImpact;

    // Hotovost po transakci: načerpání nad kupní cenu (kladné) nebo doplatek
    // z hotovosti (záporné) + výtěžky z prodeje − splacené úvěry.
    const cashAfterTransaction = (loanAmount - purchasePrice) + soldCashProceeds;

    // Cash remaining (jen kladné — informativní hláška): úvěr > kupní cena
    const cashRemaining = loanAmount > purchasePrice ? loanAmount - purchasePrice : 0;

    setCalculations({
      cashflow,
      monthly_payment: monthlyPayment,
      monthly_interest: monthlyInterest,
      principal_payment: principalPayment,
      avg_monthly_interest: avgMonthlyInterest,
      net_annual_rent_profit: netAnnualRentProfit,
      annual_appreciation_profit: annualAppreciationProfit,
      net_annual_profit: netAnnualProfit,
      net_profit_5_years: profit5Years,
      net_profit_10_years: profit10Years,
      current_cashflow_impact: currentCashflowImpact,
      cashflow_after_transaction: cashflowAfterTransaction,
      cash_remaining: cashRemaining,
      cash_after_transaction: cashAfterTransaction,
    });
  }, [formData, currentDashboardCashflow, availableLoans, refinancedLoanIds, availableProperties, soldPropertyIds, loanActionByProp]);

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

    // LTV auto-dopočet když uživatel nevyplnil (DB sloupec je NOT NULL)
    const ltvInput = parseNum(formData.ltv_percent);
    const ltvComputed = estimatedValue > 0 ? (loanAmount / estimatedValue) * 100 : 0;

    const dataToSave = {
      user_id: userId || user.id,
      property_identifier: formData.property_identifier.trim(),
      purchase_price: purchasePrice,
      estimated_value: estimatedValue,
      monthly_rent: monthlyRent,
      monthly_expenses: monthlyExpenses,
      appreciation_percent: parseNum(formData.appreciation_percent) ?? 5,
      rent_growth_percent: parseNum(formData.rent_growth_percent) ?? 5,
      loan_amount: loanAmount,
      interest_rate: interestRate,
      ltv_percent: ltvInput ?? ltvComputed,
      term_months: termYears * 12,
    };

    let error;
    if (editData) {
      ({ error } = await supabase.from("planned_investments").update(dataToSave).eq("id", editData.id));
    } else {
      ({ error } = await supabase.from("planned_investments").insert(dataToSave));
    }

    if (error) {
      const action = editData ? "upravit" : "přidat";
      toast({
        title: `Nepodařilo se ${action} plánovanou investici`,
        description: formatSupabaseError(error),
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
    setRefinancedLoanIds([]);
    setSoldPropertyIds([]);
    setLoanActionByProp({});
    setMoveTargetByProp({});
    setSellExpanded(false);
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
            <button
              type="button"
              onClick={() => setBuyExpanded((v) => !v)}
              className="font-semibold text-lg flex items-center gap-2 hover:underline"
            >
              {buyExpanded ? "▾" : "▸"} Koupit nemovitost
            </button>
            {buyExpanded && (
            <>
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
            </>
            )}
          </div>

          {/* Loan Details */}
          <div className="space-y-4 border-t pt-4">
            <button
              type="button"
              onClick={() => setFinanceExpanded((v) => !v)}
              className="font-semibold text-lg flex items-center gap-2 hover:underline"
            >
              {financeExpanded ? "▾" : "▸"} Financování
            </button>
            {financeExpanded && (
            <>
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
                <Label>LTV (%)</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Měsíční splátka (Kč)</Label>
                <Input
                  value={formatNumber(calculations.monthly_payment)}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Měsíční úrok — 1. měsíc (Kč)</Label>
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
              <div className="space-y-2">
                <Label>Průměrný měsíční úrok — celá doba (Kč)</Label>
                <Input
                  value={formatNumber(calculations.avg_monthly_interest)}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>
            </>
            )}
          </div>

          {/* Refinancovat úvěr */}
          {availableLoans.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <button
                type="button"
                onClick={() => setRefiExpanded((v) => !v)}
                className="font-semibold text-lg flex items-center gap-2 hover:underline"
              >
                {refiExpanded ? "▾" : "▸"} Refinancovat úvěr
              </button>
              {refiExpanded && (
              <>
              <p className="text-xs text-muted-foreground">
                Vybrané úvěry se v rámci této transakce „nahradí" — jejich měsíční
                splátka přestane zatěžovat cashflow (promítne se do plánovaných čísel).
              </p>
              <div className="space-y-1.5 rounded-md border p-3">
                {availableLoans.map((loan) => (
                  <div key={loan.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`refi-${loan.id}`}
                      checked={refinancedLoanIds.includes(loan.id)}
                      onCheckedChange={(c) =>
                        setRefinancedLoanIds((prev) =>
                          c ? [...prev, loan.id] : prev.filter((x) => x !== loan.id)
                        )
                      }
                    />
                    <Label htmlFor={`refi-${loan.id}`} className="text-sm font-normal cursor-pointer">
                      {loan.name || "Úvěr"} (splátka {formatNumber(loan.monthly_payment || 0)} Kč/měs)
                    </Label>
                  </div>
                ))}
              </div>
              </>
              )}
            </div>
          )}

          {/* Prodat nemovitost */}
          {availableProperties.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <button
                type="button"
                onClick={() => setSellExpanded((v) => !v)}
                className="font-semibold text-lg flex items-center gap-2 hover:underline"
              >
                {sellExpanded ? "▾" : "▸"} Prodat nemovitost
              </button>
              {sellExpanded && (
                <>
                  <p className="text-xs text-muted-foreground">
                    Vybraná nemovitost se v rámci transakce prodá (počítá se s odhadní
                    cenou). U vázaného úvěru zvol, zda ho splatit z prodeje, nebo
                    přesunout zástavu na jinou nemovitost.
                  </p>
                  <div className="space-y-2 rounded-md border p-3">
                    {availableProperties.map((p) => {
                      const sold = soldPropertyIds.includes(p.id);
                      const action = loanActionByProp[p.id] || "payoff";
                      const hasLoan = (p.boundLoans || []).length > 0;
                      return (
                        <div key={p.id} className="space-y-2 border-b last:border-b-0 pb-2 last:pb-0">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`sell-${p.id}`}
                              checked={sold}
                              onCheckedChange={(c) =>
                                setSoldPropertyIds((prev) =>
                                  c ? [...prev, p.id] : prev.filter((x) => x !== p.id)
                                )
                              }
                            />
                            <Label htmlFor={`sell-${p.id}`} className="text-sm font-normal cursor-pointer">
                              {p.identifier} (odhad {formatNumber(p.estimated_value || 0)} Kč)
                              {hasLoan && (
                                <span className="text-muted-foreground"> — vázaný úvěr</span>
                              )}
                            </Label>
                          </div>
                          {sold && hasLoan && (
                            <div className="ml-6 space-y-1.5 text-sm">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`loanaction-${p.id}`}
                                  checked={action === "payoff"}
                                  onChange={() =>
                                    setLoanActionByProp((prev) => ({ ...prev, [p.id]: "payoff" }))
                                  }
                                />
                                Splatit úvěr z prodeje
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`loanaction-${p.id}`}
                                  checked={action === "move"}
                                  onChange={() =>
                                    setLoanActionByProp((prev) => ({ ...prev, [p.id]: "move" }))
                                  }
                                />
                                Přesunout zástavu na jinou nemovitost
                              </label>
                              {action === "move" && (
                                <select
                                  className="w-full h-8 text-sm border rounded-md px-2"
                                  value={moveTargetByProp[p.id] || ""}
                                  onChange={(e) =>
                                    setMoveTargetByProp((prev) => ({ ...prev, [p.id]: e.target.value }))
                                  }
                                >
                                  <option value="">— vyber cílovou nemovitost —</option>
                                  {availableProperties
                                    .filter((o) => o.id !== p.id && !soldPropertyIds.includes(o.id))
                                    .map((o) => (
                                      <option key={o.id} value={o.id}>
                                        {o.identifier}
                                      </option>
                                    ))}
                                </select>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

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
              <div className="space-y-2">
                <Label>Hotovost po transakci (Kč)</Label>
                <Input
                  value={formatNumber(calculations.cash_after_transaction)}
                  disabled
                  className={`font-semibold ${calculations.cash_after_transaction < 0 ? "bg-red-50 text-red-600" : "bg-background"}`}
                />
                <p className="text-xs text-muted-foreground">
                  Načerpání nad kupní cenu a výtěžky z prodeje (−) splacené úvěry.
                  Záporné = doplatek z hotovosti.
                </p>
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
