import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyDialog } from "./PropertyDialog";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PropertiesTab = () => {
  const [properties, setProperties] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchProperties = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

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
  }, []);

  const totalValue = properties.reduce((sum, prop) => sum + (prop.estimated_value || 0), 0);
  const totalMonthlyRent = properties.reduce((sum, prop) => sum + (prop.monthly_rent || 0), 0);
  const totalMonthlyExpenses = properties.reduce((sum, prop) => sum + (prop.monthly_expenses || 0), 0);
  const monthlyCashflow = totalMonthlyRent - totalMonthlyExpenses;
  const avgROI = properties.length > 0 && totalValue > 0
    ? (totalMonthlyRent * 12 / totalValue) * 100
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Nemovitosti</h2>
        <p className="text-muted-foreground">
          Portfolio vašich nemovitostí
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Vaše nemovitosti</CardTitle>
              <CardDescription>Všechny vaše nemovitosti s výpočty ROI</CardDescription>
            </div>
            <PropertyDialog onSuccess={fetchProperties} />
          </div>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Zatím nemáte žádné nemovitosti. Klikněte na tlačítko výše pro přidání.
            </div>
          ) : (
            <div className="space-y-3">
              {properties.map((property) => (
                <div key={property.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{property.identifier}</div>
                    <div className="text-sm text-muted-foreground">
                      Nájem: {property.monthly_rent?.toLocaleString() || 0} Kč/měs
                      {property.is_forecast && <span className="ml-2 text-xs">(plán)</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{property.estimated_value.toLocaleString()} Kč</div>
                    <div className="text-sm text-muted-foreground">
                      Cashflow: {((property.monthly_rent || 0) - (property.monthly_expenses || 0)).toLocaleString()} Kč
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Celková hodnota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValue.toLocaleString()} Kč</div>
            <p className="text-xs text-muted-foreground mt-1">Odhadní cena</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Měsíční příjem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMonthlyRent.toLocaleString()} Kč</div>
            <p className="text-xs text-muted-foreground mt-1">Z nájemného</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ROI průměr</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgROI.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Návratnost investice</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cashflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyCashflow.toLocaleString()} Kč</div>
            <p className="text-xs text-muted-foreground mt-1">Měsíční čistý příjem</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PropertiesTab;
