import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { IncomeDialog, IncomeEditData } from "./IncomeDialog";

interface IncomeSource {
  id: string;
  category: string;
  owner_type: string;
  name: string;
  gross_salary?: number;
  net_salary?: number;
  income_amount?: number;
  expense_type?: string;
  expense_percentage?: number;
  real_expenses?: number;
  tax_base?: number;
  business_income?: number;
  business_expenses?: number;
  business_tax_base?: number;
  other_amount?: number;
  other_frequency?: string;
}

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    employment: "Zaměstnání",
    self_employed_s7: "OSVČ § 7",
    rental_s9: "Příjmy z pronájmu § 9",
    business: "Firemní příjmy",
    other: "Jiné příjmy",
  };
  return labels[category] || category;
};

const getOwnerLabel = (owner: string) => {
  return owner === "self" ? "Já" : "Partner";
};

export const IncomeTable = ({
  incomeSources,
  onDelete
}: {
  incomeSources: IncomeSource[];
  onDelete: () => void;
}) => {
  const { toast } = useToast();
  const [editingIncome, setEditingIncome] = useState<IncomeEditData | null>(null);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("income_sources").delete().eq("id", id);
    
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Úspěch", description: "Příjem byl smazán" });
    onDelete();
  };

  const renderDetails = (income: IncomeSource) => {
    switch (income.category) {
      case "employment":
        return (
          <>
            <div>Hrubá: {income.gross_salary ? formatCurrency(income.gross_salary) : "-"}</div>
            <div>Čistá: {income.net_salary ? formatCurrency(income.net_salary) : "-"}</div>
          </>
        );
      case "self_employed_s7":
      case "rental_s9":
        return (
          <>
            <div>Příjmy: {income.income_amount ? formatCurrency(income.income_amount) : "-"}</div>
            {income.expense_type === "flat_rate" && (
              <div>Výdaje: Paušál {income.expense_percentage}%</div>
            )}
            {income.expense_type === "real" && (
              <div>Výdaje: {income.real_expenses ? formatCurrency(income.real_expenses) : "-"}</div>
            )}
            {income.expense_type === "pausalni_dan" && (
              <div>Režim: Paušální daň</div>
            )}
            <div className="font-semibold">Daň. základ: {income.tax_base ? formatCurrency(income.tax_base) : "-"}</div>
          </>
        );
      case "business":
        return (
          <>
            <div>Příjmy: {income.business_income ? formatCurrency(income.business_income) : "-"}</div>
            <div>Výdaje: {income.business_expenses !== undefined ? formatCurrency(income.business_expenses) : "-"}</div>
            <div className="font-semibold">Daň. základ: {income.business_tax_base ? formatCurrency(income.business_tax_base) : "-"}</div>
          </>
        );
      case "other":
        return (
          <div>
            {income.other_amount ? formatCurrency(income.other_amount) : "-"} ({income.other_frequency === "monthly" ? "měsíčně" : "ročně"})
          </div>
        );
      default:
        return null;
    }
  };

  if (incomeSources.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Zatím nemáte žádné příjmy. Přidejte je pomocí tlačítka výše.
      </div>
    );
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kategorie</TableHead>
          <TableHead>Pro koho</TableHead>
          <TableHead>Název</TableHead>
          <TableHead>Detaily</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incomeSources.map((income) => (
          <TableRow key={income.id}>
            <TableCell className="font-medium">{getCategoryLabel(income.category)}</TableCell>
            <TableCell>{getOwnerLabel(income.owner_type)}</TableCell>
            <TableCell>{income.name}</TableCell>
            <TableCell className="text-sm space-y-1">
              {renderDetails(income)}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingIncome(income as IncomeEditData)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(income.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    {editingIncome && (
      <IncomeDialog
        onSuccess={() => { setEditingIncome(null); onDelete(); }}
        editData={editingIncome}
        open={!!editingIncome}
        onOpenChange={(open) => { if (!open) setEditingIncome(null); }}
      />
    )}
    </>
  );
};
