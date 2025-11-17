import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoanDialog } from "./LoanDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoansTab() {
  const [loans, setLoans] = useState<any[]>([]);
  const [editingLoan, setEditingLoan] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchLoans = async () => {
    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst úvěry",
        variant: "destructive",
      });
      return;
    }

    setLoans(data || []);
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("loans").delete().eq("id", id);

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat úvěr",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Úspěch",
      description: "Úvěr byl smazán",
    });

    setDeletingId(null);
    fetchLoans();
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return "-";
    return new Intl.NumberFormat("cs-CZ").format(num);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Úvěry</h2>
        <LoanDialog onSuccess={fetchLoans} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název</TableHead>
              <TableHead>Banka</TableHead>
              <TableHead className="text-right">Původní částka (Kč)</TableHead>
              <TableHead className="text-right">Zbývající jistina (Kč)</TableHead>
              <TableHead className="text-right">Úrok (%)</TableHead>
              <TableHead className="text-right">Měsíční splátka (Kč)</TableHead>
              <TableHead className="text-right">Doba (roky)</TableHead>
              <TableHead className="text-right">LTV (%)</TableHead>
              <TableHead>Zajištění</TableHead>
              <TableHead>Plán</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground">
                  Žádné úvěry
                </TableCell>
              </TableRow>
            ) : (
              loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">{loan.name}</TableCell>
                  <TableCell>{loan.bank_name || "-"}</TableCell>
                  <TableCell className="text-right">{formatNumber(loan.original_amount)}</TableCell>
                  <TableCell className="text-right">{formatNumber(loan.remaining_principal)}</TableCell>
                  <TableCell className="text-right">{loan.interest_rate}%</TableCell>
                  <TableCell className="text-right">{formatNumber(loan.monthly_payment)}</TableCell>
                  <TableCell className="text-right">{Math.round(loan.term_months / 12)} let</TableCell>
                  <TableCell className="text-right">{loan.ltv_percent !== null ? loan.ltv_percent + "%" : "-"}</TableCell>
                  <TableCell>{loan.collateral_location || "-"}</TableCell>
                  <TableCell>{loan.is_forecast ? "Ano" : "Ne"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingLoan(loan)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingId(loan.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingLoan && (
        <LoanDialog
          editData={editingLoan}
          onSuccess={() => {
            setEditingLoan(null);
            fetchLoans();
          }}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat úvěr?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce nelze vrátit zpět. Úvěr bude trvale smazán.
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
