import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay, parseISO, startOfDay, differenceInDays } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, Plus } from "lucide-react";
import { cn, formatAD } from "@/lib/utils";
import { CheckInOutDialog } from "./CheckInOutDialog";
import { ReservationMoveDialog } from "./ReservationMoveDialog";
import { NewReservationDialog } from "./NewReservationDialog";

interface Reservation {
  id: string;
  reservation_code: string;
  check_in_date: string;
  check_out_date: string;
  status: string;
  room_id: string;
  guest: {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    company_name?: string | null;
    vat_number?: string | null;
    address?: string | null;
  };
  room: {
    room_number: string;
    room_type: string;
  };
}

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  status: string;
}

const statusColorClasses: Record<string, { first: string; second: string; border: string; shadow: string }> = {
  pending: { first: "bg-amber-500 dark:bg-amber-400", second: "bg-amber-600 dark:bg-amber-500", border: "border-amber-600 dark:border-amber-500", shadow: "shadow-lg shadow-amber-500/50" },
  confirmed: { first: "bg-emerald-500 dark:bg-emerald-400", second: "bg-emerald-600 dark:bg-emerald-500", border: "border-emerald-600 dark:border-emerald-500", shadow: "shadow-lg shadow-emerald-500/50" },
  "checked-in": { first: "bg-blue-500 dark:bg-blue-400", second: "bg-blue-600 dark:bg-blue-500", border: "border-blue-600 dark:border-blue-500", shadow: "shadow-lg shadow-blue-500/50" },
  "checked-out": { first: "bg-zinc-500 dark:bg-zinc-400", second: "bg-zinc-600 dark:bg-zinc-500", border: "border-zinc-600 dark:border-zinc-500", shadow: "shadow-lg shadow-zinc-500/30" },
  cancelled: { first: "bg-red-500 dark:bg-red-400", second: "bg-red-600 dark:bg-red-500", border: "border-red-600 dark:border-red-500", shadow: "shadow-lg shadow-red-500/50" },
  "no-show": { first: "bg-red-400 dark:bg-red-300", second: "bg-red-500 dark:bg-red-400", border: "border-red-500 dark:border-red-400", shadow: "shadow-lg shadow-red-500/40" },
};

const getBookingProgress = (date: Date, checkIn: Date, checkOut: Date): number => {
  const totalDays = Math.max(1, differenceInDays(checkOut, checkIn));
  const currentDay = differenceInDays(date, checkIn);
  return Math.min(1, Math.max(0, currentDay / totalDays));
};

const isFirstHalf = (date: Date, checkIn: Date, checkOut: Date): boolean => {
  return getBookingProgress(date, checkIn, checkOut) < 0.5;
};

