import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlannedInvestmentDialog } from "./PlannedInvestmentDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatNumber as fmtNumber, calculateAnnuity } from "@/lib/utils";
import { computePlanImpact, type PlanImpactCtx } from "@/lib/planImpact";

export default function PlanningTab({ userId: viewUserId, isAdmin = false }: { userId?: string | null; isAdmin?: boolean } = {}) {
  const [investments, setInvestments] = useState<any[]>([]);
  const [editingInvestment, setEditingInvestment] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentCashflow, setCurrentCashflow] = useState(0);
  const [impactCtx, setImpactCtx] = useState<PlanImpactCtx>({ loansById: {}, propsById: {} });
  const { toast } = useToast();
  const readOnly = !!viewUserId && !isAdmin;

  const fetchInvestments = async () => {
    let query = supabase
      .from("planned_investments")
      .select("*")
      .order("created_at", { ascending: false });
    if (viewUserId) query = query.eq("user_id", viewUserId);
    const { data, error } = await query;

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst plánované investice",
        variant: "destructive",
      });
      return;
    }

    setInvestments(data || []);
  };

  useEffect(() => {
    fetchInvestments();
  }, [viewUserId]);

  // REÁLNÝ stávající cashflow (stejná logika jako Dashboard/Příjmy/dialog) —
  // ne daňový základ. Příjmy KROMĚ účetního "rental" (nahrazuje reálný nájem
  // z nemovitostí), override real_net_monthly, paušál výdaje % → celý příjem.
  useEffect(() => {
    const fetchCashflow = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const targetId = viewUserId || user.id;
      const [inc, exp, lo, pr, lcRes] = await Promise.all([
        supabase.from("income_sources").select("type, category, expense_type, income_amount, monthly_amount, real_net_monthly").eq("user_id", targetId),
        supabase.from("expenses").select("amount").eq("user_id", targetId),
        supabase.from("loans").select("id, monthly_payment, remaining_principal, interest_rate, ltv_percent").eq("user_id", targetId).eq("is_forecast", false),
        supabase.from("properties").select("id, monthly_rent, monthly_expenses, estimated_value, purchase_price, yearly_appreciation_percent, loan_id").eq("user_id", targetId).eq("is_forecast", false),
        supabase.from("loan_collaterals").select("property_id, loan_id"),
      ]);
      // Kontext pro výpočet dopadu plánů (refinanc/prodej potřebuje úvěry/nemovitosti)
      const loansById: Record<string, any> = Object.fromEntries((lo.data || []).map((l: any) => [l.id, l]));
      const propsById: Record<string, any> = Object.fromEntries((pr.data || []).map((p: any) => {
        const fromJ = (lcRes.data || []).filter((r: any) => r.property_id === p.id).map((r: any) => loansById[r.loan_id]).filter(Boolean);
        const legacy = p.loan_id && loansById[p.loan_id] ? [loansById[p.loan_id]] : [];
        const seen = new Set<string>();
        const boundLoans = [...fromJ, ...legacy].filter((l: any) => (seen.has(l.id) ? false : (seen.add(l.id), true)));
        return [p.id, { ...p, boundLoans }];
      }));
      setImpactCtx({ loansById, propsById });
      const realNonRental = (inc.data || [])
        .filter((i: any) => i.type !== "rental")
        .reduce((s: number, i: any) => {
          if (i.real_net_monthly != null) return s + i.real_net_monthly;
          const flatRate =
            (i.category === "self_employed_s7" || i.category === "rental_s9") &&
            i.expense_type === "flat_rate" && i.income_amount;
          return s + (flatRate ? (i.income_amount || 0) / 12 : (i.monthly_amount || 0));
        }, 0);
      const propRent = (pr.data || []).reduce((s: number, p: any) => s + (p.monthly_rent || 0), 0);
      const propExp = (pr.data || []).reduce((s: number, p: any) => s + (p.monthly_expenses || 0), 0);
      const te = (exp.data || []).reduce((s, e) => s + (e.amount || 0), 0);
      const tl = (lo.data || []).reduce((s, l) => s + (l.monthly_payment || 0), 0);
      setCurrentCashflow(realNonRental + propRent - propExp - te - tl);
    };
    fetchCashflow();
  }, [viewUserId]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("planned_investments").delete().eq("id", id);

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat plánovanou investici",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Úspěch",
      description: "Plánovaná investice byla smazána",
    });

    setDeletingId(null);
    fetchInvestments();
  };

  const [realizingId, setRealizingId] = useState<string | null>(null);

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return "-";
    return fmtNumber(num);
  };

  const handleRealize = async (id: string) => {
    const inv = investments.find((i) => i.id === id);
    if (!inv) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Create property
    const { data: newProperty, error: propError } = await supabase.from("properties").insert({
      user_id: user.id,
      identifier: inv.property_identifier,
      purchase_price: inv.purchase_price,
      estimated_value: inv.estimated_value,
      monthly_rent: inv.monthly_rent,
      monthly_expenses: inv.monthly_expenses,
      yearly_appreciation_percent: inv.appreciation_percent,
      is_forecast: false,
    }).select("id").single();

    if (propError) {
      toast({ title: "Chyba", description: "Nepodařilo se vytvořit nemovitost", variant: "destructive" });
      return;
    }

    // 2. Create loan
    const termMonths = inv.term_months || 300;
    const monthlyPayment = calculateAnnuity(inv.loan_amount, inv.interest_rate, termMonths);

    const { data: newLoan, error: loanError } = await supabase.from("loans").insert({
      user_id: user.id,
      name: `Úvěr — ${inv.property_identifier}`,
      original_amount: inv.loan_amount,
      remaining_principal: inv.loan_amount,
      interest_rate: inv.interest_rate,
      term_months: termMonths,
      monthly_payment: Math.round(monthlyPayment),
      ltv_percent: inv.ltv_percent,
      collateral_location: inv.property_identifier,
      bank_name: null,
      is_forecast: false,
    }).select("id").single();

    if (loanError) {
      toast({ title: "Chyba", description: "Nepodařilo se vytvořit úvěr", variant: "destructive" });
      return;
    }

    // 3. Link property to loan
    if (newProperty?.id && newLoan?.id) {
      await supabase.from("properties").update({ loan_id: newLoan.id }).eq("id", newProperty.id);
    }

    // 4. Delete planned investment
    await supabase.from("planned_investments").delete().eq("id", id);

    toast({
      title: "Realizováno!",
      description: `Nemovitost "${inv.property_identifier}" a úvěr byly přidány do portfolia.`,
    });

    setRealizingId(null);
    fetchInvestments();
  };

  // Calculate derived values — STEJNÉ vzorce jako PlannedInvestmentDialog
  // (neprůstřelná čísla — musí sedět s tím, co klient vidí v dialogu).
  const calculateValues = (inv: any) => {
    const monthlyRent = inv.monthly_rent || 0;
    const monthlyExpenses = inv.monthly_expenses || 0;
    const cashflow = monthlyRent - monthlyExpenses;

    const interestRate = inv.interest_rate || 0;
    const loanAmount = inv.loan_amount || 0;
    const estimatedValue = inv.estimated_value || 0;
    const appreciationPercent = inv.appreciation_percent || 0;
    const rentGrowthPercent = inv.rent_growth_percent || 0;
    const monthlyRate = interestRate / 100 / 12;
    const termMonths = inv.term_months || 0;

    let monthlyPayment = 0;
    if (loanAmount > 0 && monthlyRate > 0 && termMonths > 0) {
      monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
    }

    const monthlyInterest = loanAmount * monthlyRate;
    const netAnnualRentProfit = (cashflow * 12) - (monthlyInterest * 12);
    const annualAppreciationProfit = estimatedValue * (appreciationPercent / 100);
    const netAnnualProfit = netAnnualRentProfit + annualAppreciationProfit;

    // Zisk za 5 / 10 let — složené úročení nájmu + klesající úrok
    let profit5Years = 0;
    let currentRent = monthlyRent;
    let currentValue = estimatedValue;
    let remainingPrincipal = loanAmount;
    for (let year = 1; year <= 5; year++) {
      currentRent = currentRent * (1 + rentGrowthPercent / 100);
      const yearCashflow = (currentRent - monthlyExpenses) * 12;
      const yearlyInterest = remainingPrincipal * (interestRate / 100);
      remainingPrincipal = remainingPrincipal * (1 - 0.0014 * 12);
      currentValue = currentValue * (1 + appreciationPercent / 100);
      const yearAppreciation = currentValue * (appreciationPercent / 100);
      profit5Years += yearCashflow - yearlyInterest + yearAppreciation;
    }
    let profit10Years = profit5Years;
    currentRent = monthlyRent * Math.pow(1 + rentGrowthPercent / 100, 5);
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

    return {
      cashflow,
      monthlyPayment,
      monthlyInterest,
      netAnnualRentProfit,
      annualAppreciationProfit,
      netAnnualProfit,
      profit5Years,
      profit10Years,
      cashImpact: loanAmount - (inv.purchase_price || 0),
      cashflowImpact: cashflow - monthlyPayment,
    };
  };

  const getOffset = (inv: any) => inv.step_year ?? 0;

  // Kroky v pořadí (nejstarší = krok 1). Kumulativní rok = součet odstupů
  // (odstup se nastavuje při plánování investice, ne zpětně tady).
  const orderedSteps = [...investments].sort(
    (a, b) => (a.created_at || "").localeCompare(b.created_at || "")
  );
  let _cum = 0;
  const stepRows = orderedSteps.map((inv) => {
    _cum += getOffset(inv);
    return { inv, year: _cum, impact: computePlanImpact(inv, impactCtx) };
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Plánování investic</h2>
        {!readOnly && <PlannedInvestmentDialog onSuccess={fetchInvestments} userId={viewUserId || undefined} />}
      </div>

      {investments.length > 0 && (() => {
        const agg = investments.reduce(
          (a, inv) => {
            const im = computePlanImpact(inv, impactCtx); // celý dopad (vč. refinanc/prodej/reko)
            const c = calculateValues(inv); // buy-profit metriky
            a.cash += im.cashImpact;
            a.cfImpact += im.cashflowImpact;
            a.rentProfit += c.netAnnualRentProfit;
            a.profitAppr += c.netAnnualProfit;
            a.p5 += c.profit5Years;
            a.p10 += c.profit10Years;
            return a;
          },
          { cash: 0, cfImpact: 0, rentProfit: 0, profitAppr: 0, p5: 0, p10: 0 }
        );
        const cell = (label: string, val: number, accent = false) => (
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold ${val < 0 ? "text-red-600" : accent ? "text-primary" : ""}`}>
              {formatNumber(Math.round(val))} Kč
            </p>
          </div>
        );
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cell("Hotovost (souhrn plánů)", agg.cash)}
            {cell("Dopad na cashflow (jen transakcí)", agg.cfImpact)}
            {cell("Výsledné cashflow", currentCashflow + agg.cfImpact, true)}
            {cell("Roční zisk na nájmech", agg.rentProfit)}
            {cell("Roční zisk s nárůstem hodnoty", agg.profitAppr)}
            {cell("Zisk za 5 let", agg.p5, true)}
            {cell("Zisk za 10 let", agg.p10, true)}
          </div>
        );
      })()}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Krok</TableHead>
              <TableHead>Plán</TableHead>
              <TableHead className="text-right">Měsíční cashflow dopad</TableHead>
              <TableHead className="text-right">Jednorázová hotovost</TableHead>
              <TableHead className="text-right">Zisk 10 let</TableHead>
              <TableHead className="text-right">Měs. zisk zpětně</TableHead>
              {!readOnly && <TableHead className="text-right">Akce</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {stepRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Žádné plánované investice
                </TableCell>
              </TableRow>
            ) : (
              stepRows.map(({ inv, year, impact }) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    Rok {year}{year === 0 ? " (letos)" : ""}
                  </TableCell>
                  <TableCell className="font-medium">{inv.plan_name || inv.property_identifier}</TableCell>
                  <TableCell className={`text-right font-semibold ${impact.cashflowImpact < 0 ? "text-red-600" : ""}`}>
                    {impact.cashflowImpact >= 0 ? "+" : ""}{formatNumber(Math.round(impact.cashflowImpact))} Kč
                  </TableCell>
                  <TableCell className={`text-right ${impact.cashImpact < 0 ? "text-red-600" : ""}`}>
                    {formatNumber(Math.round(impact.cashImpact))} Kč
                  </TableCell>
                  <TableCell className="text-right font-semibold text-primary">
                    {impact.buyActive ? `${formatNumber(Math.round(impact.profit10Years))} Kč` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {impact.buyActive ? `${formatNumber(Math.round(impact.profit10Monthly))} Kč` : "—"}
                  </TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" title="Realizovat"
                          onClick={() => setRealizingId(inv.id)}
                          className="text-green-600 hover:text-green-700">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Upravit (obsah plánu)"
                          onClick={() => setEditingInvestment(inv)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost"
                          onClick={() => setDeletingId(inv.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingInvestment && (
        <PlannedInvestmentDialog
          editData={editingInvestment}
          userId={viewUserId || undefined}
          onSuccess={() => {
            setEditingInvestment(null);
            fetchInvestments();
          }}
          onClose={() => setEditingInvestment(null)}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat plánovanou investici?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce nelze vrátit zpět. Plánovaná investice bude trvale smazána.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && handleDelete(deletingId)}>
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!realizingId} onOpenChange={() => setRealizingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Realizovat plánovanou investici?</AlertDialogTitle>
            <AlertDialogDescription>
              Tím se vytvoří skutečná nemovitost a úvěr ve vašem portfoliu a plánovaná investice bude smazána.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={() => realizingId && handleRealize(realizingId)} className="bg-green-600 hover:bg-green-700">
              Realizovat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
