import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToPDF, exportToExcel, exportToCSV } from "@/lib/reportExport";
import { formatCurrency, formatAD } from "@/lib/utils";
import { Download, FileText, Bed, Users, Receipt, Clock, TrendingUp, CalendarDays, ArrowRight, CheckIn, CheckOut, DollarSign } from "lucide-react";
import { FrontDeskCashierReport } from "./FrontDeskCashierReport";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";
import { differenceInDays, parseISO, format, subDays } from "date-fns";

const COLORS = ["hsl(var(--success))", "hsl(var(--primary))", "hsl(var(--warning))", "hsl(var(--destructive))"];

export const FrontDeskReportsTab = () => {
  const today = new Date().toISOString().split("T")[0];
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { data: rooms = [] } = useQuery({
    queryKey: ["frontdesk-report-rooms"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id, room_number, room_type, floor, status, price_per_night");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: todayReservations = [] } = useQuery({
    queryKey: ["frontdesk-report-reservations", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("id, status, check_in_date, check_out_date, total_amount")
        .or(`check_in_date.eq.${today},check_out_date.eq.${today}`);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allReservations = [] } = useQuery({
    queryKey: ["frontdesk-report-all-reservations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("id, guest_id, room_id, status, check_in_date, check_out_date, total_amount, source")
        .order("check_in_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: guests = [] } = useQuery({
    queryKey: ["frontdesk-report-guests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("guests").select("id, first_name, last_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: folios = [] } = useQuery({
    queryKey: ["frontdesk-report-folios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guest_folios")
        .select("id, status, total_charges, total_payments, balance")
        .eq("status", "open");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: queueEntries = [] } = useQuery({
    queryKey: ["frontdesk-report-queue"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("front_desk_queue")
        .select("id, status, priority, created_at, updated_at");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["frontdesk-report-payments", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount, payment_method, payment_date")
        .eq("payment_date", today);
      if (error) throw error;
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const roomStatus = rooms.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const checkIns = todayReservations.filter((r: any) => r.check_in_date === today).length;
    const checkOuts = todayReservations.filter((r: any) => r.check_out_date === today).length;
    const openFolios = folios.length;
    const totalCharges = folios.reduce((s: number, f: any) => s + (f.total_charges || 0), 0);
    const totalPayments = folios.reduce((s: number, f: any) => s + (f.total_payments || 0), 0);
    const waitingInQueue = queueEntries.filter((q: any) => q.status === "waiting").length;

    return { roomStatus, checkIns, checkOuts, openFolios, totalCharges, totalPayments, waitingInQueue };
  }, [rooms, todayReservations, folios, queueEntries, today]);

  // Room Occupancy Log
  const occupancyLog = useMemo(() => {
    const guestMap = new Map(guests.map((g: any) => [g.id, `${g.first_name} ${g.last_name}`]));
    const roomMap = new Map(rooms.map((r) => [r.id, r.room_number]));
    return allReservations
      .filter((r: any) => r.status === "checked_in" || r.status === "checked_out" || r.status === "completed")
      .slice(0, 50)
      .map((r: any) => {
        const nights = differenceInDays(parseISO(r.check_out_date), parseISO(r.check_in_date));
        return {
          room: roomMap.get(r.room_id) || "—",
          guest: guestMap.get(r.guest_id) || "—",
          checkIn: r.check_in_date,
          checkOut: r.check_out_date,
          nights,
          revenue: r.total_amount || 0,
        };
      });
  }, [allReservations, guests, rooms]);

  // Queue Performance
  const queuePerformance = useMemo(() => {
    const byPriority: Record<string, { count: number; resolved: number; totalWaitMs: number }> = {};
    queueEntries.forEach((q: any) => {
      const p = q.priority || "normal";
      if (!byPriority[p]) byPriority[p] = { count: 0, resolved: 0, totalWaitMs: 0 };
      byPriority[p].count++;
      if (q.status === "completed" || q.status === "checked_in") {
        byPriority[p].resolved++;
        if (q.created_at && q.updated_at) {
          byPriority[p].totalWaitMs += new Date(q.updated_at).getTime() - new Date(q.created_at).getTime();
        }
      }
    });
    return Object.entries(byPriority).map(([priority, d]) => ({
      priority,
      count: d.count,
      resolved: d.resolved,
      avgWait: d.resolved > 0 ? Math.round(d.totalWaitMs / d.resolved / 60000) : 0,
    }));
  }, [queueEntries]);

  // Daily Revenue Summary
  const dailyRevenue = useMemo(() => {
    const byMethod: Record<string, { count: number; total: number }> = {};
    payments.forEach((p: any) => {
      const m = p.payment_method || "other";
      if (!byMethod[m]) byMethod[m] = { count: 0, total: 0 };
      byMethod[m].count++;
      byMethod[m].total += p.amount || 0;
    });
    return Object.entries(byMethod).map(([method, d]) => ({ method, count: d.count, total: d.total }));
  }, [payments]);

  const pieData = Object.entries(stats.roomStatus).map(([name, value]) => ({ name, value }));

  const handleExportPDF = () => {
    exportToPDF({
      title: "Front Desk Daily Report",
      headers: ["Metric", "Value"],
      rows: [
        ["Total Rooms", rooms.length],
        ["Available", stats.roomStatus["available"] || 0],
        ["Occupied", stats.roomStatus["occupied"] || 0],
        ["Cleaning", stats.roomStatus["cleaning"] || 0],
        ["Maintenance", stats.roomStatus["maintenance"] || 0],
        ["Check-ins Today", stats.checkIns],
        ["Check-outs Today", stats.checkOuts],
        ["Open Folios", stats.openFolios],
        ["Total Charges", formatCurrency(stats.totalCharges)],
        ["Total Payments", formatCurrency(stats.totalPayments)],
        ["Queue Waiting", stats.waitingInQueue],
      ],
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: "Front_Desk_Report",
      headers: ["Metric", "Value"],
      rows: [
        ["Total Rooms", rooms.length],
        ["Available", stats.roomStatus["available"] || 0],
        ["Occupied", stats.roomStatus["occupied"] || 0],
        ["Check-ins Today", stats.checkIns],
        ["Check-outs Today", stats.checkOuts],
        ["Open Folios", stats.openFolios],
        ["Total Charges", stats.totalCharges],
        ["Total Payments", stats.totalPayments],
        ["Queue Waiting", stats.waitingInQueue],
      ],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Front Desk Reports</h2>
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
        <MetricCard title="Check-ins Today" value={String(stats.checkIns)} change="Today" changeType="neutral" icon={Users} delay={0} />
        <MetricCard title="Check-outs Today" value={String(stats.checkOuts)} change="Today" changeType="neutral" icon={Users} delay={50} />
        <MetricCard title="Open Folios" value={String(stats.openFolios)} change={formatCurrency(stats.totalCharges)} changeType="neutral" icon={Receipt} delay={100} />
        <MetricCard title="Queue Waiting" value={String(stats.waitingInQueue)} change={`${queueEntries.length} total`} changeType="neutral" icon={Clock} delay={150} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bed className="h-4 w-4 text-primary" /> Room Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, i) => (
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Folio Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Total Charges (Open)</TableCell>
                  <TableCell className="text-right font-mono font-bold">{formatCurrency(stats.totalCharges)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Total Payments (Open)</TableCell>
                  <TableCell className="text-right font-mono font-bold text-success">{formatCurrency(stats.totalPayments)}</TableCell>
                </TableRow>
                <TableRow className="bg-secondary/30">
                  <TableCell className="font-semibold">Outstanding Balance</TableCell>
                  <TableCell className="text-right font-mono font-bold text-destructive">
                    {formatCurrency(stats.totalCharges - stats.totalPayments)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Room Occupancy Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Room Occupancy Log</CardTitle>
            <Button variant="outline" size="sm" onClick={() => exportToPDF({
              title: "Room Occupancy Log",
              headers: ["Room", "Guest", "Check-in", "Check-out", "Nights", "Revenue"],
              rows: occupancyLog.map(r => [r.room, r.guest, r.checkIn, r.checkOut, r.nights, formatCurrency(r.revenue)]),
            })}><Download className="h-4 w-4 mr-1" />PDF</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead className="text-right">Nights</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {occupancyLog.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No occupancy records</TableCell></TableRow>
              ) : occupancyLog.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{r.room}</TableCell>
                  <TableCell>{r.guest}</TableCell>
                  <TableCell>{r.checkIn}</TableCell>
                  <TableCell>{r.checkOut}</TableCell>
                  <TableCell className="text-right">{r.nights}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{formatCurrency(r.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Queue Performance Report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Queue Performance Report</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Avg Wait (min)</TableHead>
                <TableHead className="text-right">Resolved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queuePerformance.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No queue data</TableCell></TableRow>
              ) : queuePerformance.map((q) => (
                <TableRow key={q.priority}>
                  <TableCell className="font-medium capitalize">{q.priority}</TableCell>
                  <TableCell className="text-right">{q.count}</TableCell>
                  <TableCell className="text-right">{q.avgWait}</TableCell>
                  <TableCell className="text-right font-bold text-success">{q.resolved}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Daily Revenue Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Revenue Summary (Today)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyRevenue.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">No payments today</TableCell></TableRow>
              ) : (
                <>
                  {dailyRevenue.map((d) => (
                    <TableRow key={d.method}>
                      <TableCell className="font-medium capitalize">{d.method}</TableCell>
                      <TableCell className="text-right">{d.count}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatCurrency(d.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-secondary/30">
                    <TableCell className="font-semibold">Grand Total</TableCell>
                    <TableCell className="text-right font-bold">{dailyRevenue.reduce((s, d) => s + d.count, 0)}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-primary">{formatCurrency(dailyRevenue.reduce((s, d) => s + d.total, 0))}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cashier Report */}
      <FrontDeskCashierReport />
    </div>
  );
};
