import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus, Trash2, Clock, ShieldCheck, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEventStaffAssignments, useCreateStaffAssignment, useDeleteStaffAssignment } from "@/hooks/useBanquetData";
import { toast } from "sonner";

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
}

interface BanquetEvent {
  id: string;
  event_name: string;
  client_name: string;
  event_date: string;
}

interface StaffAssignmentPanelProps {
  events: BanquetEvent[];
}

export function StaffAssignmentPanel({ events }: StaffAssignmentPanelProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || "");
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [newAssignment, setNewAssignment] = useState({
    staff_id: "",
    role: "Server",
    start_time: "10:00",
    end_time: "18:00",
    notes: "",
  });

  const [searchParams, setSearchParams] = useSearchParams();

  const { data: assignments = [], isLoading: isLoadingAssignments } = useEventStaffAssignments(selectedEventId);
  const createAssignment = useCreateStaffAssignment();
  const deleteAssignment = useDeleteStaffAssignment();

  // Auto-open dialog if directed from quick setup
  useEffect(() => {
    const setupEventId = searchParams.get("setupEvent");
    const action = searchParams.get("setupAction");
    
    if (setupEventId && action === "assign_staff") {
      setSelectedEventId(setupEventId);
      setAssignmentDialogOpen(true);
      // Clear params after opening
      setSearchParams(prev => {
        prev.delete("setupEvent");
        prev.delete("setupAction");
        return prev;
      });
    }
  }, [searchParams, events]);

  // Fetch all staff members
  const { data: allStaff = [] } = useQuery({
    queryKey: ["staff-members-brief"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_members")
        .select("id, first_name, last_name, position, department")
        .eq("status", "active");
      
      if (error) throw error;
      return data as StaffMember[];
    },
  });

  const handleAddAssignment = async () => {
    if (!newAssignment.staff_id) {
      toast.error("Please select a staff member");
      return;
    }

    await createAssignment.mutateAsync({
      event_id: selectedEventId,
      staff_id: newAssignment.staff_id,
      role: newAssignment.role,
      start_time: newAssignment.start_time,
      end_time: newAssignment.end_time,
      notes: newAssignment.notes,
    });

    setAssignmentDialogOpen(false);
    setNewAssignment({
      staff_id: "",
      role: "Server",
      start_time: "10:00",
      end_time: "18:00",
      notes: "",
    });
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const filteredStaff = allStaff.filter(s => 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Staff Assignments</h2>
          <p className="text-muted-foreground text-sm">
            Manage personnel for scheduled banquet events
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.event_name} ({event.event_date})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setAssignmentDialogOpen(true)} className="gap-2 shrink-0">
            <UserPlus className="h-4 w-4" />
            Assign Staff
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assigned Personnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Staff currently assigned to this event
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Primary Coordinator</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold truncate">
              {assignments.find(a => a.role === "Coordinator")?.staff_member?.first_name || "Unassigned"}
            </div>
            <Badge variant="outline" className="mt-1">Event Lead</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Service Window</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {assignments.length > 0 ? "Multiple Shifts" : "Not Defined"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Details</CardTitle>
          <CardDescription>
            {selectedEvent ? `Staff roster for ${selectedEvent.event_name}` : "Select an event to view assignments"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAssignments ? (
            <div className="py-10 text-center">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              No staff assigned to this event yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.staff_member?.first_name} {assignment.staff_member?.last_name}
                      <p className="text-xs text-muted-foreground">{assignment.staff_member?.position}</p>
                    </TableCell>
                    <TableCell>{assignment.staff_member?.department}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{assignment.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {assignment.start_time} - {assignment.end_time}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
                        <ShieldCheck className="h-3 w-3" /> Confirmed
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => deleteAssignment.mutate(assignment.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Staff Member</DialogTitle>
            <DialogDescription>
              Assign a staff member to {selectedEvent?.event_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search & Select Staff</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filter by name or position..." 
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select 
                value={newAssignment.staff_id} 
                onValueChange={(v) => setNewAssignment(p => ({ ...p, staff_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a staff member" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {filteredStaff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.position})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Event Role</Label>
                <Select 
                  value={newAssignment.role} 
                  onValueChange={(v) => setNewAssignment(p => ({ ...p, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Coordinator">Coordinator</SelectItem>
                    <SelectItem value="Chef">Chef</SelectItem>
                    <SelectItem value="Server">Server</SelectItem>
                    <SelectItem value="Bartender">Bartender</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                    <SelectItem value="Cleaner">Cleaner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Shift Start</Label>
                <Input 
                  type="time" 
                  value={newAssignment.start_time}
                  onChange={(e) => setNewAssignment(p => ({ ...p, start_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Shift End</Label>
              <Input 
                type="time" 
                value={newAssignment.end_time}
                onChange={(e) => setNewAssignment(p => ({ ...p, end_time: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Internal Notes</Label>
              <Input 
                placeholder="Specific instructions for this staff..." 
                value={newAssignment.notes}
                onChange={(e) => setNewAssignment(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAssignment} disabled={createAssignment.isPending}>
              {createAssignment.isPending ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
