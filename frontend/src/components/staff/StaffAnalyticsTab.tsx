import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToPDF, exportToExcel } from "@/lib/reportExport";
import { Download, FileText, Users, Clock, CalendarDays, Building } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { differenceInMinutes, parseISO } from "date-fns";

export const StaffAnalyticsTab = () => {
  const { data: timeClock = [] } = useQuery({
    queryKey: ["staff-analytics-timeclock"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("staff_time_clock")
        .select("*")
        .order("clock_in", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ["staff-analytics-schedules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("staff_schedules")
        .select("*")
        .order("shift_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: staffMembers = [] } = useQuery({
    queryKey: ["staff-analytics-members"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("staff_members")
        .select("id, first_name, last_name, department, position, status");
      if (error) throw error;
      return data || [];
    },
  });

  const stats = useMemo(() => {
    const totalStaff = staffMembers.length;
    const activeStaff = staffMembers.filter((s: any) => s.status === "active").length;

    // Department breakdown
    const byDept: Record<string, number> = {};
    staffMembers.forEach((s: any) => {
      const dept = s.department || "Unassigned";
      byDept[dept] = (byDept[dept] || 0) + 1;
    });

    // Total hours from time clock
    let totalMinutes = 0;
    let completedShifts = 0;
    timeClock.forEach((tc: any) => {
      if (tc.clock_in && tc.clock_out) {
        totalMinutes += differenceInMinutes(parseISO(tc.clock_out), parseISO(tc.clock_in)) - (tc.break_minutes || 0);
        completedShifts++;
      }
    });

    const totalHours = Math.round(totalMinutes / 60);
    const avgHoursPerShift = completedShifts > 0 ? (totalMinutes / 60 / completedShifts).toFixed(1) : "0";

    const scheduledShifts = schedules.length;

    return { totalStaff, activeStaff, byDept, totalHours, avgHoursPerShift, completedShifts, scheduledShifts };
  }, [staffMembers, timeClock, schedules]);

  const deptData = Object.entries(stats.byDept).map(([dept, count]) => ({ department: dept, count }));

  const handleExportPDF = () => {
    exportToPDF({
      title: "Staff Analytics Report",
      headers: ["Metric", "Value"],
      rows: [
        ["Total Staff", stats.totalStaff],
        ["Active Staff", stats.activeStaff],
        ["Total Hours Logged", stats.totalHours],
        ["Avg Hours/Shift", stats.avgHoursPerShift],
        ["Completed Shifts", stats.completedShifts],
        ["Scheduled Shifts", stats.scheduledShifts],
        ...Object.entries(stats.byDept).map(([k, v]) => [`Dept: ${k}`, v]),
      ],
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: "Staff_Analytics",
      headers: ["Metric", "Value"],
      rows: [
        ["Total Staff", stats.totalStaff],
        ["Active Staff", stats.activeStaff],
        ["Total Hours Logged", stats.totalHours],
        ["Avg Hours/Shift", stats.avgHoursPerShift],
        ["Completed Shifts", stats.completedShifts],
        ["Scheduled Shifts", stats.scheduledShifts],
        ...Object.entries(stats.byDept).map(([k, v]) => [`Dept: ${k}`, v]),
      ],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Staff Analytics</h2>
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
        <MetricCard title="Total Staff" value={String(stats.totalStaff)} change={`${stats.activeStaff} active`} changeType="neutral" icon={Users} delay={0} />
        <MetricCard title="Hours Logged" value={String(stats.totalHours)} change={`${stats.completedShifts} shifts`} changeType="neutral" icon={Clock} delay={50} />
        <MetricCard title="Avg Hours/Shift" value={stats.avgHoursPerShift} change="Per completed shift" changeType="neutral" icon={Clock} delay={100} />
        <MetricCard title="Scheduled Shifts" value={String(stats.scheduledShifts)} change="All time" changeType="neutral" icon={CalendarDays} delay={150} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" /> Staff by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs fill-muted-foreground" />
                  <YAxis dataKey="department" type="category" width={100} className="text-xs fill-muted-foreground" />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff Directory Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Headcount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(stats.byDept).map(([dept, count]) => (
                  <TableRow key={dept}>
                    <TableCell className="font-medium">{dept}</TableCell>
                    <TableCell className="text-right font-bold">{count}</TableCell>
                  </TableRow>
                ))}
                {Object.keys(stats.byDept).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-6">No staff data</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Overtime Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Overtime Report</CardTitle>
            <Button variant="outline" size="sm" onClick={() => exportToPDF({
              title: "Overtime Report",
              headers: ["Staff", "Department", "Regular Hrs", "Overtime Hrs", "Total Hrs"],
              rows: (() => {
                const staffMap = new Map<string, { name: string; dept: string }>(staffMembers.map((s: any) => [s.id, { name: `${s.first_name} ${s.last_name}`, dept: s.department || "—" }]));
                const byStaff: Record<string, { name: string; dept: string; totalMin: number }> = {};
                timeClock.forEach((tc: any) => {
                  if (tc.clock_in && tc.clock_out) {
                    const sid = tc.staff_id || "unknown";
                    const s: { name: string; dept: string } = staffMap.get(sid) || { name: "Unknown", dept: "—" };
                    if (!byStaff[sid]) byStaff[sid] = { name: s.name, dept: s.dept, totalMin: 0 };
                    byStaff[sid].totalMin += differenceInMinutes(parseISO(tc.clock_out), parseISO(tc.clock_in)) - (tc.break_minutes || 0);
                  }
                });
                return Object.values(byStaff).map(s => {
                  const totalHrs = Math.round(s.totalMin / 60);
                  const regularHrs = Math.min(totalHrs, 160);
                  const overtimeHrs = Math.max(0, totalHrs - 160);
                  return [s.name, s.dept, regularHrs, overtimeHrs, totalHrs];
                });
              })(),
            })}><Download className="h-4 w-4 mr-1" />PDF</Button>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const staffMap = new Map<string, { name: string; dept: string }>(staffMembers.map((s: any) => [s.id, { name: `${s.first_name} ${s.last_name}`, dept: s.department || "—" }]));
            const byStaff: Record<string, { name: string; dept: string; totalMin: number }> = {};
            timeClock.forEach((tc: any) => {
              if (tc.clock_in && tc.clock_out) {
                const sid = tc.staff_id || "unknown";
                const s: { name: string; dept: string } = staffMap.get(sid) || { name: "Unknown", dept: "—" };
                if (!byStaff[sid]) byStaff[sid] = { name: s.name, dept: s.dept, totalMin: 0 };
                byStaff[sid].totalMin += differenceInMinutes(parseISO(tc.clock_out), parseISO(tc.clock_in)) - (tc.break_minutes || 0);
              }
            });
            const rows = Object.values(byStaff)
              .map(s => {
                const totalHrs = Math.round(s.totalMin / 60);
                const regularHrs = Math.min(totalHrs, 160);
                const overtimeHrs = Math.max(0, totalHrs - 160);
                return { ...s, totalHrs, regularHrs, overtimeHrs };
              })
              .sort((a, b) => b.overtimeHrs - a.overtimeHrs);

            return (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Regular Hrs</TableHead>
                    <TableHead className="text-right">Overtime Hrs</TableHead>
                    <TableHead className="text-right">Total Hrs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No clock data</TableCell></TableRow>
                  ) : rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.dept}</TableCell>
                      <TableCell className="text-right">{r.regularHrs}</TableCell>
                      <TableCell className="text-right font-bold text-amber-500">{r.overtimeHrs > 0 ? r.overtimeHrs : "—"}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{r.totalHrs}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
};
