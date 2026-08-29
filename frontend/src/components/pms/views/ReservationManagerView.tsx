import React, { useState, useMemo } from "react";
import {
  format,
  parseISO
} from "date-fns";
import {
  Search,
  Filter,
  Calendar,
  User,
  MoreHorizontal,
  ChevronRight,
  ArrowRightLeft,
  XCircle,
  CheckCircle2,
  Clock,
  Plus
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface ReservationManagerViewProps {
  reservations: any[];
  isLoading: boolean;
}

const statusConfig: Record<string, { label: string, color: string, icon: any }> = {
  confirmed: { label: "Confirmed", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", icon: CheckCircle2 },
  'checked-in': { label: "In-House", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", icon: User },
  'checked-out': { label: "Checked Out", color: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20", icon: Clock },
  cancelled: { label: "Cancelled", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: XCircle },
};

export const ReservationManagerView = ({ reservations, isLoading }: ReservationManagerViewProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredReservations = useMemo(() => {
    return reservations.filter(res => {
      const matchesSearch =
        res.reservation_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${res.guest?.first_name} ${res.guest?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.room?.room_number?.includes(searchQuery);

      const matchesFilter = activeFilter === 'all' || res.status === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [reservations, searchQuery, activeFilter]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-border bg-card/50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Calendar className="h-5 w-5 text-indigo-400" />
          <h2 className="text-sm font-bold tracking-widest uppercase">Reservation Management</h2>
          <div className="h-4 w-px bg-border mx-2" />
          <div className="flex items-center gap-2">
            {['all', 'confirmed', 'checked-in', 'checked-out', 'cancelled'].map(status => (
              <button
                key={status}
                onClick={() => setActiveFilter(status)}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all",
                  activeFilter === status
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                {status.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="SEARCH BY NAME, CODE, ROOM..."
              className="w-72 bg-secondary/30 border-border h-9 pl-9 text-[10px] font-bold tracking-wider"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button className="h-9 bg-indigo-500 hover:bg-indigo-400 text-white font-bold tracking-widest text-[10px] gap-2 px-4">
            <Plus className="h-4 w-4" /> NEW BOOKING
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="rounded-xl border border-border bg-card/30 overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-6 h-12">Booking ID</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Guest Information</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Dates</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12 text-center">Room</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12 text-right pr-6">Total Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.map((res) => {
                  const config = statusConfig[res.status] || statusConfig.confirmed;
                  const StatusIcon = config.icon;

                  return (
                    <TableRow key={res.id} className="border-border hover:bg-white/[0.02] group transition-colors">
                      <TableCell className="pl-6">
                        <span className="font-black text-xs text-indigo-400 tracking-tighter uppercase">{res.reservation_code}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm text-zinc-100">{res.guest?.first_name} {res.guest?.last_name}</span>
                          <span className="text-[10px] text-zinc-500 uppercase font-medium">{res.guest?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                          {format(parseISO(res.check_in_date), "dd MMM")}
                          <ChevronRight className="h-3 w-3 text-zinc-600" />
                          {format(parseISO(res.check_out_date), "dd MMM yyyy")}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-secondary/50 border-border text-[10px] font-black px-2 py-0.5">
                          {res.room?.room_number || 'TBD'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest", config.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <span className="font-black text-sm text-zinc-100">{formatCurrency(res.total_amount)}</span>
                      </TableCell>
                      <TableCell className="pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-[#18181b] border-zinc-800 text-zinc-300">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem className="gap-2"><ArrowRightLeft className="h-4 w-4" /> Change Room</DropdownMenuItem>
                            <DropdownMenuItem className="gap-2"><XCircle className="h-4 w-4" /> Cancel Booking</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredReservations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                      No reservations found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
