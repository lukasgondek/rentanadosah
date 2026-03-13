import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PropertyDialog } from "./PropertyDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatNumber as fmtNumber } from "@/lib/utils";

export default function PropertiesTab({ userId: viewUserId }: { userId?: string | null } = {}) {
  const [properties, setProperties] = useState<any[]>([]);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const readOnly = !!viewUserId;

  const fetchProperties = async () => {
    let query = supabase
      .from("properties")
      .select("*, loans(*)")
      .order("created_at", { ascending: false });
    if (viewUserId) query = query.eq("user_id", viewUserId);
    const { data, error } = await query;

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst nemovitosti",
        variant: "destructive",
      });
      return;
    }

    setProperties(data || []);
  };

  useEffect(() => {
    fetchProperties();
  }, [viewUserId]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("properties").delete().eq("id", id);

    if (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se smazat nemovitost",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Úspěch",
      description: "Nemovitost byla smazána",
    });

    setDeletingId(null);
    fetchProperties();
  };

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return "-";
    return fmtNumber(num);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Nemovitosti</h2>
        {!readOnly && <PropertyDialog onSuccess={fetchProperties} />}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identifikátor</TableHead>
              <TableHead className="text-right">Kupní cena (Kč)</TableHead>
              <TableHead className="text-right">Odhadní hodnota (Kč)</TableHead>
              <TableHead className="text-right">Měsíční nájem (Kč)</TableHead>
              <TableHead className="text-right">Měsíční náklady (Kč)</TableHead>
              <TableHead className="text-right">Roční růst (%)</TableHead>
              <TableHead>Úvěr</TableHead>
              <TableHead>Plán</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  Žádné nemovitosti
                </TableCell>
              </TableRow>
            ) : (
              properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium">{property.identifier}</TableCell>
                  <TableCell className="text-right">{formatNumber(property.purchase_price)}</TableCell>
                  <TableCell className="text-right">{formatNumber(property.estimated_value)}</TableCell>
                  <TableCell className="text-right">{formatNumber(property.monthly_rent)}</TableCell>
                  <TableCell className="text-right">{formatNumber(property.monthly_expenses)}</TableCell>
                  <TableCell className="text-right">{property.yearly_appreciation_percent !== null ? property.yearly_appreciation_percent + "%" : "-"}</TableCell>
                  <TableCell>{property.loans?.name || "-"}</TableCell>
                  <TableCell>{property.is_forecast ? "Ano" : "Ne"}</TableCell>
                  {!readOnly && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingProperty(property)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingId(property.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingProperty && (
        <PropertyDialog
          editData={editingProperty}
          onSuccess={() => {
            setEditingProperty(null);
            fetchProperties();
          }}
        />
      )}

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat nemovitost?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce nelze vrátit zpět. Nemovitost bude trvale smazána.
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
