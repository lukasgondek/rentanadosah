import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const IncomeExpensesTab = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Příjmy & Výdaje</h2>
        <p className="text-muted-foreground">
          Spravujte své příjmy a výdaje
        </p>
      </div>

      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="income">Příjmy</TabsTrigger>
          <TabsTrigger value="expenses">Výdaje</TabsTrigger>
        </TabsList>
        
        <TabsContent value="income" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Zdroje příjmů</CardTitle>
                  <CardDescription>Přidejte všechny své zdroje příjmů</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Přidat příjem
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Zatím nemáte žádné příjmy. Klikněte na tlačítko výše pro přidání.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shrnutí příjmů</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Měsíční příjem celkem:</span>
                  <span className="font-bold text-lg">0 Kč</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Roční příjem celkem:</span>
                  <span className="font-bold text-lg">0 Kč</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pravidelné výdaje</CardTitle>
                  <CardDescription>Měsíční pravidelné náklady</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Přidat výdaj
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Zatím nemáte žádné výdaje. Klikněte na tlačítko výše pro přidání.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shrnutí výdajů</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pravidelné měsíční:</span>
                  <span className="font-medium">0 Kč</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Nepravidelné měsíční:</span>
                  <span className="font-medium">0 Kč</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-sm font-medium">Celkem měsíčně:</span>
                  <span className="font-bold text-lg">0 Kč</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IncomeExpensesTab;
