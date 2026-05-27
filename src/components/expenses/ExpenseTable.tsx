import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { ExpenseDialog } from "./ExpenseDialog";

interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency: string | null;
  is_recurring: boolean | null;
}

const getMonthlyAmount = (expense: Expense): number => {
  if (expense.frequency === "yearly") return expense.amount / 12;
  return expense.amount;
};

interface ExpenseTableProps {
  expenses: Expense[];
  onDelete: () => void;
  /** Pokud admin prohlíží cizí kalkulačku, edit/delete musí psát na klientovo user_id. */
  userId?: string;
  /** Read-only režim — skryje akce. Per default false. */
  readOnly?: boolean;
}

export const ExpenseTable = ({ expenses, onDelete, userId, readOnly = false }: ExpenseTableProps) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Úspěch", description: "Výdaj byl smazán" });
    setDeleting(null);
    onDelete();
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Zatím nemáte žádné výdaje. Přidejte je pomocí tlačítka výše.
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Název</TableHead>
            <TableHead>Částka</TableHead>
            <TableHead>Měsíčně</TableHead>
            <TableHead>Typ</TableHead>
            {!readOnly && <TableHead className="w-[100px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => (
            <TableRow key={expense.id}>
              <TableCell className="font-medium">{expense.name}</TableCell>
              <TableCell>
                {formatCurrency(expense.amount)}
                {expense.frequency === "yearly" && (
                  <span className="text-xs text-muted-foreground ml-1">/rok</span>
                )}
                {expense.frequency === "monthly" && (
                  <span className="text-xs text-muted-foreground ml-1">/měs</span>
                )}
              </TableCell>
              <TableCell>{formatCurrency(getMonthlyAmount(expense))}</TableCell>
              <TableCell>
                {expense.is_recurring ? (
                  <Badge variant="secondary">Pravidelný</Badge>
                ) : (
                  <Badge variant="outline">Jednorázový</Badge>
                )}
              </TableCell>
              {!readOnly && (
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditing(expense)}
                      title="Upravit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleting(expense)}
                      title="Smazat"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ExpenseDialog
        open={!!editing}
        onOpenChange={(o) => { if (!o) setEditing(null); }}
        editData={editing || undefined}
        userId={userId}
        onSuccess={() => { setEditing(null); onDelete(); }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat výdaj?</AlertDialogTitle>
            <AlertDialogDescription>
              „{deleting?.name}" — tato akce nelze vrátit zpět.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && handleDelete(deleting.id)}
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
