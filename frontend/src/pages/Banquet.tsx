import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarDays,
  Plus,
  Search,
  Clock,
  MapPin,

  UtensilsCrossed,
  Layout,
  BarChart3,
  Receipt,
  UserCheck,
  ClipboardList,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUIPreferences } from "@/hooks/useSettings";
import { useSearchParams } from "react-router-dom";
import { useInvoices } from "@/hooks/useBillingData";
import { useGuestFolios } from "@/hooks/useGuestFolios";
import { usePostBanquetToFolio } from "@/hooks/useBanquetData";

import { 
  DraggableBanquetCalendar,
  EventReportsPanel,
  CateringManagementPanel,
  VenueSetupPanel,
  StaffAssignmentPanel,
  EventActionPlanPanel,
} from "@/components/banquet";

interface BanquetEvent {
  id: string;
  event_name: string;
  event_type: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  guest_count: number;
  status: "inquiry" | "confirmed" | "in_progress" | "completed" | "cancelled";
  menu_package: string | null;
  special_requests: string | null;
  total_amount: number;
  deposit_amount: number | null;
  notes: string | null;
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const eventTypeColors: Record<string, string> = {
  wedding: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  corporate: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  birthday: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  conference: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  social: "bg-green-500/20 text-green-400 border-green-500/30",
  other: "bg-muted text-muted-foreground border-muted",
};

const statusColors: Record<string, string> = {
  inquiry: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  confirmed: "bg-success/20 text-success border-success/30",
  in_progress: "bg-primary/20 text-primary border-primary/30",
  completed: "bg-muted text-muted-foreground border-muted",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
};

export default function Banquet() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "events";
  const [searchQuery, setSearchQuery] = useState("");
  const { folios } = useGuestFolios();
  const postToFolio = usePostBanquetToFolio();

