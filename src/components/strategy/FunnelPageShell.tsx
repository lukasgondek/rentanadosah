import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";

interface FunnelPageShellProps {
  children: ReactNode;
}

/** Jednotný rámec funnel stránek (/rezervace, /strategicka-konzultace). */
export default function FunnelPageShell({ children }: FunnelPageShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <h1 className="text-lg font-bold">Kalkulačka REALITNÍHO RENTIÉRA®</h1>
          </div>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Zpět do kalkulačky
          </Link>
        </div>
      </header>
      <main className="container px-4 py-10">{children}</main>
    </div>
  );
}
