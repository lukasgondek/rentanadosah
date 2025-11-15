import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavButtonProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export const SidebarNavButton = ({ icon: Icon, label, isActive, onClick }: SidebarNavButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 w-full text-left",
        isActive
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="font-medium">{label}</span>
    </button>
  );
};
