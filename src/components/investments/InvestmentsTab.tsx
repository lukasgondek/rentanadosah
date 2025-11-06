import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const InvestmentsTab = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Investice</h2>
        <p className="text-muted-foreground">
          Správa vašeho investičního portfolia
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Portfolio investic</CardTitle>
                <CardDescription>Hotovost, akcie, krypto a další</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Přidat investici
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Zatím nemáte žádné investice. Klikněte na tlačítko výše pro přidání.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Realitní multiplikátor</CardTitle>
            <CardDescription>Potenciál využití páky pro nemovitosti</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Volná hotovost:</span>
                <span className="font-medium">0 Kč</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">LTV 75% - možnost úvěru:</span>
                <span className="font-medium">0 Kč</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Průměrný měsíční příjem na 1M:</span>
                <span className="font-medium">0 Kč</span>
              </div>
              <div className="flex justify-between items-center border-t pt-3">
                <span className="font-medium">Zhodnocení vlastních peněz:</span>
                <span className="font-bold">0%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shrnutí investic</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Celková hodnota</div>
              <div className="text-2xl font-bold">0 Kč</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Průměrné zhodnocení</div>
              <div className="text-2xl font-bold">0%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Měsíční příjem na 1M</div>
              <div className="text-2xl font-bold">0 Kč</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvestmentsTab;
