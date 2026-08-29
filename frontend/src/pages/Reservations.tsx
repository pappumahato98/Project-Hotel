import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Plus, MoreVertical, LogIn, LogOut, CalendarDays, List, UserPlus, Receipt, Edit, XCircle, AlertTriangle, Download, CreditCard, ArrowRightLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatAD, formatCurrency } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import { NewReservationDialog } from "@/components/reservations/NewReservationDialog";
import { CheckInOutDialog } from "@/components/reservations/CheckInOutDialog";
import { EditReservationDialog } from "@/components/reservations/EditReservationDialog";
import { ReservationDetailPanel } from "@/components/reservations/ReservationDetailPanel";
import { ReservationCalendar } from "@/components/reservations/ReservationCalendar";
import { useReservations, Reservation } from "@/hooks/useReservations";
import { useRealtimeReservations } from "@/hooks/useRealtimeReservations";
import { TableSkeleton } from "@/components/skeletons";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { exportToExcel, exportToPDF } from "@/lib/reportExport";
import { ReservationReportsTab } from "@/components/reservations/ReservationReportsTab";
import { ReservationChangesTab } from "@/components/reservations/ReservationChangesTab";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusColors: Record<string, string> = {
  confirmed: "bg-success/20 text-success border-success/30",
  pending: "bg-warning/20 text-warning border-warning/30",
  "checked-in": "bg-primary/20 text-primary border-primary/30",
  "checked-out": "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/20 text-destructive border-destructive/30",
  "no-show": "bg-destructive/20 text-destructive border-destructive/30",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-warning/20 text-warning border-warning/30",
  partial: "bg-primary/20 text-primary border-primary/30",
  paid: "bg-success/20 text-success border-success/30",
  refunded: "bg-muted text-muted-foreground border-border",
};

const allStatuses = ["all", "pending", "confirmed", "checked-in", "checked-out", "cancelled", "no-show"];

