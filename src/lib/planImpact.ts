// Dopad jednoho plánu (kombinace nákup/financ/refinanc/prodej/reko).
// ZRCADLÍ matematiku PlannedInvestmentDialog — drž v synchronu (neprůstřelná
// čísla: listing musí ukazovat totéž co dialog).

export interface PlanImpactCtx {
  loansById: Record<string, any>;
  propsById: Record<string, any>; // prop + boundLoans
}

export interface PlanImpact {
  cashflowImpact: number;
  cashImpact: number;
  profit10Years: number;
  profit10Monthly: number;
  buyActive: boolean;
}

export function computePlanImpact(plan: any, ctx: PlanImpactCtx): PlanImpact {
  const offsetYears = plan.step_year || 0;

  const projRemaining = (l: any) => {
    const P = l?.remaining_principal || 0;
    if (offsetYears <= 0) return P;
    const i = ((l?.interest_rate || 0) / 100) / 12;
    const n = offsetYears * 12;
    const M = l?.monthly_payment || 0;
    if (M <= 0) return P;
    const B = i > 0
      ? P * Math.pow(1 + i, n) - M * ((Math.pow(1 + i, n) - 1) / i)
      : P - M * n;
    return Math.max(0, B);
  };
  const projValue = (p: any) => {
    const v = (p?.estimated_value || p?.purchase_price || 0);
    if (offsetYears <= 0) return v;
    const a = ((p?.yearly_appreciation_percent ?? 3)) / 100;
    return v * Math.pow(1 + a, offsetYears);
  };

  const purchasePrice = plan.purchase_price || 0;
  const estimatedValue = plan.estimated_value || 0;
  const buyActive = purchasePrice > 0 || estimatedValue > 0;

  // Nákup
  const monthlyRent = plan.monthly_rent || 0;
  const monthlyExpenses = plan.monthly_expenses || 0;
  const cashflow = monthlyRent - monthlyExpenses;
  const interestRate = plan.interest_rate || 0;
  const loanAmount = plan.loan_amount || 0;
  const termMonths = plan.term_months || 0;
  const mr = interestRate / 100 / 12;
  let monthlyPayment = 0;
  if (loanAmount > 0 && mr > 0 && termMonths > 0) {
    monthlyPayment = loanAmount * (mr * Math.pow(1 + mr, termMonths)) / (Math.pow(1 + mr, termMonths) - 1);
  }

  // Refinanc
  const refiIds: string[] = Array.isArray(plan.refinanced_loan_ids) ? plan.refinanced_loan_ids : [];
  let refinancedPayments = 0;
  let refinancedPayoff = 0;
  for (const id of refiIds) {
    const l = ctx.loansById[id];
    if (!l) continue;
    refinancedPayments += l.monthly_payment || 0;
    refinancedPayoff += projRemaining(l);
  }

  // Prodej
  const soldIds: string[] = Array.isArray(plan.sold_property_ids) ? plan.sold_property_ids : [];
  const actions: Record<string, string> = plan.sold_loan_actions || {};
  let soldCashflowDelta = 0;
  let soldCashProceeds = 0;
  for (const pid of soldIds) {
    const p = ctx.propsById[pid];
    if (!p) continue;
    soldCashflowDelta -= (p.monthly_rent || 0) - (p.monthly_expenses || 0);
    soldCashProceeds += projValue(p);
    if ((actions[pid] || "payoff") === "payoff") {
      for (const l of p.boundLoans || []) {
        soldCashflowDelta += l.monthly_payment || 0;
        soldCashProceeds -= projRemaining(l);
      }
    }
  }

  // Rekonstrukce
  const renoInvest = plan.reno_investment || 0;
  const renoRentInc = plan.reno_rent_increase || 0;

  const cashflowImpact =
    (cashflow - monthlyPayment) + refinancedPayments + soldCashflowDelta + renoRentInc;
  const cashImpact =
    (loanAmount - purchasePrice) + soldCashProceeds - refinancedPayoff - renoInvest;

  // Zisk za 10 let — složené úročení (jen smysl při nákupu)
  let profit10Years = 0;
  if (buyActive) {
    const appr = plan.appreciation_percent || 0;
    const rentG = plan.rent_growth_percent || 0;
    let p5 = 0;
    let curRent = monthlyRent, curVal = estimatedValue, rem = loanAmount;
    for (let y = 1; y <= 5; y++) {
      curRent *= (1 + rentG / 100);
      const yc = (curRent - monthlyExpenses) * 12;
      const yi = rem * (interestRate / 100);
      rem *= (1 - 0.0014 * 12);
      curVal *= (1 + appr / 100);
      p5 += yc - yi + curVal * (appr / 100);
    }
    profit10Years = p5;
    curRent = monthlyRent * Math.pow(1 + rentG / 100, 5);
    curVal = estimatedValue * Math.pow(1 + appr / 100, 5);
    rem = loanAmount * Math.pow(1 - 0.0014 * 12, 5);
    for (let y = 6; y <= 10; y++) {
      curRent *= (1 + rentG / 100);
      const yc = (curRent - monthlyExpenses) * 12;
      const yi = rem * (interestRate / 100);
      rem *= (1 - 0.0014 * 12);
      curVal *= (1 + appr / 100);
      profit10Years += yc - yi + curVal * (appr / 100);
    }
  }

  return {
    cashflowImpact,
    cashImpact,
    profit10Years,
    profit10Monthly: profit10Years / 120,
    buyActive,
  };
}
