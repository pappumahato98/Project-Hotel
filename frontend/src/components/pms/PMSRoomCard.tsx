import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MoreVertical,
  Home,
  CheckCircle2,
  AlertTriangle,
  Star,
  Ban,
  Key,
  Calendar,
  User,
  ArrowRightLeft,
  Settings,
  Receipt,
  LogOut,
  LogIn,
  Wrench,
  Trash2,
  PlusCircle,
  CreditCard
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface PMSRoomCardProps {
  room: {
    id: string;
    room_number: string;
    room_type: string;
    status: string;
    price_per_night: number;
  };
  currentGuest?: {
    name: string;
    checkoutDate: string;
    keyIssued?: boolean;
    balance?: number;
  };
  arrivalToday?: boolean;
  onAction?: (action: string, room: any) => void;
}

const statusConfig: Record<string, {
  label: string,
  color: string,
  bg: string,
  icon: any,
  borderColor: string,
  shadowGlow: string
}> = {
  occupied: {
    label: "Occupied",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    icon: Home,
    borderColor: "border-cyan-500/30",
    shadowGlow: "shadow-[0_0_15px_rgba(34,211,238,0.2)]"
  },
  available: {
    label: "Available",
    color: "text-green-400",
    bg: "bg-green-500/10",
    icon: CheckCircle2,
    borderColor: "border-green-500/30",
    shadowGlow: "shadow-[0_0_15px_rgba(74,222,128,0.2)]"
  },
  dirty: {
    label: "Dirty",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    icon: AlertTriangle,
    borderColor: "border-amber-500/30",
    shadowGlow: "shadow-[0_0_15px_rgba(251,191,36,0.2)]"
  },
  maintenance: {
    label: "Maintenance",
    color: "text-red-500",
    bg: "bg-red-500/10",
    icon: Star,
    borderColor: "border-red-500/30",
    shadowGlow: "shadow-[0_0_15px_rgba(239,68,68,0.2)]"
  },
  blocked: {
    label: "Blocked",
    color: "text-fuchsia-500",
    bg: "bg-fuchsia-500/10",
    icon: Ban,
    borderColor: "border-fuchsia-500/30",
    shadowGlow: "shadow-[0_0_15px_rgba(217,70,239,0.2)]"
  },
};

export const PMSRoomCard = ({ room, currentGuest, arrivalToday, onAction }: PMSRoomCardProps) => {
  const config = statusConfig[room.status.toLowerCase()] || statusConfig.available;
  const StatusIcon = config.icon;

  return (
    <Card className={cn(
      "relative bg-[#0a0a0b] border-2 transition-all duration-300 hover:scale-[1.02] group overflow-hidden h-[180px]",
      config.borderColor,
      config.shadowGlow,
      "text-white"
    )}>
      <CardContent className="p-4 h-full flex flex-col justify-between">
        {/* Header: Room No & Status Icon */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-xl font-bold tracking-tight">Room {room.room_number}</h3>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{room.room_type}</p>
          </div>
          <StatusIcon className={cn("h-6 w-6", config.color)} fill={room.status === 'maintenance' ? 'currentColor' : 'none'} />
        </div>

        {/* Middle Divider */}
        <div className="w-full h-px bg-zinc-800 my-2" />

        {/* Content Area */}
        <div className="flex-1">
          {room.status.toLowerCase() === 'occupied' && currentGuest && (
            <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <p className={cn("text-[10px] font-black uppercase tracking-widest", config.color)}>Occupied</p>
                {(currentGuest.balance || 0) > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">Due: {formatCurrency(currentGuest.balance)}</span>
                  </div>
                )}
              </div>
              <p className="text-sm font-bold truncate">{currentGuest.name}</p>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                 <span>Out: {currentGuest.checkoutDate}</span>
              </div>
              {currentGuest.keyIssued && (
                <div className="flex items-center gap-1 mt-1">
                  <Key className="h-3 w-3 text-cyan-400" />
                  <span className="text-[9px] text-cyan-400/80 font-black uppercase tracking-tighter">Key Active</span>
                </div>
              )}
            </div>
          )}

          {room.status.toLowerCase() === 'available' && (
            <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2">
              <p className={cn("text-xs font-semibold", config.color)}>Available</p>
              {arrivalToday && (
                <div className="flex items-center gap-1.5 mt-1 text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Arrival Today</span>
                </div>
              )}
            </div>
          )}

          {room.status.toLowerCase() === 'dirty' && (
            <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2 pt-4">
              <p className={cn("text-sm font-bold", config.color)}>Dirty</p>
            </div>
          )}

          {room.status.toLowerCase() === 'maintenance' && (
            <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2 pt-4">
              <p className={cn("text-sm font-bold", config.color)}>Maintenance</p>
            </div>
          )}

          {room.status.toLowerCase() === 'blocked' && (
            <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2 pt-4">
              <p className={cn("text-sm font-bold", config.color)}>Blocked</p>
            </div>
          )}
        </div>

        {/* Bottom Actions Row */}
        <div className="absolute bottom-3 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#18181b] border-zinc-800 text-zinc-300">
              <DropdownMenuLabel>Room Operations</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />

              {room.status === 'available' && (
                <DropdownMenuItem onClick={() => onAction?.('checkin', room)} className="gap-2 focus:bg-cyan-500/10 focus:text-cyan-400">
                  <LogIn className="h-4 w-4" /> Check-In Guest
                </DropdownMenuItem>
              )}

              {room.status === 'occupied' && (
                <>
                  <DropdownMenuItem onClick={() => onAction?.('checkout', room)} className="gap-2 focus:bg-red-500/10 focus:text-red-400">
                    <LogOut className="h-4 w-4" /> Check-Out
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction?.('move', room)} className="gap-2">
                    <ArrowRightLeft className="h-4 w-4" /> Room Move
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction?.('folio', room)} className="gap-2">
                    <Receipt className="h-4 w-4" /> View Folio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction?.('add-charge', room)} className="gap-2">
                    <PlusCircle className="h-4 w-4 text-cyan-400" /> Add Quick Charge
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAction?.('quick-payment', room)} className="gap-2">
                    <CreditCard className="h-4 w-4 text-green-400" /> Quick Payment
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuLabel>Update Status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onAction?.('set_available', room)} className="gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" /> Mark Available
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.('set_dirty', room)} className="gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Mark Dirty
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.('set_maintenance', room)} className="gap-2">
                <Wrench className="h-4 w-4 text-red-400" /> Maintenance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction?.('set_blocked', room)} className="gap-2">
                <Ban className="h-4 w-4 text-fuchsia-400" /> Block Room
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};
