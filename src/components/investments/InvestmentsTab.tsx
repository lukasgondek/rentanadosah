import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InvestmentDialog } from "./InvestmentDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const investmentTypeLabels: Record<string, string> = {
  cash: "Hotovost",
  stocks: "Akcie",
  bonds: "Dluhopisy",
  crypto: "Kryptoměny",
  etf: "ETF",
  mutual_fund: "Podílový fond",
  other: "Jiné",
};

export default function InvestmentsTab() {
  const [investments, setInvestments] = useState<any[]>([]);
  const [editingInvestment, setEditingInvestment] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInvestments = async () => {
    const { data, error } = await supabase
      .from("investments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst investice",
        variant: "destructive",
      });
      return;
    }

    setInvestments(data || []);
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("investments").delete().eq("id", id);

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat investici",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Úspěch",
      description: "Investice byla smazána",
    });

    setDeletingId(null);
    fetchInvestments();
  };

  const formatNumber = (num: number | null) => {
    if (num === null) return "-";
    return new Intl.NumberFormat("cs-CZ").format(num);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Investice</h2>
        <InvestmentDialog onSuccess={fetchInvestments} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Název</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead className="text-right">Hodnota (Kč)</TableHead>
              <TableHead className="text-right">Roční zhodnocení (%)</TableHead>
              <TableHead className="text-right">Likvidace (měsíce)</TableHead>
              <TableHead>Plán</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Žádné investice
                </TableCell>
              </TableRow>
            ) : (
              investments.map((investment) => (
                <TableRow key={investment.id}>
                  <TableCell className="font-medium">{investment.name}</TableCell>
                  <TableCell>{investmentTypeLabels[investment.type] || investment.type}</TableCell>
                  <TableCell className="text-right">{formatNumber(investment.amount)}</TableCell>
                  <TableCell className="text-right">{investment.yearly_return_percent !== null ? investment.yearly_return_percent + "%" : "-"}</TableCell>
                  <TableCell className="text-right">{investment.liquidity_months !== null ? investment.liquidity_months : "-"}</TableCell>
                  <TableCell>{investment.is_forecast ? "Ano" : "Ne"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingInvestment(investment)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingId(investment.id)}
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

      {editingInvestment && (
        <InvestmentDialog
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
            <AlertDialogTitle>Smazat investici?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce nelze vrátit zpět. Investice bude trvale smazána.
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
