import { useState, useMemo } from "react";
import { useInvoices } from "@/hooks/useBillingData";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, Wifi, Tv, Coffee, Bath, Grid, List, Bed, Receipt, Search, Filter, Download, FileText, MessageSquare, DollarSign, TrendingUp, CreditCard, Loader2, Eye, Printer, RotateCcw, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatCurrency } from "@/lib/utils";
import { useRooms } from "@/hooks/useRooms";
import { useUIPreferences } from "@/hooks/useSettings";
import { GuestFolioManager } from "@/components/front-desk/GuestFolioManager";
import { InHouseGuestManager } from "@/components/front-desk/InHouseGuestManager";
import { DataTable, Column } from "@/components/ui/data-table";
import { TableSkeleton } from "@/components/skeletons";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Tables } from "@/integrations/supabase/types";
import { RoomActionsPanel } from "@/components/rooms/RoomActionsPanel";
import { useQuickActions } from "@/contexts/QuickActionsContext";
import { FrontDeskReportsTab } from "@/components/front-desk/FrontDeskReportsTab";
import { FrontDeskSetup } from "@/components/front-desk/FrontDeskSetup";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { exportToExcel } from "@/lib/reportExport";
import { formatAD } from "@/lib/utils";
import { FrontDeskProvider, useFrontDeskContext } from "@/contexts/FrontDeskContext";

type Room = Tables<"rooms">;

const statusStyles = {
  available: "bg-success/20 text-success border-success/30",
  occupied: "bg-primary/20 text-primary border-primary/30",
  cleaning: "bg-warning/20 text-warning border-warning/30",
  maintenance: "bg-destructive/20 text-destructive border-destructive/30",
};

const amenityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  wifi: Wifi, tv: Tv, minibar: Coffee, jacuzzi: Bath,
};

import React from "react";

const invoiceStatusColors = {
  paid: "bg-success/20 text-success border-success/30",
  pending: "bg-warning/20 text-warning border-warning/30",
  partial: "bg-primary/20 text-primary border-primary/30",
  overdue: "bg-destructive/20 text-destructive border-destructive/30",
};

