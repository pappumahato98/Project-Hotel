import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Calendar, Plus, Loader2, Trash2 } from "lucide-react";
import { useStaffSchedules } from "@/hooks/useHR";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { formatAD } from "@/lib/utils";
import { toast } from "sonner";

export function SchedulesTab() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [addOpen, setAddOpen] = useState(false);
  const { data: schedules = [], isLoading, createSchedule, deleteSchedule } = useStaffSchedules({ date: selectedDate });
  const { data: staff = [] } = useStaffMembers();

  const [newShift, setNewShift] = useState({
    staff_id: "", shift_date: selectedDate, shift_start: "09:00", shift_end: "17:00",
    department: "", position: "", status: "scheduled", notes: "",
  });

  const handleCreate = () => {
    if (!newShift.staff_id) { toast.error("Select a staff member"); return; }
    createSchedule.mutate({
      ...newShift,
      shift_date: selectedDate,
      updated_at: new Date().toISOString(),
    } as any, {
      onSuccess: () => { setAddOpen(false); toast.success("Shift created"); },
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-48" />
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Add Shift</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shift Schedule — {formatAD(selectedDate)}</CardTitle>
          <CardDescription>{schedules.length} shift(s) scheduled</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : schedules.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No shifts scheduled for this date.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.staff?.first_name} {s.staff?.last_name}</TableCell>
                    <TableCell>{s.department || "—"}</TableCell>
                    <TableCell>{s.shift_start}</TableCell>
                    <TableCell>{s.shift_end}</TableCell>
                    <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteSchedule.mutate(s.id)}>
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Shift</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={newShift.staff_id} onValueChange={(v) => setNewShift({ ...newShift, staff_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.department}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={newShift.shift_start} onChange={(e) => setNewShift({ ...newShift, shift_start: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={newShift.shift_end} onChange={(e) => setNewShift({ ...newShift, shift_end: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createSchedule.isPending}>Create Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