export function ReservationCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"walk-in" | "check-in" | "check-out">("check-in");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draggedReservation, setDraggedReservation] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    reservationId: string;
    targetRoomId: string;
    targetDate: Date;
  } | null>(null);
  const [newResDialogOpen, setNewResDialogOpen] = useState(false);
  const [newResPrefill, setNewResPrefill] = useState<{ roomId: string; checkInDate: Date } | null>(null);
  // Performance optimization: Pre-group and pre-parse reservations to avoid O(N) lookups in every cell
  const processedReservations = useMemo(() => {
    const map: Record<string, Record<string, (Reservation & { _checkIn: Date; _checkOutEnd: Date; _checkOut: Date })[]>> = {};
    reservations.forEach((res) => {
      const roomNum = res.room?.room_number;
      if (!roomNum) return;
      if (!map[roomNum]) map[roomNum] = {};

      const checkIn = startOfDay(parseISO(res.check_in_date));
      const checkOut = startOfDay(parseISO(res.check_out_date));

      // Index by each date of the stay for O(1) lookup in the cell
      let current = checkIn;
      while (current < checkOut) {
        const dateKey = format(current, "yyyy-MM-dd");
        if (!map[roomNum][dateKey]) map[roomNum][dateKey] = [];
        map[roomNum][dateKey].push({
          ...res,
          _checkIn: checkIn,
          _checkOut: checkOut,
          _checkOutEnd: addDays(checkOut, -1),
        });
        current = addDays(current, 1);
      }
    });
    return map;
  }, [reservations]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 13), // Show 2 weeks
  });

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setIsLoading(true);
    
    const startDate = format(weekStart, "yyyy-MM-dd");
    const endDate = format(addDays(weekStart, 13), "yyyy-MM-dd");

    const [reservationsResult, roomsResult] = await Promise.all([
      supabase
        .from("reservations")
        .select(`
          id,
          room_id,
          reservation_code,
          check_in_date,
          check_out_date,
          status,
          guest:guests(first_name, last_name, email, phone, address),
          room:rooms(room_number, room_type)
        `)
        .gte("check_out_date", startDate)
        .lte("check_in_date", endDate)
        .neq("status", "cancelled"),
      supabase
        .from("rooms")
        .select("id, room_number, room_type, status")
        .order("room_number"),
    ]);

    if (reservationsResult.data) {
      setReservations(reservationsResult.data as unknown as Reservation[]);
    }
    if (roomsResult.data) {
      setRooms(roomsResult.data);
    }
    setIsLoading(false);
  };

  /**
   * Performance-optimized lookup for reservations in a specific cell.
   * Reduced from O(N) to O(1) using pre-computed date index.
   */
  const getReservationsForRoomAndDate = (roomNumber: string, date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    return processedReservations[roomNumber]?.[dateKey] || [];
  };

  const isCheckInDate = (reservation: Reservation | (Reservation & { _checkIn: Date }), date: Date) => {
    const checkIn = "_checkIn" in reservation ? reservation._checkIn : parseISO(reservation.check_in_date);
    return isSameDay(checkIn, date);
  };

  const isCheckOutDate = (reservation: Reservation | (Reservation & { _checkOut: Date }), date: Date) => {
    const checkOut = "_checkOut" in reservation ? reservation._checkOut : parseISO(reservation.check_out_date);
    return isSameDay(checkOut, date);
  };

  const handleDragStart = (e: React.DragEvent, reservationId: string) => {
    setDraggedReservation(reservationId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, roomId: string, date: Date) => {
    e.preventDefault();
    if (!draggedReservation) return;

    const reservation = reservations.find((r) => r.id === draggedReservation);
    if (!reservation) return;

    if (reservation.room_id === roomId && isSameDay(parseISO(reservation.check_in_date), date)) {
      setDraggedReservation(null);
      return;
    }

    setPendingMove({
      reservationId: draggedReservation,
      targetRoomId: roomId,
      targetDate: date,
    });
    setMoveDialogOpen(true);
    setDraggedReservation(null);
  };

  const checkRoomConflict = async (roomId: string, checkIn: Date, checkOut: Date, excludeResId: string) => {
    const { data } = await supabase
      .from("reservations")
      .select("id, check_in_date, check_out_date")
      .eq("room_id", roomId)
      .neq("id", excludeResId)
      .neq("status", "cancelled")
      .or(`and(check_in_date,lt,${format(checkOut, "yyyy-MM-dd")}),and(check_out_date,gt,${format(checkIn, "yyyy-MM-dd")})`);

    return data && data.length > 0;
  };

  const confirmMove = async (data: {
    newRoomId: string;
    newCheckIn: string;
    newCheckOut: string;
    reason: string;
  }) => {
    if (!pendingMove) return;

    const reservation = reservations.find((r) => r.id === pendingMove.reservationId);
    if (!reservation) return;

    const hasConflict = await checkRoomConflict(
      data.newRoomId,
      parseISO(data.newCheckIn),
      parseISO(data.newCheckOut),
      pendingMove.reservationId
    );
    if (hasConflict) {
      toast.error("Room conflict detected", { description: "The selected room is already booked for the chosen dates." });
      return;
    }

    const { error } = await supabase
      .from("reservations")
      .update({
        room_id: data.newRoomId,
        check_in_date: data.newCheckIn,
        check_out_date: data.newCheckOut,
        special_requests: data.reason,
      })
      .eq("id", pendingMove.reservationId);

    if (!error) {
      await supabase.from("reservation_changes").insert({
        reservation_id: pendingMove.reservationId,
        old_room_id: reservation.room_id,
        new_room_id: data.newRoomId,
        old_check_in: reservation.check_in_date,
        new_check_in: data.newCheckIn,
        old_check_out: reservation.check_out_date,
        new_check_out: data.newCheckOut,
        reason: data.reason,
      });

      await supabase.from("audit_log").insert({
        action: "UPDATE",
        entity_type: "reservations",
        entity_id: pendingMove.reservationId,
        old_values: {
          room_id: reservation.room_id,
          check_in_date: reservation.check_in_date,
          check_out_date: reservation.check_out_date,
        },
        new_values: {
          room_id: data.newRoomId,
          check_in_date: data.newCheckIn,
          check_out_date: data.newCheckOut,
          reason: data.reason,
        },
      });

      toast.success("Reservation moved", { description: "The reservation has been successfully updated." });
      fetchData();
    } else {
      toast.error("Failed to move reservation");
    }

    setPendingMove(null);
  };

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation.id);
    if (reservation.status === "confirmed" || reservation.status === "pending") {
      setDialogMode("check-in");
    } else if (reservation.status === "checked-in") {
      setDialogMode("check-out");
    }
    setDialogOpen(true);
  };

  const goToPreviousWeek = () => setCurrentDate(addDays(currentDate, -7));
  const goToNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const goToToday = () => setCurrentDate(new Date());

  if (isLoading) {
    return (
      <Card variant="elevated">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card variant="elevated" className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Reservation Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-32 text-center">
              {formatAD(weekStart)} - {formatAD(addDays(weekStart, 13))}
            </span>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="sticky left-0 bg-card z-10 p-3 text-left text-sm font-medium text-muted-foreground min-w-24">
                    Room
                  </th>
                  {weekDays.map((day) => (
                    <th
                      key={day.toISOString()}
                      className={cn(
                        "p-2 text-center text-xs font-medium min-w-20",
                        isSameDay(day, new Date()) && "bg-primary/10"
                      )}
                    >
                      <div className="text-muted-foreground">{format(day, "EEE")}</div>
                      <div className={cn(
                        "text-sm",
                        isSameDay(day, new Date()) && "text-primary font-bold"
                      )}>
                        {format(day, "d")}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b border-border hover:bg-secondary/30">
                    <td className="sticky left-0 bg-card z-10 p-3 border-r border-border">
                      <div className="font-medium">{room.room_number}</div>
                      <div className="text-xs text-muted-foreground capitalize">{room.room_type}</div>
                    </td>
                    {weekDays.map((day) => {
                      const dayReservations = getReservationsForRoomAndDate(room.room_number, day);
                      
                      return (
                        <td
                          key={day.toISOString()}
                          className={cn(
                            "p-1 h-16 relative",
                            isSameDay(day, new Date()) && "bg-primary/5"
                          )}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, room.id, day)}
                          onDoubleClick={() => {
                            setNewResPrefill({ roomId: room.id, checkInDate: day });
                            setNewResDialogOpen(true);
                          }}
                        >
                          {dayReservations.map((res) => {
                            const checkIn = res._checkIn;
                            const checkOut = res._checkOut;
                            const isFirst = isFirstHalf(day, checkIn, checkOut);
                            const progress = getBookingProgress(day, checkIn, checkOut);
                            const totalDays = Math.max(1, differenceInDays(checkOut, checkIn));
                            const isMidpoint = differenceInDays(day, checkIn) === Math.floor(totalDays / 2);
                            
                            const colors = statusColorClasses[res.status] || statusColorClasses["checked-in"];
                            
                            return (
                              <div
                                key={res.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, res.id)}
                                onClick={() => handleReservationClick(res)}
                                className={cn(
                                  "absolute inset-x-0.5 inset-y-1 rounded-md px-1.5 py-0.5 cursor-pointer transition-all border-2",
                                  isFirst ? colors.first : colors.second,
                                  colors.border,
                                  isFirst ? colors.shadow : "",
                                  "hover:ring-2 hover:ring-white/50 hover:z-20",
                                  isCheckInDate(res, day) && "rounded-l-lg ml-0.5",
                                  isCheckOutDate(res, day) && "rounded-r-lg mr-0.5",
                                  draggedReservation === res.id && "opacity-50"
                                )}
                              >
                                {isCheckInDate(res, day) && (
                                  <div className="truncate text-xs font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
                                    {res.guest?.first_name} {res.guest?.last_name?.charAt(0)}.
                                  </div>
                                )}
                                {isMidpoint && !isCheckInDate(res, day) && !isCheckOutDate(res, day) && (
                                  <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white -translate-x-1/2 z-10" />
                                )}
                              </div>
                            );
                          })}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Legend */}
          <div className="p-4 border-t border-border flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge className="bg-amber-500 dark:bg-amber-400 text-white">Pending</Badge>
              <Badge className="bg-emerald-500 dark:bg-emerald-400 text-white">Confirmed</Badge>
              <Badge className="bg-blue-500 dark:bg-blue-400 text-white">Checked-in</Badge>
              <Badge className="bg-zinc-500 dark:bg-zinc-400 text-white">Checked-out</Badge>
            </div>
            <div className="text-xs text-muted-foreground ml-auto">
              Drag reservations to move them
            </div>
          </div>
        </CardContent>
      </Card>

      <CheckInOutDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        reservationId={selectedReservation || undefined}
        onSuccess={fetchData}
      />

      <ReservationMoveDialog
        open={moveDialogOpen}
        onOpenChange={(open) => {
          setMoveDialogOpen(open);
          if (!open) setPendingMove(null);
        }}
        reservation={pendingMove ? reservations.find((r) => r.id === pendingMove.reservationId) || null : null}
        targetRoomId={pendingMove?.targetRoomId || ""}
        targetDate={pendingMove?.targetDate || new Date()}
        rooms={rooms}
        onConfirm={confirmMove}
      />

      <NewReservationDialog
        open={newResDialogOpen}
        onOpenChange={(open) => {
          setNewResDialogOpen(open);
          if (!open) setNewResPrefill(null);
        }}
        onSuccess={fetchData}
        prefillRoomId={newResPrefill?.roomId}
        prefillCheckInDate={newResPrefill?.checkInDate}
      />
    </>
  );
}
