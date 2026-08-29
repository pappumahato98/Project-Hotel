import React, { useMemo } from "react";
import {
  format,
  addDays,
  startOfToday,
  eachDayOfInterval,
  isSameDay,
  differenceInDays,
  parseISO
} from "date-fns";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Loader2,
  Info,
  CheckCircle2,
  CalendarDays
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AvailabilityGridViewProps {
  rooms: any[];
  reservations: any[];
  isLoading: boolean;
}

const getBookingProgress = (date: Date, checkIn: Date, checkOut: Date): number => {
  const totalDays = Math.max(1, differenceInDays(checkOut, checkIn));
  const currentDay = differenceInDays(date, checkIn);
  return Math.min(1, Math.max(0, currentDay / totalDays));
};

const isFirstHalf = (date: Date, checkIn: Date, checkOut: Date): boolean => {
  return getBookingProgress(date, checkIn, checkOut) < 0.5;
};

export const AvailabilityGridView = ({ rooms, reservations, isLoading }: AvailabilityGridViewProps) => {
  const [startDate, setStartDate] = React.useState(startOfToday());
  const daysToShow = 14;

  const dates = useMemo(() => {
    return eachDayOfInterval({
      start: startDate,
      end: addDays(startDate, daysToShow - 1)
    });
  }, [startDate]);

  const getReservationForRoomAndDate = (roomId: string, date: Date) => {
    return reservations.find(res => {
      if (res.room_id !== roomId) return false;
      if (res.status === 'cancelled') return false;

      const checkIn = new Date(res.check_in_date);
      const checkOut = new Date(res.check_out_date);

      return date >= checkIn && date < checkOut;
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        <p className="text-zinc-500 text-xs font-bold tracking-widest uppercase tracking-widest">Loading Timeline...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-border bg-card/50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <CalendarDays className="h-5 w-5 text-cyan-400" />
          <h2 className="text-sm font-bold tracking-widest uppercase">Availability Grid (14-Day View)</h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-secondary/50 border border-border p-1 rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setStartDate(prev => addDays(prev, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 text-[10px] font-bold tracking-wider text-zinc-300">
              {format(dates[0], "dd MMM")} - {format(dates[dates.length-1], "dd MMM yyyy")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setStartDate(prev => addDays(prev, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="FILTER ROOMS..."
              className="w-48 bg-secondary/30 border-border h-8 pl-8 text-[10px] font-bold tracking-wider"
            />
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <ScrollArea className="flex-1 overflow-auto">
        <div className="min-w-fit border-l border-border">
          {/* Calendar Header Row */}
          <div className="flex sticky top-0 z-20 bg-[#0a0a0b] border-b border-border">
            <div className="w-48 shrink-0 p-4 font-bold text-[10px] text-muted-foreground uppercase tracking-widest border-r border-border bg-card/50">
              Room / Type
            </div>
            {dates.map((date) => (
              <div
                key={date.toISOString()}
                className={cn(
                  "w-24 shrink-0 flex flex-col items-center justify-center p-2 border-r border-border",
                  isSameDay(date, new Date()) ? "bg-cyan-500/10 text-cyan-400" : "text-muted-foreground"
                )}
              >
                <span className="text-[10px] font-bold">{format(date, "EEE")}</span>
                <span className="text-lg font-black">{format(date, "dd")}</span>
              </div>
            ))}
          </div>

          {/* Room Rows */}
          {rooms.map((room) => (
            <div key={room.id} className="flex border-b border-border group hover:bg-white/[0.02] transition-colors">
              {/* Room Info */}
              <div className="w-48 shrink-0 p-3 border-r border-border flex flex-col justify-center bg-card/20">
                <span className="font-black text-sm text-white leading-none">R-{room.room_number}</span>
                <span className="text-[9px] font-bold text-zinc-500 mt-1 uppercase tracking-tighter truncate">
                  {room.room_type}
                </span>
              </div>

              {/* Day Cells */}
              {dates.map((date) => {
                const res = getReservationForRoomAndDate(room.id, date);
                const isCheckIn = res && isSameDay(parseISO(res.check_in_date), date);
                const checkInDate = res ? parseISO(res.check_in_date) : null;
                const checkOutDate = res ? parseISO(res.check_out_date) : null;
                const isFirst = checkInDate && checkOutDate ? isFirstHalf(date, checkInDate, checkOutDate) : false;
                const totalDays = checkInDate && checkOutDate ? Math.max(1, differenceInDays(checkOutDate, checkInDate)) : 1;
                const currentDay = checkInDate ? differenceInDays(date, checkInDate) : 0;
                const isMidpoint = currentDay === Math.floor(totalDays / 2);

                const isCheckedIn = res?.status === 'checked-in';

                return (
                  <div key={date.toISOString()} className="w-24 shrink-0 h-16 border-r border-border/50 relative p-1 flex items-center justify-center">
                    {res ? (
                      <div
                        className={cn(
                          "absolute inset-y-1 left-0 right-0 mx-1 rounded-sm border-2 flex flex-col items-center justify-center p-1 cursor-pointer transition-all",
                          isCheckedIn 
                            ? isFirst ? "bg-cyan-500 dark:bg-cyan-400 border-cyan-600 dark:border-cyan-500 shadow-lg shadow-cyan-500/50" : "bg-cyan-600 dark:bg-cyan-500 border-cyan-700 dark:border-cyan-600"
                            : isFirst ? "bg-indigo-500 dark:bg-indigo-400 border-indigo-600 dark:border-indigo-500 shadow-lg shadow-indigo-500/50" : "bg-indigo-600 dark:bg-indigo-500 border-indigo-700 dark:border-indigo-600",
                          "hover:ring-2 hover:ring-white/50"
                        )}
                        title={`${res.guest?.first_name} ${res.guest?.last_name}`}
                      >
                        <span className="text-[9px] font-bold uppercase truncate w-full text-center text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
                          {res.guest?.last_name || 'BOOKED'}
                        </span>
                        {isCheckIn && (
                          <div className="h-2 w-2 rounded-full bg-white shadow-lg absolute top-1 right-1 animate-pulse" />
                        )}
                        {isMidpoint && !isCheckIn && (
                          <div className="absolute left-1/2 top-1 bottom-1 w-1 bg-white -translate-x-1/2 z-10" />
                        )}
                      </div>
                    ) : (
                      <div className="text-[8px] font-bold text-zinc-800 dark:text-zinc-700 opacity-20 uppercase tracking-widest select-none">
                        Vacant
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Footer Info */}
      <div className="h-10 border-t border-border bg-card/80 flex items-center px-6 gap-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-cyan-500 dark:bg-cyan-400 border-2 border-cyan-600 dark:border-cyan-500" />
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">In-House</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-indigo-500 dark:bg-indigo-400 border-2 border-indigo-600 dark:border-indigo-500" />
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Confirmed</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Info className="h-3 w-3 text-zinc-500" />
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Click a booking to view details</span>
        </div>
      </div>
    </div>
  );
};
