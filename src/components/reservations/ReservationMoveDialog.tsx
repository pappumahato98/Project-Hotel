import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { cn, formatAD } from "@/lib/utils";
import { CalendarIcon, Loader2, ArrowRight, Bed, AlertCircle } from "lucide-react";

interface Room {
  id: string;
  room_number: string;
  room_type: string;
}

interface Reason {
  id: string;
  label: string;
  sort_order: number;
}

interface ReservationMoveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: {
    id: string;
    reservation_code: string;
    check_in_date: string;
    check_out_date: string;
    room_id: string;
    guest: {
      first_name: string;
      last_name: string;
    };
    room: {
      room_number: string;
      room_type: string;
    };
  } | null;
  targetRoomId: string;
  targetDate: Date;
  rooms: Room[];
  onConfirm: (data: {
    newRoomId: string;
    newCheckIn: string;
    newCheckOut: string;
    reason: string;
  }) => Promise<void>;
}

export function ReservationMoveDialog({
  open,
  onOpenChange,
  reservation,
  targetRoomId,
  targetDate,
  rooms,
  onConfirm,
}: ReservationMoveDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [reasons, setReasons] = useState<Reason[]>([]);

  const stayDuration = reservation
    ? Math.ceil((new Date(reservation.check_out_date).getTime() - new Date(reservation.check_in_date).getTime()) / (1000 * 60 * 60 * 24))
    : 1;

  const [formData, setFormData] = useState({
    roomId: targetRoomId,
    checkIn: targetDate,
    reason: "",
    reasonText: "",
  });

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      roomId: targetRoomId,
      checkIn: targetDate,
    }));
  }, [targetRoomId, targetDate]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      roomId: targetRoomId,
      checkIn: targetDate,
    }));
  }, [targetRoomId, targetDate]);

  useEffect(() => {
    if (open) {
      fetchReasons().then(() => {
        setFormData((prev) => ({ ...prev, reason: "", reasonText: "" }));
      });
    }
  }, [open]);

  const fetchReasons = async () => {
    const { data } = await supabase
      .from("reservation_change_reasons")
      .select("id, label, sort_order")
      .order("sort_order");
    if (data && data.length > 0) {
      setReasons(data);
    } else {
      setReasons([
        { id: "fallback-1", label: "Room upgrade requested", sort_order: 1 },
        { id: "fallback-2", label: "Room downgrade requested", sort_order: 2 },
        { id: "fallback-3", label: "Maintenance issue", sort_order: 3 },
        { id: "fallback-4", label: "Guest complaint", sort_order: 4 },
        { id: "fallback-5", label: "Overbooking", sort_order: 5 },
        { id: "fallback-6", label: "Room swap", sort_order: 6 },
        { id: "fallback-7", label: "Early checkout by previous guest", sort_order: 7 },
        { id: "fallback-8", label: "Late arrival - room not ready", sort_order: 8 },
        { id: "fallback-9", label: "System error correction", sort_order: 9 },
        { id: "fallback-10", label: "Other", sort_order: 100 },
      ]);
    }
  };

  const handleConfirm = async () => {
    if (!reservation) return;
    if (!formData.roomId) {
      toast({ title: "Please select a room", variant: "destructive" });
      return;
    }

    const finalReason = formData.reason === "Other" ? formData.reasonText.trim() : formData.reason;
    if (!finalReason) {
      toast({ title: "Please enter a reason", description: "Specify a reason when selecting 'Other'", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await onConfirm({
        newRoomId: formData.roomId,
        newCheckIn: format(formData.checkIn, "yyyy-MM-dd"),
        newCheckOut: format(addDays(formData.checkIn, stayDuration), "yyyy-MM-dd"),
        reason: finalReason,
      });
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to move reservation", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (!reservation) return null;

  const targetRoom = rooms.find((r) => r.id === formData.roomId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bed className="h-5 w-5 text-primary" />
            Move Reservation
          </DialogTitle>
          <DialogDescription>
            {reservation.guest.first_name} {reservation.guest.last_name} &mdash; {reservation.reservation_code}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current:</span>
              <div className="flex items-center gap-2">
                <Bed className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{reservation.room.room_number}</span>
                <span className="text-xs text-muted-foreground">({reservation.room.room_type})</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Stay:</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {formatAD(new Date(reservation.check_in_date))}
                <ArrowRight className="h-3 w-3" />
                {formatAD(new Date(reservation.check_out_date))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="h-5 w-px bg-border" />
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">New Room</Label>
                <Select
                  value={formData.roomId}
                  onValueChange={(val) => setFormData((p) => ({ ...p, roomId: val }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.room_number} ({room.room_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Check-in Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9",
                        !formData.checkIn && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {formData.checkIn ? format(formData.checkIn, "MMM d") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.checkIn}
                      onSelect={(date) => date && setFormData((p) => ({ ...p, checkIn: date }))}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {targetRoom && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>New checkout:</span>
                <span className="font-medium">{formatAD(addDays(formData.checkIn, stayDuration))}</span>
                <span>&middot;</span>
                <span>{stayDuration} night{stayDuration !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Reason for Move</Label>
            <Select
              value={formData.reason}
              onValueChange={(val) => setFormData((p) => ({ ...p, reason: val }))}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.id} value={r.label}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.reason === "Other" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Specify Reason <span className="text-destructive">*</span></Label>
              <Textarea
                value={formData.reasonText}
                onChange={(e) => setFormData((p) => ({ ...p, reasonText: e.target.value }))}
                placeholder="Describe the reason for this move..."
                rows={2}
                className="resize-none"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Confirm Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}