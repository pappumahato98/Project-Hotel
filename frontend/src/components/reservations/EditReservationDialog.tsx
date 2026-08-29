import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Edit } from "lucide-react";
import { cn, formatAD, formatCurrency } from "@/lib/utils";
import { differenceInDays, format } from "date-fns";
import { Reservation, useReservations } from "@/hooks/useReservations";

interface EditReservationDialogProps {
  reservation: Reservation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditReservationDialog({ reservation, open, onOpenChange }: EditReservationDialogProps) {
  const { updateReservation } = useReservations();
  const [formData, setFormData] = useState({
    checkInDate: new Date(),
    checkOutDate: new Date(),
    adults: 1,
    children: 0,
    specialRequests: "",
    source: "direct",
    payment_status: "pending",
  });

  useEffect(() => {
    if (reservation && open) {
      setFormData({
        checkInDate: new Date(reservation.check_in_date),
        checkOutDate: new Date(reservation.check_out_date),
        adults: reservation.adults,
        children: reservation.children || 0,
        specialRequests: reservation.special_requests || "",
        source: reservation.source || "direct",
        payment_status: reservation.payment_status || "pending",
      });
    }
  }, [reservation, open]);

  if (!reservation) return null;

  const nights = differenceInDays(formData.checkOutDate, formData.checkInDate) || 1;
  const total = (reservation.room?.price_per_night || 0) * nights;

  const handleSave = () => {
    updateReservation.mutate({
      id: reservation.id,
      check_in_date: format(formData.checkInDate, "yyyy-MM-dd"),
      check_out_date: format(formData.checkOutDate, "yyyy-MM-dd"),
      adults: formData.adults,
      children: formData.children,
      special_requests: formData.specialRequests || null,
      source: formData.source,
      payment_status: formData.payment_status,
      total_amount: total,
    }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Edit Reservation — {reservation.reservation_code}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Check-in Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatAD(formData.checkInDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formData.checkInDate} onSelect={(d) => d && setFormData({ ...formData, checkInDate: d })} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Check-out Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatAD(formData.checkOutDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formData.checkOutDate} onSelect={(d) => d && setFormData({ ...formData, checkOutDate: d })} disabled={(d) => d <= formData.checkInDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Adults</Label>
              <Input type="number" min={1} value={formData.adults} onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) || 1 })} />
            </div>
            <div className="space-y-2">
              <Label>Children</Label>
              <Input type="number" min={0} value={formData.children} onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="booking.com">Booking.com</SelectItem>
                  <SelectItem value="expedia">Expedia</SelectItem>
                  <SelectItem value="airbnb">Airbnb</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="walk-in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Payment Status</Label>
            <Select value={formData.payment_status} onValueChange={(v) => setFormData({ ...formData, payment_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Special Requests</Label>
            <Textarea value={formData.specialRequests} onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })} rows={3} />
          </div>
          <div className="p-3 bg-secondary rounded-lg flex justify-between items-center">
            <span className="text-muted-foreground">{nights} night(s)</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateReservation.isPending}>
            {updateReservation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
