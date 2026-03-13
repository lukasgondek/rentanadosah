import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { formatNumber } from "./utils";

// ─── Types ──────────────────────────────────────────────────────────────

export interface ExportData {
  // Summary
  monthlyCashflow: number;
  netWorth: number;
  netWorth5yr: number;
  netWorth10yr: number;
  // Detail arrays
  incomes: {
    name: string;
    type: string;
    monthlyAmount: number;
    yearlyAmount: number;
  }[];
  expenses: {
    name: string;
    monthlyAmount: number;
    isRecurring: boolean;
  }[];
  loans: {
    name: string;
    bankName: string | null;
    originalAmount: number;
    remainingPrincipal: number;
    monthlyPayment: number;
    interestRate: number;
    termMonths: number;
  }[];
  properties: {
    identifier: string;
    purchasePrice: number;
    estimatedValue: number;
    monthlyRent: number;
    monthlyExpenses: number;
  }[];
  investments: {
    name: string;
    type: string;
    amount: number;
    yearlyReturnPercent: number;
  }[];
}

// ─── Helpers ────────────────────────────────────────────────────────────

const fmt = (num: number): string => formatNumber(Math.round(num));
const fmtKc = (num: number): string => `${fmt(num)} Kc`;

const incomeTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    salary: "Zamestnanecky",
    self_employed: "OSVC",
    rental: "Prijem z pronajmu",
    business: "Firemni",
    other: "Ostatni",
  };
  return map[type] || type;
};

const investTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    savings: "Sporeni",
    stocks: "Akcie",
    bonds: "Dluhopisy",
    crypto: "Krypto",
    etf: "ETF",
    other: "Ostatni",
  };
  return map[type] || type;
};

