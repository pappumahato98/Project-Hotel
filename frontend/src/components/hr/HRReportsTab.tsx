import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Calendar, DollarSign, TrendingUp, Download, FileText } from "lucide-react";
import { useStaffMembers, useStaffDepartments } from "@/hooks/useStaffMembers";
import { useHRStats } from "@/hooks/useHR";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { exportToPDF, exportToExcel } from "@/lib/reportExport";

export function HRReportsTab() {
  const { data: staff = [] } = useStaffMembers();
  const { data: departments = [] } = useStaffDepartments();
  const stats = useHRStats();

  const { data: payrollRecords = [] } = useQuery({
    queryKey: ["hr-payroll-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_records")
        .select("id, staff_id, basic_salary, allowances, deductions, net_pay, status, pay_period_start, pay_period_end")
        .order("pay_period_start", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const departmentBreakdown = departments.map(dept => ({
    name: dept,
    count: staff.filter(s => s.department === dept).length,
  })).sort((a, b) => b.count - a.count);

  const activeCount = staff.filter(s => s.status === "active").length;
  const onLeaveCount = staff.filter(s => s.status === "on_leave").length;

  // Payroll Summary
  const payrollSummary = useMemo(() => {
    const staffMap = new Map(staff.map((s: any) => [s.id, { name: `${s.first_name} ${s.last_name}`, dept: s.department || "—" }]));
    return payrollRecords.map((p: any) => {
      const s = staffMap.get(p.staff_id) || { name: "Unknown", dept: "—" };
      return {
        staff: s.name,
        department: s.dept,
        basic: p.basic_salary || 0,
        allowances: p.allowances || 0,
        deductions: p.deductions || 0,
        netPay: p.net_pay || 0,
        status: p.status,
      };
    });
  }, [payrollRecords, staff]);

  const handleExportPDF = () => {
    exportToPDF({
      title: "HR Summary Report",
      headers: ["Metric", "Value"],
      rows: [
        ["Total Staff", staff.length],
        ["Active", activeCount],
        ["On Leave", onLeaveCount],
        ["Pending Leave Requests", stats.pendingLeaveRequests],
        ["Total Payroll", formatCurrency(stats.totalPayrollAmount)],
        ...departmentBreakdown.map(d => [`Dept: ${d.name}`, d.count]),
      ],
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: "HR_Summary",
      headers: ["Metric", "Value"],
      rows: [
        ["Total Staff", staff.length],
        ["Active", activeCount],
        ["On Leave", onLeaveCount],
        ["Pending Leave Requests", stats.pendingLeaveRequests],
        ["Total Payroll", stats.totalPayrollAmount],
        ...departmentBreakdown.map(d => [`Dept: ${d.name}`, d.count]),
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with exports */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">HR Reports</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportPDF}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
            <Download className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Staff</p>
                <p className="text-2xl font-bold">{staff.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Leave Today</p>
                <p className="text-2xl font-bold text-amber-500">{onLeaveCount}</p>
              </div>
              <Calendar className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Leave</p>
                <p className="text-2xl font-bold">{stats.pendingLeaveRequests}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid Payroll</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalPayrollAmount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Headcount by Department</CardTitle>
          <CardDescription>{departments.length} departments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {departmentBreakdown.map((dept) => (
              <div key={dept.name} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <span className="font-medium">{dept.name}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2"
                      style={{ width: `${Math.min(100, (dept.count / Math.max(staff.length, 1)) * 100)}%` }}
                    />
                  </div>
                  <Badge variant="outline">{dept.count}</Badge>
                </div>
              </div>
            ))}
            {departmentBreakdown.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No departments found</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-success/10 text-center">
              <p className="text-3xl font-bold text-success">{stats.clockedInToday}</p>
              <p className="text-sm text-muted-foreground">Currently Clocked In</p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30 text-center">
              <p className="text-3xl font-bold">{stats.totalStaffToday}</p>
              <p className="text-sm text-muted-foreground">Total Clock Records</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payroll Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Payroll Summary</CardTitle>
            <Button variant="outline" size="sm" onClick={() => exportToPDF({
              title: "Payroll Summary Report",
              headers: ["Staff", "Department", "Basic", "Allowances", "Deductions", "Net Pay", "Status"],
              rows: payrollSummary.map(p => [p.staff, p.department, formatCurrency(p.basic), formatCurrency(p.allowances), formatCurrency(p.deductions), formatCurrency(p.netPay), p.status]),
            })}><Download className="h-4 w-4 mr-1" />PDF</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Basic</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollSummary.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No payroll records</TableCell></TableRow>
              ) : payrollSummary.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{p.staff}</TableCell>
                  <TableCell>{p.department}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(p.basic)}</TableCell>
                  <TableCell className="text-right font-mono text-success">{formatCurrency(p.allowances)}</TableCell>
                  <TableCell className="text-right font-mono text-destructive">{formatCurrency(p.deductions)}</TableCell>
                  <TableCell className="text-right font-mono font-bold">{formatCurrency(p.netPay)}</TableCell>
                  <TableCell><Badge className={p.status === "paid" ? "bg-success/20 text-success" : "bg-amber-500/20 text-amber-400"}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}