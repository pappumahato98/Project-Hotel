import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  Clock,
  Calendar,
  TrendingUp,
  FileText,
  Play,
  Pause,
  Users,
  Calculator,
  Download,
  Loader2,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { usePayrollRecords, useHRStats, useTimeClock } from "@/hooks/useHR";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { formatCurrency } from "@/lib/utils";
import { calculateNepalPayroll } from "@/utils/payrollCalculator";

const statusColors: Record<string, string> = {
  draft: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  paid: "bg-success/20 text-success border-success/30",
};

export function PayrollPanel() {
  const { data: payrollRecords = [], isLoading, approvePayroll, markPayrollPaid, createPayroll } = usePayrollRecords();
  const { data: staff = [] } = useStaffMembers();
  const stats = useHRStats();
  const today = new Date().toISOString().split("T")[0];
  const { data: timeEntries = [], clockIn, clockOut } = useTimeClock(today);

  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockInDialogOpen, setClockInDialogOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");

  // Generate Payroll State
  const [runPayrollOpen, setRunPayrollOpen] = useState(false);
  const [runForm, setRunForm] = useState({
    staffId: "",
    basicSalary: 0,
    overtime: 0,
    allowances: 0,
    maritalStatus: "single" as "single" | "married"
  });

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockIn = async () => {
    if (!selectedStaffId) {
      toast.error("Please select an employee");
      return;
    }
    try {
      await clockIn.mutateAsync(selectedStaffId);
      const s = staff.find(x => x.id === selectedStaffId);
      toast.success(`${s?.first_name} clocked in at ${format(new Date(), "HH:mm")}`);
      setSelectedStaffId("");
      setClockInDialogOpen(false);
    } catch (error: any) {
      toast.error("Failed to clock in: " + error.message);
    }
  };

  const handleClockOut = async (id: string) => {
    try {
      await clockOut.mutateAsync({ id });
      toast.success(`Clocked out at ${format(new Date(), "HH:mm")}`);
    } catch (error: any) {
      toast.error("Failed to clock out: " + error.message);
    }
  };

  const handleProcessPayroll = async () => {
    if (!selectedPayroll) return;
    try {
      await approvePayroll.mutateAsync(selectedPayroll.id);
      toast.success(`Payroll approved for ${selectedPayroll.staff?.first_name}`);
      setProcessDialogOpen(false);
      setSelectedPayroll(null);
    } catch (error: any) {
      toast.error("Failed to process: " + error.message);
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    const method = window.prompt("Enter payment method (e.g. Bank Transfer, Cash):", "Bank Transfer");
    if (!method) return;
    try {
      await markPayrollPaid.mutateAsync({ id, paymentMethod: method });
      toast.success("Marked as paid");
    } catch (error: any) {
      toast.error("Failed to mark as paid: " + error.message);
    }
  };

  const calculateDuration = (clockInStr: string, clockOutStr: string | null) => {
    const start = new Date(clockInStr);
    const end = clockOutStr ? new Date(clockOutStr) : currentTime;
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  const handleGeneratePayroll = async () => {
    if (!runForm.staffId) {
      toast.error("Select an employee");
      return;
    }
    const calc = calculateNepalPayroll({
      basicSalary: runForm.basicSalary,
      overtime: runForm.overtime,
      allowances: runForm.allowances,
      maritalStatus: runForm.maritalStatus
    });
    
    try {
      const todayDate = new Date();
      const startOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1).toISOString().split("T")[0];
      const endOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).toISOString().split("T")[0];
      
      await createPayroll.mutateAsync({
        staff_id: runForm.staffId,
        pay_period_start: startOfMonth,
        pay_period_end: endOfMonth,
        basic_salary: runForm.basicSalary,
        overtime_hours: 0, // Simplified
        overtime_pay: runForm.overtime,
        allowances: runForm.allowances,
        deductions: calc.ssfDeduction,
        tax_amount: calc.taxAmount,
        net_pay: calc.netPay,
        status: "draft",
        notes: "Generated via Auto Tax Engine"
      } as any);
      
      toast.success("Draft Payroll Generated Successfully");
      setRunPayrollOpen(false);
      setRunForm({ staffId: "", basicSalary: 0, overtime: 0, allowances: 0, maritalStatus: "single" });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Real-time Clock */}
      <Card variant="glass" className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-primary animate-pulse" />
            <div>
              <p className="text-2xl font-bold font-mono">{format(currentTime, "HH:mm:ss")}</p>
              <p className="text-sm text-muted-foreground">{format(currentTime, "EEEE, MMMM d, yyyy")}</p>
            </div>
          </div>
          <Button variant="blue" className="gap-2" onClick={() => setClockInDialogOpen(true)}>
            <Play className="h-4 w-4" />
            Clock In
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paid Payroll</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalPayrollAmount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold">{stats.pendingPayroll}</p>
              </div>
              <FileText className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Records</p>
                <p className="text-2xl font-bold">{payrollRecords.length}</p>
              </div>
              <Calculator className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Clocks</p>
                <p className="text-2xl font-bold">{stats.clockedInToday}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Time Entries */}
      {timeEntries.filter((e) => !e.clock_out).length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-success animate-pulse" />
              Active Time Entries
            </CardTitle>
            <CardDescription>Currently clocked in employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeEntries
                .filter((e) => !e.clock_out)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-success/20 flex items-center justify-center">
                        <span className="text-sm font-semibold text-success">
                          {entry.staff?.first_name[0]}{entry.staff?.last_name[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{entry.staff?.first_name} {entry.staff?.last_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Clocked in at {format(new Date(entry.clock_in), "HH:mm")} • Duration:{" "}
                          <span className="text-success font-mono">
                            {calculateDuration(entry.clock_in, null)}
                          </span>
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleClockOut(entry.id)}
                      disabled={clockOut.isPending}
                    >
                      <Pause className="h-4 w-4" />
                      Clock Out
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll Records */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payroll Records
              </CardTitle>
              <CardDescription>Consolidated payroll cycles</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="blue" size="sm" className="gap-2" onClick={() => setRunPayrollOpen(true)}>
                <Settings2 className="h-4 w-4" />
                Run Payroll
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Basic</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></TableCell></TableRow>
                ) : payrollRecords.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payroll records found</TableCell></TableRow>
                ) : (
                  payrollRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.staff?.first_name} {record.staff?.last_name}</p>
                          <p className="text-xs text-muted-foreground">{record.staff?.employee_id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(record.pay_period_start), "MMM d")} - {format(new Date(record.pay_period_end), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(record.basic_salary)}</TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">{formatCurrency(record.net_pay)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[record.status] || ""}>
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {record.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPayroll(record);
                              setProcessDialogOpen(true);
                            }}
                          >
                            Approve
                          </Button>
                        )}
                        {record.status === "approved" && (
                          <Button variant="ghost" size="sm" onClick={() => handleMarkAsPaid(record.id)}>
                            Mark Paid
                          </Button>
                        )}
                        {record.status === "paid" && (
                          <span className="text-xs text-muted-foreground">Completed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Clock In Dialog */}
      <Dialog open={clockInDialogOpen} onOpenChange={setClockInDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clock In</DialogTitle>
            <DialogDescription>Select employee to start time tracking</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff">Employee</Label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff..." />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground">Current Time</p>
              <p className="text-3xl font-bold font-mono">{format(currentTime, "HH:mm:ss")}</p>
            </div>
            <Button variant="blue" className="w-full gap-2" onClick={handleClockIn} disabled={clockIn.isPending}>
              {clockIn.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Clock In Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Process Payroll Dialog */}
      <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payroll</DialogTitle>
            <DialogDescription>
              Confirm payroll approval for {selectedPayroll?.staff?.first_name}
            </DialogDescription>
          </DialogHeader>
          {selectedPayroll && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Salary</span>
                  <span>{formatCurrency(selectedPayroll.basic_salary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Overtime Pay</span>
                  <span className="text-success">+{formatCurrency(selectedPayroll.overtime_pay)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Allowances</span>
                  <span className="text-success">+{formatCurrency(selectedPayroll.allowances)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deductions</span>
                  <span className="text-destructive">-{formatCurrency(selectedPayroll.deductions)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-border pt-2">
                  <span>Net Pay</span>
                  <span className="text-primary">{formatCurrency(selectedPayroll.net_pay)}</span>
                </div>
              </div>
              <Button variant="blue" className="w-full" onClick={handleProcessPayroll} disabled={approvePayroll.isPending}>
                {approvePayroll.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm & Approve
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Run Payroll Dialog */}
      <Dialog open={runPayrollOpen} onOpenChange={setRunPayrollOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Run Payroll & Calculate Taxes</DialogTitle>
            <DialogDescription>
              Automatically calculate SSF and Income Tax based on Nepal labor laws.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={runForm.staffId} onValueChange={(v) => setRunForm({...runForm, staffId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                  <SelectContent>
                    {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Marital Status (For Tax Bracket)</Label>
                <Select value={runForm.maritalStatus} onValueChange={(v) => setRunForm({...runForm, maritalStatus: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Basic Salary (Monthly)</Label>
                <Input type="number" value={runForm.basicSalary} onChange={(e) => setRunForm({...runForm, basicSalary: Number(e.target.value)})} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Overtime Pay</Label>
                  <Input type="number" value={runForm.overtime} onChange={(e) => setRunForm({...runForm, overtime: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Allowances</Label>
                  <Input type="number" value={runForm.allowances} onChange={(e) => setRunForm({...runForm, allowances: Number(e.target.value)})} />
                </div>
              </div>
            </div>
            
            <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-4">
              <h3 className="font-bold flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Live Preview</h3>
              {(() => {
                const calc = calculateNepalPayroll(runForm);
                return (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Gross Pay</span>
                      <span>{formatCurrency(calc.grossPay)}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>SSF Deduction (11%)</span>
                      <span>-{formatCurrency(calc.ssfDeduction)}</span>
                    </div>
                    <div className="flex justify-between text-destructive border-b border-border pb-3">
                      <span>Income Tax (Monthly)</span>
                      <span>-{formatCurrency(calc.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-1">
                      <span>Net Pay</span>
                      <span className="text-success">{formatCurrency(calc.netPay)}</span>
                    </div>
                  </div>
                );
              })()}
              <Button variant="blue" className="w-full mt-4" onClick={handleGeneratePayroll} disabled={!runForm.staffId || createPayroll.isPending}>
                {createPayroll.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Generate Draft Pay Slip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
