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
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2, Lock } from "lucide-react";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
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

  const renderContent = () => {
    if (activeTab === "admin" && isAdmin) {
      if (selectedClientId) {
        return (
          <div className="space-y-6">
            <AdminDashboard onSelectClient={setSelectedClientId} selectedClientId={selectedClientId} />
            <div className="border-t pt-6">
              {renderClientContent(selectedClientId)}
            </div>
          </div>
        );
      }
      return <AdminDashboard onSelectClient={setSelectedClientId} selectedClientId={selectedClientId} />;
    }

    return renderClientContent();
  };

  const renderClientContent = (viewUserId?: string | null) => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardOverview userId={viewUserId} />;
      case "income-expenses":
        return <IncomeExpensesTab userId={viewUserId} />;
      case "investments":
        return <InvestmentsTab userId={viewUserId} />;
      case "loans":
        return <LoansTab userId={viewUserId} />;
      case "properties":
        return <PropertiesTab userId={viewUserId} />;
      case "planning":
        if (isProspect) {
          return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Lock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Plánování je dostupné pouze pro klienty</h2>
              <p className="text-muted-foreground max-w-md">
                Tato sekce je dostupná pouze pro účastníky Akcelerátoru Realitního Rentiéra.
                Pro přístup kontaktujte svého poradce.
              </p>
            </div>
          );
        }
        return <PlanningTab userId={viewUserId} />;
      case "emails":
        return null; // Handled by admin dashboard
      default:
        return <DashboardOverview userId={viewUserId} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} isAdmin={isAdmin} isProspect={isProspect}>
      {renderContent()}
    </Layout>
  );
};

export default Index;
