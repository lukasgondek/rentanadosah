import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlannedInvestmentDialog } from "./PlannedInvestmentDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PlanningTab({ userId: viewUserId }: { userId?: string | null } = {}) {
  const [investments, setInvestments] = useState<any[]>([]);
  const [editingInvestment, setEditingInvestment] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const readOnly = !!viewUserId;

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

  const formatNumber = (num: number | null) => {
    if (num === null) return "-";
    return new Intl.NumberFormat("cs-CZ").format(num);
  };

  // Calculate derived values for display
  const calculateValues = (inv: any) => {
    const monthlyRent = inv.monthly_rent || 0;
    const monthlyExpenses = inv.monthly_expenses || 0;
    const cashflow = monthlyRent - monthlyExpenses;

    // Monthly payment calculation
    const monthlyRate = (inv.interest_rate || 0) / 100 / 12;
    const termMonths = inv.term_months || 0;
    let monthlyPayment = 0;
    if (inv.loan_amount > 0 && monthlyRate > 0 && termMonths > 0) {
      monthlyPayment = inv.loan_amount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
    }

    const monthlyInterest = inv.loan_amount * monthlyRate;
    const netAnnualRentProfit = (cashflow * 12) - (monthlyInterest * 12);
    const annualAppreciationProfit = inv.estimated_value * ((inv.appreciation_percent || 0) / 100);
    const netAnnualProfit = netAnnualRentProfit + annualAppreciationProfit;

    return {
      cashflow,
      monthlyPayment,
      monthlyInterest,
      netAnnualProfit,
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Plánování investic</h2>
        {!readOnly && <PlannedInvestmentDialog onSuccess={fetchInvestments} />}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identifikátor</TableHead>
              <TableHead className="text-right">Kupní cena (Kč)</TableHead>
              <TableHead className="text-right">Odhadní cena (Kč)</TableHead>
              <TableHead className="text-right">Měs. nájem (Kč)</TableHead>
              <TableHead className="text-right">Měs. výdaje (Kč)</TableHead>
              <TableHead className="text-right">Cashflow (Kč)</TableHead>
              <TableHead className="text-right">Výše úvěru (Kč)</TableHead>
              <TableHead className="text-right">Úrok (%)</TableHead>
              <TableHead className="text-right">LTV (%)</TableHead>
              <TableHead className="text-right">Měs. splátka (Kč)</TableHead>
              <TableHead className="text-right">Čistý roční zisk (Kč)</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-muted-foreground">
                  Žádné plánované investice
                </TableCell>
              </TableRow>
            ) : (
              investments.map((inv) => {
                const calc = calculateValues(inv);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.property_identifier}</TableCell>
                    <TableCell className="text-right">{formatNumber(inv.purchase_price)}</TableCell>
                    <TableCell className="text-right">{formatNumber(inv.estimated_value)}</TableCell>
                    <TableCell className="text-right">{formatNumber(inv.monthly_rent)}</TableCell>
                    <TableCell className="text-right">{formatNumber(inv.monthly_expenses)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatNumber(calc.cashflow)}</TableCell>
                    <TableCell className="text-right">{formatNumber(inv.loan_amount)}</TableCell>
                    <TableCell className="text-right">{inv.interest_rate}%</TableCell>
                    <TableCell className="text-right">{inv.ltv_percent}%</TableCell>
                    <TableCell className="text-right">{formatNumber(calc.monthlyPayment)}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">{formatNumber(calc.netAnnualProfit)}</TableCell>
                    {!readOnly && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingInvestment(inv)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeletingId(inv.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {editingInvestment && (
        <PlannedInvestmentDialog
          editData={editingInvestment}
          onSuccess={() => {
            setEditingInvestment(null);
            fetchInvestments();
          }}
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
    </div>
  );
}
