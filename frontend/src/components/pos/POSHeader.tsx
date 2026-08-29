import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  History,
  BarChart3,
  ArrowLeft,
  Clock,
  Receipt
} from "lucide-react";
import { cn } from "@/lib/utils";

export const POSHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: "Clock In/Out", path: "/pos/clock", icon: Clock },
    { label: "Dashboard", path: "/pos", icon: LayoutDashboard },
    { label: "Terminal", path: "/pos/terminal", icon: ShoppingCart },
    { label: "Bills Track", path: "/pos/bills", icon: Receipt },
    { label: "Kitchen", path: "/pos/kitchen", icon: ChefHat },
    { label: "History", path: "/pos/history", icon: BarChart3 },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex flex-col space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full hover:bg-primary/10 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Point of Sale</h1>
            <p className="text-sm text-muted-foreground">Manage your restaurant and bar operations</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant={isActive(item.path) ? "default" : "outline"}
            size="sm"
            onClick={() => navigate(item.path)}
            className={cn(
              "gap-2 shrink-0 transition-all duration-300",
              isActive(item.path)
                ? "shadow-glow bg-primary text-primary-foreground"
                : "hover:bg-primary/5 hover:border-primary/50"
            )}
          >
            <item.icon className={cn("h-4 w-4", isActive(item.path) ? "text-primary-foreground" : "text-primary")} />
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
