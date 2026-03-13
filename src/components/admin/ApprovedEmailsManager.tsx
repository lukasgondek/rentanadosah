import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { z } from "zod";

type AppRole = "user" | "prospect";

interface ApprovedEmail {
  id: string;
  email: string;
  created_at: string;
  notes: string | null;
  role: AppRole;
}

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Neplatná emailová adresa" }).max(255),
  notes: z.string().trim().max(500).optional(),
});

export const ApprovedEmailsManager = () => {
  const [emails, setEmails] = useState<ApprovedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("user");
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const fetchEmails = async () => {
    try {
      const { data, error } = await supabase
        .from("approved_emails")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEmails(data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodařilo se načíst schválené emaily.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);

    try {
      const validation = emailSchema.safeParse({ email: newEmail, notes });
      if (!validation.success) {
        toast({
          variant: "destructive",
          title: "Chyba validace",
          description: validation.error.errors[0].message,
        });
        setAdding(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("approved_emails")
        .insert({
          email: newEmail.trim().toLowerCase(),
          notes: notes.trim() || null,
          role: selectedRole,
          approved_by: user?.id,
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            variant: "destructive",
            title: "Email již existuje",
            description: "Tento email je již v seznamu schválených.",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Email přidán",
          description: "Email byl úspěšně přidán do seznamu schválených.",
        });
        setNewEmail("");
        setNotes("");
        setSelectedRole("user");
        fetchEmails();
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodařilo se přidat email.",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (id: string, newRole: AppRole) => {
    try {
      // Update approved_emails role
      const { error } = await supabase
        .from("approved_emails")
        .update({ role: newRole })
        .eq("id", id);

      if (error) throw error;

      // Try to update user_roles if user already registered
      const email = emails.find((e) => e.id === id)?.email;
      if (email) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (profile) {
          await supabase
            .from("user_roles")
            .update({ role: newRole })
            .eq("user_id", profile.id);
        }
      }

      toast({
        title: "Role změněna",
        description: `Role nastavena na ${newRole === "prospect" ? "Zájemce" : "Klient"}`,
      });
      fetchEmails();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodařilo se změnit roli.",
      });
    }
  };

  const handleDeleteEmail = async (id: string) => {
    try {
      const { error } = await supabase
        .from("approved_emails")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Email odebrán",
        description: "Email byl úspěšně odebrán ze seznamu schválených.",
      });
      fetchEmails();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Chyba",
        description: "Nepodařilo se odebrat email.",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Přidat schválený email</CardTitle>
          <CardDescription>
            Pouze e-maily v tomto seznamu se mohou registrovat do aplikace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddEmail} className="space-y-4">
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="notes">Poznámka (volitelné)</Label>
              <Input
                id="notes"
                type="text"
                placeholder="Např. jméno účastníka"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Klient (plný přístup)</SelectItem>
                  <SelectItem value="prospect">Zájemce (bez plánování)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={adding}>
              {adding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Přidávám...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Přidat email
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schválené e-maily ({emails.length})</CardTitle>
          <CardDescription>
            Seznam všech e-mailů s přístupem do aplikace
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Zatím nejsou schváleny žádné e-maily
            </p>
          ) : (
            <div className="space-y-2">
              {emails.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{item.email}</p>
                      <Select
                        value={item.role}
                        onValueChange={(v) => handleRoleChange(item.id, v as AppRole)}
                      >
                        <SelectTrigger className="h-6 w-[120px] text-xs px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Klient</SelectItem>
                          <SelectItem value="prospect">Zájemce</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground">{item.notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Přidáno: {new Date(item.created_at).toLocaleDateString("cs-CZ")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteEmail(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
