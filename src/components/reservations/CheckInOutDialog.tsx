import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { cn, formatAD, formatCurrency } from "@/lib/utils";
import { CalendarIcon, Loader2, UserPlus, LogIn, LogOut, Wallet, AlertTriangle } from "lucide-react";
import { useCheckInSettings } from "@/hooks/useSettings";
import { useInvoices } from "@/hooks/useBillingData";
import { useGuestFolios } from "@/hooks/useGuestFolios";

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  price_per_night: number;
}

interface CheckInOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "walk-in" | "check-in" | "check-out";
  reservationId?: string;
  onSuccess?: () => void;
}

export function CheckInOutDialog({
  open,
  onOpenChange,
  mode,
  reservationId,
  onSuccess,
}: CheckInOutDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const { data: checkInSettings } = useCheckInSettings();
  const { data: allInvoices = [] } = useInvoices();
  const { createFolio } = useGuestFolios();
  const [guestDue, setGuestDue] = useState(0);
  const [reservation, setReservation] = useState<any>(null);

  // Walk-in form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idType: "passport" as "passport" | "driver_license" | "national_id" | "other",
    idNumber: "",
    roomId: "",
    checkInDate: new Date(),
    checkOutDate: new Date(Date.now() + 86400000), // Tomorrow
    adults: 1,
    children: 0,
    specialRequests: "",
  });

  useEffect(() => {
    if (open) {
      if (mode === "walk-in") {
        fetchAvailableRooms();
      } else if (reservationId) {
        fetchReservationDetails();
      }
    }
  }, [open, mode, reservationId]);

  const fetchReservationDetails = async () => {
    const { data, error } = await supabase
      .from("reservations")
      .select("*, guest:guests(*)")
      .eq("id", reservationId)
      .single();

    if (!error && data) {
      setReservation(data);
      if (data.guest_id) {
        const due = allInvoices
          .filter(inv => inv.guest_id === data.guest_id && inv.status !== 'paid')
          .reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
        setGuestDue(due);
      }
    }
  };

  const fetchAvailableRooms = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, room_number, room_type, price_per_night")
      .eq("status", "available")
      .order("room_number");

    if (!error && data) {
      setRooms(data);
    }
  };

  const calculateTotal = () => {
    const selectedRoom = rooms.find((r) => r.id === formData.roomId);
    if (!selectedRoom) return 0;
    const nights = differenceInDays(formData.checkOutDate, formData.checkInDate);
    return selectedRoom.price_per_night * Math.max(nights, 1);
  };

  const handleWalkIn = async () => {
    // Validate required fields based on settings
    const missingFields: string[] = [];
    
    if (!formData.firstName) missingFields.push("First Name");
    if (!formData.lastName) missingFields.push("Last Name");
    if (!formData.roomId) missingFields.push("Room");
    
    if (checkInSettings?.id_required && !formData.idNumber) {
      missingFields.push("ID Number");
    }
    if (checkInSettings?.phone_required && !formData.phone) {
      missingFields.push("Phone");
    }
    if (checkInSettings?.email_required && !formData.email) {
      missingFields.push("Email");
    }

    if (missingFields.length > 0) {
      toast({
        variant: "destructive",
        title: "Missing required fields",
        description: `Please fill in: ${missingFields.join(", ")}`,
      });
      return;
    }

    setIsLoading(true);

    // Create guest
    const { data: guest, error: guestError } = await supabase
      .from("guests")
      .insert({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email || null,
        phone: formData.phone || null,
        id_type: formData.idType,
        id_number: formData.idNumber || null,
      })
      .select()
      .single();

    if (guestError) {
      toast({
        variant: "destructive",
        title: "Error creating guest",
        description: guestError.message,
      });
      setIsLoading(false);
      return;
    }

    // Generate reservation code
    const reservationCode = 'RES-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    
    // Create reservation with checked-in status
    const { data: reservation, error: resError } = await supabase
      .from("reservations")
      .insert([{
        guest_id: guest.id,
        room_id: formData.roomId,
        check_in_date: format(formData.checkInDate, "yyyy-MM-dd"),
        check_out_date: format(formData.checkOutDate, "yyyy-MM-dd"),
        actual_check_in: new Date().toISOString(),
        status: "checked-in" as const,
        adults: formData.adults,
        children: formData.children,
        total_amount: calculateTotal(),
        special_requests: formData.specialRequests || null,
        source: "walk-in" as const,
        reservation_code: reservationCode,
      }])
      .select()
      .single();

    if (resError) {
      toast({
        variant: "destructive",
        title: "Error creating reservation",
        description: resError.message,
      });
      setIsLoading(false);
      return;
    }

    // 4. Create initial folio for walk-in
    await createFolio.mutateAsync({
      reservation_id: reservation.id,
      guest_id: guest.id,
      room_id: formData.roomId,
      status: "open",
      folio_number: `FOL-${reservationCode.split('-')[1]}`
    });

    // Update room status
    await supabase
      .from("rooms")
      .update({ status: "occupied" })
      .eq("id", formData.roomId);


    setIsLoading(false);
    toast({
      title: "Walk-in check-in complete",
      description: `Guest ${formData.firstName} ${formData.lastName} has been checked in.`,
    });
    onOpenChange(false);
    onSuccess?.();
    resetForm();
  };

  const handleCheckIn = async () => {
    if (!reservationId) return;
    setIsLoading(true);

    const { data: resData, error } = await supabase
      .from("reservations")
      .update({
        status: "checked-in",
        actual_check_in: new Date().toISOString(),
      })
      .eq("id", reservationId)
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Check-in failed",
        description: error.message,
      });
    } else {
      // Create folio if it doesn't exist
      const { data: existingFolio } = await supabase
        .from('guest_folios')
        .select('id')
        .eq('reservation_id', reservationId)
        .maybeSingle();

      if (!existingFolio) {
        await createFolio.mutateAsync({
          reservation_id: reservationId,
          guest_id: resData.guest_id,
          room_id: resData.room_id,
          status: "open",
          folio_number: `FOL-${resData.reservation_code.split('-')[1] || Math.floor(Math.random()*1000)}`
        });
      }

      // Update room status to occupied
      if (resData.room_id) {
        await supabase
          .from("rooms")
          .update({ status: "occupied" })
          .eq("id", resData.room_id);
      }

      toast({
        title: "Check-in successful",
        description: "Guest has been checked in and room status updated to occupied.",
      });
      onSuccess?.();
    }

    setIsLoading(false);
    onOpenChange(false);
  };

  const handleCheckOut = async () => {
    if (!reservationId) return;
    setIsLoading(true);

    // Get reservation to update room
    const { data: reservation } = await supabase
      .from("reservations")
      .select("room_id, guest_id, total_amount")
      .eq("id", reservationId)
      .single();

    const { error } = await supabase
      .from("reservations")
      .update({
        status: "checked-out",
        actual_check_out: new Date().toISOString(),
      })
      .eq("id", reservationId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Check-out failed",
        description: error.message,
      });
    } else {
      // Update room status to cleaning
      if (reservation?.room_id) {
        // Update room status
        await supabase
          .from("rooms")
          .update({ status: "cleaning" })
          .eq("id", reservation.room_id);

        // Auto-create a housekeeping task for checkout
        const today = new Date().toISOString().split("T")[0];
        const { data: existingHk } = await supabase
          .from("housekeeping_tasks")
          .select("id")
          .eq("room_id", reservation.room_id)
          .eq("scheduled_date", today)
          .maybeSingle();

        if (!existingHk) {
          await (supabase as any).from("housekeeping_tasks").insert({
            room_id: reservation.room_id,
            task_type: "checkout",
            status: "pending",
            scheduled_date: today,
            priority: "high",
            description: "Guest checkout - urgent cleaning required"
          });
        }
      }

      // Update guest total spending and visit count
      if (reservation?.guest_id) {
        const { data: guest } = await supabase
          .from("guests")
          .select("total_spending, total_visits")
          .eq("id", reservation.guest_id)
          .single();

        const updates: any = {
          total_visits: (guest?.total_visits || 0) + 1
        };

        if (reservation.total_amount) {
          updates.total_spending = (guest?.total_spending || 0) + reservation.total_amount;
        }

        await supabase
          .from("guests")
          .update(updates)
          .eq("id", reservation.guest_id);
      }

      toast({
        title: "Check-out successful",
        description: "Guest has been checked out. Room set to cleaning.",
      });
      onSuccess?.();
    }

    setIsLoading(false);
    onOpenChange(false);
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      idType: "passport",
      idNumber: "",
      roomId: "",
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      adults: 1,
      children: 0,
      specialRequests: "",
    });
  };

  const getTitle = () => {
    switch (mode) {
      case "walk-in":
        return "Walk-in Check-in";
      case "check-in":
        return "Guest Check-in";
      case "check-out":
        return "Guest Check-out";
    }
  };

  const getIcon = () => {
    switch (mode) {
      case "walk-in":
        return <UserPlus className="h-5 w-5" />;
      case "check-in":
        return <LogIn className="h-5 w-5" />;
      case "check-out":
        return <LogOut className="h-5 w-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getTitle()}
          </DialogTitle>
          <DialogDescription>
            {mode === "walk-in"
              ? "Register a walk-in guest and check them in directly."
              : mode === "check-in"
              ? "Confirm check-in for this reservation."
              : "Process check-out for this guest."}
          </DialogDescription>
        </DialogHeader>

        {guestDue > 0 && (
          <div className="mx-0 p-3 bg-destructive/10 border-y border-destructive/20 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <div className="text-left">
                <p className="text-[10px] font-bold uppercase tracking-wider leading-none">Outstanding Balance Detected</p>
                <p className="text-xs font-medium">This guest has unpaid invoices from previous stays.</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-destructive/70 font-bold uppercase">Total Due</p>
              <p className="text-sm font-bold text-destructive font-mono">{formatCurrency(guestDue)}</p>
            </div>
          </div>
        )}

        {mode === "walk-in" ? (
          <div className="space-y-6">
            {/* Guest Information */}
            <div className="space-y-4">
              <h4 className="font-medium">Guest Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email {checkInSettings?.email_required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    required={checkInSettings?.email_required}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone {checkInSettings?.phone_required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    required={checkInSettings?.phone_required}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="idType">ID Type</Label>
                  <Select
                    value={formData.idType}
                    onValueChange={(value: "passport" | "driver_license" | "national_id" | "other") =>
                      setFormData({ ...formData, idType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="driver_license">Driver's License</SelectItem>
                      <SelectItem value="national_id">National ID</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idNumber">
                    ID Number {checkInSettings?.id_required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="idNumber"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                    placeholder="ABC123456"
                    required={checkInSettings?.id_required}
                  />
                </div>
              </div>
            </div>

            {/* Room & Dates */}
            <div className="space-y-4">
              <h4 className="font-medium">Room & Stay Details</h4>
              <div className="space-y-2">
                <Label htmlFor="room">Select Room *</Label>
                <Select
                  value={formData.roomId}
                  onValueChange={(value) => setFormData({ ...formData, roomId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an available room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.room_number} - {room.room_type} ({formatCurrency(room.price_per_night)}/night)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                      <Calendar
                        mode="single"
                        selected={formData.checkInDate}
                        onSelect={(date) => date && setFormData({ ...formData, checkInDate: date })}
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
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
                      <Calendar
                        mode="single"
                        selected={formData.checkOutDate}
                        onSelect={(date) => date && setFormData({ ...formData, checkOutDate: date })}
                        disabled={(date) => date <= formData.checkInDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adults">Adults</Label>
                  <Input
                    id="adults"
                    type="number"
                    min={1}
                    value={formData.adults}
                    onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="children">Children</Label>
                  <Input
                    id="children"
                    type="number"
                    min={0}
                    value={formData.children}
                    onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialRequests">Special Requests</Label>
                <Textarea
                  id="specialRequests"
                  value={formData.specialRequests}
                  onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                  placeholder="Any special requests or notes..."
                  rows={3}
                />
              </div>
            </div>

            {/* Total */}
            {formData.roomId && (
              <div className="p-4 bg-secondary rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {differenceInDays(formData.checkOutDate, formData.checkInDate) || 1} night(s)
                </p>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button variant="blue" onClick={handleWalkIn} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Check In Guest
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-muted-foreground">
              {mode === "check-in"
                ? "Click the button below to confirm check-in. The guest's arrival time will be recorded."
                : "Click the button below to process check-out. The room will be marked for cleaning."}
            </p>
            <div className="flex justify-end gap-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant={mode === "check-out" ? "destructive" : "blue"}
                onClick={mode === "check-in" ? handleCheckIn : handleCheckOut}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : mode === "check-in" ? (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Confirm Check-in
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Confirm Check-out
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
