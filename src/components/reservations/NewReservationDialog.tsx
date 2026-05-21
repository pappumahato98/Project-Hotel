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
import { CalendarIcon, Loader2, CalendarPlus, Search, UserPlus, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Room {
  id: string;
  room_number: string;
  room_type: string;
  price_per_night: number;
  capacity: number;
  status: string;
}

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  is_vip: boolean | null;
  total_visits: number | null;
}

interface NewReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  prefillRoomId?: string;
  prefillCheckInDate?: Date;
}

export function NewReservationDialog({
  open,
  onOpenChange,
  onSuccess,
  prefillRoomId,
  prefillCheckInDate,
}: NewReservationDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestSearch, setGuestSearch] = useState("");
  const [showNewGuestForm, setShowNewGuestForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    guestId: "",
    roomId: "",
    checkInDate: new Date(),
    checkOutDate: new Date(Date.now() + 86400000),
    adults: 1,
    children: 0,
    specialRequests: "",
    source: "direct" as "direct" | "booking.com" | "expedia" | "airbnb" | "phone" | "email",
  });

  // New guest form state
  const [newGuest, setNewGuest] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    vatNumber: "",
    address: "",
  });

  useEffect(() => {
    if (open) {
      fetchRooms();
      fetchGuests();
      setShowNewGuestForm(false);
      setFormData((prev) => ({
        ...prev,
        roomId: prefillRoomId || "",
        checkInDate: prefillCheckInDate || new Date(),
        checkOutDate: prefillCheckInDate ? new Date(prefillCheckInDate.getTime() + 86400000) : new Date(Date.now() + 86400000),
      }));
    }
  }, [open, prefillRoomId, prefillCheckInDate]);

  useEffect(() => {
    if (guestSearch.length >= 2) {
      searchGuests(guestSearch);
    } else if (guestSearch.length === 0) {
      fetchGuests();
    }
  }, [guestSearch]);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, room_number, room_type, price_per_night, capacity, status")
      .in("status", ["available", "cleaning"])
      .order("room_number");

    if (!error && data) {
      setRooms(data);
    }
  };

  const fetchGuests = async () => {
    const { data, error } = await supabase
      .from("guests")
      .select("id, first_name, last_name, email, phone, is_vip, total_visits")
      .order("last_name")
      .limit(20);

    if (!error && data) {
      setGuests(data);
    }
  };

  const searchGuests = async (query: string) => {
    const { data, error } = await supabase
      .from("guests")
      .select("id, first_name, last_name, email, phone, is_vip, total_visits")
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(20);

    if (!error && data) {
      setGuests(data);
    }
  };

  const calculateTotal = () => {
    const selectedRoom = rooms.find((r) => r.id === formData.roomId);
    if (!selectedRoom) return 0;
    const nights = differenceInDays(formData.checkOutDate, formData.checkInDate);
    return selectedRoom.price_per_night * Math.max(nights, 1);
  };

  const handleCreateNewGuest = async () => {
    if (!newGuest.firstName || !newGuest.lastName) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please enter first and last name.",
      });
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("guests")
      .insert({
        first_name: newGuest.firstName,
        last_name: newGuest.lastName,
        email: newGuest.email || null,
        phone: newGuest.phone || null,
        address: newGuest.address || null,
      })
      .select()
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error creating guest",
        description: error.message,
      });
    } else if (data) {
      toast({
        title: "Guest created",
        description: `${data.first_name} ${data.last_name} has been added.`,
      });
      setFormData({ ...formData, guestId: data.id });
      setShowNewGuestForm(false);
      setNewGuest({ firstName: "", lastName: "", email: "", phone: "", companyName: "", vatNumber: "", address: "" });
      fetchGuests();
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.guestId || !formData.roomId) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please select a guest and a room.",
      });
      return;
    }

    setIsLoading(true);

    // Generate reservation code
    const reservationCode = 'RES-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    const { error } = await supabase.from("reservations").insert({
      guest_id: formData.guestId,
      room_id: formData.roomId,
      check_in_date: format(formData.checkInDate, "yyyy-MM-dd"),
      check_out_date: format(formData.checkOutDate, "yyyy-MM-dd"),
      status: "pending" as const,
      adults: formData.adults,
      children: formData.children,
      total_amount: calculateTotal(),
      special_requests: formData.specialRequests || null,
      source: formData.source,
      reservation_code: reservationCode,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error creating reservation",
        description: error.message,
      });
    } else {
      toast({
        title: "Reservation created",
        description: `Reservation ${reservationCode} has been created successfully.`,
      });
      onOpenChange(false);
      onSuccess?.();
      resetForm();
    }

    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      guestId: "",
      roomId: "",
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 86400000),
      adults: 1,
      children: 0,
      specialRequests: "",
      source: "direct",
    });
    setGuestSearch("");
    setShowNewGuestForm(false);
  };

  const selectedGuest = guests.find((g) => g.id === formData.guestId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            New Reservation
          </DialogTitle>
          <DialogDescription>
            Create a new reservation by selecting a guest and room.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Guest Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-lg">Guest Information</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowNewGuestForm(!showNewGuestForm)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {showNewGuestForm ? "Select Existing" : "New Guest"}
              </Button>
            </div>

            {showNewGuestForm ? (
              <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newFirstName">First Name *</Label>
                    <Input
                      id="newFirstName"
                      value={newGuest.firstName}
                      onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newLastName">Last Name *</Label>
                    <Input
                      id="newLastName"
                      value={newGuest.lastName}
                      onChange={(e) => setNewGuest({ ...newGuest, lastName: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newEmail">Email</Label>
                    <Input
                      id="newEmail"
                      type="email"
                      value={newGuest.email}
                      onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPhone">Phone</Label>
                    <Input
                      id="newPhone"
                      value={newGuest.phone}
                      onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newCompanyName">Company Name</Label>
                    <Input
                      id="newCompanyName"
                      value={newGuest.companyName}
                      onChange={(e) => setNewGuest({ ...newGuest, companyName: e.target.value })}
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newVatNumber">VAT / TAX ID</Label>
                    <Input
                      id="newVatNumber"
                      value={newGuest.vatNumber}
                      onChange={(e) => setNewGuest({ ...newGuest, vatNumber: e.target.value })}
                      placeholder="VAT123456"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newAddress">Address</Label>
                  <Textarea
                    id="newAddress"
                    value={newGuest.address}
                    onChange={(e) => setNewGuest({ ...newGuest, address: e.target.value })}
                    placeholder="123 Street, City, Country"
                    rows={2}
                  />
                </div>
                <Button onClick={handleCreateNewGuest} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Guest
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search guests by name, email, or phone..."
                    value={guestSearch}
                    onChange={(e) => setGuestSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                  {guests.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No guests found. Try a different search or create a new guest.
                    </div>
                  ) : (
                    guests.map((guest) => (
                      <div
                        key={guest.id}
                        className={cn(
                          "p-3 cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors",
                          formData.guestId === guest.id && "bg-primary/10 border-primary"
                        )}
                        onClick={() => setFormData({ ...formData, guestId: guest.id })}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">
                              {guest.first_name} {guest.last_name}
                            </span>
                            {guest.is_vip && (
                              <Badge variant="secondary" className="ml-2">
                                <Star className="h-3 w-3 mr-1" />
                                VIP
                              </Badge>
                            )}
                          </div>
                          {guest.total_visits && guest.total_visits > 0 && (
                            <Badge variant="outline">{guest.total_visits} visits</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {guest.email || guest.phone || "No contact info"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {selectedGuest && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <span className="text-sm text-muted-foreground">Selected: </span>
                    <span className="font-medium">
                      {selectedGuest.first_name} {selectedGuest.last_name}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Room Selection */}
          <div className="space-y-4">
            <h4 className="font-medium text-lg">Room & Stay Details</h4>
            <div className="space-y-2">
              <Label htmlFor="room">Select Room *</Label>
              <Select
                value={formData.roomId}
                onValueChange={(value) => setFormData({ ...formData, roomId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      <div className="flex items-center gap-2">
                        <span>Room {room.room_number}</span>
                        <span className="text-muted-foreground">-</span>
                        <span>{room.room_type}</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="font-medium">{formatCurrency(room.price_per_night)}/night</span>
                        <Badge variant={room.status === "available" ? "default" : "secondary"} className="ml-2">
                          {room.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in Date *</Label>
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
                <Label>Check-out Date *</Label>
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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adults">Adults *</Label>
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
              <div className="space-y-2">
                <Label htmlFor="source">Booking Source</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value: "direct" | "booking.com" | "expedia" | "airbnb" | "phone" | "email") =>
                    setFormData({ ...formData, source: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="booking.com">Booking.com</SelectItem>
                    <SelectItem value="expedia">Expedia</SelectItem>
                    <SelectItem value="airbnb">Airbnb</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
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
                <div>
                  <span className="text-muted-foreground">Total Amount</span>
                  <p className="text-sm text-muted-foreground">
                    {differenceInDays(formData.checkOutDate, formData.checkInDate)} night(s)
                  </p>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Create Reservation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
