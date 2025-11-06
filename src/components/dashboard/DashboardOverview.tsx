import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  description?: string;
  icon: React.ElementType;
  trend?: "up" | "down";
}

const MetricCard = ({ title, value, change, description, icon: Icon, trend }: MetricCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="p-2 bg-primary/10 rounded-full">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className={cn(
            "text-xs flex items-center gap-1 mt-1",
            trend === "up" ? "text-success" : "text-destructive"
          )}>
            {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {change > 0 ? "+" : ""}{change.toFixed(1)}%
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

const DashboardOverview = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Přehled vašich financí a investic
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Měsíční cashflow"
          value="0 Kč"
          change={0}
          trend="up"
          description="Po odečtení výdajů"
          icon={Wallet}
        />
        <MetricCard
          title="Celkový majetek (Net Worth)"
          value="0 Kč"
          description="Aktuální hodnota"
          icon={DollarSign}
        />
        <MetricCard
          title="Net Worth za 5 let"
          value="0 Kč"
          change={0}
          trend="up"
          description="Odhadovaná hodnota"
          icon={TrendingUp}
        />
        <MetricCard
          title="Net Worth za 10 let"
          value="0 Kč"
          change={0}
          trend="up"
          description="Odhadovaná hodnota"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shrnutí příjmů</CardTitle>
            <CardDescription>Vaše měsíční příjmy podle typu</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Zaměstnanecký</span>
                <span className="font-medium">0 Kč</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">OSVČ</span>
                <span className="font-medium">0 Kč</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Firemní</span>
                <span className="font-medium">0 Kč</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-medium">Celkem měsíčně</span>
                <span className="font-bold">0 Kč</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shrnutí výdajů</CardTitle>
            <CardDescription>Vaše měsíční náklady</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Pravidelné výdaje</span>
                <span className="font-medium">0 Kč</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Nepravidelné výdaje</span>
                <span className="font-medium">0 Kč</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-medium">Celkem měsíčně</span>
                <span className="font-bold">0 Kč</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle>Začněte vyplňovat své údaje</CardTitle>
          <CardDescription>
            Pro zobrazení přesných výpočtů a prognóz prosím vyplňte své příjmy, výdaje, investice, úvěry a nemovitosti v příslušných sekcích.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};

export default DashboardOverview;
