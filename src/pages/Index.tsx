import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Layout from "@/components/Layout";
import DashboardOverview from "@/components/dashboard/DashboardOverview";
import IncomeExpensesTab from "@/components/income/IncomeExpensesTab";
import InvestmentsTab from "@/components/investments/InvestmentsTab";
import LoansTab from "@/components/loans/LoansTab";
import PropertiesTab from "@/components/properties/PropertiesTab";
import PlanningTab from "@/components/planning/PlanningTab";
import StrategyTab from "@/components/strategy/StrategyTab";
import StrategyProspectLP from "@/components/strategy/StrategyProspectLP";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, User as UserIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientInfo {
  id: string;
  email: string;
  full_name: string | null;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientInfo, setSelectedClientInfo] = useState<ClientInfo | null>(null);
  const { isAdmin, isProspect, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSelectClient = async (clientId: string | null) => {
    setSelectedClientId(clientId);
    if (clientId) {
      setActiveTab("dashboard");
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("id", clientId)
        .single();
      if (data) setSelectedClientInfo(data);
    } else {
      setSelectedClientInfo(null);
    }
  };

  const renderContent = () => {
    if (activeTab === "admin" && isAdmin) {
      return <AdminDashboard onSelectClient={handleSelectClient} selectedClientId={selectedClientId} />;
    }

    const viewUserId = isAdmin ? selectedClientId : null;
    return renderClientContent(viewUserId);
  };

  const renderClientContent = (viewUserId?: string | null) => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardOverview userId={viewUserId} isProspect={isProspect} />;
      case "income-expenses":
        return <IncomeExpensesTab userId={viewUserId} isAdmin={isAdmin} />;
      case "investments":
        return <InvestmentsTab userId={viewUserId} isAdmin={isAdmin} />;
      case "loans":
        return <LoansTab userId={viewUserId} isAdmin={isAdmin} />;
      case "properties":
        return <PropertiesTab userId={viewUserId} isAdmin={isAdmin} />;
      case "strategy":
        if (isProspect) {
          return <StrategyProspectLP section="strategy" />;
        }
        return <StrategyTab userId={viewUserId} isAdmin={isAdmin} />;
      case "planning":
        if (isProspect) {
          return <StrategyProspectLP section="planning" />;
        }
        return <PlanningTab userId={viewUserId} isAdmin={isAdmin} />;
      case "emails":
        return null; // Handled by admin dashboard
      default:
        return <DashboardOverview userId={viewUserId} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} isProspect={isProspect}>
      {isAdmin && selectedClientId && activeTab !== "admin" && selectedClientInfo && (
        <div className="flex items-center justify-between gap-3 p-3 mb-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <UserIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Prohlížíte kalkulačku: {selectedClientInfo.full_name || selectedClientInfo.email}
              </p>
              {selectedClientInfo.full_name && (
                <p className="text-xs text-muted-foreground">{selectedClientInfo.email}</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleSelectClient(null)}>
            <X className="h-4 w-4 mr-1" />
            Zpět
          </Button>
        </div>
      )}
      {renderContent()}
    </Layout>
  );
};

export default Index;
