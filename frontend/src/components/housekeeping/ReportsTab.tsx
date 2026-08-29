import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  BarChart3, CalendarIcon, Download, Clock, CheckCircle2, TrendingUp, Users, Loader2
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { formatAD } from "@/lib/utils";
import { exportToPDF, exportToExcel } from "@/lib/reportExport";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const COLORS = ["hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--muted))"];

export function HousekeepingReportsTab() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["housekeeping-reports", dateRange],
    queryFn: async () => {
      const fromDate = format(startOfDay(dateRange.from), "yyyy-MM-dd");
      const toDate = format(endOfDay(dateRange.to), "yyyy-MM-dd");

      // Get tasks in date range
      const { data: tasks, error } = await db
        .from("housekeeping_tasks")
        .select("*")
        .gte("scheduled_date", fromDate)
        .lte("scheduled_date", toDate);
      if (error) throw error;

      // Get inspections in date range
      const { data: inspections } = await db
        .from("housekeeping_inspections")
        .select("*")
        .gte("inspection_date", startOfDay(dateRange.from).toISOString())
        .lte("inspection_date", endOfDay(dateRange.to).toISOString());

      // Calculate stats
      const total = tasks?.length || 0;
      const completed = tasks?.filter((t: any) => t.status === "completed").length || 0;
      const pending = tasks?.filter((t: any) => t.status === "pending").length || 0;
      const inProgress = tasks?.filter((t: any) => t.status === "in_progress").length || 0;
      const cancelled = tasks?.filter((t: any) => t.status === "cancelled").length || 0;

      // Calculate average completion time
      const completedTasks = tasks?.filter((t: any) => t.started_at && t.completed_at) || [];
      let avgCompletionTime = 0;
      if (completedTasks.length > 0) {
        const totalMinutes = completedTasks.reduce((sum: number, t: any) => {
          const start = new Date(t.started_at).getTime();
          const end = new Date(t.completed_at).getTime();
          return sum + (end - start) / 60000;
        }, 0);
        avgCompletionTime = Math.round(totalMinutes / completedTasks.length);
      }

      // Calculate average inspection score
      const avgInspectionScore = inspections?.length 
        ? Math.round(inspections.reduce((sum: number, i: any) => sum + (i.overall_score || 0), 0) / inspections.length)
        : 0;

      // Group by date for chart
      const dailyData: Record<string, { date: string; completed: number; total: number }> = {};
      tasks?.forEach((t: any) => {
        if (!dailyData[t.scheduled_date]) {
          dailyData[t.scheduled_date] = { date: t.scheduled_date, completed: 0, total: 0 };
        }
        dailyData[t.scheduled_date].total++;
        if (t.status === "completed") dailyData[t.scheduled_date].completed++;
      });

      // Staff performance
      const staffStats: Record<string, { name: string; completed: number; total: number }> = {};
      tasks?.forEach((t: any) => {
        const name = t.assigned_to || "Unassigned";
        if (!staffStats[name]) {
          staffStats[name] = { name, completed: 0, total: 0 };
        }
        staffStats[name].total++;
        if (t.status === "completed") staffStats[name].completed++;
      });

      return {
        total,
        completed,
        pending,
        inProgress,
        cancelled,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        avgCompletionTime,
        avgInspectionScore,
        dailyData: Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)),
        staffStats: Object.values(staffStats).sort((a, b) => b.completed - a.completed),
        statusBreakdown: [
          { name: "Completed", value: completed },
          { name: "In Progress", value: inProgress },
          { name: "Pending", value: pending },
          { name: "Cancelled", value: cancelled },
        ],
        tasks,
      };
    },
  });

  const handleExportPDF = () => {
    if (!reportData) return;
    exportToPDF({
      title: "Housekeeping Report",
      headers: ["Date", "Room", "Type", "Status", "Assigned To", "Completion Time"],
      rows: reportData.tasks?.map((t: any) => [
        t.scheduled_date,
        t.room_id || "N/A",
        t.task_type,
        t.status,
        t.assigned_to || "Unassigned",
        t.started_at && t.completed_at 
          ? `${Math.round((new Date(t.completed_at).getTime() - new Date(t.started_at).getTime()) / 60000)} min`
          : "-"
      ]) || [],
      generatedAt: new Date().toLocaleString(),
    });
  };

  const handleExportExcel = () => {
    if (!reportData) return;
    exportToExcel({
      title: "Housekeeping_Report",
      headers: ["Date", "Room", "Type", "Status", "Priority", "Assigned To", "Started", "Completed"],
      rows: reportData.tasks?.map((t: any) => [
        t.scheduled_date,
        t.room_id || "N/A",
        t.task_type,
        t.status,
        t.priority,
        t.assigned_to || "Unassigned",
        t.started_at ? format(new Date(t.started_at), "HH:mm") : "-",
        t.completed_at ? format(new Date(t.completed_at), "HH:mm") : "-"
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
                    <p className="text-sm text-muted-foreground">Avg. Time</p>
                    <p className="text-2xl font-bold">{reportData?.avgCompletionTime} min</p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Inspection Score</p>
                    <p className="text-2xl font-bold text-primary">{reportData?.avgInspectionScore}%</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tasks</p>
                    <p className="text-2xl font-bold">{reportData?.total}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Performance Chart */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Daily Performance</CardTitle>
                <CardDescription>Tasks completed vs total by day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData?.dailyData}>
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
                      <Bar dataKey="total" fill="hsl(var(--muted))" name="Total" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" fill="hsl(var(--success))" name="Completed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Status Breakdown */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Task distribution by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportData?.statusBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportData?.statusBreakdown.map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staff Performance */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Performance
              </CardTitle>
              <CardDescription>Tasks completed by staff member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData?.staffStats.slice(0, 10).map((staff: any) => (
                  <div key={staff.name} className="flex items-center gap-4">
                    <div className="w-32 truncate font-medium">{staff.name}</div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success rounded-full"
                          style={{ width: `${staff.total > 0 ? (staff.completed / staff.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-20 text-right text-sm">
                      <span className="font-medium">{staff.completed}</span>
                      <span className="text-muted-foreground">/{staff.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          {/* Room Turnaround Report */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Room Turnaround Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const roomStats: Record<string, { tasks: number; totalScore: number; scoreCount: number; lastInspection: string }> = {};
                reportData?.tasks?.forEach((t: any) => {
                  const room = t.room_id || "Unknown";
                  if (!roomStats[room]) roomStats[room] = { tasks: 0, totalScore: 0, scoreCount: 0, lastInspection: "" };
                  if (t.status === "completed") roomStats[room].tasks++;
                  if (t.inspection_score) {
                    roomStats[room].totalScore += t.inspection_score;
                    roomStats[room].scoreCount++;
                  }
                });
                const rows = Object.entries(roomStats)
                  .map(([room, d]) => ({ room, tasks: d.tasks, avgScore: d.scoreCount > 0 ? Math.round(d.totalScore / d.scoreCount) : 0 }))
                  .sort((a, b) => b.tasks - a.tasks)
                  .slice(0, 20);

                return (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">Room</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Tasks Completed</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Avg Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr><td colSpan={3} className="text-center text-muted-foreground py-6">No turnaround data</td></tr>
                      ) : rows.map((r, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 font-medium">{r.room}</td>
                          <td className="py-2 text-right">{r.tasks}</td>
                          <td className="py-2 text-right font-bold">{r.avgScore > 0 ? `${r.avgScore}%` : "—"}</td>
                        </tr>
                      ))}
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
