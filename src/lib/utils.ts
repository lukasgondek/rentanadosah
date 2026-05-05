import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Number formatting ───────────────────────────────────────────────

/** Format number with dot separators: 1.200.000 */
export function formatNumber(num: number, decimals = 0): string {
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(num);
}

/** Format number as Czech currency: 1.200.000 Kč */
export function formatCurrency(num: number): string {
  if (isNaN(num)) return "0 Kč";
  return `${formatNumber(num)} Kč`;
}

/** Safely parse a numeric input value — returns undefined for empty/NaN */
export function parseNum(val: string): number | undefined {
  if (!val || val.trim() === "") return undefined;
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
}

// ─── Error formatting ────────────────────────────────────────────────

/**
 * Convert a Supabase/PostgREST error into a human-readable Czech message.
 * Maps common Postgres error codes; falls back to error.message + code.
 *
 * Usage:
 *   const { error } = await supabase.from("x").insert(...);
 *   if (error) toast({ description: formatSupabaseError(error) });
 */
export function formatSupabaseError(error: unknown): string {
  if (!error) return "Neznámá chyba";

  const e = error as { code?: string; message?: string; details?: string; hint?: string };
  const code = e.code || "";
  const message = e.message || "";
  const details = e.details || "";

  // Extract column name from messages like: 'null value in column "ltv_percent"'
  const colMatch = (message + " " + details).match(/column "([^"]+)"/);
  const column = colMatch?.[1];

  switch (code) {
    case "23505":
      return `Záznam už existuje (duplicita)${column ? ` v poli "${column}"` : ""} [${code}]`;
    case "23502":
      return `Chybí povinné pole${column ? `: "${column}"` : ""} [${code}]`;
    case "23503":
      return `Odkaz na neexistující záznam${column ? ` (pole "${column}")` : ""} [${code}]`;
    case "23514":
      return `Hodnota nesplňuje pravidlo databáze${column ? ` (pole "${column}")` : ""} [${code}]`;
    case "42501":
    case "PGRST301":
      return `Nemáte oprávnění k této operaci (RLS policy) [${code}]`;
    case "PGRST116":
      return `Žádný odpovídající záznam nenalezen [${code}]`;
    case "PGRST204":
      return `Sloupec v databázi neexistuje${column ? `: "${column}"` : ""} [${code}]`;
    case "22P02":
      return `Neplatný formát hodnoty${column ? ` v poli "${column}"` : ""} [${code}]`;
    default:
      // Fallback: show raw message + code (anglicky, ale aspoň něco konkrétního)
      const tail = code ? ` [${code}]` : "";
      if (message) return `${message}${tail}`;
      return `Chyba databáze${tail}`;
  }
}

// ─── Financial calculations ──────────────────────────────────────────

/**
 * Calculate monthly annuity payment.
 * @param principal - loan amount
 * @param annualRate - annual interest rate in percent (e.g. 4.5)
 * @param termMonths - loan term in months
 */
export function calculateAnnuity(principal: number, annualRate: number, termMonths: number): number {
  if (principal <= 0 || termMonths <= 0) return 0;
  if (annualRate <= 0) return principal / termMonths; // zero interest
  const monthlyRate = annualRate / 100 / 12;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
}

// ─── Czech tax calculator (2024+) ────────────────────────────────────

/**
 * Calculate net salary from gross salary (Czech tax rules 2024+).
 * Simplified — does not account for children, disability, etc.
 *
 * - Social insurance (employee): 6.5%
 * - Health insurance (employee): 4.5%
 * - Income tax: 15% up to 131 901 Kč/month (4× average salary), 23% above
 * - Taxpayer discount: 2 570 Kč/month
 */
export function grossToNet(grossMonthly: number): number {
  if (grossMonthly <= 0) return 0;

  // Social and health insurance (employee part)
  const socialInsurance = Math.round(grossMonthly * 0.065);
  const healthInsurance = Math.round(grossMonthly * 0.045);

  // Tax base = gross (superhrubá zrušena 2021)
  const taxBase = grossMonthly;

  // Income tax (progressive: 15% / 23%)
  const threshold = 131901; // 4× průměrná mzda 2024
  let tax: number;
  if (taxBase <= threshold) {
    tax = Math.round(taxBase * 0.15);
  } else {
    tax = Math.round(threshold * 0.15 + (taxBase - threshold) * 0.23);
  }

  // Taxpayer discount
  const discount = 2570;
  tax = Math.max(0, tax - discount);

  return grossMonthly - socialInsurance - healthInsurance - tax;
}

/**
 * Calculate gross salary from net salary (inverse approximation).
 * Uses binary search since the tax function is not easily invertible.
 */
export function netToGross(netMonthly: number): number {
  if (netMonthly <= 0) return 0;

  let low = netMonthly;
  let high = netMonthly * 2;

  // Expand range if needed
  while (grossToNet(high) < netMonthly) {
    high *= 1.5;
  }

  // Binary search
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const result = grossToNet(mid);
    if (Math.abs(result - netMonthly) < 1) return Math.round(mid);
    if (result < netMonthly) low = mid;
    else high = mid;
  }

  return Math.round((low + high) / 2);
}
