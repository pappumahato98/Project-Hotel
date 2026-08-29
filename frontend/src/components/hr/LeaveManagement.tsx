import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Calendar,
  Plus,
  Check,
  X,
  Clock,
  User,
  FileText,
  Loader2,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { formatAD } from "@/lib/utils";
import { toast } from "sonner";
import { useLeaveRequests, useHRStats } from "@/hooks/useHR";
import { useStaffMembers } from "@/hooks/useStaffMembers";

const leaveTypes = [
  { id: "annual", label: "Annual Leave" },
  { id: "sick", label: "Sick Leave" },
  { id: "personal", label: "Personal Leave" },
  { id: "unpaid", label: "Unpaid Leave" },
];

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-success/20 text-success border-success/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

export function LeaveManagement() {
  const [filter, setFilter] = useState<string>("all");
  const { data: leaveRequests = [], isLoading, createLeaveRequest, approveLeave, rejectLeave } = useLeaveRequests(
    filter !== "all" ? { status: filter } : undefined
  );
  const { data: staff = [] } = useStaffMembers();
  const stats = useHRStats();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: "",
    leave_type: "annual",
    start_date: "",
    end_date: "",
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.staff_id || !formData.leave_type || !formData.start_date || !formData.end_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    const days = differenceInDays(parseISO(formData.end_date), parseISO(formData.start_date)) + 1;

    try {
      await createLeaveRequest.mutateAsync({
        staff_id: formData.staff_id,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days_requested: days,
        reason: formData.reason,
        status: "pending",
      });

      toast.success("Leave request submitted successfully");
      setDialogOpen(false);
      setFormData({
        staff_id: "",
        leave_type: "annual",
        start_date: "",
        end_date: "",
        reason: "",
      });
    } catch (error: any) {
      toast.error("Failed to submit request: " + error.message);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await approveLeave.mutateAsync({ id, approvedBy: "Admin" });
      toast.success("Leave request approved");
    } catch (error: any) {
      toast.error("Failed to approve: " + error.message);
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt("Enter rejection reason:");
    if (reason === null) return;

    try {
      await rejectLeave.mutateAsync({ id, reason });
      toast.error("Leave request rejected");
    } catch (error: any) {
      toast.error("Failed to reject: " + error.message);
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Management
            </CardTitle>
            <CardDescription>Manage employee leave requests and approvals</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="blue" className="gap-2">
                <Plus className="h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Leave Request</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="staff">Employee *</Label>
                    <Select
                      value={formData.staff_id}
                      onValueChange={(v) => setFormData({ ...formData, staff_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.first_name} {s.last_name} ({s.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leaveType">Leave Type *</Label>
                  <Select
                    value={formData.leave_type}
                    onValueChange={(v) => setFormData({ ...formData, leave_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      min={formData.start_date}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Brief description of leave reason..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="blue" disabled={createLeaveRequest.isPending}>
                    {createLeaveRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Submit Request
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-secondary/50 text-center">
            <p className="text-2xl font-bold">{leaveRequests.length}</p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-500/10 text-center">
            <p className="text-2xl font-bold text-amber-400">{stats.pendingLeaveRequests}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="p-3 rounded-lg bg-success/10 text-center">
            <p className="text-2xl font-bold text-success">{stats.approvedLeaveRequests}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 text-center">
            <p className="text-2xl font-bold text-destructive">
              {leaveRequests.filter(r => r.status === 'rejected').length}
            </p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></TableCell></TableRow>
              ) : leaveRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No leave requests found
                  </TableCell>
                </TableRow>
              ) : (
                leaveRequests.map((request) => {
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{request.staff ? `${request.staff.first_name} ${request.staff.last_name}` : "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{request.staff?.employee_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="capitalize">{request.leave_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{request.days_requested} day{request.days_requested !== 1 ? "s" : ""}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatAD(parseISO(request.start_date))} -{" "}
                            {formatAD(parseISO(request.end_date))}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[request.status] || ""}>
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === "pending" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-success hover:text-success hover:bg-success/20"
                              onClick={() => handleApprove(request.id)}
                              disabled={approveLeave.isPending}
                            >
                              {approveLeave.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/20"
                              onClick={() => handleReject(request.id)}
                              disabled={rejectLeave.isPending}
                            >
                              {rejectLeave.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {request.approved_by && `By ${request.approved_by}`}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
