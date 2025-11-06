import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const LoansTab = () => {
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
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Přidat úvěr
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Zatím nemáte žádné úvěry. Klikněte na tlačítko výše pro přidání.
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Celková jistina</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 Kč</div>
            <p className="text-xs text-muted-foreground mt-1">Zbývající k doplacení</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Měsíční splátky</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 Kč</div>
            <p className="text-xs text-muted-foreground mt-1">Celkem všech úvěrů</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Průměrný úrok</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground mt-1">Vážený průměr</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoansTab;
