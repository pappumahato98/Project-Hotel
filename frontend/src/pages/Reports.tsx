import { useState, useMemo } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Download, TrendingUp, Users, BedDouble, DollarSign, Filter,
  ArrowUpRight, ArrowDownRight, Loader2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend, CartesianGrid
} from "recharts";
import { toast } from "sonner";
import { useReportStats } from "@/hooks/useReportStats";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import { DailyManagementReport } from "@/components/reports/DailyManagementReport";
import { useManagement } from "@/hooks/useManagement";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToPDF } from "@/lib/reportExport";
import { format, parseISO } from "date-fns";

const Reports = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeReportTab = searchParams.get("tab") || "overview";
  const { data: stats, isLoading } = useReportStats();
  const { data: managementData, isLoading: isManagementLoading } = useManagement();

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
  };

  const reportTypes = [
    { icon: TrendingUp, title: "Revenue Report", description: "Detailed financial analysis", value: stats ? formatCurrency(stats.totalReservationRevenue) : "—" },
    { icon: BedDouble, title: "Occupancy Report", description: "Room utilization metrics", value: stats ? `${stats.occupancyRate}%` : "—" },
    { icon: Users, title: "Reservations", description: "Total bookings tracked", value: stats ? String(stats.reservationCount) : "—" },
    { icon: DollarSign, title: "POS Revenue", description: "Restaurant & service sales", value: stats ? formatCurrency(stats.totalPOSRevenue) : "—" },
  ];

  const monthlyData = stats?.monthlyData || [];
  const revenueBySource = stats?.revenueBySource || [];

  return (
    <MainLayout fixedHeight title="Reports" subtitle="Analytics and business intelligence">
      <div className="flex flex-col h-full overflow-hidden">
      <Tabs value={activeReportTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden space-y-8">
        <div className="flex justify-between items-center mt-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="dmr">DMR Executive</TabsTrigger>
            <TabsTrigger value="daily">Daily Stats</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
            <TabsTrigger value="financial">Financial Summary</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" /> Filter Range</Button>
            <Button size="sm"><Download className="h-4 w-4 mr-2" /> Export All</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide">
        {/* Overview */}
        <TabsContent value="overview" className="space-y-8 mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {reportTypes.map((report) => (
              <Card key={report.title} variant="elevated">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <report.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{report.title}</h3>
                  <p className="text-2xl font-bold text-primary">
                    {isLoading ? <Skeleton className="h-8 w-20" /> : report.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Reservations & Revenue by Month</CardTitle>
                <CardDescription>Booking volume and revenue trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  {isLoading ? <Skeleton className="h-full w-full" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="reservations" stroke="hsl(var(--success))" name="Reservations" strokeWidth={3} />
                        <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" name="Revenue ($)" strokeWidth={3} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>Contribution by source</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center">
                <div className="h-[350px] w-full">
                  {isLoading ? <Skeleton className="h-full w-full" /> : revenueBySource.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No revenue data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={revenueBySource} innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="amount">
                          {revenueBySource.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                        <Legend verticalAlign="bottom" />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* DMR Executive Report */}
        <TabsContent value="dmr" className="space-y-6">
          <DailyManagementReport data={managementData} isLoading={isManagementLoading} />
        </TabsContent>

        {/* Daily Report */}
        <TabsContent value="daily" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">ADR</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-bold font-display">
                  {isLoading ? <Skeleton className="h-9 w-24" /> : formatCurrency(stats?.adr || 0)}
                </span>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Occupancy</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-bold font-display">
                  {isLoading ? <Skeleton className="h-9 w-24" /> : `${stats?.occupancyRate || 0}%`}
                </span>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Total POS Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-3xl font-bold font-display">
                  {isLoading ? <Skeleton className="h-9 w-24" /> : formatCurrency(stats?.totalPOSRevenue || 0)}
                </span>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monthly */}
        <TabsContent value="monthly" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Monthly Revenue Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {isLoading ? <Skeleton className="h-full w-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorMonthly" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorMonthly)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Summary */}
        <TabsContent value="financial" className="space-y-6 mt-0 focus-visible:outline-none">
          <FinancialSummaryReport />
        </TabsContent>
        </div>
      </Tabs>
      </div>
    </MainLayout>
  );
};

function FinancialSummaryReport() {
  const { data: reservations = [] } = useQuery({
    queryKey: ["fin-summary-reservations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reservations").select("total_amount, check_in_date").eq("status", "checked_out");
      if (error) throw error;
      return data || [];
    },
  });
  const { data: posTransactions = [] } = useQuery({
    queryKey: ["fin-summary-pos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pos_transactions").select("total, created_at");
      if (error) throw error;
      return data || [];
    },
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["fin-summary-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("amount, expense_date").eq("status", "approved");
      if (error) throw error;
      return data || [];
    },
  });
  const { data: banquetEvents = [] } = useQuery({
    queryKey: ["fin-summary-banquet"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banquet_events").select("total_amount, event_date").eq("status", "completed");
      if (error) throw error;
      return data || [];
    },
  });

  const monthlyData = useMemo(() => {
    const byMonth: Record<string, { rooms: number; pos: number; banquet: number; expenses: number }> = {};
    reservations.forEach((r: any) => {
      const m = (r.check_in_date || "").slice(0, 7);
      if (!m) return;
      if (!byMonth[m]) byMonth[m] = { rooms: 0, pos: 0, banquet: 0, expenses: 0 };
      byMonth[m].rooms += r.total_amount || 0;
    });
    posTransactions.forEach((t: any) => {
      const m = (t.created_at || "").slice(0, 7);
      if (!m) return;
      if (!byMonth[m]) byMonth[m] = { rooms: 0, pos: 0, banquet: 0, expenses: 0 };
      byMonth[m].pos += t.total || 0;
    });
    banquetEvents.forEach((e: any) => {
      const m = (e.event_date || "").slice(0, 7);
      if (!m) return;
      if (!byMonth[m]) byMonth[m] = { rooms: 0, pos: 0, banquet: 0, expenses: 0 };
      byMonth[m].banquet += e.total_amount || 0;
    });
    expenses.forEach((e: any) => {
      const m = (e.expense_date || "").slice(0, 7);
      if (!m) return;
      if (!byMonth[m]) byMonth[m] = { rooms: 0, pos: 0, banquet: 0, expenses: 0 };
      byMonth[m].expenses += e.amount || 0;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12)
      .reverse()
      .map(([month, d]) => ({
        month,
        rooms: d.rooms,
        pos: d.pos,
        banquet: d.banquet,
        totalRevenue: d.rooms + d.pos + d.banquet,
        expenses: d.expenses,
        netProfit: d.rooms + d.pos + d.banquet - d.expenses,
      }));
  }, [reservations, posTransactions, banquetEvents, expenses]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Financial Summary by Month</CardTitle>
          <Button variant="outline" size="sm" onClick={() => exportToPDF({
            title: "Financial Summary Report",
            headers: ["Month", "Room Revenue", "POS Revenue", "Banquet Revenue", "Total Revenue", "Expenses", "Net Profit"],
            rows: monthlyData.map(m => [m.month, formatCurrency(m.rooms), formatCurrency(m.pos), formatCurrency(m.banquet), formatCurrency(m.totalRevenue), formatCurrency(m.expenses), formatCurrency(m.netProfit)]),
          })}><Download className="h-4 w-4 mr-1" />PDF</Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Rooms</TableHead>
              <TableHead className="text-right">POS</TableHead>
              <TableHead className="text-right">Banquet</TableHead>
              <TableHead className="text-right">Total Revenue</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Net Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyData.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No financial data</TableCell></TableRow>
            ) : monthlyData.map((m) => (
              <TableRow key={m.month}>
                <TableCell className="font-medium">{m.month}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(m.rooms)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(m.pos)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(m.banquet)}</TableCell>
                <TableCell className="text-right font-mono font-bold text-primary">{formatCurrency(m.totalRevenue)}</TableCell>
                <TableCell className="text-right font-mono text-destructive">{formatCurrency(m.expenses)}</TableCell>
                <TableCell className="text-right font-mono font-bold text-success">{formatCurrency(m.netProfit)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

const ReportsPage = () => (
  <ErrorBoundary>
    <Reports />
  </ErrorBoundary>
);

export default ReportsPage;
