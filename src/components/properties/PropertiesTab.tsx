import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PropertyDialog } from "./PropertyDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Building2, Home } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatNumber as fmtNumber } from "@/lib/utils";

export default function PropertiesTab({ userId: viewUserId, isAdmin = false }: { userId?: string | null; isAdmin?: boolean } = {}) {
  const [properties, setProperties] = useState<any[]>([]);
  const [editingProperty, setEditingProperty] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const readOnly = !!viewUserId && !isAdmin;

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

    const props = data || [];

    // Volná zástava = odhadní cena − Σ(zbývající jistina ÷ LTV) přes úvěry
    // zajištěné touto nemovitostí. LTV default 80 % když chybí.
    const propIds = props.map((p: any) => p.id);
    const consumedByProp: Record<string, number> = {};
    if (propIds.length > 0) {
      const { data: lc } = await supabase
        .from("loan_collaterals")
        .select("property_id, loan:loans(remaining_principal, ltv_percent)")
        .in("property_id", propIds);
      for (const row of lc || []) {
        const loan: any = (row as any).loan;
        const pid = (row as any).property_id;
        if (!loan || !pid) continue;
        const ltv = (loan.ltv_percent ?? 80) / 100;
        const consumed = ltv > 0 ? (loan.remaining_principal || 0) / ltv : (loan.remaining_principal || 0);
        consumedByProp[pid] = (consumedByProp[pid] || 0) + consumed;
      }
    }

    setProperties(
      props.map((p: any) => ({
        ...p,
        free_collateral: Math.max(0, ((p.estimated_value || p.purchase_price || 0)) - (consumedByProp[p.id] || 0)),
      }))
    );
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
        {!readOnly && <PropertyDialog onSuccess={fetchProperties} userId={viewUserId || undefined} />}
      </div>

      {properties.length > 0 && (() => {
        const value = (p: any) => p.estimated_value || p.purchase_price || 0;
        const totalValue = properties.reduce((s, p) => s + value(p), 0);
        const realizedGrowth = properties.reduce(
          (s, p) => s + (value(p) - (p.purchase_price || 0)), 0
        );
        const freeCollateral = properties.reduce((s, p) => s + (p.free_collateral || 0), 0);
        const rentProfit = properties.reduce(
          (s, p) => s + ((p.monthly_rent || 0) - (p.monthly_expenses || 0)), 0
        );
        const cell = (label: string, val: number, accent = false) => (
          <div className="rounded-md border p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-xl font-bold ${val < 0 ? "text-red-600" : accent ? "text-primary" : ""}`}>
              {formatNumber(Math.round(val))} Kč
            </p>
          </div>
        );
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cell("Celková hodnota portfolia", totalValue, true)}
            {cell("Realizovaný nárůst", realizedGrowth)}
            {cell("Volná zástavní hodnota", freeCollateral)}
            {cell("Nájemní zisk / měs", rentProfit)}
          </div>
        );
      })()}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Identifikátor</TableHead>
              <TableHead className="text-right">Kupní cena (Kč)</TableHead>
              <TableHead className="text-right">Odhadní hodnota (Kč)</TableHead>
              <TableHead className="text-right">Měsíční nájem (Kč)</TableHead>
              <TableHead className="text-right">Měsíční náklady (Kč)</TableHead>
              <TableHead className="text-right">Volná zástava (Kč)</TableHead>
              <TableHead>Úvěr</TableHead>
              <TableHead className="text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {properties.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Žádné nemovitosti
                </TableCell>
              </TableRow>
            ) : (
              properties.map((property) => (
                <TableRow key={property.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {property.property_type === "multi" ? (
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <Home className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span>{property.identifier}</span>
                      {property.property_type === "multi" && (
                        <Badge variant="outline" className="text-xs">Činžák</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(property.purchase_price)}</TableCell>
                  <TableCell className="text-right">{formatNumber(property.estimated_value)}</TableCell>
                  <TableCell className="text-right">{formatNumber(property.monthly_rent)}</TableCell>
                  <TableCell className="text-right">{formatNumber(property.monthly_expenses)}</TableCell>
                  <TableCell className="text-right">{formatNumber(property.free_collateral)}</TableCell>
                  <TableCell>{property.loans?.name || "-"}</TableCell>
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
          userId={viewUserId || undefined}
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