const RoomCard = React.memo(({ room, isSelected, onClick }: { room: Room, isSelected: boolean, onClick: (room: Room) => void }) => (
  <Card
    variant="elevated"
    className={cn(
      "animate-slide-up overflow-hidden hover:shadow-glow transition-all cursor-pointer group",
      isSelected && "ring-2 ring-primary"
    )}
    onClick={() => onClick(room)}
  >
    <div className="h-32 bg-gradient-card flex items-center justify-center relative">
      <span className="text-5xl font-display font-bold text-gradient-blue">{room.room_number}</span>
      <Badge variant="outline" className={cn("absolute top-3 right-3", statusStyles[room.status as keyof typeof statusStyles] || statusStyles.available)}>{room.status}</Badge>
    </div>
    <CardContent className="p-4">
      <div className="mb-3"><h3 className="font-semibold text-foreground">{room.room_type}</h3><p className="text-sm text-muted-foreground">Floor {room.floor}</p></div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-4 w-4" /><span>Up to {room.capacity}</span></div>
        <div className="text-right"><span className="text-xl font-bold text-primary">{formatCurrency(room.price_per_night)}</span><span className="text-xs text-muted-foreground">/night</span></div>
      </div>
      <div className="flex gap-2 pt-3 border-t border-border">
        {(room.amenities || []).map((amenity) => { const Icon = amenityIcons[amenity.toLowerCase()]; return Icon ? <div key={amenity} className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center" title={amenity}><Icon className="h-4 w-4 text-muted-foreground" /></div> : null; })}
      </div>
    </CardContent>
  </Card>
));

const FrontDeskInner = () => {
  const { data: rooms = [], isLoading } = useRooms();
  const { data: invoices = [] } = useInvoices();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "inhouse";
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const { refreshAll, notification } = useFrontDeskContext();

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      if (value !== "folios") {
        prev.delete("folioId");
        prev.delete("guestId");
        prev.delete("reservationId");
      }
      return prev;
    });
  };
  const [roomStatusFilter, setRoomStatusFilter] = useState("all");
  const [billingSearch, setBillingSearch] = useState("");
  const [billingStatusFilter, setBillingStatusFilter] = useState("all");
  const { setNewRoomOpen } = useQuickActions();
  const { data: uiPrefs } = useUIPreferences();
  const isHorizontalNav = uiPrefs?.navigation_style === "horizontal-subheader";

  const filteredRooms = useMemo(() => {
    if (roomStatusFilter === "all") return rooms;
    return rooms.filter((r) => r.status === roomStatusFilter);
  }, [rooms, roomStatusFilter]);

  const filteredInvoices = useMemo(() => {
    let result = invoices as any[];
    if (billingStatusFilter !== "all") {
      result = result.filter((i: any) => i.status === billingStatusFilter);
    }
    if (billingSearch) {
      const s = billingSearch.toLowerCase();
      result = result.filter((i: any) =>
        i.invoice_number?.toLowerCase().includes(s) ||
        `${i.guest?.first_name || ""} ${i.guest?.last_name || ""}`.toLowerCase().includes(s)
      );
    }
    return result;
  }, [invoices, billingSearch, billingStatusFilter]);

  const stats = useMemo(() => ({
    available: rooms.filter((r) => r.status === "available").length,
    occupied: rooms.filter((r) => r.status === "occupied").length,
    cleaning: rooms.filter((r) => r.status === "cleaning").length,
    maintenance: rooms.filter((r) => r.status === "maintenance").length,
  }), [rooms]);

  const handleExportInvoices = () => {
    exportToExcel({
      title: "Invoices_Report",
      headers: ["Invoice #", "Guest", "Date", "Total", "Paid", "Balance", "Status"],
      rows: filteredInvoices.map((i: any) => [
        i.invoice_number, i.guest ? `${i.guest.first_name} ${i.guest.last_name}` : "—",
        i.invoice_date, i.total || 0, i.amount_paid || 0, i.balance_due || 0, i.status,
      ]),
    });
  };

  const columns: Column<Room>[] = [
    { key: "room_number", header: "Room", render: (room) => <span className="font-mono font-bold text-primary">{room.room_number}</span> },
    { key: "room_type", header: "Type", render: (room) => <span>{room.room_type}</span> },
    { key: "floor", header: "Floor", render: (room) => <span>Floor {room.floor}</span> },
    { key: "capacity", header: "Capacity", render: (room) => <div className="flex items-center gap-1"><Users className="h-4 w-4 text-muted-foreground" /><span>{room.capacity}</span></div> },
    { key: "price_per_night", header: "Price/Night", render: (room) => <span className="font-semibold text-primary">{formatCurrency(room.price_per_night)}</span> },
    { key: "status", header: "Status", render: (room) => <Badge variant="outline" className={statusStyles[room.status as keyof typeof statusStyles] || statusStyles.available}>{room.status}</Badge> },
    { key: "amenities", header: "Amenities", sortable: false, searchable: false, render: (room) => (
      <div className="flex gap-1">
        {(room.amenities || []).slice(0, 4).map((amenity) => { const Icon = amenityIcons[amenity.toLowerCase()]; return Icon ? <div key={amenity} className="h-6 w-6 rounded bg-secondary flex items-center justify-center" title={amenity}><Icon className="h-3 w-3 text-muted-foreground" /></div> : null; })}
      </div>
    )},
  ];

  return (
    <MainLayout fixedHeight title="Front Desk" subtitle="Manage room inventory, check-ins, and billing">
      {notification && (
        <div className={cn(
          "fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg animate-fade-in",
          notification.type === "success" && "bg-emerald-500 text-white",
          notification.type === "error" && "bg-red-500 text-white",
          notification.type === "info" && "bg-blue-500 text-white"
        )}>
          {notification.message}
        </div>
      )}
      <ErrorBoundary>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col h-full overflow-hidden space-y-6">
          <div className="px-4 sm:px-6 py-2 bg-secondary/20 border-b border-border/50 flex items-center justify-between">
          <TabsList className="bg-transparent border-none p-0 gap-1">
            <TabsTrigger value="inhouse" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Users className="h-4 w-4" />In-house</TabsTrigger>
            <TabsTrigger value="folios" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><FileText className="h-4 w-4" />Guest Folios</TabsTrigger>
            <TabsTrigger value="billing" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Receipt className="h-4 w-4" />Billing</TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><TrendingUp className="h-4 w-4" />Reports</TabsTrigger>
            <TabsTrigger value="setup" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Settings className="h-4 w-4" />Setup</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={refreshAll} className="gap-2 ml-4">
            <RotateCcw className="h-4 w-4" />Refresh All
          </Button>
          </div>

          <div className="p-4 sm:p-6 h-full overflow-y-auto scrollbar-hide">
          <TabsContent value="inhouse"><InHouseGuestManager /></TabsContent>
          <TabsContent value="folios"><GuestFolioManager /></TabsContent>
          <TabsContent value="reports" className="mt-0 focus-visible:outline-none"><FrontDeskReportsTab /></TabsContent>
          <TabsContent value="setup" className="mt-0 focus-visible:outline-none h-full"><FrontDeskSetup /></TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="mt-0 focus-visible:outline-none">
            <div className="space-y-6">
              {(() => {
                const totalRevenue = invoices.reduce((s: number, i: any) => s + (i.total || 0), 0);
                const pendingInvoices = invoices.filter((i: any) => i.status === "pending" || i.status === "partial");
                const pendingAmount = pendingInvoices.reduce((s: number, i: any) => s + (i.balance_due || 0), 0);
                const paidCount = invoices.filter((i: any) => i.status === "paid").length;
                const successRate = invoices.length > 0 ? ((paidCount / invoices.length) * 100).toFixed(1) : "0";
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <MetricCard title="Total Invoiced" value={formatCurrency(totalRevenue)} change={`${invoices.length} invoices`} changeType="neutral" icon={DollarSign} delay={0} />
                    <MetricCard title="Pending Payments" value={formatCurrency(pendingAmount)} change={`${pendingInvoices.length} invoices`} changeType="neutral" icon={Receipt} delay={50} />
                    <MetricCard title="Paid Invoices" value={`${paidCount}`} change={`of ${invoices.length} total`} changeType="positive" icon={TrendingUp} delay={100} />
                    <MetricCard title="Payment Success Rate" value={`${successRate}%`} change="based on paid/total" changeType="positive" icon={CreditCard} delay={150} />
                  </div>
                );
              })()}

              <Card variant="elevated" className="animate-fade-in overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <CardTitle>Recent Invoices ({filteredInvoices.length})</CardTitle>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Search invoices..." className="w-full sm:w-48 lg:w-64 pl-9 bg-secondary" value={billingSearch} onChange={(e) => setBillingSearch(e.target.value)} />
                    </div>
                    <Select value={billingStatusFilter} onValueChange={setBillingStatusFilter}>
                      <SelectTrigger className="w-[120px] bg-secondary">
                        <Filter className="h-4 w-4 mr-2" /><SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleExportInvoices}>
                      <Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border hover:bg-transparent">
                          <TableHead className="whitespace-nowrap">Invoice ID</TableHead>
                          <TableHead className="whitespace-nowrap">Guest</TableHead>
                          <TableHead className="whitespace-nowrap hidden md:table-cell">Reservation</TableHead>
                          <TableHead className="whitespace-nowrap hidden lg:table-cell">Date</TableHead>
                          <TableHead className="whitespace-nowrap">Amount</TableHead>
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No invoices found.</TableCell></TableRow>
                        ) : filteredInvoices.map((invoice: any) => (
                          <TableRow key={invoice.id} className="border-border hover:bg-secondary/50 cursor-pointer" onClick={() => setPreviewInvoice(invoice)}>
                            <TableCell className="font-mono text-sm text-primary whitespace-nowrap">{invoice.invoice_number}</TableCell>
                            <TableCell className="font-medium whitespace-nowrap">{invoice.guest ? `${invoice.guest.first_name} ${invoice.guest.last_name}` : "—"}</TableCell>
                            <TableCell className="text-muted-foreground hidden md:table-cell">{invoice.reservation?.reservation_code || "—"}</TableCell>
                            <TableCell className="hidden lg:table-cell">{invoice.invoice_date}</TableCell>
                            <TableCell className="font-semibold whitespace-nowrap">{formatCurrency(invoice.total || 0)}</TableCell>
                            <TableCell><Badge variant="outline" className={invoiceStatusColors[invoice.status as keyof typeof invoiceStatusColors] || ""}>{invoice.status}</Badge></TableCell>
                            <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setPreviewInvoice(invoice); }}><Eye className="h-4 w-4" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Invoice Preview Dialog */}
            <Dialog open={!!previewInvoice} onOpenChange={() => setPreviewInvoice(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><Receipt className="h-5 w-5" />Invoice Preview</span>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Button>
                  </DialogTitle>
                </DialogHeader>
                {previewInvoice && (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start p-4 bg-muted/30 rounded-xl border">
                      <div>
                        <p className="text-2xl font-black text-primary font-mono">{previewInvoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">Date: {previewInvoice.invoice_date}</p>
                      </div>
                      <Badge variant="outline" className={cn("h-8 px-4 text-sm font-bold", invoiceStatusColors[previewInvoice.status as keyof typeof invoiceStatusColors] || "")}>{previewInvoice.status}</Badge>
                    </div>

                    {/* Guest & Room */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg bg-secondary/30 border space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Guest</p>
                        <p className="font-bold text-lg">{previewInvoice.guest ? `${previewInvoice.guest.first_name} ${previewInvoice.guest.last_name}` : "Walk-in"}</p>
                        <p className="text-xs text-muted-foreground">{previewInvoice.guest?.email || ""}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-secondary/30 border space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Reservation</p>
                        <p className="font-bold text-lg font-mono">{previewInvoice.reservation?.reservation_code || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">Room {previewInvoice.reservation?.rooms?.room_number || "—"}</p>
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="font-medium">Room Charges (Subtotal)</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(previewInvoice.subtotal || previewInvoice.total || 0)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Tax (13% VAT)</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(previewInvoice.tax || (previewInvoice.total || 0) * 0.13)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-medium">Service Charge (10%)</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(previewInvoice.service_charge || (previewInvoice.total || 0) * 0.10)}</TableCell>
                          </TableRow>
                          <TableRow className="bg-primary/5">
                            <TableCell className="font-black text-lg">Total</TableCell>
                            <TableCell className="text-right font-black text-lg text-primary font-mono">{formatCurrency(previewInvoice.total || 0)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    {/* Payment Info */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Paid</p>
                        <p className="text-xl font-black text-emerald-600">{formatCurrency(previewInvoice.amount_paid || 0)}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-[10px] font-bold text-red-600 uppercase">Balance Due</p>
                        <p className="text-xl font-black text-red-600">{formatCurrency(previewInvoice.balance_due || 0)}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-[10px] font-bold text-blue-600 uppercase">Payment Method</p>
                        <p className="text-xl font-black text-blue-600 capitalize">{previewInvoice.payment_method || "Pending"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
          </div>
        </Tabs>
      </ErrorBoundary>
    </MainLayout>
  );
};

const FrontDeskWithProvider = () => (
  <FrontDeskProvider>
    <FrontDeskInner />
  </FrontDeskProvider>
);

export default FrontDeskWithProvider;
