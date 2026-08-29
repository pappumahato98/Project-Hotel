import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatAD, formatCurrency } from "@/lib/utils";
import { exportToPDF, exportToExcel } from "@/lib/reportExport";
import { Download, FileText, Bed, TrendingUp, CalendarDays, ArrowRightLeft, BarChart3, Filter, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { MetricCard } from "@/components/dashboard/MetricCard";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))", "#8B5CF6", "#EC4899", "#06B6D4"];

export const ReservationChangesTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  const { data: changes = [], isLoading } = useQuery({
    queryKey: ["reservation-changes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservation_changes")
        .select(`
          id,
          old_room_id,
          new_room_id,
          old_check_in,
          new_check_in,
          old_check_out,
          new_check_out,
          reason,
          changed_by,
          created_at,
          reservation:reservations(id, reservation_code, guest:guests(first_name, last_name)),
          old_room:rooms!reservation_changes_old_room_id_fkey(room_number, room_type),
          new_room:rooms!reservation_changes_new_room_id_fkey(room_number, room_type),
          user:profiles!reservation_changes_changed_by_fkey(first_name, last_name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: roomOptions = [] } = useQuery({
    queryKey: ["rooms-for-change-filter"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id, room_number, room_type").order("room_number");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: reasonOptions = [] } = useQuery({
    queryKey: ["change-reason-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reservation_change_reasons").select("label").order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const total = changes.length;
    const byReason: Record<string, number> = {};
    const byRoomType: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    let thisMonth = 0;
    const thisMonthStr = format(new Date(), "yyyy-MM");

    changes.forEach((c: any) => {
      const reason = c.reason || "Unknown";
      byReason[reason] = (byReason[reason] || 0) + 1;

      const roomType = c.new_room?.room_type || "Unknown";
      byRoomType[roomType] = (byRoomType[roomType] || 0) + 1;

      const month = format(parseISO(c.created_at), "MMM yyyy");
      byMonth[month] = (byMonth[month] || 0) + 1;

      if ((c.created_at || "").startsWith(thisMonthStr)) thisMonth++;
    });

    return {
      total,
      thisMonth,
      byReason,
      byRoomType,
      byMonth,
      topReason: Object.entries(byReason).sort(([, a], [, b]) => b - a)[0]?.[0] || "—",
    };
  }, [changes]);

  const filteredChanges = useMemo(() => {
    let result = changes;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c: any) =>
        c.reservation?.reservation_code?.toLowerCase().includes(q) ||
        c.reservation?.guest?.first_name?.toLowerCase().includes(q) ||
        c.reservation?.guest?.last_name?.toLowerCase().includes(q) ||
        c.reason?.toLowerCase().includes(q) ||
        c.new_room?.room_number?.toLowerCase().includes(q) ||
        c.old_room?.room_number?.toLowerCase().includes(q)
      );
    }

    if (reasonFilter !== "all") {
      result = result.filter((c: any) => c.reason === reasonFilter);
    }

    if (roomFilter !== "all") {
      result = result.filter((c: any) => c.new_room_id === roomFilter || c.old_room_id === roomFilter);
    }

    if (dateRange !== "all") {
      const now = new Date();
      let cutoff: Date;
      switch (dateRange) {
        case "7d": cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case "30d": cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case "90d": cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
        default: cutoff = new Date(0);
      }
      result = result.filter((c: any) => new Date(c.created_at) >= cutoff);
    }

    return result;
  }, [changes, searchQuery, reasonFilter, roomFilter, dateRange]);

  const reasonChartData = Object.entries(stats.byReason)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const roomTypeChartData = Object.entries(stats.byRoomType)
    .map(([name, value]) => ({ name, value }));

  const monthlyChartData = Object.entries(stats.byMonth)
    .map(([month, count]) => ({ month, moves: count }))
    .reverse()
    .slice(-6);

  const handleExportPDF = () => {
    exportToPDF({
      title: "Reservation Changes Report",
      headers: ["Date", "Reservation", "Guest", "From Room", "To Room", "Dates", "Reason", "By"],
      rows: filteredChanges.map((c: any) => [
        format(parseISO(c.created_at), "MMM d, yyyy HH:mm"),
        c.reservation?.reservation_code || "—",
        c.reservation?.guest ? `${c.reservation.guest.first_name} ${c.reservation.guest.last_name}` : "—",
        c.old_room?.room_number || "—",
        c.new_room?.room_number || "—",
        c.new_check_in && c.new_check_out ? `${formatAD(parseISO(c.new_check_in))} - ${formatAD(parseISO(c.new_check_out))}` : "—",
        c.reason || "—",
        c.user ? `${c.user.first_name} ${c.user.last_name}` : "—",
      ]),
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: "Reservation_Changes",
      headers: ["Date", "Reservation", "Guest", "From Room", "To Room", "New Check-in", "New Check-out", "Reason", "By"],
      rows: filteredChanges.map((c: any) => [
        format(parseISO(c.created_at), "yyyy-MM-dd HH:mm"),
        c.reservation?.reservation_code || "—",
        c.reservation?.guest ? `${c.reservation.guest.first_name} ${c.reservation.guest.last_name}` : "—",
        c.old_room?.room_number || "—",
        c.new_room?.room_number || "—",
        c.new_check_in || "—",
        c.new_check_out || "—",
        c.reason || "—",
        c.user ? `${c.user.first_name} ${c.user.last_name}` : "—",
      ]),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Reservation Changes & Moves</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
            <Download className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Moves" value={String(stats.total)} change="All time" changeType="neutral" icon={ArrowRightLeft} delay={0} />
        <MetricCard title="This Month" value={String(stats.thisMonth)} change={dateRange === "all" ? "All time" : "Filtered"} changeType="neutral" icon={CalendarDays} delay={50} />
        <MetricCard title="Top Reason" value={stats.topReason} change="Most frequent" changeType="neutral" icon={TrendingUp} delay={100} />
        <MetricCard title="Unique Rooms" value={String(new Set(changes.map((c: any) => c.new_room_id).filter(Boolean)).size)} change="Affected" changeType="neutral" icon={Bed} delay={150} />
      </div>

      <Tabs defaultValue="log" className="space-y-4">
        <TabsList>
          <TabsTrigger value="log"><BarChart3 className="h-4 w-4 mr-1.5" />Change Log</TabsTrigger>
          <TabsTrigger value="analytics"><TrendingUp className="h-4 w-4 mr-1.5" />Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search reservation, guest, room..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="All reasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reasons</SelectItem>
                {reasonOptions.map((r: any) => (
                  <SelectItem key={r.label} value={r.label}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roomFilter} onValueChange={setRoomFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All rooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rooms</SelectItem>
                {roomOptions.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.room_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || reasonFilter !== "all" || roomFilter !== "all" || dateRange !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearchQuery(""); setReasonFilter("all"); setRoomFilter("all"); setDateRange("all"); }}
              >
                <Filter className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}

            <div className="ml-auto text-sm text-muted-foreground">
              {filteredChanges.length} record{filteredChanges.length !== 1 ? "s" : ""}
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reservation</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>New Dates</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Changed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredChanges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        {isLoading ? "Loading..." : "No reservation changes found"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredChanges.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(parseISO(c.created_at), "MMM d, yyyy")}<br />
                          <span className="text-muted-foreground">{format(parseISO(c.created_at), "HH:mm")}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm font-medium">{c.reservation?.reservation_code || "—"}</span>
                        </TableCell>
                        <TableCell>
                          {c.reservation?.guest ? (
                            <span>{c.reservation.guest.first_name} {c.reservation.guest.last_name}</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">{c.old_room?.room_number || "—"}</Badge>
                            <span className="text-xs text-muted-foreground capitalize">{c.old_room?.room_type || ""}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">{c.new_room?.room_number || "—"}</Badge>
                            <span className="text-xs text-muted-foreground capitalize">{c.new_room?.room_type || ""}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {c.new_check_in && c.new_check_out ? (
                            <>
                              {formatAD(parseISO(c.new_check_in))}
                              <ArrowRight className="inline h-3 w-3 mx-1" />
                              {formatAD(parseISO(c.new_check_out))}
                            </>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{c.reason || "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.user ? `${c.user.first_name} ${c.user.last_name}` : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Moves by Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {reasonChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reasonChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis type="number" className="text-xs fill-muted-foreground" />
                        <YAxis dataKey="name" type="category" width={140} className="text-xs fill-muted-foreground" />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Moves by Room Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {roomTypeChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={roomTypeChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {roomTypeChartData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Moves Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {monthlyChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                      <YAxis className="text-xs fill-muted-foreground" />
                      <Tooltip />
                      <Bar dataKey="moves" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

function ArrowRight(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
}