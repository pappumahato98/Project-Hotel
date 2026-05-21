import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Bed, CheckCircle2, Clock, AlertCircle, Sparkles, User, Filter, RefreshCw, Loader2, Users
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaffMembers } from "@/hooks/useStaffMembers";

type RoomStatus = "clean" | "dirty" | "inspected" | "out_of_order" | "in_progress";

interface RoomHousekeepingStatus {
  id: string;
  room_id: string;
  status: RoomStatus;
  assigned_to: string | null;
  priority: string;
  updated_at: string;
}

const statusConfig: Record<RoomStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  clean: { label: "Clean", color: "bg-success/20 text-success border-success/30", icon: CheckCircle2 },
  dirty: { label: "Dirty", color: "bg-destructive/20 text-destructive border-destructive/30", icon: AlertCircle },
  inspected: { label: "Inspected", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Sparkles },
  out_of_order: { label: "Out of Order", color: "bg-muted text-muted-foreground border-border", icon: AlertCircle },
  in_progress: { label: "In Progress", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock },
};

export function RoomsTab() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFloor, setFilterFloor] = useState<string>("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>("");

  const { data: staffMembers = [] } = useStaffMembers();
  const housekeepingStaff = staffMembers.filter(
    s => s.department?.toLowerCase() === "housekeeping" && s.status === "active"
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: rooms, isLoading, refetch } = useQuery({
    queryKey: ["housekeeping-rooms-status"],
    queryFn: async () => {
      const { data: roomsData, error } = await supabase.from("rooms").select("*").order("room_number");
      if (error) throw error;
      
      // Get housekeeping status from housekeeping_tasks for today
      const today = new Date().toISOString().split("T")[0];
      const { data: tasks } = await db
        .from("housekeeping_tasks")
        .select("room_id, status, assigned_to, priority")
        .eq("scheduled_date", today)
        .order("created_at", { ascending: false });
      
      // Map tasks to rooms
      const taskMap = new Map<string, any>();
      (tasks || []).forEach((t: any) => {
        if (t.room_id && !taskMap.has(t.room_id)) {
          taskMap.set(t.room_id, t);
        }
      });

      return roomsData.map((room: any) => {
        const task = taskMap.get(room.id);
        let hkStatus: RoomStatus = "dirty";
        if (task) {
          if (task.status === "completed") hkStatus = "clean";
          else if (task.status === "in_progress") hkStatus = "in_progress";
        }
        if (room.status === "maintenance") hkStatus = "out_of_order";
        
        return {
          ...room,
          housekeeping_status: hkStatus,
          assigned_to: task?.assigned_to || null,
          priority: task?.priority || "normal",
        };
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ roomId, status, assignedTo }: { roomId: string; status: RoomStatus; assignedTo?: string }) => {
      const today = new Date().toISOString().split("T")[0];
      
      // Check if task exists for today
      const { data: existing } = await db
        .from("housekeeping_tasks")
        .select("id")
        .eq("room_id", roomId)
        .eq("scheduled_date", today)
        .single();
      
      const taskStatus = status === "clean" ? "completed" : status === "in_progress" ? "in_progress" : "pending";
      
      if (existing) {
        const update: any = { status: taskStatus };
        if (status === "clean") update.completed_at = new Date().toISOString();
        if (status === "in_progress") update.started_at = new Date().toISOString();
        if (assignedTo) update.assigned_to = assignedTo;
        
        await db.from("housekeeping_tasks").update(update).eq("id", existing.id);
      } else {
        await db.from("housekeeping_tasks").insert({
          room_id: roomId,
          task_type: "routine",
          status: taskStatus,
          scheduled_date: today,
          priority: "normal",
          assigned_to: assignedTo || null,
          started_at: status === "in_progress" ? new Date().toISOString() : null,
          completed_at: status === "clean" ? new Date().toISOString() : null,
        });
      }
    },
    onSuccess: async (_, variables) => {
      // Sync with rooms table if status is clean or inspected
      if (variables.status === "clean" || variables.status === "inspected") {
        await supabase.from("rooms").update({ status: "available" }).eq("id", variables.roomId);
      } else if (variables.status === "dirty" || variables.status === "in_progress") {
        await supabase.from("rooms").update({ status: "cleaning" }).eq("id", variables.roomId);
      } else if (variables.status === "out_of_order") {
        await supabase.from("rooms").update({ status: "maintenance" }).eq("id", variables.roomId);
      }

      queryClient.invalidateQueries({ queryKey: ["housekeeping-rooms-status"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      toast.success("Room status updated and synced with Front Desk");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleStatusChange = (roomId: string, newStatus: RoomStatus) => {
    updateStatusMutation.mutate({ roomId, status: newStatus });
  };

  const handleAssign = () => {
    if (!selectedRoom || !selectedStaff) return;
    updateStatusMutation.mutate({ 
      roomId: selectedRoom.id, 
      status: selectedRoom.housekeeping_status,
      assignedTo: selectedStaff 
    });
    setAssignDialogOpen(false);
    setSelectedRoom(null);
    setSelectedStaff("");
  };

  const floors = rooms ? [...new Set(rooms.map((r: any) => r.floor))].sort() : [];

  const filteredRooms = rooms?.filter((room: any) => {
    const matchesStatus = filterStatus === "all" || room.housekeeping_status === filterStatus;
    const matchesFloor = filterFloor === "all" || room.floor.toString() === filterFloor;
    return matchesStatus && matchesFloor;
  });

  const roomStats = {
    clean: rooms?.filter((r: any) => r.housekeeping_status === "clean").length || 0,
    dirty: rooms?.filter((r: any) => r.housekeeping_status === "dirty").length || 0,
    inProgress: rooms?.filter((r: any) => r.housekeeping_status === "in_progress").length || 0,
    inspected: rooms?.filter((r: any) => r.housekeeping_status === "inspected").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:border-success/50" onClick={() => setFilterStatus("clean")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clean</p>
                <p className="text-2xl font-bold text-success">{roomStats.clean}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-destructive/50" onClick={() => setFilterStatus("dirty")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dirty</p>
                <p className="text-2xl font-bold text-destructive">{roomStats.dirty}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-amber-500/50" onClick={() => setFilterStatus("in_progress")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-amber-400">{roomStats.inProgress}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-blue-500/50" onClick={() => setFilterStatus("inspected")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inspected</p>
                <p className="text-2xl font-bold text-blue-400">{roomStats.inspected}</p>
              </div>
              <Sparkles className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="clean">Clean</SelectItem>
            <SelectItem value="dirty">Dirty</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="inspected">Inspected</SelectItem>
            <SelectItem value="out_of_order">Out of Order</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterFloor} onValueChange={setFilterFloor}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Floor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Floors</SelectItem>
            {floors.map((floor) => (
              <SelectItem key={floor} value={(floor as number).toString()}>Floor {floor}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { setFilterStatus("all"); setFilterFloor("all"); }}>
          Clear Filters
        </Button>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Room Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredRooms?.map((room: any) => {
            const StatusIcon = statusConfig[room.housekeeping_status as RoomStatus]?.icon || AlertCircle;
            return (
              <Card 
                key={room.id} 
                variant="elevated" 
                className={`relative ${room.priority === "high" ? "ring-2 ring-destructive/50" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bed className="h-4 w-4 text-muted-foreground" />
                      <span className="font-bold">{room.room_number}</span>
                    </div>
                    {room.priority === "high" && (
                      <Badge className="bg-destructive/20 text-destructive text-xs">Urgent</Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2 truncate">{room.room_type}</p>
                  
                  <Badge 
                    variant="outline" 
                    className={`${statusConfig[room.housekeeping_status as RoomStatus]?.color} w-full justify-center mb-3`}
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig[room.housekeeping_status as RoomStatus]?.label}
                  </Badge>

                  {room.assigned_to && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                      <User className="h-3 w-3" />
                      <span className="truncate">{room.assigned_to}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Select 
                      value={room.housekeeping_status} 
                      onValueChange={(v) => handleStatusChange(room.id, v as RoomStatus)}
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dirty">Mark Dirty</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="clean">Mark Clean</SelectItem>
                        <SelectItem value="inspected">Inspected</SelectItem>
                        <SelectItem value="out_of_order">Out of Order</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => { setSelectedRoom(room); setAssignDialogOpen(true); }}
                    >
                      <Users className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assign Staff Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Staff to Room {selectedRoom?.room_number}</DialogTitle>
            <DialogDescription>Select a housekeeping staff member to assign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {housekeepingStaff.map((staff) => (
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

