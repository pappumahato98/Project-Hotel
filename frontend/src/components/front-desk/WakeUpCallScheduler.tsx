import { useState, useMemo } from "react";
import { useWakeUpCalls } from "@/hooks/useWakeUpCalls";
import { useRooms } from "@/hooks/useRooms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlarmClock, Plus, Check, X, Phone } from "lucide-react";
import { format } from "date-fns";
import { formatAD } from "@/lib/utils";

export function WakeUpCallScheduler() {
  const { data: calls = [], scheduleCall, updateCallStatus, cancelCall } = useWakeUpCalls();
  const { data: rooms = [] } = useRooms();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    guest_name: "",
    room_number: "",
    call_time: "06:00",
    call_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const occupiedRooms = useMemo(() => rooms.filter((r) => r.status === "occupied"), [rooms]);

  const todayCalls = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return calls.filter((c) => c.call_date === today);
  }, [calls]);

  const handleSchedule = () => {
    scheduleCall.mutate(
      {
        guest_name: form.guest_name,
        room_number: form.room_number,
        call_time: form.call_time,
        call_date: form.call_date,
        notes: form.notes || null,
        guest_id: null,
        reservation_id: null,
        room_id: null,
      },
      {
        onSuccess: () => {
          setIsAddOpen(false);
          setForm({ guest_name: "", room_number: "", call_time: "06:00", call_date: new Date().toISOString().split("T")[0], notes: "" });
        },
      }
    );
  };

  const statusColors: Record<string, string> = {
    pending: "bg-warning/20 text-warning border-warning/30",
    completed: "bg-success/20 text-success border-success/30",
    missed: "bg-destructive/20 text-destructive border-destructive/30",
    cancelled: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold font-display flex items-center gap-2">
            <AlarmClock className="h-5 w-5 text-primary" />
            Wake-Up Call Scheduler
          </h3>
          <p className="text-sm text-muted-foreground">
            {todayCalls.filter((c) => c.status === "pending").length} pending calls today
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Schedule Call</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Wake-Up Call</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Guest Name</Label>
                  <Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Room</Label>
                  <Select value={form.room_number} onValueChange={(v) => setForm({ ...form, room_number: v })}>
                    <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                    <SelectContent>
                      {occupiedRooms.map((r) => (
                        <SelectItem key={r.id} value={r.room_number}>Room {r.room_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Call Time</Label>
                  <Input type="time" value={form.call_time} onChange={(e) => setForm({ ...form, call_time: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Call Date</Label>
                  <Input type="date" value={form.call_date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, call_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Special instructions..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleSchedule} disabled={!form.guest_name || !form.room_number || scheduleCall.isPending}>
                {scheduleCall.isPending ? "Scheduling..." : "Schedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass"><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Today's Calls</p>
          <p className="text-2xl font-bold">{todayCalls.length}</p>
        </CardContent></Card>
        <Card variant="glass" className="bg-warning/5"><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-warning">{todayCalls.filter((c) => c.status === "pending").length}</p>
        </CardContent></Card>
        <Card variant="glass" className="bg-success/5"><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-2xl font-bold text-success">{todayCalls.filter((c) => c.status === "completed").length}</p>
        </CardContent></Card>
        <Card variant="glass" className="bg-destructive/5"><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Missed</p>
          <p className="text-2xl font-bold text-destructive">{todayCalls.filter((c) => c.status === "missed").length}</p>
        </CardContent></Card>
      </div>

      <Card variant="elevated">
        <CardHeader><CardTitle className="text-sm">All Wake-Up Calls</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No wake-up calls scheduled</TableCell></TableRow>
              ) : (
                calls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell className="font-mono font-bold text-primary">{call.call_time}</TableCell>
                    <TableCell className="text-sm">{formatAD(new Date(call.call_date))}</TableCell>
                    <TableCell className="font-medium">{call.guest_name}</TableCell>
                    <TableCell className="font-mono">{call.room_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[call.status] || ""}>{call.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{call.notes || "-"}</TableCell>
                    <TableCell className="text-right">
                      {call.status === "pending" && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => updateCallStatus.mutate({ id: call.id, status: "completed" })}>
                            <Check className="h-4 w-4 text-success" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => updateCallStatus.mutate({ id: call.id, status: "missed" })}>
                            <Phone className="h-4 w-4 text-warning" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => cancelCall.mutate(call.id)}>
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
