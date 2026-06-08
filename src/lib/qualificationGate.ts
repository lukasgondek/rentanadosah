import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

/**
 * Qualification gate pro funnel "Strategická konzultace".
 *
 * Tok: user vyplní kalkulačku → klikne CTA → checkQualification rozhodne:
 *   - incomplete        → nemá dost dat, ukáže se výzva k doplnění
 *   - arr_qualified     → splňuje kritéria Akcelerátoru → kalendář (call zdarma)
 *   - consultation_only → nesplňuje → prodejní stránka konzultace 14 990 Kč
 *
 * Pozn.: Příjem se posuzuje z REÁLNÉ čisté hotovosti, NE z daňového základu.
 * Logika realNetMonthly je 1:1 převzatá z IncomeExpensesTab.tsx (jediný zdroj pravdy).
 */

// ---- Prahy kvalifikace (na jednom místě, ať se ladí snadno) ----
export const QUALIFY = {
  /** Min. reálný čistý měsíční příjem (Kč) pro income kvalifikátor. */
  MIN_MONTHLY_INCOME: 70_000,
  /** Min. počet vlastních nemovitostí pro property kvalifikátor. */
  MIN_PROPERTIES: 1,
  /** Min. úspory + investice (Kč) pro savings kvalifikátor. */
  MIN_SAVINGS_INVEST: 400_000,
} as const;

export type QualificationResult =
  | { status: "incomplete"; missing: string[] }
  | { status: "arr_qualified"; reason: "income" | "property" | "savings" }
  | { status: "consultation_only"; reason: "no_qualification_match" };

/** Snapshot dat, ze kterých se rozhoduje (pro log + debug). */
export interface QualificationSnapshot {
  monthlyRealIncome: number;
  propertiesCount: number;
  savingsAndInvestments: number;
  hasIncomeData: boolean;
}

/**
 * Reálná čistá měsíční hotovost z jednoho income_source.
 * Shoda s IncomeExpensesTab.tsx → realNetMonthly().
 * U OSVČ/nájmu s PAUŠÁLNÍMI výdaji není paušál reálný výdaj, takže
 * reálně zůstává celý příjem. Ostatní typy = daňový základ = reálná hotovost.
 */
function realNetMonthly(inv: any): number {
  if (inv.real_net_monthly != null) return inv.real_net_monthly; // ruční override
  const flatRate =
    (inv.category === "self_employed_s7" || inv.category === "rental_s9") &&
    inv.expense_type === "flat_rate" &&
    inv.income_amount;
  if (flatRate) return (inv.income_amount || 0) / 12;
  return inv.monthly_amount || 0;
}

/** Načte všechna potřebná data uživatele paralelně. */
async function loadUserData(userId: string) {
  const [income, properties, investments] = await Promise.all([
    supabase.from("income_sources").select("*").eq("user_id", userId),
    supabase.from("properties").select("id, estimated_value, is_forecast").eq("user_id", userId),
    supabase.from("investments").select("amount, is_forecast").eq("user_id", userId),
  ]);
  return {
    income: income.data ?? [],
    properties: properties.data ?? [],
    investments: investments.data ?? [],
  };
}

/**
 * Postaví snapshot z načtených dat. Bere v potaz JEN reálná data
 * (ne forecast/plánované řádky — ty jsou "co kdyby", ne aktuální situace).
 */
function buildSnapshot(data: Awaited<ReturnType<typeof loadUserData>>): QualificationSnapshot {
  const realIncome = data.income.filter((i: any) => !i.is_forecast);
  const realProperties = data.properties.filter((p: any) => !p.is_forecast);
  const realInvestments = data.investments.filter((i: any) => !i.is_forecast);

  const monthlyRealIncome = realIncome.reduce((s: number, i: any) => s + realNetMonthly(i), 0);
  const propertiesCount = realProperties.length;
  const savingsAndInvestments = realInvestments.reduce(
    (s: number, i: any) => s + (i.amount || 0),
    0,
  );

  return {
    monthlyRealIncome,
    propertiesCount,
    savingsAndInvestments,
    hasIncomeData: realIncome.length > 0,
  };
}

/**
 * Vyhodnotí completeness + kvalifikaci z hotového snapshotu.
 * Oddělené od I/O kvůli testovatelnosti.
 */
export function evaluateSnapshot(s: QualificationSnapshot): QualificationResult {
  // --- 1. Completeness ---
  // Příjem je nutná podmínka — bez něj nelze posoudit nic.
  // Pokud je kalkulačka prázdná (žádný příjem ani majetek), pošli doplnit.
  const missing: string[] = [];
  if (!s.hasIncomeData) missing.push("příjmy (alespoň jeden zdroj příjmu)");

  const hasAnyWealthData = s.propertiesCount > 0 || s.savingsAndInvestments > 0;
  // Když nemá příjem ani žádný majetek → fakticky prázdná kalkulačka.
  if (!s.hasIncomeData && !hasAnyWealthData) {
    missing.push("majetek (nemovitosti nebo úspory/investice)");
  }

  if (missing.length > 0) {
    return { status: "incomplete", missing };
  }

  // --- 2. Kvalifikace (stačí splnit JEDEN kvalifikátor) ---
  if (s.monthlyRealIncome >= QUALIFY.MIN_MONTHLY_INCOME) {
    return { status: "arr_qualified", reason: "income" };
  }
  if (s.propertiesCount >= QUALIFY.MIN_PROPERTIES) {
    return { status: "arr_qualified", reason: "property" };
  }
  if (s.savingsAndInvestments >= QUALIFY.MIN_SAVINGS_INVEST) {
    return { status: "arr_qualified", reason: "savings" };
  }

  return { status: "consultation_only", reason: "no_qualification_match" };
}

/**
 * Hlavní vstupní bod. Načte data, vyhodnotí a (best-effort) zaloguje výsledek.
 * Logování chyby NIKDY neshodí samotné rozhodnutí.
 */
export async function checkQualification(userId: string): Promise<QualificationResult> {
  const data = await loadUserData(userId);
  const snapshot = buildSnapshot(data);
  const result = evaluateSnapshot(snapshot);

  // Best-effort log + cache (tabulka/sloupce nemusí existovat na starší DB).
  void logQualification(userId, result, snapshot);

  return result;
}

/** Zapíše výsledek do qualification_log + nacachuje do profiles. Chyby polyká. */
async function logQualification(
  userId: string,
  result: QualificationResult,
  snapshot: QualificationSnapshot,
): Promise<void> {
  try {
    await supabase.from("qualification_log").insert({
      user_id: userId,
      result: { ...result, snapshot } as unknown as Json,
    });
  } catch {
    /* tabulka nemusí existovat — ignoruj */
  }
  try {
    await supabase
      .from("profiles")
      .update({
        qualification_status: result.status,
        qualification_checked_at: new Date().toISOString(),
      })
      .eq("id", userId);
  } catch {
    /* sloupce nemusí existovat — ignoruj */
  }
}

/** Lidsky čitelný důvod kvalifikace (pro UI / analytiku). */
export function reasonLabel(result: QualificationResult): string {
  if (result.status === "arr_qualified") {
    switch (result.reason) {
      case "income":
        return "Příjem nad hranicí Akcelerátoru";
      case "property":
        return "Vlastní nemovitost";
      case "savings":
        return "Dostatek úspor a investic";
    }
  }
  if (result.status === "consultation_only") return "Nesplňuje kritéria Akcelerátoru";
  return "Nedostatek dat";
}
