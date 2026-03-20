import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, MessageCircleQuestion, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientQuestion {
  id: string;
  client_id: string;
  question: string;
  answer: string | null;
  is_sos: boolean;
  is_resolved: boolean;
  created_at: string;
  answered_at: string | null;
}

interface Props {
  userId?: string | null;
  isAdmin?: boolean;
}

export default function QuestionsList({ userId: viewUserId, isAdmin = false }: Props) {
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newIsSos, setNewIsSos] = useState(false);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchQuestions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const targetUserId = viewUserId || user.id;

    const { data, error } = await supabase
      .from("client_questions")
      .select("*")
      .eq("client_id", targetUserId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setQuestions(data as ClientQuestion[]);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [viewUserId]);

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) {
      toast({ title: "Chyba", description: "Napište dotaz", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const targetUserId = viewUserId || user.id;

    const { error } = await supabase.from("client_questions").insert({
      client_id: targetUserId,
      question: newQuestion.trim(),
      is_sos: newIsSos,
    });

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }

    // SOS notification via Supabase Edge Function
    if (newIsSos) {
      try {
        await supabase.functions.invoke("sos-notification", {
          body: {
            clientName: "Klient kalkulačky",
            question: newQuestion.trim(),
          },
        });
      } catch (err) {
        console.warn("SOS notification failed:", err);
      }
      toast({ title: "SOS dotaz odeslán", description: "Váš naléhavý dotaz byl zaznamenán a poradce byl upozorněn." });
    } else {
      toast({ title: "Úspěch", description: "Dotaz byl přidán" });
    }

    setDialogOpen(false);
    setNewQuestion("");
    setNewIsSos(false);
    fetchQuestions();
  };

  const handleAnswer = async (questionId: string) => {
    const text = answerText[questionId];
    if (!text?.trim()) return;

    const { error } = await supabase
      .from("client_questions")
      .update({
        answer: text.trim(),
        answered_at: new Date().toISOString(),
      })
      .eq("id", questionId);

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Úspěch", description: "Odpověď byla uložena" });
    setAnswerText((prev) => ({ ...prev, [questionId]: "" }));
    fetchQuestions();
  };

  const handleResolve = async (questionId: string, resolved: boolean) => {
    const { error } = await supabase
      .from("client_questions")
      .update({ is_resolved: resolved })
      .eq("id", questionId);

    if (!error) fetchQuestions();
  };

  const unresolvedQuestions = questions.filter((q) => !q.is_resolved);
  const resolvedQuestions = questions.filter((q) => q.is_resolved);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Dotazy</h3>
        {(!isAdmin || viewUserId) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nový dotaz
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nový dotaz</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitQuestion} className="space-y-4">
                <div className="space-y-2">
                  <Label>Váš dotaz</Label>
                  <Textarea
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Co byste chtěli probrat na konzultaci?"
                    className="min-h-[120px]"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_sos"
                    checked={newIsSos}
                    onCheckedChange={(v) => setNewIsSos(v as boolean)}
                  />
                  <Label htmlFor="is_sos" className="text-sm">
                    SOS — naléhavý dotaz (odešle notifikaci poradci)
                  </Label>
                </div>
                {newIsSos && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>SOS dotaz odešle okamžitou notifikaci vašemu poradci. Používejte pouze pro naléhavé situace.</p>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Zrušit
                  </Button>
                  <Button type="submit" variant={newIsSos ? "destructive" : "default"}>
                    {newIsSos ? "Odeslat SOS" : "Odeslat dotaz"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {unresolvedQuestions.length === 0 && resolvedQuestions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircleQuestion className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Zatím žádné dotazy</p>
        </div>
      ) : (
        <>
          {unresolvedQuestions.map((q) => (
            <Card
              key={q.id}
              className={cn(
                "transition-colors",
                q.is_sos && "border-red-300 dark:border-red-700"
              )}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {q.is_sos && (
                        <Badge variant="destructive" className="text-xs">SOS</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(q.created_at).toLocaleDateString("cs-CZ")}
                      </span>
                    </div>
                    <p className="font-medium">{q.question}</p>
                  </div>
                  {(isAdmin || !viewUserId) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleResolve(q.id, true)}
                      className="text-xs"
                    >
                      Vyřešeno
                    </Button>
                  )}
                </div>

                {q.answer && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Odpověď:</p>
                    <p className="text-sm">{q.answer}</p>
                    {q.answered_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(q.answered_at).toLocaleDateString("cs-CZ")}
                      </p>
                    )}
                  </div>
                )}

                {isAdmin && !q.answer && (
                  <div className="flex gap-2">
                    <Textarea
                      value={answerText[q.id] || ""}
                      onChange={(e) => setAnswerText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Napsat odpověď..."
                      className="min-h-[60px] text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAnswer(q.id)}
                      disabled={!answerText[q.id]?.trim()}
                    >
                      Odpovědět
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {resolvedQuestions.length > 0 && (
            <div className="space-y-2 mt-6">
              <p className="text-sm text-muted-foreground">Vyřešené dotazy ({resolvedQuestions.length})</p>
              {resolvedQuestions.map((q) => (
                <Card key={q.id} className="opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm">{q.question}</p>
                        {q.answer && (
                          <p className="text-sm text-muted-foreground mt-1">→ {q.answer}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResolve(q.id, false)}
                        className="text-xs"
                      >
                        Znovu otevřít
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
