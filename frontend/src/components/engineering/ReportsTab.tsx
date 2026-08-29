import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  BarChart3, CalendarIcon, Download, Clock, CheckCircle2, TrendingUp, Wrench, Loader2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, differenceInMinutes } from "date-fns";
import { formatAD, formatCurrency } from "@/lib/utils";
import { exportToPDF, exportToExcel } from "@/lib/reportExport";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const COLORS = ["hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--primary))", "hsl(var(--muted))"];

const priorityColors: Record<string, string> = {
  low: "hsl(var(--muted))",
  medium: "hsl(var(--primary))",
  high: "hsl(var(--warning))",
  urgent: "hsl(var(--destructive))",
};

export function EngineeringReportsTab() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["engineering-reports", dateRange],
    queryFn: async () => {
      const fromDate = dateRange.from.toISOString();
      const toDate = dateRange.to.toISOString();

      const { data: requests, error } = await db
        .from("maintenance_requests")
        .select("*")
        .gte("created_at", fromDate)
        .lte("created_at", toDate);
      if (error) throw error;

      // Stats
      const total = requests?.length || 0;
      const completed = requests?.filter((r: any) => r.status === "completed").length || 0;
      const pending = requests?.filter((r: any) => r.status === "pending").length || 0;
      const inProgress = requests?.filter((r: any) => r.status === "in_progress").length || 0;
      const cancelled = requests?.filter((r: any) => r.status === "cancelled").length || 0;

      // Avg response time (time from creation to in_progress)
      const respondedRequests = requests?.filter((r: any) => r.status !== "pending" && r.updated_at) || [];
      let avgResponseTime = 0;
      if (respondedRequests.length > 0) {
        const totalMinutes = respondedRequests.reduce((sum: number, r: any) => {
          const created = new Date(r.created_at).getTime();
          const updated = new Date(r.updated_at).getTime();
          return sum + (updated - created) / 60000;
        }, 0);
        avgResponseTime = Math.round(totalMinutes / respondedRequests.length);
      }

      // Priority breakdown
      const priorityBreakdown = [
        { name: "Low", value: requests?.filter((r: any) => r.priority === "low").length || 0, color: priorityColors.low },
        { name: "Medium", value: requests?.filter((r: any) => r.priority === "medium").length || 0, color: priorityColors.medium },
        { name: "High", value: requests?.filter((r: any) => r.priority === "high").length || 0, color: priorityColors.high },
        { name: "Urgent", value: requests?.filter((r: any) => r.priority === "urgent").length || 0, color: priorityColors.urgent },
      ];

      // By location
      const locationStats: Record<string, number> = {};
      requests?.forEach((r: any) => {
        const loc = r.room || "Unknown";
        locationStats[loc] = (locationStats[loc] || 0) + 1;
      });
      const topLocations = Object.entries(locationStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([location, count]) => ({ location, count }));

      // Daily trend
      const dailyData: Record<string, { date: string; count: number; completed: number }> = {};
      requests?.forEach((r: any) => {
        const date = format(new Date(r.created_at), "yyyy-MM-dd");
        if (!dailyData[date]) {
          dailyData[date] = { date, count: 0, completed: 0 };
        }
        dailyData[date].count++;
        if (r.status === "completed") dailyData[date].completed++;
      });

      return {
        total,
        completed,
        pending,
        inProgress,
        cancelled,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        avgResponseTime,
        priorityBreakdown,
        topLocations,
        dailyData: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
        requests,
      };
    },
  });

  const handleExportPDF = () => {
    if (!reportData) return;
    exportToPDF({
      title: "Engineering Report",
      headers: ["Request #", "Location", "Issue", "Priority", "Status", "Created"],
      rows: reportData.requests?.map((r: any) => [
        r.request_number,
        r.room,
        r.issue,
        r.priority,
        r.status,
        format(new Date(r.created_at), "yyyy-MM-dd HH:mm")
      ]) || [],
      generatedAt: new Date().toLocaleString(),
    });
  };

  const handleExportExcel = () => {
    if (!reportData) return;
    exportToExcel({
      title: "Engineering_Report",
      headers: ["Request #", "Location", "Issue", "Description", "Priority", "Status", "Assigned To", "Created", "Completed"],
      rows: reportData.requests?.map((r: any) => [
        r.request_number,
        r.room,
        r.issue,
        r.description || "",
        r.priority,
        r.status,
        r.assigned_to || "",
        format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
        r.completed_at ? format(new Date(r.completed_at), "yyyy-MM-dd HH:mm") : ""
      ]) || [],
    });
  };

  return (
    <div className="space-y-6">
      {/* Date Range & Export */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {formatAD(dateRange.from)} - {formatAD(dateRange.to)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Requests</p>
                    <p className="text-2xl font-bold">{reportData?.total}</p>
                  </div>
                  <Wrench className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold text-success">{reportData?.completionRate}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Response</p>
                    <p className="text-2xl font-bold">
                      {reportData?.avgResponseTime && reportData.avgResponseTime > 60 
                        ? `${Math.round(reportData.avgResponseTime / 60)}h` 
                        : `${reportData?.avgResponseTime}m`}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-success">{reportData?.completed}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Request Trend */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Request Trend</CardTitle>
                <CardDescription>Daily maintenance requests over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={reportData?.dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        tickFormatter={(v) => format(new Date(v), "MMM d")}
                      />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} name="Created" />
                      <Line type="monotone" dataKey="completed" stroke="hsl(var(--success))" strokeWidth={2} name="Completed" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Priority Breakdown */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Priority Breakdown</CardTitle>
                <CardDescription>Requests by priority level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData?.priorityBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportData?.priorityBreakdown.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Locations */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Locations by Requests
              </CardTitle>
              <CardDescription>Rooms/areas with most maintenance issues</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData?.topLocations} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis 
                      type="category" 
                      dataKey="location" 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      width={100}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Requests" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          {/* Asset Downtime Log */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Asset Downtime Log</CardTitle>
                <Button variant="outline" size="sm" onClick={() => {
                  if (!reportData) return;
                  const completed = reportData.requests?.filter((r: any) => r.status === "completed" && r.completed_at) || [];
                  exportToPDF({
                    title: "Asset Downtime Log",
                    headers: ["Location", "Issue", "Priority", "Created", "Resolved", "Downtime (hrs)"],
                    rows: completed.map((r: any) => {
                      const hrs = Math.round((new Date(r.completed_at).getTime() - new Date(r.created_at).getTime()) / 3600000);
                      return [r.room, r.issue, r.priority, format(new Date(r.created_at), "yyyy-MM-dd"), format(new Date(r.completed_at), "yyyy-MM-dd"), hrs];
                    }),
                  });
                }}><Download className="h-4 w-4 mr-1" />PDF</Button>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const completed = reportData?.requests?.filter((r: any) => r.status === "completed" && r.completed_at) || [];
                return (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">Location</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Issue</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Priority</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Created</th>
                        <th className="text-left py-2 font-medium text-muted-foreground">Resolved</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Downtime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {completed.length === 0 ? (
                        <tr><td colSpan={6} className="text-center text-muted-foreground py-6">No resolved requests</td></tr>
                      ) : completed.slice(0, 20).map((r: any, i: number) => {
                        const hrs = Math.round((new Date(r.completed_at).getTime() - new Date(r.created_at).getTime()) / 3600000);
                        return (
                          <tr key={i} className="border-b border-border/50">
                            <td className="py-2 font-medium">{r.room}</td>
                            <td className="py-2">{r.issue}</td>
                            <td className="py-2 capitalize">{r.priority}</td>
                            <td className="py-2">{format(new Date(r.created_at), "MMM d")}</td>
                            <td className="py-2">{format(new Date(r.completed_at), "MMM d")}</td>
                            <td className="py-2 text-right font-mono font-bold">{hrs}h</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
