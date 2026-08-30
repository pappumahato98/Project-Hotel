import React from "react";
import {
  Grid,
  LogIn,
  LogOut,
  CalendarDays,
  Receipt,
  Tag,
  DollarSign,
  ArrowRightLeft,
  FileText,
  BarChart3,
  PlusCircle,
  TrendingUp,
  LayoutDashboard,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PMSOperationsSidebarProps {
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
}

const operations = [
  { id: "room-status", label: "ROOM STATUS", icon: LayoutDashboard },
  { id: "availability-grid", label: "AVAILABILITY GRID", icon: Grid },
  { id: "reservation", label: "RESERVATIONS", icon: CalendarDays },
  { id: "spacer1", isSpacer: true },
  { id: "advance-receipt", label: "ADVANCE RECEIPT", icon: Receipt },
  { id: "rate-posting", label: "MANUAL POSTING", icon: DollarSign },
  { id: "change-rate", label: "CHANGE RATE", icon: Tag },
  { id: "adjustment", label: "ADJUSTMENT", icon: TrendingUp },
  { id: "spacer2", isSpacer: true },
  { id: "room-move", label: "ROOM MOVE", icon: ArrowRightLeft },
  { id: "guest-folios", label: "GUEST FOLIOS", icon: FileText },
  { id: "reports", label: "REPORTS", icon: BarChart3 },
];

export const PMSOperationsSidebar = ({ activeModule, onModuleChange }: PMSOperationsSidebarProps) => {
  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-full overflow-hidden shrink-0">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="text-muted-foreground text-[10px] font-bold tracking-[0.2em] uppercase">Operations Center</h2>
        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20">
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {operations.map((op) => {
            if (op.isSpacer) {
              return <div key={op.id} className="h-px bg-zinc-800/50 mx-4 my-2" />;
            }
            const isActive = activeModule === op.id;
            const Icon = op.icon as any;
            return (
              <Button
                key={op.id}
                variant="ghost"
                onClick={() => onModuleChange(op.id)}
                className={cn(
                  "w-full justify-start gap-3 h-10 px-3 text-[10px] font-black tracking-widest transition-all duration-200",
                  "hover:bg-accent hover:text-accent-foreground",
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-500 rounded-none shadow-[inset_4px_0_10px_-4px_rgba(34,211,238,0.2)]"
                    : "text-muted-foreground border-l-2 border-transparent"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", isActive ? "text-cyan-400" : "text-zinc-500")} />
                {op.label}
              </Button>
            );
          })}
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-border bg-card/50">
        <div className="flex items-center gap-3 px-1">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-muted-foreground font-bold tracking-tight">SYSTEM ONLINE</span>
        </div>
      </div>
    </div>
  );
};
