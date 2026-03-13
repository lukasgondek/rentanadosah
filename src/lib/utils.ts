import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Number formatting ───────────────────────────────────────────────

/** Format number with Czech separators: 1 200 000 */
export function formatNumber(num: number, decimals = 0): string {
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("cs-CZ", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(num);
}

/** Format number as Czech currency: 1 200 000 Kč */
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
