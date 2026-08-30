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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Plus, ClipboardList, CalendarIcon, Trash2, Edit, Loader2, Filter, Search
} from "lucide-react";
import { toast } from "sonner";
import { useHousekeepingTasks, useHousekeepingStats, HousekeepingTask } from "@/hooks/useHousekeeping";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatAD } from "@/lib/utils";

const taskStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground" },
  in_progress: { label: "In Progress", color: "bg-amber-500/20 text-amber-400" },
  completed: { label: "Completed", color: "bg-success/20 text-success" },
  cancelled: { label: "Cancelled", color: "bg-destructive/20 text-destructive" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-blue-500/20 text-blue-400" },
  normal: { label: "Normal", color: "bg-muted text-muted-foreground" },
  high: { label: "High", color: "bg-amber-500/20 text-amber-400" },
  urgent: { label: "Urgent", color: "bg-destructive/20 text-destructive" },
};

export function TasksTab() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<HousekeepingTask | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: tasks = [], isLoading, createTask, updateTask, updateTaskStatus } = useHousekeepingTasks({ date: dateStr });
  const stats = useHousekeepingStats(dateStr);

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id, room_number, room_type").order("room_number");
      if (error) throw error;
      return data;
    },
  });

  const { data: staffMembers = [] } = useStaffMembers();
  const housekeepingStaff = staffMembers.filter(
    s => s.department?.toLowerCase() === "housekeeping" && s.status === "active"
  );

  const [newTask, setNewTask] = useState({
    room_id: "",
    task_type: "routine",
    priority: "normal",
    scheduled_date: dateStr,
    assigned_to: "",
    notes: "",
  });

  const filteredTasks = tasks.filter((task) => {
    const matchesStatus = filterStatus === "all" || task.status === filterStatus;
    const matchesSearch = 
      task.room?.room_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.task_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assigned_to?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreateTask = async () => {
    try {
      await createTask.mutateAsync({ 
        ...newTask, 
        status: "pending",
        scheduled_date: dateStr,
      } as any);
      toast.success("Task created successfully");
      setTaskDialogOpen(false);
      setNewTask({ room_id: "", task_type: "routine", priority: "normal", scheduled_date: dateStr, assigned_to: "", notes: "" });
    } catch (error: any) {
      toast.error(error.message || "Failed to create task");
    }
  };

  const handleUpdateTask = async () => {
    if (!editTask) return;
    try {
      await updateTask.mutateAsync({
        id: editTask.id,
        task_type: newTask.task_type,
        priority: newTask.priority,
        assigned_to: newTask.assigned_to || null,
        notes: newTask.notes,
      });
      toast.success("Task updated");
      setEditTask(null);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleStatusChange = (taskId: string, status: string) => {
    updateTaskStatus.mutate({ id: taskId, status });
  };

  const openEditDialog = (task: HousekeepingTask) => {
    setEditTask(task);
    setNewTask({
      room_id: task.room_id || "",
      task_type: task.task_type,
      priority: task.priority,
      scheduled_date: task.scheduled_date,
      assigned_to: task.assigned_to || "",
      notes: task.notes || "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-success">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>
        <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="blue" className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
              <DialogDescription>Assign a housekeeping task</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Room</Label>
                <Select value={newTask.room_id} onValueChange={(v) => setNewTask({ ...newTask, room_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent>
                    {rooms.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.room_number} - {r.room_type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Task Type</Label>
                  <Select value={newTask.task_type} onValueChange={(v) => setNewTask({ ...newTask, task_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="routine">Routine Clean</SelectItem>
                      <SelectItem value="deep_clean">Deep Clean</SelectItem>
                      <SelectItem value="turndown">Turndown</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="special">Special Request</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={newTask.assigned_to} onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v })}>
                  <SelectTrigger><SelectValue placeholder="Select staff (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {housekeepingStaff.map((s) => (
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
                  value={newTask.notes} 
                  onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTask} disabled={!newTask.room_id || createTask.isPending}>
                {createTask.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {formatAD(selectedDate)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
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

      {/* Tasks Table */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Tasks for {formatAD(selectedDate)}
          </CardTitle>
          <CardDescription>{filteredTasks.length} tasks</CardDescription>
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
                    <TableHead>Room</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No tasks for this date. Click "New Task" to create one.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.room?.room_number || "N/A"}</TableCell>
                        <TableCell className="capitalize">{task.task_type.replace("_", " ")}</TableCell>
                        <TableCell>
                          <Badge className={priorityConfig[task.priority]?.color}>
                            {priorityConfig[task.priority]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell>{task.assigned_to || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                        <TableCell>
                          <Badge className={taskStatusConfig[task.status]?.color}>
                            {taskStatusConfig[task.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {task.started_at && <div>Started: {format(new Date(task.started_at), "HH:mm")}</div>}
                          {task.completed_at && <div>Done: {format(new Date(task.completed_at), "HH:mm")}</div>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(task)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Edit Task Dialog */}
      <Dialog open={!!editTask} onOpenChange={() => setEditTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Task Type</Label>
                <Select value={newTask.task_type} onValueChange={(v) => setNewTask({ ...newTask, task_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine Clean</SelectItem>
                    <SelectItem value="deep_clean">Deep Clean</SelectItem>
                    <SelectItem value="turndown">Turndown</SelectItem>
                    <SelectItem value="inspection">Inspection</SelectItem>
                    <SelectItem value="special">Special Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={newTask.assigned_to} onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v })}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {housekeepingStaff.map((s) => (
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
                value={newTask.notes} 
                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTask(null)}>Cancel</Button>
            <Button onClick={handleUpdateTask} disabled={updateTask.isPending}>
              {updateTask.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
