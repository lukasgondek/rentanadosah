import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Trash2, User } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const { toast } = useToast();

  const filteredClients = clients.filter((client) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      client.email.toLowerCase().includes(q) ||
      (client.full_name && client.full_name.toLowerCase().includes(q))
    );
  });

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

  const handleDeleteClient = async (client: Client) => {
    try {
      // Delete all related data (RLS allows admin full access)
      const tables = [
        { table: "client_questions", column: "client_id" },
        { table: "client_tasks", column: "client_id" },
        { table: "consultation_records", column: "client_id" },
        { table: "investments", column: "user_id" },
        { table: "loans", column: "user_id" },
        { table: "properties", column: "user_id" },
        { table: "income_sources", column: "user_id" },
        { table: "expenses", column: "user_id" },
        { table: "planned_investments", column: "user_id" },
        { table: "user_roles", column: "user_id" },
      ];

      for (const { table, column } of tables) {
        await supabase.from(table).delete().eq(column, client.id);
      }

      // Delete from approved_emails
      await supabase.from("approved_emails").delete().eq("email", client.email);

      // Delete profile
      await supabase.from("profiles").delete().eq("id", client.id);

      toast({ title: "Klient smazán", description: `${client.full_name || client.email} byl odstraněn ze systému.` });
      setDeletingClient(null);
      if (selectedClientId === client.id) onSelectClient(null);
      fetchClients();
    } catch (error) {
      toast({ title: "Chyba", description: "Nepodařilo se smazat klienta", variant: "destructive" });
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
                  {searchQuery
                    ? `Nalezeno ${filteredClients.length} z ${clients.length}`
                    : `Celkem ${clients.length} ${clients.length === 1 ? "klient" : clients.length < 5 ? "klienti" : "klientů"}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Hledat klienta podle jména nebo e-mailu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="grid gap-4">
                  {filteredClients.map((client) => (
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
                          <div className="flex gap-2">
                            <Button onClick={() => onSelectClient(client.id)}>
                              Zobrazit kalkulačku
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeletingClient(client); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredClients.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "Žádný klient neodpovídá hledání" : "Zatím nejsou žádní registrovaní klienti"}
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
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{clients.find(c => c.id === selectedClientId)?.full_name || "Klient"}</p>
            <p className="text-sm text-muted-foreground">{clients.find(c => c.id === selectedClientId)?.email} — plný přístup</p>
          </div>
        </div>
      )}

      <AlertDialog open={!!deletingClient} onOpenChange={() => setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat klienta?</AlertDialogTitle>
            <AlertDialogDescription>
              Trvale smazat <strong>{deletingClient?.full_name || deletingClient?.email}</strong> a všechna jeho data
              (investice, příjmy, výdaje, nemovitosti, úvěry, zápisy, úkoly, dotazy)?
              Tato akce nelze vrátit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingClient && handleDeleteClient(deletingClient)}
            >
              Smazat klienta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