const Reservations = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "list";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
  };
  const [walkInDialogOpen, setWalkInDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [noShowConfirmId, setNoShowConfirmId] = useState<string | null>(null);
  const [checkInOutDialog, setCheckInOutDialog] = useState<{
    open: boolean;
    mode: "check-in" | "check-out";
    reservationId: string;
  }>({ open: false, mode: "check-in", reservationId: "" });

  const { reservations, isLoading, refetch, filterReservations, cancelReservation, markNoShow } = useReservations();
  const searchFiltered = filterReservations(searchQuery);
  const filteredReservations = useMemo(() => {
    if (statusFilter === "all") return searchFiltered;
    return searchFiltered.filter((r) => r.status === statusFilter);
  }, [searchFiltered, statusFilter]);

  useRealtimeReservations({
    onInsert: refetch,
    onUpdate: refetch,
    onDelete: refetch,
  });

  const handleExportExcel = () => {
    exportToExcel({
      title: "Reservations_Report",
      headers: ["Code", "Guest", "Room", "Check In", "Check Out", "Status", "Payment", "Total"],
      rows: filteredReservations.map((r) => [
        r.reservation_code,
        r.guest ? `${r.guest.first_name} ${r.guest.last_name}` : "Unknown",
        r.room?.room_number || "N/A",
        r.check_in_date,
        r.check_out_date,
        r.status,
        r.payment_status || "pending",
        r.total_amount,
      ]),
    });
  };

  const handleExportPDF = () => {
    exportToPDF({
      title: "Reservations Report",
      headers: ["Code", "Guest", "Room", "Check In", "Check Out", "Status", "Total"],
      rows: filteredReservations.map((r) => [
        r.reservation_code,
        r.guest ? `${r.guest.first_name} ${r.guest.last_name}` : "Unknown",
        r.room?.room_number || "N/A",
        r.check_in_date,
        r.check_out_date,
        r.status,
        r.total_amount,
      ]),
    });
  };

  return (
    <MainLayout fixedHeight title="Reservations" subtitle="Manage all bookings and reservations">
      <ErrorBoundary>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full overflow-hidden space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6">
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                List View
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <Receipt className="h-4 w-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="moves" className="gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Moves
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleExportExcel}>Export Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>Export PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" onClick={() => setWalkInDialogOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Walk-in
              </Button>
              <Button variant="blue" className="gap-2" onClick={() => setNewDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                New Reservation
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide p-4 sm:p-6">
          <TabsContent value="list" className="mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className={selectedReservation ? "lg:col-span-3" : "lg:col-span-4"}>
                <Card variant="elevated" className="animate-fade-in overflow-hidden">
                  <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <CardTitle>All Reservations ({filteredReservations.length})</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <div className="relative flex-1 sm:flex-initial">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search reservations..."
                          className="w-full sm:w-48 lg:w-64 pl-9 bg-secondary"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px] bg-secondary">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {allStatuses.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 sm:p-6">
                    {isLoading ? (
                      <div className="p-6"><TableSkeleton columns={8} rows={5} /></div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border hover:bg-transparent">
                              <TableHead className="whitespace-nowrap">Reservation ID</TableHead>
                              <TableHead className="whitespace-nowrap">Guest</TableHead>
                              <TableHead className="whitespace-nowrap hidden md:table-cell">Room</TableHead>
                              <TableHead className="whitespace-nowrap hidden lg:table-cell">Check In</TableHead>
                              <TableHead className="whitespace-nowrap hidden lg:table-cell">Check Out</TableHead>
                              <TableHead className="whitespace-nowrap">Status</TableHead>
                              <TableHead className="whitespace-nowrap hidden sm:table-cell">Payment</TableHead>
                              <TableHead className="whitespace-nowrap hidden sm:table-cell">Total</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredReservations.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                  No reservations found
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredReservations.map((reservation) => (
                                <TableRow
                                  key={reservation.id}
                                  className={`border-border hover:bg-secondary/50 cursor-pointer ${selectedReservation?.id === reservation.id ? "bg-primary/5" : ""}`}
                                  onClick={() => setSelectedReservation(reservation)}
                                >
                                  <TableCell className="font-mono text-sm text-primary whitespace-nowrap">
                                    {reservation.reservation_code}
                                  </TableCell>
                                  <TableCell className="font-medium whitespace-nowrap">
                                    {reservation.guest ? `${reservation.guest.first_name} ${reservation.guest.last_name}` : "Unknown"}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground hidden md:table-cell">
                                    {reservation.room ? `${reservation.room.room_number} - ${reservation.room.room_type}` : "N/A"}
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell">
                                    {formatAD(new Date(reservation.check_in_date))}
                                  </TableCell>
                                  <TableCell className="hidden lg:table-cell">
                                    {formatAD(new Date(reservation.check_out_date))}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={statusColors[reservation.status] || statusColors.pending}>
                                      {reservation.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    <Badge variant="outline" className={paymentStatusColors[reservation.payment_status || "pending"] || ""}>
                                      {reservation.payment_status || "pending"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-semibold hidden sm:table-cell">
                                    {formatCurrency(reservation.total_amount)}
                                  </TableCell>
                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedReservation(reservation); setEditDialogOpen(true); }}>
                                          <Edit className="h-4 w-4 mr-2" />Edit
                                        </DropdownMenuItem>
                                        {(reservation.status === "confirmed" || reservation.status === "pending") && (
                                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setCheckInOutDialog({ open: true, mode: "check-in", reservationId: reservation.id }); }}>
                                            <LogIn className="h-4 w-4 mr-2" />Check In
                                          </DropdownMenuItem>
                                        )}
                                        {reservation.status === "checked-in" && (
                                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setCheckInOutDialog({ open: true, mode: "check-out", reservationId: reservation.id }); }}>
                                            <LogOut className="h-4 w-4 mr-2" />Check Out
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/front-desk?reservationId=${reservation.id}`); }}>
                                          <Receipt className="h-4 w-4 mr-2" />View Folio
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        {(reservation.status === "pending" || reservation.status === "confirmed") && (
                                          <>
                                            <DropdownMenuItem className="text-warning" onClick={(e) => { e.stopPropagation(); setNoShowConfirmId(reservation.id); }}>
                                              <AlertTriangle className="h-4 w-4 mr-2" />No-Show
                                            </DropdownMenuItem>
                                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setCancelConfirmId(reservation.id); }}>
                                              <XCircle className="h-4 w-4 mr-2" />Cancel
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {selectedReservation && (
                <div className="lg:col-span-1">
                  <ReservationDetailPanel reservation={selectedReservation} onClose={() => setSelectedReservation(null)} />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="mt-0 focus-visible:outline-none">
            <ReservationCalendar />
          </TabsContent>

          <TabsContent value="reports" className="mt-0 focus-visible:outline-none">
            <ReservationReportsTab />
          </TabsContent>

          <TabsContent value="moves" className="mt-0 focus-visible:outline-none">
            <ReservationChangesTab />
          </TabsContent>
          </div>
        </Tabs>

        <NewReservationDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} onSuccess={refetch} />
        <EditReservationDialog reservation={selectedReservation} open={editDialogOpen} onOpenChange={setEditDialogOpen} />
        <CheckInOutDialog
          open={checkInOutDialog.open}
          onOpenChange={(open) => setCheckInOutDialog({ ...checkInOutDialog, open })}
          mode={checkInOutDialog.mode}
          reservationId={checkInOutDialog.reservationId}
          onSuccess={refetch}
        />
        <CheckInOutDialog
          open={walkInDialogOpen}
          onOpenChange={setWalkInDialogOpen}
          mode="walk-in"
        />

        {/* Cancel Confirmation */}
        <AlertDialog open={!!cancelConfirmId} onOpenChange={() => setCancelConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Reservation?</AlertDialogTitle>
              <AlertDialogDescription>This will cancel the reservation and free up the room. This action cannot be easily undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Reservation</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (cancelConfirmId) cancelReservation.mutate(cancelConfirmId); setCancelConfirmId(null); }}>
                Cancel Reservation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* No-Show Confirmation */}
        <AlertDialog open={!!noShowConfirmId} onOpenChange={() => setNoShowConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mark as No-Show?</AlertDialogTitle>
              <AlertDialogDescription>This will mark the guest as a no-show. The reservation status will be updated accordingly.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Go Back</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (noShowConfirmId) markNoShow.mutate(noShowConfirmId); setNoShowConfirmId(null); }}>
                Mark No-Show
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ErrorBoundary>
    </MainLayout>
  );
};

export default Reservations;
