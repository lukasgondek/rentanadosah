import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

export const ExpenseTable = ({
  expenses,
  onDelete,
}: {
  expenses: Expense[];
  onDelete: () => void;
}) => {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Úspěch", description: "Výdaj byl smazán" });
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Název</TableHead>
          <TableHead>Částka</TableHead>
          <TableHead>Měsíčně</TableHead>
          <TableHead>Typ</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {expenses.map((expense) => (
          <TableRow key={expense.id}>
            <TableCell className="font-medium">{expense.name}</TableCell>
            <TableCell>
              {expense.amount.toLocaleString("cs-CZ")} Kč
              {expense.frequency === "yearly" && (
                <span className="text-xs text-muted-foreground ml-1">/rok</span>
              )}
              {expense.frequency === "monthly" && (
                <span className="text-xs text-muted-foreground ml-1">/měs</span>
              )}
            </TableCell>
            <TableCell>
              {getMonthlyAmount(expense).toLocaleString("cs-CZ", { maximumFractionDigits: 0 })} Kč
            </TableCell>
            <TableCell>
              {expense.is_recurring ? (
                <Badge variant="secondary">Pravidelný</Badge>
              ) : (
                <Badge variant="outline">Jednorázový</Badge>
              )}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(expense.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
