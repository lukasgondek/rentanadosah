import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, CheckSquare, ChevronDown, ChevronUp } from "lucide-react";

interface ClientTask {
  id: string;
  client_id: string;
  created_by: string;
  title: string;
  description: string | null;
  assigned_to: string;
  deadline: string | null;
  is_completed: boolean;
  consultation_id: string | null;
  created_at: string;
  completed_at: string | null;
}

interface Props {
  userId?: string | null;
  isAdmin?: boolean;
}

export default function TaskList({ userId: viewUserId, isAdmin = false }: Props) {
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState("klient");
  const [newDeadline, setNewDeadline] = useState("");
  const { toast } = useToast();

  const fetchTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const targetUserId = viewUserId || user.id;

    const { data, error } = await supabase
      .from("client_tasks")
      .select("*")
      .eq("client_id", targetUserId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTasks(data as ClientTask[]);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [viewUserId]);

  const handleToggleComplete = async (task: ClientTask) => {
    // Klient může toggleovat jen svoje úkoly
    if (!isAdmin && task.assigned_to !== "klient") return;

    const newCompleted = !task.is_completed;
    const { error } = await supabase
      .from("client_tasks")
      .update({
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })
      .eq("id", task.id);

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }
    fetchTasks();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast({ title: "Chyba", description: "Vyplňte název úkolu", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const targetUserId = viewUserId || user.id;

    const { error } = await supabase.from("client_tasks").insert({
      client_id: targetUserId,
      created_by: user.id,
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      assigned_to: newAssignedTo,
      deadline: newDeadline || null,
    });

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Úspěch", description: "Úkol byl přidán" });
    setDialogOpen(false);
    setNewTitle("");
    setNewDescription("");
    setNewAssignedTo("klient");
    setNewDeadline("");
    fetchTasks();
  };

  const activeTasks = tasks.filter((t) => !t.is_completed);
  const completedTasks = tasks.filter((t) => t.is_completed);

  const filteredActive = filterAssignee === "all"
    ? activeTasks
    : activeTasks.filter((t) => t.assigned_to === filterAssignee);

  const filteredCompleted = filterAssignee === "all"
    ? completedTasks
    : completedTasks.filter((t) => t.assigned_to === filterAssignee);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Úkoly</h3>
        <div className="flex items-center gap-2">
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[140px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny</SelectItem>
              <SelectItem value="klient">Pro klienta</SelectItem>
              <SelectItem value="rr">Pro RR</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Přidat úkol
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nový úkol</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Název úkolu</Label>
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Co je potřeba udělat..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Popis (nepovinné)</Label>
                    <Textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Podrobnosti..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Úkol je pro</Label>
                      <Select value={newAssignedTo} onValueChange={setNewAssignedTo}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="klient">Klienta</SelectItem>
                          <SelectItem value="rr">Realitní Rentiér</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Deadline (nepovinné)</Label>
                      <Input
                        type="date"
                        value={newDeadline}
                        onChange={(e) => setNewDeadline(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Zrušit
                    </Button>
                    <Button type="submit">Přidat</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Active tasks */}
      {filteredActive.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Žádné aktivní úkoly</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredActive.map((task) => (
            <Card key={task.id} className="hover:bg-accent/30 transition-colors">
              <CardContent className="p-4 flex items-start gap-3">
                <Checkbox
                  checked={task.is_completed}
                  onCheckedChange={() => handleToggleComplete(task)}
                  disabled={!isAdmin && task.assigned_to !== "klient"}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{task.title}</span>
                    <Badge variant={task.assigned_to === "klient" ? "default" : "secondary"} className="text-xs">
                      {task.assigned_to === "klient" ? "Klient" : "RR"}
                    </Badge>
                    {task.deadline && (
                      <span className="text-xs text-muted-foreground">
                        do {new Date(task.deadline).toLocaleDateString("cs-CZ")}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed tasks toggle */}
      {filteredCompleted.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showCompleted ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Hotové úkoly ({filteredCompleted.length})
          </button>
          {showCompleted && (
            <div className="space-y-2 mt-2">
              {filteredCompleted.map((task) => (
                <Card key={task.id} className="opacity-60">
                  <CardContent className="p-4 flex items-start gap-3">
                    <Checkbox
                      checked={true}
                      onCheckedChange={() => handleToggleComplete(task)}
                      disabled={!isAdmin && task.assigned_to !== "klient"}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium line-through">{task.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {task.assigned_to === "klient" ? "Klient" : "RR"}
                        </Badge>
                        {task.completed_at && (
                          <span className="text-xs text-muted-foreground">
                            dokončeno {new Date(task.completed_at).toLocaleDateString("cs-CZ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
