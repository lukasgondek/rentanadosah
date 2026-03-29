import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import ConsultationRecords from "./ConsultationRecords";
import TaskList from "./TaskList";
import QuestionsList from "./QuestionsList";

interface StrategyTabProps {
  userId?: string | null;
  isAdmin?: boolean;
}

export default function StrategyTab({ userId: viewUserId, isAdmin = false }: StrategyTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Strategie</h2>
          <p className="text-muted-foreground">
            Záznamy z konzultací, úkoly a dotazy
          </p>
        </div>
        <Button asChild>
          <a href="https://calendar.app.google/opeUKRzkAPLNFKdo6" target="_blank" rel="noopener noreferrer">
            <Calendar className="mr-2 h-4 w-4" />
            Rezervovat konzultaci
          </a>
        </Button>
      </div>

      <Tabs defaultValue="records" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="records">Zápisy</TabsTrigger>
          <TabsTrigger value="tasks">Úkoly</TabsTrigger>
          <TabsTrigger value="questions">Dotazy</TabsTrigger>
        </TabsList>
        <TabsContent value="records">
          <ConsultationRecords userId={viewUserId} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="tasks">
          <TaskList userId={viewUserId} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="questions">
          <QuestionsList userId={viewUserId} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