  const handleTabChange = (value: string, eventId?: string, action?: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      if (eventId) {
        prev.set("setupEvent", eventId);
      } else {
        prev.delete("setupEvent");
      }
      
      if (action) {
        prev.set("setupAction", action);
      } else {
        prev.delete("setupAction");
      }
      return prev;
    });
  };
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BanquetEvent | null>(null);

  const [newEvent, setNewEvent] = useState({
    event_name: "",
    event_type: "corporate",
    client_name: "",
    client_phone: "",
    client_email: "",
    event_date: new Date().toISOString().slice(0, 10),
    start_time: "10:00",
    end_time: "14:00",
    venue: "",
    guest_count: 50,
    menu_package: "",
    special_requests: "",
    total_amount: 0,
    deposit_amount: 0,
  });

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["banquet-events"],
    queryFn: async () => {
      const { data, error } = await db
        .from("banquet_events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) {
        console.error("Error fetching banquet events:", error);
        return [];
      }

      return data as BanquetEvent[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("banquet-events-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "banquet_events" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["banquet-events"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Create event mutation
  const createEvent = useMutation({
    mutationFn: async (
      event: Omit<BanquetEvent, "id" | "created_at" | "status">
    ) => {
      const { data, error } = await db
        .from("banquet_events")
        .insert({ ...event, status: "inquiry" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banquet-events"] });
      toast.success("Event created successfully");
      setEventDialogOpen(false);
      resetNewEvent();
    },
    onError: () => {
      toast.error("Failed to create event");
    },
  });
 
   // Update event mutation
   const updateEvent = useMutation({
     mutationFn: async ({
       id,
       updates,
     }: {
       id: string;
       updates: Partial<BanquetEvent>;
     }) => {
       const { error } = await db
         .from("banquet_events")
         .update(updates)
         .eq("id", id);
 
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["banquet-events"] });
       toast.success("Event updated successfully");
       setEventDialogOpen(false);
       setEditingEvent(null);
       resetNewEvent();
     },
     onError: () => {
       toast.error("Failed to update event");
     },
   });

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: BanquetEvent["status"];
    }) => {
      const { error } = await db
        .from("banquet_events")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banquet-events"] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  // Reschedule event mutation (for drag-and-drop)
  const rescheduleEvent = useMutation({
    mutationFn: async ({ id, newDate }: { id: string; newDate: string }) => {
      const { error } = await db
        .from("banquet_events")
        .update({ event_date: newDate })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banquet-events"] });
    },
    onError: () => {
      toast.error("Failed to reschedule event");
    },
  });

  const handleEventDrop = async (eventId: string, newDate: string) => {
    await rescheduleEvent.mutateAsync({ id: eventId, newDate });
  };

  const resetNewEvent = () => {
    setNewEvent({
      event_name: "",
      event_type: "corporate",
      client_name: "",
      client_phone: "",
      client_email: "",
      event_date: new Date().toISOString().slice(0, 10),
      start_time: "10:00",
      end_time: "14:00",
      venue: "",
      guest_count: 50,
      menu_package: "",
      special_requests: "",
      total_amount: 0,
      deposit_amount: 0,
    });
     setEditingEvent(null);
  };
 
   const handleEditEvent = (event: BanquetEvent) => {
     setEditingEvent(event);
     setNewEvent({
       event_name: event.event_name,
       event_type: event.event_type,
       client_name: event.client_name,
       client_phone: event.client_phone || "",
       client_email: event.client_email || "",
       event_date: event.event_date,
       start_time: event.start_time,
       end_time: event.end_time,
       venue: event.venue,
       guest_count: event.guest_count,
       menu_package: event.menu_package || "",
       special_requests: event.special_requests || "",
       total_amount: event.total_amount,
       deposit_amount: event.deposit_amount || 0,
     });
     setEventDialogOpen(true);
   };
 
   const getPreviousDue = (clientName: string, currentEventId?: string) => {
     // 1. Banquet specific due
     const banquetDue = events
       .filter(e => e.client_name === clientName && e.id !== currentEventId && e.status !== 'cancelled')
       .reduce((sum, e) => sum + (e.total_amount - (e.deposit_amount || 0)), 0);

     // 2. Cross-module invoice due (Room, POS, etc)
     const invoiceDue = allInvoices
       .filter(inv => {
         const guestName = `${inv.guest?.first_name || ""} ${inv.guest?.last_name || ""}`.trim();
         return (guestName.toLowerCase().includes(clientName.toLowerCase()) ||
                 inv.company_name?.toLowerCase().includes(clientName.toLowerCase())) &&
                inv.status !== 'paid';
       })
       .reduce((sum, inv) => sum + (inv.balance_due || 0), 0);

     return banquetDue + invoiceDue;
   };

   const handleSaveEvent = () => {
     if (!newEvent.event_name || !newEvent.client_name || !newEvent.venue) {
       toast.error("Please fill in event name, client name, and venue");
       return;
     }
 
     if (editingEvent) {
       updateEvent.mutate({
         id: editingEvent.id,
         updates: {
           event_name: newEvent.event_name,
           event_type: newEvent.event_type,
           client_name: newEvent.client_name,
           client_phone: newEvent.client_phone || null,
           client_email: newEvent.client_email || null,
           event_date: newEvent.event_date,
           start_time: newEvent.start_time,
           end_time: newEvent.end_time,
           venue: newEvent.venue,
           guest_count: newEvent.guest_count,
           menu_package: newEvent.menu_package || null,
           special_requests: newEvent.special_requests || null,
           total_amount: newEvent.total_amount,
           deposit_amount: newEvent.deposit_amount || null,
         },
       });
     } else {
       handleCreateEvent();
     }
   };

  const handleCreateEvent = () => {
    if (!newEvent.event_name || !newEvent.client_name || !newEvent.venue) {
      toast.error("Please fill in event name, client name, and venue");
      return;
    }

    createEvent.mutate({
      event_name: newEvent.event_name,
      event_type: newEvent.event_type,
      client_name: newEvent.client_name,
      client_phone: newEvent.client_phone || null,
      client_email: newEvent.client_email || null,
      event_date: newEvent.event_date,
      start_time: newEvent.start_time,
      end_time: newEvent.end_time,
      venue: newEvent.venue,
      guest_count: newEvent.guest_count,
      menu_package: newEvent.menu_package || null,
      special_requests: newEvent.special_requests || null,
      total_amount: newEvent.total_amount,
      deposit_amount: newEvent.deposit_amount || null,
      notes: null,
    });
  };

  // Filter events
  const filteredEvents = events.filter(
    (e) =>
      e.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.client_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Metrics
  const upcomingEvents = events.filter(
    (e) =>
      e.status !== "completed" &&
      e.status !== "cancelled" &&
      new Date(e.event_date) >= new Date()
  );
  const totalRevenue = events
    .filter((e) => e.status === "completed")
    .reduce((sum, e) => sum + e.total_amount, 0);
  const pendingDeposits = events
    .filter((e) => e.status === "confirmed")
    .reduce((sum, e) => sum + (e.deposit_amount || 0), 0);

  const { data: uiPrefs } = useUIPreferences();
  const { data: allInvoices = [] } = useInvoices();
  const isHorizontalNav = uiPrefs?.navigation_style === "horizontal-subheader";

  return (
    <ErrorBoundary>
    <MainLayout fixedHeight title="Banquet & Events" subtitle="Manage events, bookings, and catering">
      <div className="flex flex-col h-full overflow-hidden">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 sm:px-6">
          <TabsList>
            <TabsTrigger value="events" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Clock className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="catering" className="gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Catering
            </TabsTrigger>
            <TabsTrigger value="venue" className="gap-2">
              <Layout className="h-4 w-4" />
              Venue Setup
            </TabsTrigger>
            <TabsTrigger value="staffing" className="gap-2">
              <UserCheck className="h-4 w-4" />
              Staffing
            </TabsTrigger>
            <TabsTrigger value="plan" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Action Plan
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
          <TabsContent value="events" className="h-full space-y-4 mt-0 focus-visible:outline-none p-4 sm:p-6 overflow-y-auto scrollbar-hide">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={() => setEventDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Event
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground">Loading events...</div>
                ) : filteredEvents.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No events found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Venue</TableHead>
                        <TableHead>Guests</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Quick Setup</TableHead>
                        <TableHead></TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-primary"
                              onClick={() => handleEditEvent(event)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{event.event_name}</p>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  eventTypeColors[event.event_type] || eventTypeColors.other
                                }`}
                              >
                                {event.event_type}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{event.client_name}</p>
                              {event.client_phone && (
                                <p className="text-xs text-muted-foreground">
                                  {event.client_phone}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3 text-muted-foreground" />
                              <span>{event.event_date}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {event.start_time} - {event.end_time}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                              {event.venue}
                            </div>
                          </TableCell>
                          <TableCell>{event.guest_count}</TableCell>
                          <TableCell className="font-mono">
                            {formatCurrency(event.total_amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[event.status]}>
                              {event.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {!event.menu_package && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-7 text-[10px] px-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                                  onClick={() => handleTabChange("catering", event.id, "add_catering")}
                                >
                                  + Catering
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-[10px] px-2 border-blue-500/50 text-blue-600 hover:bg-blue-500/10"
                                onClick={() => handleTabChange("venue", event.id, "setup_venue")}
                              >
                                + Layout
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-[10px] px-2 border-success/50 text-success hover:bg-success/10"
                                onClick={() => handleTabChange("staffing", event.id, "assign_staff")}
                              >
                                + Staff
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-[10px] px-2 border-purple-500/50 text-purple-600 hover:bg-purple-500/10"
                                onClick={() => handleTabChange("plan", event.id, "view_plan")}
                              >
                                + Plan
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                            <Select
                              value={event.status}
                              onValueChange={(v: BanquetEvent["status"]) =>
                                updateStatus.mutate({ id: event.id, status: v })
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="inquiry">Inquiry</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                            {event.status === 'confirmed' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                    <Receipt className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuLabel>Billing Operations</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => {
                                      const guestFolio = folios?.find(f =>
                                        `${f.guests?.first_name} ${f.guests?.last_name}`.toLowerCase() === event.client_name.toLowerCase() &&
                                        f.status === 'open'
                                      );
                                      if (guestFolio) {
                                        postToFolio.mutate({
                                          eventId: event.id,
                                          folioId: guestFolio.id,
                                          amount: event.total_amount,
                                          description: `Banquet Event: ${event.event_name}`
                                        });
                                      } else {
                                        toast.error("No active guest folio found for this client");
                                      }
                                    }}
                                  >
                                    <Plus className="h-4 w-4" /> Post to In-house Folio
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                            </div>
                          </TableCell>
                           <TableCell>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => handleEditEvent(event)}
                             >
                               Edit
                             </Button>
                           </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="h-full mt-0 focus-visible:outline-none p-4 sm:p-6 overflow-y-auto scrollbar-hide">
            <EventReportsPanel
              events={events.map(e => ({
                id: e.id,
                event_name: e.event_name,
                event_type: e.event_type,
                client_name: e.client_name,
                event_date: e.event_date,
                venue: e.venue,
                guest_count: e.guest_count,
                status: e.status,
                total_amount: e.total_amount,
              }))}
            />
          </TabsContent>

          {/* Calendar, Catering, and Venue also need to be wrapped in the scrollable div but they are usually full-height panels */}
          <TabsContent value="calendar" className="mt-0 focus-visible:outline-none h-full p-0">
            <DraggableBanquetCalendar
              events={events.map(e => ({
                id: e.id,
                event_name: e.event_name,
                event_type: e.event_type,
                client_name: e.client_name,
                event_date: e.event_date,
                start_time: e.start_time,
                end_time: e.end_time,
                venue: e.venue,
                guest_count: e.guest_count,
                status: e.status,
                total_amount: e.total_amount,
              }))}
              onEventClick={(event) => {
                toast.info(`Selected: ${event.event_name}`);
              }}
              onDateClick={(date) => {
                setNewEvent(prev => ({ ...prev, event_date: date }));
                setEventDialogOpen(true);
              }}
              onEventDrop={handleEventDrop}
            />
          </TabsContent>

          <TabsContent value="catering" className="h-full mt-0 focus-visible:outline-none p-4 sm:p-6 overflow-y-auto scrollbar-hide">
            <CateringManagementPanel
              events={events.map(e => ({
                id: e.id,
                event_name: e.event_name,
                event_type: e.event_type,
                client_name: e.client_name,
                event_date: e.event_date,
                venue: e.venue,
                guest_count: e.guest_count || 0,
                status: (e.status || "inquiry") as any,
                menu_package: e.menu_package,
                special_requests: e.special_requests,
              }))}
            />
          </TabsContent>

          <TabsContent value="venue" className="h-full mt-0 focus-visible:outline-none p-4 sm:p-6 overflow-y-auto scrollbar-hide">
            <VenueSetupPanel
              events={events.map(e => ({
                id: e.id,
                event_name: e.event_name,
                event_type: e.event_type,
                client_name: e.client_name,
                event_date: e.event_date,
                venue: e.venue,
                guest_count: e.guest_count,
                status: e.status,
              }))}
            />
          </TabsContent>

          <TabsContent value="staffing" className="h-full mt-0 focus-visible:outline-none p-4 sm:p-6 overflow-y-auto scrollbar-hide">
            <StaffAssignmentPanel
              events={events.map(e => ({
                id: e.id,
                event_name: e.event_name,
                client_name: e.client_name,
                event_date: e.event_date,
              }))}
            />
          </TabsContent>

          <TabsContent value="plan" className="h-full mt-0 focus-visible:outline-none p-4 sm:p-6 overflow-y-auto scrollbar-hide">
            <EventActionPlanPanel
              events={events.map(e => ({
                id: e.id,
                event_name: e.event_name,
                client_name: e.client_name,
                event_date: e.event_date,
              }))}
            />
          </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* New Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
             <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
             <DialogDescription>
               {editingEvent ? "Update the event details" : "Enter the details for the banquet event"}
             </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Name *</Label>
                <Input
                  placeholder="Annual Corporate Dinner"
                  value={newEvent.event_name}
                  onChange={(e) => setNewEvent((p) => ({ ...p, event_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select
                  value={newEvent.event_type}
                  onValueChange={(v) => setNewEvent((p) => ({ ...p, event_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="corporate">Corporate</SelectItem>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Input
                  placeholder="John Smith"
                  value={newEvent.client_name}
                  onChange={(e) => setNewEvent((p) => ({ ...p, client_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="+1 234 567 8900"
                  value={newEvent.client_phone}
                  onChange={(e) => setNewEvent((p) => ({ ...p, client_phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={newEvent.client_email}
                  onChange={(e) => setNewEvent((p) => ({ ...p, client_email: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Event Date *</Label>
                <Input
                  type="date"
                  value={newEvent.event_date}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setNewEvent((p) => ({ ...p, event_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newEvent.start_time}
                  onChange={(e) => setNewEvent((p) => ({ ...p, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newEvent.end_time}
                  onChange={(e) => setNewEvent((p) => ({ ...p, end_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Guests</Label>
                <Input
                  type="number"
                  value={newEvent.guest_count}
                  onChange={(e) =>
                    setNewEvent((p) => ({ ...p, guest_count: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Venue *</Label>
                <Input
                  placeholder="Grand Ballroom"
                  value={newEvent.venue}
                  onChange={(e) => setNewEvent((p) => ({ ...p, venue: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Menu Package</Label>
                <Input
                  placeholder="Premium Buffet"
                  value={newEvent.menu_package}
                  onChange={(e) => setNewEvent((p) => ({ ...p, menu_package: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Total Amount ($)</Label>
                <Input
                  type="number"
                  value={newEvent.total_amount}
                  onChange={(e) =>
                    setNewEvent((p) => ({ ...p, total_amount: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Deposit Amount ($)</Label>
                <Input
                  type="number"
                  value={newEvent.deposit_amount}
                  onChange={(e) =>
                    setNewEvent((p) => ({
                      ...p,
                      deposit_amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-destructive">Previous Due ($)</Label>
                <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/50 font-mono font-bold text-destructive">
                   {formatCurrency(getPreviousDue(newEvent.client_name, editingEvent?.id))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Special Requests</Label>
              <Textarea
                placeholder="Any special requirements..."
                value={newEvent.special_requests}
                onChange={(e) => setNewEvent((p) => ({ ...p, special_requests: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2">
               <Button variant="outline" onClick={() => {
                 setEventDialogOpen(false);
                 resetNewEvent();
               }}>
                Cancel
              </Button>
               <Button onClick={handleSaveEvent} disabled={createEvent.isPending || updateEvent.isPending}>
                 {createEvent.isPending || updateEvent.isPending
                   ? (editingEvent ? "Updating..." : "Creating...")
                   : (editingEvent ? "Update Event" : "Create Event")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
    </ErrorBoundary>
  );
}
