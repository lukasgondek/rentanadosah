import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User } from "lucide-react";
import { ApprovedEmailsManager } from "./ApprovedEmailsManager";

interface Client {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string | null;
}

interface AdminDashboardProps {
  onSelectClient: (clientId: string | null) => void;
  selectedClientId: string | null;
}

export const AdminDashboard = ({ onSelectClient, selectedClientId }: AdminDashboardProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst seznam klientů",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Správa klientských kalkulaček</p>
        </div>
        {selectedClientId && (
          <Button variant="outline" onClick={() => onSelectClient(null)}>
            Zpět na seznam klientů
          </Button>
        )}
      </div>

      {!selectedClientId ? (
        <Tabs defaultValue="clients" className="space-y-4">
          <TabsList>
            <TabsTrigger value="clients">Klienti</TabsTrigger>
            <TabsTrigger value="emails">Schválené e-maily</TabsTrigger>
          </TabsList>
          
          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <CardTitle>Seznam klientů</CardTitle>
                <CardDescription>
                  Celkem {clients.length} {clients.length === 1 ? "klient" : clients.length < 5 ? "klienti" : "klientů"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {clients.map((client) => (
                    <Card key={client.id} className="hover:bg-accent/50 transition-colors cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">{client.full_name || "Nepojmenovaný klient"}</p>
                              <p className="text-sm text-muted-foreground">{client.email}</p>
                              {client.created_at && (
                                <p className="text-xs text-muted-foreground">
                                  Registrován: {new Date(client.created_at).toLocaleDateString("cs-CZ")}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button onClick={() => onSelectClient(client.id)}>
                            Zobrazit kalkulačku
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {clients.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Zatím nejsou žádní registrovaní klienti
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails">
            <ApprovedEmailsManager />
          </TabsContent>
        </Tabs>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Kalkulačka klienta</CardTitle>
            <CardDescription>
              Prohlížíte data klienta: {clients.find(c => c.id === selectedClientId)?.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Zde se zobrazí běžný dashboard s daty vybraného klienta. Můžete editovat forecasting tabulky.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
