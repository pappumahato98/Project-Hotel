import { useState, useMemo } from "react";
import { useReservations, Reservation } from "@/hooks/useReservations";
import { useRooms } from "@/hooks/useRooms";
import { useGuestFolios } from "@/hooks/useGuestFolios";
import { useGuestMessages } from "@/hooks/useGuestMessages";
import { useWakeUpCalls } from "@/hooks/useWakeUpCalls";
import { useFrontDeskContext } from "@/contexts/FrontDeskContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Users,
  Home,
  MoreVertical,
  ArrowRightLeft,
  CalendarPlus,
  Receipt,
  User,
  Filter,
  LogOut,
  CreditCard,
  Star,
  Loader2,
  MessageSquare,
  AlarmClock,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Printer,
  Info,
  ListTodo,
  Briefcase,
  Moon,
  Wrench,
  Brush
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, isSameDay, parseISO } from "date-fns";
import { cn, formatCurrency } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const InHouseGuestManager = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { reservations, isLoading: loadingRes, updateReservation } = useReservations();
  const { data: rooms = [] } = useRooms();
  const { folios, addFolioItem } = useGuestFolios();
  const { messages, createMessage } = useGuestMessages();
  const { scheduleCall, data: wakeUpCalls = [] } = useWakeUpCalls();
  const { goToFolios, showNotification } = useFrontDeskContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "due-out" | "stay-over" | "vip" | "late-checkout" | "complimentary" | "upgrade" | "groups">("all");
  const [floorFilter, setFloorFilter] = useState<string>("all");

  // Room Move State
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [isRoomMoveOpen, setIsRoomMoveOpen] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState("");
  const [moveReason, setMoveReason] = useState("");

  // Extend Stay State
  const [isExtendStayOpen, setIsExtendStayOpen] = useState(false);
  const [newCheckOutDate, setNewCheckOutDate] = useState("");

  // Quick Post State
  const [isQuickPostOpen, setIsQuickPostOpen] = useState(false);
  const [quickPostData, setQuickPostData] = useState({
    description: "",
    amount: 0,
    source: "manual"
  });

  // Guest Message State
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [newMessage, setNewMessage] = useState({
    text: "",
    type: "standard"
  });

  // Wake Up Call State
  const [isWakeUpOpen, setIsWakeUpOpen] = useState(false);
  const [wakeUpData, setWakeUpData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    time: "07:00",
    notes: ""
  });

  // Pre-Check-out State
  const [isPreCheckoutOpen, setIsPreCheckoutOpen] = useState(false);

  // Guest Preferences/Notes State
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [guestNotes, setGuestNotes] = useState("");

  // Traces/Tasks State
  const [isTracesOpen, setIsTracesOpen] = useState(false);
  const [newTrace, setNewTrace] = useState({
    type: "special",
    priority: "normal",
    notes: ""
  });

  const inHouseGuests = useMemo(() => {
    return reservations.filter(r => r.status === 'checked-in');
  }, [reservations]);

  const floors = useMemo(() => {
    const uniqueFloors = Array.from(new Set(rooms.map(r => r.floor))).sort((a, b) => a - b);
    return uniqueFloors;
  }, [rooms]);

  const filteredGuests = useMemo(() => {
    let result = inHouseGuests;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(g =>
        `${g.guest?.first_name} ${g.guest?.last_name}`.toLowerCase().includes(lowerQuery) ||
        g.room?.room_number.toLowerCase().includes(lowerQuery) ||
        g.reservation_code.toLowerCase().includes(lowerQuery)
      );
    }

    if (statusFilter === "due-out") {
      const today = new Date();
      result = result.filter(g => isSameDay(parseISO(g.check_out_date), today));
    } else if (statusFilter === "stay-over") {
      const today = new Date();
      result = result.filter(g => !isSameDay(parseISO(g.check_out_date), today));
    } else if (statusFilter === "vip") {
      result = result.filter(g => g.guest?.is_vip);
    } else if (statusFilter === "late-checkout") {
      result = result.filter(g => g.late_check_out || g.special_requests?.toLowerCase().includes("late"));
    } else if (statusFilter === "complimentary") {
      result = result.filter(g => g.is_complimentary);
    } else if (statusFilter === "upgrade") {
      result = result.filter(g => g.is_upgrade);
    } else if (statusFilter === "groups") {
      result = result.filter(g => g.market_segment === 'groups');
    }

    if (floorFilter !== "all") {
      result = result.filter(g => g.room?.floor === parseInt(floorFilter));
    }

    return result;
  }, [inHouseGuests, searchQuery, statusFilter, floorFilter]);

  const handleRoomMove = async () => {
    if (!selectedRes || !targetRoomId) return;

    try {
      const targetRoom = rooms.find(r => r.id === targetRoomId);
      const priceDiff = (targetRoom?.price_per_night || 0) - (selectedRes.room?.price_per_night || 0);
      const folio = folios?.find(f => f.reservation_id === selectedRes.id);

      // 1. Update old room status to 'cleaning'
      await supabase.from("rooms").update({ status: "cleaning" }).eq("id", selectedRes.room_id);

      // 2. Update new room status to 'occupied'
      await supabase.from("rooms").update({ status: "occupied" }).eq("id", targetRoomId);

      // 3. Update reservation with new room_id
      const moveLog = `Room Move: from ${selectedRes.room?.room_number} to ${targetRoom?.room_number}. Reason: ${moveReason}. Rate Diff: ${formatCurrency(priceDiff)}/night.`;

      await updateReservation.mutateAsync({
        id: selectedRes.id,
        room_id: targetRoomId,
        special_requests: (selectedRes.special_requests ? selectedRes.special_requests + "\n" : "") + moveLog
      });

      // 4. Post folio adjustment if rate changed
      if (folio && priceDiff !== 0) {
        await addFolioItem.mutateAsync({
          folio_id: folio.id,
          item_type: priceDiff > 0 ? 'charge' : 'adjustment',
          source: 'room_rate',
          description: `Room Move Rate Adjustment: ${selectedRes.room?.room_number} -> ${targetRoom?.room_number}`,
          amount: Math.abs(priceDiff)
        });
      }

      // 5. Create a task for housekeeping
      await (supabase as any).from("housekeeping_tasks").insert({
        room_id: selectedRes.room_id,
        task_type: "routine",
        priority: "high",
        notes: `Guest moved to ${targetRoom?.room_number}. Reason: ${moveReason}`
      });

      setIsRoomMoveOpen(false);
      setSelectedRes(null);
      setTargetRoomId("");
      setMoveReason("");
      toast({ title: "Success", description: "Room moved successfully. Housekeeping notified." });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to move room: " + error.message, variant: "destructive" });
    }
  };

  const handleExtendStay = async () => {
    if (!selectedRes || !newCheckOutDate) return;

    try {
      await updateReservation.mutateAsync({
        id: selectedRes.id,
        check_out_date: newCheckOutDate
      });
      setIsExtendStayOpen(false);
      setSelectedRes(null);
      setNewCheckOutDate("");
      toast({ title: "Success", description: "Stay extended successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to extend stay: " + error.message, variant: "destructive" });
    }
  };

  const handleQuickPost = async () => {
    if (!selectedRes || !quickPostData.description || quickPostData.amount === 0) return;

    const folio = folios?.find(f => f.reservation_id === selectedRes.id);
    if (!folio) {
      toast({ title: "Error", description: "No folio found for this guest", variant: "destructive" });
      return;
    }

    try {
      await addFolioItem.mutateAsync({
        folio_id: folio.id,
        item_type: 'charge',
        source: quickPostData.source,
        description: quickPostData.description,
        amount: Math.abs(quickPostData.amount)
      });
      setIsQuickPostOpen(false);
      setQuickPostData({ description: "", amount: 0, source: "manual" });
      setSelectedRes(null);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to post charge: " + error.message, variant: "destructive" });
    }
  };

  const handleCreateMessage = async () => {
    if (!selectedRes || !newMessage.text) return;

    try {
      await createMessage.mutateAsync({
        guest_id: selectedRes.guest_id,
        sender_name: "Front Desk",
        message_text: newMessage.text,
        message_type: newMessage.type,
        room_id: selectedRes.room_id
      });
      setIsMessageOpen(false);
      setNewMessage({ text: "", type: "standard" });
      setSelectedRes(null);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to send message: " + error.message, variant: "destructive" });
    }
  };

  const handleScheduleWakeUp = async () => {
    if (!selectedRes) return;

    try {
      await scheduleCall.mutateAsync({
        guest_id: selectedRes.guest_id,
        reservation_id: selectedRes.id,
        room_id: selectedRes.room_id,
        guest_name: `${selectedRes.guest?.first_name} ${selectedRes.guest?.last_name}`,
        room_number: selectedRes.room?.room_number || "",
        call_date: wakeUpData.date,
        call_time: wakeUpData.time,
        notes: wakeUpData.notes
      });
      setIsWakeUpOpen(false);
      setWakeUpData({ date: format(new Date(), "yyyy-MM-dd"), time: "07:00", notes: "" });
      setSelectedRes(null);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to schedule wake-up call: " + error.message, variant: "destructive" });
    }
  };

  const handleUpdateGuestNotes = async () => {
    if (!selectedRes) return;

    try {
      const { error } = await supabase
        .from("guests")
        .update({ notes: guestNotes })
        .eq("id", selectedRes.guest_id);

      if (error) throw error;

      setIsNotesOpen(false);
      setSelectedRes(null);
      toast({ title: "Success", description: "Guest notes updated" });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to update notes: " + error.message, variant: "destructive" });
    }
  };

  const handleCreateTrace = async () => {
    if (!selectedRes || !newTrace.notes) return;

    try {
      const { error } = await (supabase as any).from("housekeeping_tasks").insert({
        room_id: selectedRes.room_id,
        task_type: newTrace.type,
        priority: newTrace.priority,
        notes: `[GUEST TRACE] ${newTrace.notes}`
      });

      if (error) throw error;

      setIsTracesOpen(false);
      setNewTrace({ type: "special", priority: "normal", notes: "" });
      setSelectedRes(null);
      toast({ title: "Success", description: "Guest trace/task created" });
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to create trace: " + error.message, variant: "destructive" });
    }
  };

  const goToFolio = (reservationId: string) => {
    const folio = folios?.find(f => f.reservation_id === reservationId);
    if (folio) {
      setSearchParams(prev => {
        prev.set("tab", "folios");
        prev.set("folioId", folio.id);
        return prev;
      });
    } else {
      toast({ title: "Error", description: "No folio found for this reservation", variant: "destructive" });
    }
  };

  const availableRooms = rooms.filter(r => r.status === 'available');

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search in-house guests..."
              className="w-full sm:w-64 pl-9 bg-secondary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-[160px] bg-secondary">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All In-house</SelectItem>
              <SelectItem value="due-out">Due-out Today</SelectItem>
              <SelectItem value="stay-over">Stay-overs</SelectItem>
              <SelectItem value="vip">VIP Guests</SelectItem>
              <SelectItem value="groups">Groups / Corporate</SelectItem>
              <SelectItem value="late-checkout">Late Check-out</SelectItem>
              <SelectItem value="complimentary">Complimentary</SelectItem>
              <SelectItem value="upgrade">Upgraded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={floorFilter} onValueChange={setFloorFilter}>
            <SelectTrigger className="w-[130px] bg-secondary">
              <Home className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Floors</SelectItem>
              {floors.map(f => (
                <SelectItem key={f} value={f.toString()}>Floor {f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 py-1.5 px-3">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            {inHouseGuests.length} In-house
          </Badge>
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 py-1.5 px-3">
            <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
            {inHouseGuests.filter(g => isSameDay(parseISO(g.check_out_date), new Date())).length} Due-out
          </Badge>
        </div>
      </div>

      <Card variant="elevated">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30">
                  <TableHead>Guest / Reservation</TableHead>
                  <TableHead>Room & Alerts</TableHead>
                  <TableHead>Stay Duration</TableHead>
                  <TableHead>Folio Balance</TableHead>
                  <TableHead>Attributes & Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRes ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="mt-2 text-muted-foreground">Loading guests...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredGuests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                      No in-house guests found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGuests.map((res) => {
                    const folio = folios?.find(f => f.reservation_id === res.id);
                    const isDueOut = isSameDay(parseISO(res.check_out_date), new Date());
                    const guestMessages = messages.filter(m => m.guest_id === res.guest_id && m.status !== 'archived');
                    const guestWakeUps = wakeUpCalls.filter(w => w.reservation_id === res.id && w.status === 'pending');
                    const isVIP = res.guest?.is_vip;
                    const isGroup = res.market_segment === 'groups';

                    return (
                      <TableRow key={res.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-10 w-10 rounded-full flex items-center justify-center font-bold relative",
                              isVIP ? "bg-amber-100 text-amber-700 ring-2 ring-amber-400" : "bg-primary/10 text-primary"
                            )}>
                              {res.guest?.first_name?.[0]}{res.guest?.last_name?.[0]}
                              {isVIP && <Star className="h-3 w-3 absolute -top-1 -right-1 fill-amber-500 text-amber-500" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate max-w-[120px]">{res.guest?.first_name} {res.guest?.last_name}</p>
                                {isVIP && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 text-[10px] h-4 py-0">VIP</Badge>}
                                {isGroup && <Briefcase className="h-3 w-3 text-blue-500" title="Group Booking" />}
                              </div>
                              <p className="text-xs text-muted-foreground font-mono">{res.reservation_code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Home className={cn("h-4 w-4", isVIP ? "text-amber-600" : "text-muted-foreground")} />
                            <div>
                              <p className="font-bold text-primary">Room {res.room?.room_number}</p>
                              <div className="flex gap-1 mt-0.5">
                                {res.room?.status === 'cleaning' && <Brush className="h-3 w-3 text-warning" title="Cleaning in Progress" />}
                                {res.room?.status === 'maintenance' && <Wrench className="h-3 w-3 text-destructive" title="Maintenance Issue" />}
                                <Moon className="h-3 w-3 text-muted-foreground/40" title="DND Status Unknown" />
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-[10px] py-0 h-4 w-8 justify-center">IN</Badge>
                              <span>{format(parseISO(res.check_in_date), "MMM dd")}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className={cn("text-[10px] py-0 h-4 w-8 justify-center", isDueOut && "border-warning text-warning")}>OUT</Badge>
                              <span className={cn(isDueOut && "font-bold text-warning")}>{format(parseISO(res.check_out_date), "MMM dd")}</span>
                            </div>
                            <div className="flex gap-1 mt-1">
                              {guestMessages.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-100">
                                  <MessageSquare className="h-2.5 w-2.5 mr-0.5" /> {guestMessages.length}
                                </Badge>
                              )}
                              {guestWakeUps.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-purple-50 text-purple-700 border-purple-100">
                                  <AlarmClock className="h-2.5 w-2.5 mr-0.5" /> {guestWakeUps.length}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {folio ? (
                            <div className="space-y-1">
                              <p className={cn("font-bold", folio.balance > 0 ? "text-destructive" : "text-success")}>
                                {formatCurrency(folio.balance)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">Folio: {folio.folio_number}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">No folio</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex flex-wrap gap-1">
                              {isDueOut ? (
                                <Badge className="bg-warning/20 text-warning border-warning/30 hover:bg-warning/20 text-[10px] py-0 h-4">Due-out</Badge>
                              ) : (
                                <Badge variant="outline" className="border-success/30 text-success bg-success/10 text-[10px] py-0 h-4">In-house</Badge>
                              )}
                              {res.late_check_out && <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] py-0 h-4">Late C/O</Badge>}
                              {res.is_complimentary && <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] py-0 h-4">Comp</Badge>}
                              {res.is_upgrade && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] py-0 h-4">Upgrade</Badge>}
                            </div>
                            <div className="flex items-center gap-1">
                              {res.special_requests && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-muted-foreground hover:text-primary"
                                  onClick={() => {
                                    setSelectedRes(res);
                                    setGuestNotes(res.guest?.notes || "");
                                    setIsNotesOpen(true);
                                  }}
                                >
                                  <Info className="h-3 w-3" />
                                </Button>
                              )}
                              {res.guest?.notes && (
                                <Badge variant="outline" className="text-[9px] py-0 h-3 border-muted-foreground/30">Notes</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>Guest Management</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => goToFolio(res.id)}>
                                <Receipt className="h-4 w-4 mr-2" />
                                View Folio & Billing
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedRes(res);
                                setIsRoomMoveOpen(true);
                              }}>
                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                Room Move
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedRes(res);
                                setQuickPostData({ description: "", amount: 0, source: "manual" });
                                setIsQuickPostOpen(true);
                              }}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Quick Folio Post
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedRes(res);
                                setNewCheckOutDate(res.check_out_date);
                                setIsExtendStayOpen(true);
                              }}>
                                <CalendarPlus className="h-4 w-4 mr-2" />
                                Extend Stay
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Concierge & Alerts</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => {
                                setSelectedRes(res);
                                setIsMessageOpen(true);
                              }}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Guest Message
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedRes(res);
                                setIsWakeUpOpen(true);
                              }}>
                                <AlarmClock className="h-4 w-4 mr-2" />
                                Schedule Wake-up
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedRes(res);
                                setGuestNotes(res.guest?.notes || "");
                                setIsNotesOpen(true);
                              }}>
                                <ClipboardList className="h-4 w-4 mr-2" />
                                Preferences & Notes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedRes(res);
                                setIsTracesOpen(true);
                              }}>
                                <ListTodo className="h-4 w-4 mr-2" />
                                Add Guest Trace/Task
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-warning font-medium"
                                onClick={() => {
                                  setSelectedRes(res);
                                  setIsPreCheckoutOpen(true);
                                }}
                              >
                                <LogOut className="h-4 w-4 mr-2" />
                                Pre-Check-out
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Room Move Dialog */}
      <Dialog open={isRoomMoveOpen} onOpenChange={setIsRoomMoveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Elevated Room Move</DialogTitle>
            <DialogDescription>
              Move guest to a new room. System will automatically update housekeeping.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-2 items-center p-3 bg-secondary/30 rounded-lg border border-border/50">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Current</p>
                <p className="text-lg font-bold">{selectedRes?.room?.room_number}</p>
                <p className="text-[10px] text-muted-foreground">{formatCurrency(selectedRes?.room?.price_per_night || 0)}</p>
              </div>
              <div className="flex justify-center">
                <ArrowRightLeft className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Target</p>
                <p className="text-lg font-bold text-primary">
                  {targetRoomId ? rooms.find(r => r.id === targetRoomId)?.room_number : "---"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {targetRoomId ? formatCurrency(rooms.find(r => r.id === targetRoomId)?.price_per_night || 0) : "---"}
                </p>
              </div>
            </div>

            {targetRoomId && (
              <div className={cn(
                "p-2 text-xs rounded border flex items-center gap-2",
                (rooms.find(r => r.id === targetRoomId)?.price_per_night || 0) > (selectedRes?.room?.price_per_night || 0)
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
              )}>
                <AlertCircle className="h-4 w-4" />
                <span>
                  Rate difference: <strong>{formatCurrency((rooms.find(r => r.id === targetRoomId)?.price_per_night || 0) - (selectedRes?.room?.price_per_night || 0))}</strong> / night.
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Select Available Room</Label>
              <Select value={targetRoomId} onValueChange={setTargetRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a room" />
                </SelectTrigger>
                <SelectContent>
                  {availableRooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      Room {room.room_number} - {room.room_type} ({formatCurrency(room.price_per_night)})
                    </SelectItem>
                  ))}
                  {availableRooms.length === 0 && <p className="p-2 text-sm text-center italic">No rooms available</p>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason for Move</Label>
              <Textarea
                placeholder="e.g. AC failure in 204. Guest upgraded to Deluxe."
                className="h-20 resize-none"
                value={moveReason}
                onChange={(e) => setMoveReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoomMoveOpen(false)}>Cancel</Button>
            <Button onClick={handleRoomMove} disabled={!targetRoomId || !moveReason}>
              Execute Room Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Message Dialog */}
      <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Guest Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Message Type</Label>
              <Select
                value={newMessage.type}
                onValueChange={(v) => setNewMessage({...newMessage, type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Message</SelectItem>
                  <SelectItem value="package">Package / Delivery</SelectItem>
                  <SelectItem value="emergency">Urgent / Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Message Text</Label>
              <Textarea
                placeholder="Type the message here..."
                className="h-32"
                value={newMessage.text}
                onChange={(e) => setNewMessage({...newMessage, text: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateMessage} disabled={!newMessage.text}>
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wake-up Call Dialog */}
      <Dialog open={isWakeUpOpen} onOpenChange={setIsWakeUpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Wake-up Call</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={wakeUpData.date}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setWakeUpData({...wakeUpData, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={wakeUpData.time}
                  onChange={(e) => setWakeUpData({...wakeUpData, time: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input
                placeholder="e.g. Provide extra coffee with wake-up"
                value={wakeUpData.notes}
                onChange={(e) => setWakeUpData({...wakeUpData, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsWakeUpOpen(false)}>Cancel</Button>
            <Button onClick={handleScheduleWakeUp}>Schedule Call</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pre-Check-out Dialog */}
      <Dialog open={isPreCheckoutOpen} onOpenChange={setIsPreCheckoutOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pre-Check-out Verification</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-bold border-b pb-2 flex items-center gap-2">
                  <User className="h-4 w-4" /> Guest Info
                </h4>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{selectedRes?.guest?.first_name} {selectedRes?.guest?.last_name}</p>
                  <p className="text-xs text-muted-foreground">Room {selectedRes?.room?.room_number} • {selectedRes?.room?.room_type}</p>
                </div>

                <h4 className="font-bold border-b pb-2 mt-6 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> Final Checks
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm">Mini-bar consumed?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm">Key cards returned?</span>
                  </div>
                </div>
              </div>

              <div className="bg-secondary/20 p-4 rounded-xl space-y-4">
                <h4 className="font-bold flex items-center justify-between">
                  <span>Folio Summary</span>
                  <Badge variant="outline" className="bg-white font-mono">
                    {folios?.find(f => f.reservation_id === selectedRes?.id)?.folio_number}
                  </Badge>
                </h4>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Room Charges</span>
                    <span>{formatCurrency(selectedRes?.total_amount || 0)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                    <span>Balance Due</span>
                    <span className={cn(
                      (folios?.find(f => f.reservation_id === selectedRes?.id)?.balance || 0) > 0
                      ? "text-destructive" : "text-success"
                    )}>
                      {formatCurrency(folios?.find(f => f.reservation_id === selectedRes?.id)?.balance || 0)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-2">
                  <Button variant="outline" className="w-full justify-start h-9" onClick={() => selectedRes && goToFolio(selectedRes.id)}>
                    <Receipt className="h-4 w-4 mr-2" /> View Detailed Folio
                  </Button>
                  <Button variant="outline" className="w-full justify-start h-9">
                    <Printer className="h-4 w-4 mr-2" /> Print Preliminary Bill
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-secondary/30 -mx-6 -mb-6 p-4 mt-0">
            <Button variant="ghost" onClick={() => setIsPreCheckoutOpen(false)}>Cancel</Button>
            <div className="flex-1" />
            <Button
              className="bg-warning text-warning-foreground hover:bg-warning/90"
              onClick={() => {
                toast({ title: "Marked for Departure", description: "The guest has been flagged for check-out." });
                setIsPreCheckoutOpen(false);
              }}
            >
              Confirm Pre-Check-out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Traces/Tasks Dialog */}
      <Dialog open={isTracesOpen} onOpenChange={setIsTracesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Guest Trace / Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Department/Type</Label>
                <Select
                  value={newTrace.type}
                  onValueChange={(v) => setNewTrace({...newTrace, type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="special">Special Request</SelectItem>
                    <SelectItem value="routine">Housekeeping</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newTrace.priority}
                  onValueChange={(v) => setNewTrace({...newTrace, priority: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Instruction / Note</Label>
              <Textarea
                placeholder="e.g. Guest requested bucket of ice at 8 PM"
                className="h-24"
                value={newTrace.notes}
                onChange={(e) => setNewTrace({...newTrace, notes: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTracesOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTrace} disabled={!newTrace.notes}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preferences & Notes Dialog */}
      <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guest Preferences & Notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Special Requests (from Reservation)</Label>
              <div className="p-3 bg-secondary/30 rounded text-sm min-h-[60px] whitespace-pre-wrap">
                {selectedRes?.special_requests || "No special requests."}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Internal Guest Notes (Persistent)</Label>
              <Textarea
                placeholder="Add notes about guest preferences..."
                className="h-32"
                value={guestNotes}
                onChange={(e) => setGuestNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNotesOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateGuestNotes}>Save Preferences</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Post Dialog */}
      <Dialog open={isQuickPostOpen} onOpenChange={setIsQuickPostOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Folio Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={quickPostData.source}
                onValueChange={(v) => setQuickPostData({...quickPostData, source: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="minibar">Mini Bar</SelectItem>
                  <SelectItem value="laundry">Laundry</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="spa">Spa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="e.g. Extra Water Bottle"
                value={quickPostData.description}
                onChange={(e) => setQuickPostData({...quickPostData, description: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={quickPostData.amount}
                onChange={(e) => setQuickPostData({...quickPostData, amount: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuickPostOpen(false)}>Cancel</Button>
            <Button onClick={handleQuickPost} disabled={!quickPostData.description || quickPostData.amount === 0 || addFolioItem.isPending}>
              {addFolioItem.isPending ? "Posting..." : "Post Charge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Stay Dialog */}
      <Dialog open={isExtendStayOpen} onOpenChange={setIsExtendStayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Stay</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Departure Date</Label>
              <Input
                type="date"
                value={newCheckOutDate}
                min={selectedRes?.check_out_date}
                onChange={(e) => setNewCheckOutDate(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground italic">
              Note: Extending stay will increase total charges based on room rate.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExtendStayOpen(false)}>Cancel</Button>
            <Button onClick={handleExtendStay} disabled={!newCheckOutDate || newCheckOutDate === selectedRes?.check_out_date}>
              Update Departure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
