import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const PropertiesTab = () => {
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
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Přidat nemovitost
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Zatím nemáte žádné nemovitosti. Klikněte na tlačítko výše pro přidání.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Celková hodnota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 Kč</div>
            <p className="text-xs text-muted-foreground mt-1">Odhadní cena</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Měsíční příjem</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 Kč</div>
            <p className="text-xs text-muted-foreground mt-1">Z nájemného</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ROI průměr</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground mt-1">Návratnost investice</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cashflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 Kč</div>
            <p className="text-xs text-muted-foreground mt-1">Měsíční čistý příjem</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PropertiesTab;
