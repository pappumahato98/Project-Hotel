import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReservations } from "@/hooks/useReservations";
import { useRooms } from "@/hooks/useRooms";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToPDF, exportToExcel } from "@/lib/reportExport";
import { formatCurrency } from "@/lib/utils";
import { Download, FileText, CalendarDays, TrendingUp, XCircle, CreditCard } from "lucide-react";
import { ReservationCashierReport } from "./ReservationCashierReport";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { differenceInDays, parseISO, format } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

export const ReservationReportsTab = () => {
  const { reservations = [] } = useReservations();
  const { data: rooms = [] } = useRooms();

  const { data: guests = [] } = useQuery({
    queryKey: ["reservation-report-guests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("guests").select("id, first_name, last_name");
      if (error) throw error;
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const total = reservations.length;
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byPayment: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    let totalStayDays = 0;
    let totalRevenue = 0;
    let cancelled = 0;

    reservations.forEach((r: any) => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      bySource[r.source || "direct"] = (bySource[r.source || "direct"] || 0) + 1;
      byPayment[r.payment_status || "pending"] = (byPayment[r.payment_status || "pending"] || 0) + 1;

      const month = format(parseISO(r.check_in_date), "MMM yyyy");
      byMonth[month] = (byMonth[month] || 0) + 1;

      totalStayDays += differenceInDays(parseISO(r.check_out_date), parseISO(r.check_in_date));
      totalRevenue += r.total_amount || 0;
      if (r.status === "cancelled") cancelled++;
    });

    const avgStay = total > 0 ? (totalStayDays / total).toFixed(1) : "0";
    const cancelRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : "0";

    return { total, byStatus, bySource, byPayment, byMonth, avgStay, cancelRate, totalRevenue };
  }, [reservations]);

  // No-Show Report
  const noShowReport = useMemo(() => {
    const guestMap = new Map(guests.map((g: any) => [g.id, `${g.first_name} ${g.last_name}`]));
    const roomMap = new Map(rooms.map((r) => [r.id, r.room_number]));
    return reservations
      .filter((r: any) => r.status === "no_show" || (r.status === "cancelled" && !r.actual_check_in))
      .map((r: any) => ({
        code: r.reservation_code,
        guest: guestMap.get(r.guest_id) || "—",
        room: roomMap.get(r.room_id) || "—",
        checkIn: r.check_in_date,
        revenueLost: r.total_amount || 0,
        status: r.status,
      }));
  }, [reservations, guests, rooms]);

  // Source Performance
  const sourcePerformance = useMemo(() => {
    const bySource: Record<string, { count: number; revenue: number; totalNights: number }> = {};
    reservations.forEach((r: any) => {
      const src = r.source || "direct";
      if (!bySource[src]) bySource[src] = { count: 0, revenue: 0, totalNights: 0 };
      bySource[src].count++;
      bySource[src].revenue += r.total_amount || 0;
      bySource[src].totalNights += differenceInDays(parseISO(r.check_out_date), parseISO(r.check_in_date));
    });
    return Object.entries(bySource).map(([source, d]) => ({
      source,
      count: d.count,
      revenue: d.revenue,
      avgStay: d.count > 0 ? (d.totalNights / d.count).toFixed(1) : "0",
      avgRate: d.totalNights > 0 ? Math.round(d.revenue / d.totalNights) : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [reservations]);

  // Room Type Demand
  const roomTypeDemand = useMemo(() => {
    const roomMap = new Map(rooms.map((r) => [r.id, r.room_type]));
    const byType: Record<string, { count: number; revenue: number }> = {};
    reservations.forEach((r: any) => {
      const type = roomMap.get(r.room_id) || "Unknown";
      if (!byType[type]) byType[type] = { count: 0, revenue: 0 };
      byType[type].count++;
      byType[type].revenue += r.total_amount || 0;
    });
    return Object.entries(byType).map(([type, d]) => ({
      type,
      count: d.count,
      revenue: d.revenue,
    })).sort((a, b) => b.count - a.count);
  }, [reservations, rooms]);

  const monthData = Object.entries(stats.byMonth).map(([month, count]) => ({ month, bookings: count }));
  const sourceData = Object.entries(stats.bySource).map(([name, value]) => ({ name, value }));

  const handleExportPDF = () => {
    exportToPDF({
      title: "Reservations Analytics Report",
      headers: ["Metric", "Value"],
      rows: [
        ["Total Reservations", stats.total],
        ["Total Revenue", formatCurrency(stats.totalRevenue)],
        ["Average Stay", `${stats.avgStay} nights`],
        ["Cancellation Rate", `${stats.cancelRate}%`],
        ...Object.entries(stats.byStatus).map(([k, v]) => [`Status: ${k}`, v]),
        ...Object.entries(stats.bySource).map(([k, v]) => [`Source: ${k}`, v]),
      ],
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: "Reservations_Analytics",
      headers: ["Metric", "Value"],
      rows: [
        ["Total Reservations", stats.total],
        ["Total Revenue", stats.totalRevenue],
        ["Average Stay (nights)", stats.avgStay],
        ["Cancellation Rate (%)", stats.cancelRate],
        ...Object.entries(stats.byStatus).map(([k, v]) => [`Status: ${k}`, v]),
        ...Object.entries(stats.bySource).map(([k, v]) => [`Source: ${k}`, v]),
        ...Object.entries(stats.byPayment).map(([k, v]) => [`Payment: ${k}`, v]),
      ],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Reservation Analytics</h2>
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
        <MetricCard title="Total Bookings" value={String(stats.total)} change="All time" changeType="neutral" icon={CalendarDays} delay={0} />
        <MetricCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} change="All bookings" changeType="positive" icon={TrendingUp} delay={50} />
        <MetricCard title="Avg Stay" value={`${stats.avgStay} nights`} change="Per booking" changeType="neutral" icon={CalendarDays} delay={100} />
        <MetricCard title="Cancel Rate" value={`${stats.cancelRate}%`} change={`${stats.byStatus["cancelled"] || 0} cancelled`} changeType="negative" icon={XCircle} delay={150} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bookings by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking Source Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {sourceData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Payment Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(stats.byPayment).map(([status, count]) => (
              <div key={status} className="p-4 rounded-xl bg-secondary/30 text-center">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground capitalize">{status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* No-Show Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">No-Show / Cancellation Report</CardTitle>
            <Button variant="outline" size="sm" onClick={() => exportToPDF({
              title: "No-Show Report",
              headers: ["Code", "Guest", "Room", "Check-in", "Revenue Lost", "Status"],
              rows: noShowReport.map(r => [r.code, r.guest, r.room, r.checkIn, formatCurrency(r.revenueLost), r.status]),
            })}><Download className="h-4 w-4 mr-1" />PDF</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead className="text-right">Revenue Lost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {noShowReport.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No no-shows or cancellations</TableCell></TableRow>
              ) : noShowReport.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-sm">{r.code}</TableCell>
                  <TableCell>{r.guest}</TableCell>
                  <TableCell>{r.room}</TableCell>
                  <TableCell>{r.checkIn}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">{formatCurrency(r.revenueLost)}</TableCell>
                  <TableCell className="capitalize">{r.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Source Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Avg Stay</TableHead>
                <TableHead className="text-right">Avg Rate/Night</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sourcePerformance.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
              ) : sourcePerformance.map((s) => (
                <TableRow key={s.source}>
                  <TableCell className="font-medium capitalize">{s.source}</TableCell>
                  <TableCell className="text-right">{s.count}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(s.revenue)}</TableCell>
                  <TableCell className="text-right">{s.avgStay} nights</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(s.avgRate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Room Type Demand */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Room Type Demand</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Type</TableHead>
                <TableHead className="text-right">Bookings</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roomTypeDemand.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No data</TableCell></TableRow>
              ) : roomTypeDemand.map((r) => (
                <TableRow key={r.type}>
                  <TableCell className="font-medium">{r.type}</TableCell>
                  <TableCell className="text-right">{r.count}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{formatCurrency(r.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cashier Report */}
      <ReservationCashierReport />
    </div>
  );
};
