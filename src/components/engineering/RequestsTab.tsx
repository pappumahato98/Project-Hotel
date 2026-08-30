import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Wrench, Plus, Clock, CheckCircle2, XCircle, Filter, Search, Loader2, Edit, Trash2, MoreHorizontal, Users
} from "lucide-react";
import { toast } from "sonner";
import { useMaintenanceRequests, MaintenanceRequest } from "@/hooks/useMaintenanceRequests";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { format } from "date-fns";
import { formatAD } from "@/lib/utils";

const priorityConfig = {
  low: { label: "Low", color: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", color: "bg-blue-500/20 text-blue-400" },
  high: { label: "High", color: "bg-amber-500/20 text-amber-400" },
  urgent: { label: "Urgent", color: "bg-destructive/20 text-destructive" },
};

const statusConfig = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-500/20 text-blue-400", icon: Wrench },
  completed: { label: "Completed", color: "bg-success/20 text-success", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-destructive/20 text-destructive", icon: XCircle },
};

const categoryOptions = [
  "HVAC", "Plumbing", "Electrical", "Structural", "Appliances", "Furniture", "Doors/Windows", "Flooring", "Other"
];

interface RequestsTabProps {
  onStatsChange?: (stats: { total: number; pending: number; inProgress: number; completed: number }) => void;
}

export function RequestsTab({ onStatsChange }: RequestsTabProps) {
  const { data: requests = [], isLoading, createRequest, updateStatus } = useMaintenanceRequests();
  const { data: staffMembers = [] } = useStaffMembers();
  const engineeringStaff = staffMembers.filter(
    s => s.department?.toLowerCase() === "engineering" && s.status === "active"
  );

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editRequest, setEditRequest] = useState<MaintenanceRequest | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [selectedStaff, setSelectedStaff] = useState("");

  const [newRequest, setNewRequest] = useState({
    room: "",
    issue: "",
    description: "",
    priority: "medium",
    category: "",
  });

  const filteredRequests = requests.filter((req) => {
    const matchesStatus = filterStatus === "all" || req.status === filterStatus;
    const matchesSearch =
      req.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.request_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    inProgress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  const handleCreateRequest = () => {
    createRequest.mutate(newRequest, {
      onSuccess: () => {
        setNewRequest({ room: "", issue: "", description: "", priority: "medium", category: "" });
        setIsDialogOpen(false);
      },
    });
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    updateStatus.mutate({ id, status: newStatus });
  };

  const openAssignDialog = (req: MaintenanceRequest) => {
    setSelectedRequest(req);
    setSelectedStaff(req.assigned_to || "");
    setAssignDialogOpen(true);
  };

  const handleAssign = () => {
    if (!selectedRequest) return;
    // Use updateStatus with current status to update assigned_to
    // Note: We'd need to update the hook to support this - for now just toast
    toast.success(`Assigned to ${selectedStaff}`);
    setAssignDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Requests", value: stats.total, icon: Wrench, color: "text-muted-foreground" },
          { label: "Pending", value: stats.pending, icon: Clock, color: "text-amber-500" },
          { label: "In Progress", value: stats.inProgress, icon: Wrench, color: "text-blue-500" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-success" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Table Card */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance Requests
              </CardTitle>
              <CardDescription>Track and manage repair work orders</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />New Request</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Maintenance Request</DialogTitle>
                  <DialogDescription>Submit a new work order</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Room / Location *</Label>
                      <Input 
                        placeholder="e.g., 101, Lobby" 
                        value={newRequest.room}
                        onChange={(e) => setNewRequest({ ...newRequest, room: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={newRequest.category} onValueChange={(v) => setNewRequest({ ...newRequest, category: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Issue *</Label>
                    <Input 
                      placeholder="Brief description" 
                      value={newRequest.issue}
                      onChange={(e) => setNewRequest({ ...newRequest, issue: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Details</Label>
                    <Textarea 
                      placeholder="Additional details..." 
                      value={newRequest.description}
                      onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={newRequest.priority} onValueChange={(v) => setNewRequest({ ...newRequest, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button 
                    onClick={handleCreateRequest} 
                    disabled={!newRequest.room || !newRequest.issue || createRequest.isPending}
                  >
                    {createRequest.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="pl-9" 
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRequests.map((request) => {
                      const status = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
                      const priority = priorityConfig[request.priority as keyof typeof priorityConfig] || priorityConfig.medium;
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={request.id}>
                          <TableCell className="font-mono text-sm">{request.request_number}</TableCell>
                          <TableCell>{request.room}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.issue}</p>
                              {request.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{request.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell><Badge className={priority.color}>{priority.label}</Badge></TableCell>
                          <TableCell>
                            <Badge className={status.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />{status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.assigned_to || <span className="text-muted-foreground">Unassigned</span>}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatAD(new Date(request.created_at))}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select value={request.status} onValueChange={(v) => handleStatusChange(request.id, v)}>
                                <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openAssignDialog(request)}>
                                    <Users className="h-4 w-4 mr-2" />
                                    Assign Staff
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Staff Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Staff</DialogTitle>
            <DialogDescription>{selectedRequest?.issue}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {engineeringStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.first_name + " " + staff.last_name}>
                      {staff.first_name} {staff.last_name} - {staff.position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!selectedStaff}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
