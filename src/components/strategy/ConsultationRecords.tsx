import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConsultationRecord {
  id: string;
  client_id: string;
  created_by: string;
  title: string;
  content: string;
  meeting_date: string;
  meeting_number: number | null;
  created_at: string;
}

interface Props {
  userId?: string | null;
  isAdmin?: boolean;
}

export default function ConsultationRecords({ userId: viewUserId, isAdmin = false }: Props) {
  const [records, setRecords] = useState<ConsultationRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const fetchRecords = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const targetUserId = viewUserId || user.id;

    const { data, error } = await supabase
      .from("consultation_records")
      .select("*")
      .eq("client_id", targetUserId)
      .order("meeting_date", { ascending: false });

    if (!error && data) {
      setRecords(data as ConsultationRecord[]);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [viewUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !meetingDate || !content.trim()) {
      toast({ title: "Chyba", description: "Vyplňte všechna pole", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const targetUserId = viewUserId || user.id;
    const meetingNumber = records.length + 1;

    const { error } = await supabase.from("consultation_records").insert({
      client_id: targetUserId,
      created_by: user.id,
      title: title.trim(),
      content: content.trim(),
      meeting_date: meetingDate,
      meeting_number: meetingNumber,
    });

    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Úspěch", description: "Záznam byl přidán" });
    setDialogOpen(false);
    setTitle("");
    setMeetingDate("");
    setContent("");
    fetchRecords();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Zápisy ze setkání</h3>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Přidat záznam
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nový záznam ze setkání</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Název</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="1. Setkání"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Datum setkání</Label>
                    <Input
                      type="date"
                      value={meetingDate}
                      onChange={(e) => setMeetingDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Obsah záznamu</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Shrnutí setkání, probraná témata, akční kroky..."
                    className="min-h-[300px]"
                    required
                  />
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

      {records.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Zatím žádné záznamy ze setkání</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <Card
              key={record.id}
              className={cn(
                "cursor-pointer transition-colors hover:bg-accent/50",
                expandedId === record.id && "ring-1 ring-primary"
              )}
            >
              <CardHeader
                className="pb-2"
                onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {record.meeting_number && (
                      <span className="text-xs font-bold bg-primary/10 text-primary rounded-full w-7 h-7 flex items-center justify-center">
                        {record.meeting_number}
                      </span>
                    )}
                    <div>
                      <CardTitle className="text-base">{record.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(record.meeting_date).toLocaleDateString("cs-CZ")}
                      </p>
                    </div>
                  </div>
                  {expandedId === record.id ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
              {expandedId === record.id && (
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                    {record.content}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
