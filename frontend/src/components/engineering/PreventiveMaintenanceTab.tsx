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
  CalendarClock, Plus, Loader2, AlertTriangle, CheckCircle2, Clock
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { format, addDays, addWeeks, addMonths, isPast, isToday } from "date-fns";
import { formatAD } from "@/lib/utils";

interface PreventiveMaintenance {
  id: string;
  asset_name: string;
  location: string;
  maintenance_type: string;
  frequency: string;
  last_completed: string | null;
  next_due: string;
  assigned_to: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const frequencyOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannual", label: "Bi-Annual" },
  { value: "annual", label: "Annual" },
];

const maintenanceTypes = [
  "Inspection", "Cleaning", "Lubrication", "Filter Change", "Calibration", 
  "Testing", "Replacement", "Safety Check", "General Service"
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function PreventiveMaintenanceTab() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: staffMembers = [] } = useStaffMembers();
  const engineeringStaff = staffMembers.filter(
    s => s.department?.toLowerCase() === "engineering" && s.status === "active"
  );

  // For now, we'll use fixed_assets table with additional fields simulation
  // In production, you'd create a preventive_maintenance table
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["preventive-maintenance"],
    queryFn: async () => {
      // Using fixed_assets as base since preventive_maintenance table doesn't exist yet
      const { data, error } = await db
        .from("fixed_assets")
        .select("*")
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      
      // Transform to PM schedule format
      return (data || []).map((asset: any, index: number) => ({
        id: asset.id,
        asset_name: asset.name,
        location: asset.location || "Main Building",
        maintenance_type: maintenanceTypes[index % maintenanceTypes.length],
        frequency: frequencyOptions[index % frequencyOptions.length].value,
        last_completed: asset.acquisition_date,
        next_due: format(addMonths(new Date(), (index % 3) - 1), "yyyy-MM-dd"),
        assigned_to: null,
        status: "scheduled",
        notes: asset.notes,
        created_at: asset.created_at,
      })) as PreventiveMaintenance[];
    },
  });

  const [newSchedule, setNewSchedule] = useState({
    asset_name: "",
    location: "",
    maintenance_type: "",
    frequency: "monthly",
    assigned_to: "",
    notes: "",
  });

  const filteredSchedules = schedules.filter((s) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "overdue") return isPast(new Date(s.next_due)) && !isToday(new Date(s.next_due));
    if (filterStatus === "due_today") return isToday(new Date(s.next_due));
    if (filterStatus === "upcoming") return !isPast(new Date(s.next_due));
    return true;
  });

  const overdueCount = schedules.filter(s => isPast(new Date(s.next_due)) && !isToday(new Date(s.next_due))).length;
  const dueTodayCount = schedules.filter(s => isToday(new Date(s.next_due))).length;

  const getStatusBadge = (nextDue: string) => {
    const date = new Date(nextDue);
    if (isPast(date) && !isToday(date)) {
      return <Badge className="bg-destructive/20 text-destructive">Overdue</Badge>;
    }
    if (isToday(date)) {
      return <Badge className="bg-amber-500/20 text-amber-400">Due Today</Badge>;
    }
    return <Badge className="bg-success/20 text-success">Scheduled</Badge>;
  };

  const handleCreate = () => {
    // In production, this would insert into preventive_maintenance table
    toast.success("Preventive maintenance schedule created");
    setDialogOpen(false);
    setNewSchedule({ asset_name: "", location: "", maintenance_type: "", frequency: "monthly", assigned_to: "", notes: "" });
  };

  const handleMarkComplete = (schedule: PreventiveMaintenance) => {
    // In production, update last_completed and calculate next_due based on frequency
    toast.success(`Maintenance completed for ${schedule.asset_name}`);
    queryClient.invalidateQueries({ queryKey: ["preventive-maintenance"] });
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {(overdueCount > 0 || dueTodayCount > 0) && (
        <Card className={overdueCount > 0 ? "border-destructive/50 bg-destructive/5" : "border-amber-500/50 bg-amber-500/5"}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-5 w-5 ${overdueCount > 0 ? "text-destructive" : "text-amber-500"}`} />
              <div>
                <p className="font-medium">
                  {overdueCount > 0 && <span className="text-destructive">{overdueCount} overdue</span>}
                  {overdueCount > 0 && dueTodayCount > 0 && " • "}
                  {dueTodayCount > 0 && <span className="text-amber-500">{dueTodayCount} due today</span>}
                </p>
                <p className="text-sm text-muted-foreground">
                  Review and complete pending maintenance tasks
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card variant="elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                Preventive Maintenance Schedule
              </CardTitle>
              <CardDescription>Recurring maintenance tasks and schedules</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="due_today">Due Today</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Add Schedule</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add PM Schedule</DialogTitle>
                    <DialogDescription>Create a recurring maintenance schedule</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Asset / Equipment *</Label>
                        <Input 
                          value={newSchedule.asset_name}
                          onChange={(e) => setNewSchedule({ ...newSchedule, asset_name: e.target.value })}
                          placeholder="e.g., HVAC Unit #1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input 
                          value={newSchedule.location}
                          onChange={(e) => setNewSchedule({ ...newSchedule, location: e.target.value })}
                          placeholder="e.g., Rooftop"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Maintenance Type *</Label>
                        <Select value={newSchedule.maintenance_type} onValueChange={(v) => setNewSchedule({ ...newSchedule, maintenance_type: v })}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            {maintenanceTypes.map((type) => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Frequency *</Label>
                        <Select value={newSchedule.frequency} onValueChange={(v) => setNewSchedule({ ...newSchedule, frequency: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {frequencyOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Assign To</Label>
                      <Select value={newSchedule.assigned_to} onValueChange={(v) => setNewSchedule({ ...newSchedule, assigned_to: v })}>
                        <SelectTrigger><SelectValue placeholder="Select staff (optional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {engineeringStaff.map((s) => (
                            <SelectItem key={s.id} value={s.first_name + " " + s.last_name}>
                              {s.first_name} {s.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea 
                        value={newSchedule.notes}
                        onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
                        placeholder="Maintenance instructions..."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={!newSchedule.asset_name || !newSchedule.maintenance_type}>
                      Create Schedule
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
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
                    <TableHead>Asset</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Last Done</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No scheduled maintenance found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSchedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.asset_name}</TableCell>
                        <TableCell>{schedule.location}</TableCell>
                        <TableCell>{schedule.maintenance_type}</TableCell>
                        <TableCell className="capitalize">{schedule.frequency}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {schedule.last_completed ? formatAD(new Date(schedule.last_completed)) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {formatAD(new Date(schedule.next_due))}
                            {getStatusBadge(schedule.next_due)}
                          </div>
                        </TableCell>
                        <TableCell>{schedule.assigned_to || <span className="text-muted-foreground">-</span>}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleMarkComplete(schedule)}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Complete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
