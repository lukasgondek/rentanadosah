# Kalkulacka Realitniho Rentiera

## Co to je

Financni kalkulacka pro klienty Realitniho Rentiera. Umoznuje zadat prijmy, vydaje, nemovitosti, uvery, investice a videt dashboard s cashflow, net worth a exportem do PDF/Excel.

- **URL:** https://kalkulacka.realitnirentier.cz
- **Repo:** `lukasgondek/rentanadosah` (GitHub)
- **Deploy:** GitHub Pages (automaticky pri push na main)

## Stack

- React 18 + TypeScript + Vite
- shadcn/ui + TailwindCSS
- Supabase (PostgreSQL + Auth + RLS)
- jsPDF + XLSX (export)

## Supabase

- **Projekt:** `cihocfgnphqzjzliuzxk`
- **Dashboard:** https://supabase.com/dashboard/project/cihocfgnphqzjzliuzxk
- **Service role key:** macOS Keychain `supabase-service-role`
- **DB password:** macOS Keychain `supabase-db-password`

### Tabulky

| Tabulka | Popis |
|---------|-------|
| `approved_emails` | Whitelist emailu, ktere se mohou registrovat |
| `profiles` | Uzivatelske profily (jmeno) |
| `user_roles` | Role: admin, user, prospect |
| `income_sources` | Prijmy (zamestnanani, OSVC, najem, firma, jine) |
| `expenses` | Vydaje (mesicni/rocni, jednoznacne/opakujici) |
| `properties` | Nemovitosti (single/multi = cinzak) |
| `property_units` | Sub-jednotky cinzaku (byt 1, byt 2...) |
| `loans` | Uvery (hypoteky, spotrebaky) |
| `loan_collaterals` | Zastavy u uveru (N:M vazba na properties/units) |
| `investments` | Investice (akcie, fondy, krypto...) |
| `planned_investments` | Planovane investice s kalkulaci |

## Struktura kodu

```
src/
├── pages/           Auth, Index (hlavni app), Terms, ResetPassword
├── components/
│   ├── dashboard/   DashboardOverview (metriky + export)
│   ├── income/      IncomeDialog, IncomeTable, IncomeExpensesTab
│   ├── expenses/    ExpenseDialog, ExpenseTable
│   ├── properties/  PropertyDialog (single/cinzak), PropertiesTab
│   ├── loans/       LoanDialog (multi-collateral), LoansTab
│   ├── investments/ InvestmentDialog, InvestmentsTab
│   ├── planning/    PlannedInvestmentDialog, PlanningTab
│   ├── admin/       AdminDashboard, ApprovedEmailsManager
│   └── ui/          shadcn komponenty + FormattedNumberInput
├── lib/
│   ├── utils.ts     formatNumber, formatCurrency, parseNum, grossToNet, calculateAnnuity
│   └── export.ts    exportToPDF, exportToExcel
├── integrations/supabase/
│   ├── client.ts    Supabase klient
│   └── types.ts     TypeScript typy pro vsechny tabulky
└── hooks/           use-toast, use-mobile
```

## Klicove vzory v kodu

- **Formatovani cisel:** `formatCurrency()` z `utils.ts` — pouziva `de-DE` locale (tecky jako oddelovace tisicu: 1.000.000 Kc)
- **Input pole s teckami:** `FormattedNumberInput` komponenta — live formatovani pri psani. Pouziva se pro vsechny penezni pole, procenta zustavaji jako `type="number"`
- **Parsovani:** `parseNum(val)` — bezpecny prevod string→number, vraci `undefined` pro prazdne/NaN
- **RLS:** Vsechny tabulky maji Row Level Security — uzivatel vidi jen sva data, admin vidi vse
- **Cinzak mod:** `properties.property_type = "single" | "multi"`. Multi ma sub-jednotky v `property_units`
- **Zastavy:** `loan_collaterals` junction tabulka. Katastralne oddelene jednotky s odhadni hodnotou se nabizeji jako zastava u uveru

## Jak deployovat

```bash
git push  # GitHub Actions automaticky buildne a deployne na GH Pages
```

Zmeny v databazi: SQL pres Supabase Dashboard → SQL Editor (prihlasit se v Chrome profilu CEO).

## Typicke upravy

- **Novy sloupec v DB:** 1. SQL migrace v `supabase/migrations/` 2. Pridat typ do `types.ts` 3. Upravit prislusny Dialog + Tab
- **Nova tabulka:** + RLS politiky + trigger `updated_at`
- **UI zmena:** Editovat prislusny `*Dialog.tsx` (formular) nebo `*Tab.tsx` (seznam/tabulka)
- **Export:** Upravit `export.ts` + `buildExportData()` v DashboardOverview
