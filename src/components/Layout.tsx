import { ReactNode, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Home,
  CreditCard,
  LogOut,
  Menu,
  X,
  Shield,
  Lock,
} from "lucide-react";
import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isAdmin?: boolean;
  isProspect?: boolean;
}

const Layout = ({ children, activeTab, onTabChange, isAdmin = false, isProspect = false }: LayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Odhlášení",
      description: "Byli jste úspěšně odhlášeni.",
    });
    navigate("/auth");
  };

  const adminTabs = isAdmin ? [
    { id: "admin", label: "Admin Dashboard", icon: Shield },
  ] : [];

  const tabs = [
    ...adminTabs,
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "income-expenses", label: "Příjmy & Výdaje", icon: Wallet },
    { id: "investments", label: "Investice", icon: TrendingUp },
    { id: "loans", label: "Úvěry", icon: CreditCard },
    { id: "properties", label: "Nemovitosti", icon: Home },
    { id: "planning", label: "Plánování", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <h1 className="text-xl font-bold hidden sm:block">Kalkulačka REALITNÍHO RENTIÉRA®</h1>
            <h1 className="text-lg font-bold sm:hidden">Kalkulačka RR®</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </Button>
            <Button variant="outline" onClick={handleLogout} className="hidden md:flex">
              <LogOut className="mr-2 h-4 w-4" />
              Odhlásit se
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b bg-card p-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isLocked = isProspect && tab.id === "planning";
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (isLocked) {
                    toast({
                      title: "Omezený přístup",
                      description: "Plánování je dostupné pouze pro klienty Akcelerátoru.",
                    });
                    return;
                  }
                  onTabChange(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors",
                  isLocked
                    ? "opacity-50 cursor-not-allowed"
                    : activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                )}
              >
                {isLocked ? <Lock className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
          <Button variant="outline" onClick={handleLogout} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Odhlásit se
          </Button>
        </div>
      )}

      {/* Desktop Navigation */}
      <div className="hidden md:block border-b bg-muted/30">
        <div className="container px-4">
          <nav className="flex gap-2 py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isLocked = isProspect && tab.id === "planning";
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (isLocked) {
                      toast({
                        title: "Omezený přístup",
                        description: "Plánování je dostupné pouze pro klienty Akcelerátoru.",
                      });
                      return;
                    }
                    onTabChange(tab.id);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isLocked
                      ? "opacity-50 cursor-not-allowed"
                      : activeTab === tab.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted"
                  )}
                  title={isLocked ? "Pouze pro klienty Akcelerátoru" : undefined}
                >
                  {isLocked ? <Lock className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container px-4 py-6">{children}</main>
    </div>
  );
};

export default Layout;
