import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Trash2, User, Plus, UserCheck, UserX, Users } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { z } from "zod";

type AppRole = "user" | "prospect";
type FilterRole = "all" | "user" | "prospect";

interface PersonEntry {
  email: string;
  role: AppRole;
  approvedEmailId: string;
  notes: string | null;
  approvedAt: string;
  profileId: string | null;
  fullName: string | null;
  registeredAt: string | null;
}

interface AdminDashboardProps {
  onSelectClient: (clientId: string | null) => void;
  selectedClientId: string | null;
}

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Neplatná emailová adresa" }).max(255),
  notes: z.string().trim().max(500).optional(),
});

export const AdminDashboard = ({ onSelectClient, selectedClientId }: AdminDashboardProps) => {
  const [people, setPeople] = useState<PersonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<FilterRole>("all");
  const [deletingPerson, setDeletingPerson] = useState<PersonEntry | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("user");
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const filteredPeople = people.filter((p) => {
    // Role filter
    if (filterRole !== "all" && p.role !== filterRole) return false;
    // Search filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.email.toLowerCase().includes(q) ||
      (p.fullName && p.fullName.toLowerCase().includes(q)) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  const counts = {
    all: people.length,
    user: people.filter((p) => p.role === "user").length,
    prospect: people.filter((p) => p.role === "prospect").length,
  };

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      // Fetch both sources
      const [emailsRes, profilesRes] = await Promise.all([
        supabase.from("approved_emails").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*"),
      ]);

      if (emailsRes.error) throw emailsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const emails = emailsRes.data || [];
      const profiles = profilesRes.data || [];

      // Create a map of profiles by email for fast lookup
      const profileMap = new Map(profiles.map((p) => [p.email.toLowerCase(), p]));

      // Build unified list from approved_emails
      const merged: PersonEntry[] = emails.map((ae) => {
        const profile = profileMap.get(ae.email.toLowerCase());
        return {
          email: ae.email,
          role: ae.role as AppRole,
          approvedEmailId: ae.id,
          notes: ae.notes,
          approvedAt: ae.created_at,
          profileId: profile?.id || null,
          fullName: profile?.full_name || null,
          registeredAt: profile?.created_at || null,
        };
      });

      setPeople(merged);
    } catch (error) {
      toast({
        title: "Chyba",
        description: "Nepodařilo se načíst seznam přístupů",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);

    try {
      const validation = emailSchema.safeParse({ email: newEmail, notes: newNotes });
      if (!validation.success) {
        toast({ variant: "destructive", title: "Chyba validace", description: validation.error.errors[0].message });
        setAdding(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from("approved_emails").insert({
        email: newEmail.trim().toLowerCase(),
        notes: newNotes.trim() || null,
        role: newRole,
        approved_by: user?.id,
      });

      if (error) {
        if (error.code === "23505") {
          toast({ variant: "destructive", title: "Email již existuje", description: "Tento email je již v seznamu." });
        } else {
          throw error;
        }
      } else {
        toast({ title: "Přístup přidán", description: `${newEmail} přidán jako ${newRole === "prospect" ? "zájemce" : "klient"}.` });
        setNewEmail("");
        setNewNotes("");
        setNewRole("user");
        setShowAddForm(false);
        fetchPeople();
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se přidat email." });
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (person: PersonEntry, newRoleVal: AppRole) => {
    try {
      // Update approved_emails
      const { error } = await supabase
        .from("approved_emails")
        .update({ role: newRoleVal })
        .eq("id", person.approvedEmailId);

      if (error) throw error;

      // Update user_roles if registered
      if (person.profileId) {
        await supabase
          .from("user_roles")
          .upsert({ user_id: person.profileId, role: newRoleVal }, { onConflict: "user_id" });
      }

      toast({
        title: "Role změněna",
        description: `${person.fullName || person.email} → ${newRoleVal === "prospect" ? "Zájemce" : "Klient"}`,
      });
      fetchPeople();
    } catch (error) {
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se změnit roli." });
    }
  };

  const handleDeletePerson = async (person: PersonEntry) => {
    try {
      // If registered, delete all user data
      if (person.profileId) {
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
          await supabase.from(table).delete().eq(column, person.profileId);
        }

        await supabase.from("profiles").delete().eq("id", person.profileId);
      }

      // Delete approved email
      await supabase.from("approved_emails").delete().eq("id", person.approvedEmailId);

      toast({
        title: "Přístup odebrán",
        description: `${person.fullName || person.email} byl odstraněn ze systému.`,
      });
      setDeletingPerson(null);
      if (selectedClientId === person.profileId) onSelectClient(null);
      fetchPeople();
    } catch (error) {
      toast({ variant: "destructive", title: "Chyba", description: "Nepodařilo se smazat přístup." });
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
          <p className="text-muted-foreground">Správa přístupů do kalkulačky</p>
        </div>
        <div className="flex gap-2">
          {selectedClientId && (
            <Button variant="outline" onClick={() => onSelectClient(null)}>
              Zpět na seznam
            </Button>
          )}
        </div>
      </div>

      {!selectedClientId ? (
        <div className="space-y-4">
          {/* Add access button + form */}
          {!showAddForm ? (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Přidat přístup
            </Button>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Přidat přístup</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddEmail} className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1.5 flex-1 min-w-[200px]">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="uzivatel@email.cz"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      required
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-1.5 min-w-[140px]">
                    <Label>Role</Label>
                    <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Klient</SelectItem>
                        <SelectItem value="prospect">Zájemce</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-[160px]">
                    <Label htmlFor="notes">Poznámka</Label>
                    <Input
                      id="notes"
                      placeholder="Volitelné"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      maxLength={500}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={adding}>
                      {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Přidat"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>
                      Zrušit
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Search + Filter */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Přístupy ({filteredPeople.length})</CardTitle>
                  <CardDescription>
                    {counts.user} {counts.user === 1 ? "klient" : counts.user < 5 ? "klienti" : "klientů"}, {counts.prospect} {counts.prospect === 1 ? "zájemce" : counts.prospect < 5 ? "zájemci" : "zájemců"}
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={filterRole === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterRole("all")}
                  >
                    <Users className="mr-1 h-3.5 w-3.5" />
                    Všichni ({counts.all})
                  </Button>
                  <Button
                    variant={filterRole === "user" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterRole("user")}
                  >
                    <UserCheck className="mr-1 h-3.5 w-3.5" />
                    Klienti ({counts.user})
                  </Button>
                  <Button
                    variant={filterRole === "prospect" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterRole("prospect")}
                  >
                    <UserX className="mr-1 h-3.5 w-3.5" />
                    Zájemci ({counts.prospect})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Hledat podle jména, e-mailu nebo poznámky..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="grid gap-3">
                {filteredPeople.map((person) => (
                  <Card key={person.approvedEmailId} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold truncate">
                                {person.fullName || person.email}
                              </p>
                              <Badge variant={person.role === "user" ? "default" : "secondary"}>
                                {person.role === "user" ? "Klient" : "Zájemce"}
                              </Badge>
                              {!person.profileId && (
                                <Badge variant="outline" className="text-muted-foreground">
                                  Neregistrován
                                </Badge>
                              )}
                            </div>
                            {person.fullName && (
                              <p className="text-sm text-muted-foreground truncate">{person.email}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {person.registeredAt && (
                                <span>Registrován: {new Date(person.registeredAt).toLocaleDateString("cs-CZ")}</span>
                              )}
                              {person.notes && <span>· {person.notes}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Select
                            value={person.role}
                            onValueChange={(v) => handleRoleChange(person, v as AppRole)}
                          >
                            <SelectTrigger className="h-8 w-[110px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Klient</SelectItem>
                              <SelectItem value="prospect">Zájemce</SelectItem>
                            </SelectContent>
                          </Select>
                          {person.profileId && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onSelectClient(person.profileId!)}
                            >
                              Kalkulačka
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); setDeletingPerson(person); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {filteredPeople.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery || filterRole !== "all"
                      ? "Žádný výsledek neodpovídá hledání"
                      : "Zatím nejsou žádné přístupy"}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">
              {people.find((p) => p.profileId === selectedClientId)?.fullName || "Klient"}
            </p>
            <p className="text-sm text-muted-foreground">
              {people.find((p) => p.profileId === selectedClientId)?.email}
            </p>
          </div>
        </div>
      )}

      <AlertDialog open={!!deletingPerson} onOpenChange={() => setDeletingPerson(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Odebrat přístup?</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingPerson?.profileId ? (
                <>
                  Trvale smazat <strong>{deletingPerson?.fullName || deletingPerson?.email}</strong> a všechna jeho data
                  (investice, příjmy, výdaje, nemovitosti, úvěry, zápisy, úkoly, dotazy)?
                  Tato akce nelze vrátit.
                </>
              ) : (
                <>
                  Odebrat <strong>{deletingPerson?.email}</strong> ze seznamu schválených přístupů?
                  Tento email se nebude moct registrovat.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingPerson && handleDeletePerson(deletingPerson)}
            >
              {deletingPerson?.profileId ? "Smazat vše" : "Odebrat přístup"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
