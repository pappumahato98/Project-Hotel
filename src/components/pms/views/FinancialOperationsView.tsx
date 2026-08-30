import React, { useMemo } from "react";
import {
  format,
  parseISO
} from "date-fns";
import {
  DollarSign,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  ArrowRightLeft,
  Calendar,
  User,
  Hash
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGuestFolios } from "@/hooks/useGuestFolios";
import { cn, formatCurrency } from "@/lib/utils";

interface FinancialOperationsViewProps {
  type: 'advance-receipt' | 'rate-posting' | 'adjustment';
}

export const FinancialOperationsView = ({ type }: FinancialOperationsViewProps) => {
  const { folios = [] } = useGuestFolios();

  const allItems = useMemo(() => {
    const items: any[] = [];
    folios.forEach(folio => {
      if (folio.items) {
        folio.items.forEach((item: any) => {
          // Filter by type
          let matches = false;
          if (type === 'advance-receipt' && item.source === 'advance_deposit') matches = true;
          if (type === 'rate-posting' && item.source === 'room_rate') matches = true;
          if (type === 'adjustment' && item.item_type === 'adjustment') matches = true;

          if (matches) {
            items.push({
              ...item,
              guest_name: `${folio.reservation?.guest?.first_name} ${folio.reservation?.guest?.last_name}`,
              room_number: folio.room?.room_number,
              date: item.created_at
            });
          }
        });
      }
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [folios, type]);

  const getTitle = () => {
    switch(type) {
      case 'advance-receipt': return 'Advance Receipt / Deposit History';
      case 'rate-posting': return 'Manual Rate Posting Log';
      case 'adjustment': return 'Financial Adjustments History';
      default: return 'Financial Operations';
    }
  };

  const getIcon = () => {
    switch(type) {
      case 'advance-receipt': return <DollarSign className="h-5 w-5 text-emerald-400" />;
      case 'rate-posting': return <Clock className="h-5 w-5 text-amber-400" />;
      case 'adjustment': return <ArrowRightLeft className="h-5 w-5 text-fuchsia-400" />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-border bg-card/50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          {getIcon()}
          <h2 className="text-sm font-bold tracking-widest uppercase">{getTitle()}</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="SEARCH BY GUEST, ROOM, ID..."
              className="w-72 bg-secondary/30 border-border h-9 pl-9 text-[10px] font-bold tracking-wider"
            />
          </div>
          <Button variant="outline" size="icon" className="h-9 w-9 bg-secondary/30 border-border text-muted-foreground">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 pb-0 shrink-0">
        <div className="bg-card/30 border border-border rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Transaction Count</span>
          <span className="text-2xl font-black text-white">{allItems.length}</span>
        </div>
        <div className="bg-card/30 border border-border rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Aggregate Volume</span>
          <span className="text-2xl font-black text-white">
            {formatCurrency(Math.abs(allItems.reduce((s, i) => s + (i.amount || 0), 0)))}
          </span>
        </div>
        <div className="bg-card/30 border border-border rounded-xl p-4 flex flex-col gap-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recent Activity</span>
          <span className="text-sm font-bold text-cyan-500 uppercase">Last 24 Hours: {allItems.filter(i => new Date(i.date).getTime() > Date.now() - 86400000).length} Entries</span>
        </div>
      </div>

      {/* Table Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <div className="rounded-xl border border-border bg-card/30 overflow-hidden">
            <Table>
              <TableHeader className="bg-secondary/20">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-6 h-12">Entry Date</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Guest / Room</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Description</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12">Reference</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground h-12 text-right pr-6">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allItems.map((item) => (
                  <TableRow key={item.id} className="border-border hover:bg-white/[0.02] group transition-colors">
                    <TableCell className="pl-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-zinc-100">{format(new Date(item.date), "dd MMM yyyy")}</span>
                        <span className="text-[10px] text-zinc-500 uppercase font-medium">{format(new Date(item.date), "HH:mm")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-zinc-100">{item.guest_name}</span>
                        <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">Room {item.room_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-zinc-300 font-medium">{item.description}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                        <Hash className="h-3 w-3" />
                        {item.id.split('-')[0]}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <span className={cn(
                        "font-black text-sm",
                        item.amount < 0 ? "text-emerald-400" : "text-amber-400"
                      )}>
                        {formatCurrency(Math.abs(item.amount))}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}

                {allItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-2 py-8">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                          No records found in this category.
                        </p>
                      </div>
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
