import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoanDialog } from "./LoanDialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const LoansTab = () => {
  const [loans, setLoans] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchLoans = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("loans")
      .select("*")
      .eq("user_id", user.id)
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

  const totalPrincipal = loans.reduce((sum, loan) => sum + (loan.remaining_principal || 0), 0);
  const totalMonthlyPayment = loans.reduce((sum, loan) => sum + (loan.monthly_payment || 0), 0);
  const avgInterestRate = loans.length > 0
    ? loans.reduce((sum, loan) => sum + (loan.interest_rate || 0), 0) / loans.length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Úvěry</h2>
        <p className="text-muted-foreground">
          Přehled vašich úvěrů a závazků
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Aktivní úvěry</CardTitle>
              <CardDescription>Všechny vaše úvěry na jednom místě</CardDescription>
            </div>
            <LoanDialog onSuccess={fetchLoans} />
          </div>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Zatím nemáte žádné úvěry. Klikněte na tlačítko výše pro přidání.
            </div>
          ) : (
            <div className="space-y-3">
              {loans.map((loan) => (
                <div key={loan.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{loan.name || `Úvěr ${loan.bank_name || ''}`}</div>
                    <div className="text-sm text-muted-foreground">
                      {loan.interest_rate}% · {loan.term_months} měsíců
                      {loan.is_forecast && <span className="ml-2 text-xs">(plán)</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{loan.remaining_principal.toLocaleString()} Kč</div>
                    <div className="text-sm text-muted-foreground">{loan.monthly_payment.toLocaleString()} Kč/měs</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Celková jistina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPrincipal.toLocaleString()} Kč</div>
            <p className="text-xs text-muted-foreground mt-1">Zbývající k doplacení</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Měsíční splátky</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMonthlyPayment.toLocaleString()} Kč</div>
            <p className="text-xs text-muted-foreground mt-1">Celkem všech úvěrů</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Průměrný úrok</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgInterestRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Vážený průměr</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoansTab;