const today = (): string => {
  return new Date().toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// ─── PDF Export ─────────────────────────────────────────────────────────

export function exportToPDF(data: ExportData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Kalkulacka REALITNIHO RENTIERA", pageWidth / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Vygenerovano: ${today()}`, pageWidth / 2, y, { align: "center" });
  y += 10;

  // Section 1: Summary metrics
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Souhrnne metriky", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Metrika", "Hodnota"]],
    body: [
      ["Mesicni cashflow", fmtKc(data.monthlyCashflow)],
      ["Celkovy majetek (Net Worth)", fmtKc(data.netWorth)],
      ["Net Worth za 5 let (odhad)", fmtKc(data.netWorth5yr)],
      ["Net Worth za 10 let (odhad)", fmtKc(data.netWorth10yr)],
    ],
    theme: "grid",
    headStyles: { fillColor: [41, 65, 122] },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Section 2: Incomes
  if (data.incomes.length > 0) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Prijmy", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Nazev", "Typ", "Mesicne (Kc)", "Rocne (Kc)"]],
      body: data.incomes.map((i) => [
        i.name,
        incomeTypeLabel(i.type),
        fmt(i.monthlyAmount),
        fmt(i.yearlyAmount),
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 65, 122] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Section 3: Expenses
  if (data.expenses.length > 0) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Vydaje", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Nazev", "Mesicne (Kc)", "Typ"]],
      body: data.expenses.map((e) => [
        e.name,
        fmt(e.monthlyAmount),
        e.isRecurring ? "Pravidelny" : "Nepravidelny",
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 65, 122] },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Section 4: Loans
  if (data.loans.length > 0) {
    // Check if we need a new page
    if (y > 240) {
      doc.addPage();
      y = 15;
    }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Uvery", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Nazev", "Banka", "Splatka (Kc)", "Zustatek (Kc)", "Sazba (%)", "Splatnost (mes.)"]],
      body: data.loans.map((l) => [
        l.name,
        l.bankName || "—",
        fmt(l.monthlyPayment),
        fmt(l.remainingPrincipal),
        l.interestRate.toFixed(2),
        l.termMonths.toString(),
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 65, 122] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Section 5: Properties
  if (data.properties.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 15;
    }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Nemovitosti", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Identifikace", "Kupni cena (Kc)", "Odhadovana hodnota (Kc)", "Najem (Kc/mes.)", "Naklady (Kc/mes.)"]],
      body: data.properties.map((p) => [
        p.identifier,
        fmt(p.purchasePrice),
        fmt(p.estimatedValue),
        fmt(p.monthlyRent),
        fmt(p.monthlyExpenses),
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 65, 122] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Section 6: Investments
  if (data.investments.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 15;
    }
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Investice", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Nazev", "Typ", "Hodnota (Kc)", "Vynos (%/rok)"]],
      body: data.investments.map((i) => [
        i.name,
        investTypeLabel(i.type),
        fmt(i.amount),
        i.yearlyReturnPercent.toFixed(1),
      ]),
      theme: "grid",
      headStyles: { fillColor: [41, 65, 122] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
      },
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Vygenerovano z Kalkulacky Realitniho Rentiera | kalkulacka.realitnirentier.cz",
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  doc.save(`financni-prehled-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Excel Export ───────────────────────────────────────────────────────

export function exportToExcel(data: ExportData): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Overview
  const overviewData = [
    ["Kalkulacka Realitniho Rentiera — Financni prehled"],
    [`Vygenerovano: ${today()}`],
    [],
    ["Metrika", "Hodnota (Kc)"],
    ["Mesicni cashflow", Math.round(data.monthlyCashflow)],
    ["Celkovy majetek (Net Worth)", Math.round(data.netWorth)],
    ["Net Worth za 5 let (odhad)", Math.round(data.netWorth5yr)],
    ["Net Worth za 10 let (odhad)", Math.round(data.netWorth10yr)],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  wsOverview["!cols"] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, "Prehled");

  // Sheet 2: Incomes
  if (data.incomes.length > 0) {
    const incomeRows = data.incomes.map((i) => [
      i.name,
      incomeTypeLabel(i.type),
      Math.round(i.monthlyAmount),
      Math.round(i.yearlyAmount),
    ]);
    const wsIncome = XLSX.utils.aoa_to_sheet([
      ["Nazev", "Typ", "Mesicne (Kc)", "Rocne (Kc)"],
      ...incomeRows,
    ]);
    wsIncome["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsIncome, "Prijmy");
  }

  // Sheet 3: Expenses
  if (data.expenses.length > 0) {
    const expenseRows = data.expenses.map((e) => [
      e.name,
      Math.round(e.monthlyAmount),
      e.isRecurring ? "Pravidelny" : "Nepravidelny",
    ]);
    const wsExpense = XLSX.utils.aoa_to_sheet([
      ["Nazev", "Mesicne (Kc)", "Typ"],
      ...expenseRows,
    ]);
    wsExpense["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsExpense, "Vydaje");
  }

  // Sheet 4: Loans
  if (data.loans.length > 0) {
    const loanRows = data.loans.map((l) => [
      l.name,
      l.bankName || "",
      Math.round(l.originalAmount),
      Math.round(l.remainingPrincipal),
      Math.round(l.monthlyPayment),
      l.interestRate,
      l.termMonths,
    ]);
    const wsLoans = XLSX.utils.aoa_to_sheet([
      ["Nazev", "Banka", "Puvodni castka (Kc)", "Zustatek (Kc)", "Splatka (Kc/mes.)", "Sazba (%)", "Splatnost (mes.)"],
      ...loanRows,
    ]);
    wsLoans["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 18 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsLoans, "Uvery");
  }

  // Sheet 5: Properties
  if (data.properties.length > 0) {
    const propRows = data.properties.map((p) => [
      p.identifier,
      Math.round(p.purchasePrice),
      Math.round(p.estimatedValue),
      Math.round(p.monthlyRent),
      Math.round(p.monthlyExpenses),
    ]);
    const wsProps = XLSX.utils.aoa_to_sheet([
      ["Identifikace", "Kupni cena (Kc)", "Odhadovana hodnota (Kc)", "Najem (Kc/mes.)", "Naklady (Kc/mes.)"],
      ...propRows,
    ]);
    wsProps["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 22 }, { wch: 15 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, wsProps, "Nemovitosti");
  }

  // Sheet 6: Investments
  if (data.investments.length > 0) {
    const investRows = data.investments.map((i) => [
      i.name,
      investTypeLabel(i.type),
      Math.round(i.amount),
      i.yearlyReturnPercent,
    ]);
    const wsInvest = XLSX.utils.aoa_to_sheet([
      ["Nazev", "Typ", "Hodnota (Kc)", "Vynos (%/rok)"],
      ...investRows,
    ]);
    wsInvest["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsInvest, "Investice");
  }

  XLSX.writeFile(wb, `financni-prehled-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
