import { useState } from "react";
import { useFrontDeskQueue } from "@/hooks/useFrontDeskQueue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus, Bell, Check, Trash2, Clock, Star } from "lucide-react";
import { format } from "date-fns";

export const QueueManager = () => {
  const { queue, isLoading, addToQueue, updateQueueStatus, deleteFromQueue } = useFrontDeskQueue();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    guest_name: "",
    requested_room_type: "Standard",
    priority: "normal",
    notes: ""
  });

  const handleAdd = async () => {
    await addToQueue.mutateAsync(newEntry);
    setIsAddOpen(false);
    setNewEntry({ guest_name: "", requested_room_type: "Standard", priority: "normal", notes: "" });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'vip': return <Badge className="bg-primary text-white"><Star className="h-3 w-3 mr-1 fill-white" /> VIP</Badge>;
      case 'urgent': return <Badge variant="destructive">Urgent</Badge>;
      default: return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'notified': return <Badge variant="outline" className="text-blue-500 border-blue-500">Notified</Badge>;
      case 'checked_in': return <Badge variant="outline" className="text-success border-success">Checked In</Badge>;
      default: return <Badge variant="outline">Waiting</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold font-display">Guest Arrival Queue</h3>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Add Guest to Queue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Queue</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Guest Name</Label>
                <Input
                  value={newEntry.guest_name}
                  onChange={(e) => setNewEntry({...newEntry, guest_name: e.target.value})}
                  placeholder="Full guest name"
                />
              </div>
              <div className="space-y-2">
                <Label>Requested Room Type</Label>
                <Select
                  value={newEntry.requested_room_type}
                  onValueChange={(v) => setNewEntry({...newEntry, requested_room_type: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard Room</SelectItem>
                    <SelectItem value="Deluxe">Deluxe Room</SelectItem>
                    <SelectItem value="Suite">Executive Suite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newEntry.priority}
                  onValueChange={(v) => setNewEntry({...newEntry, priority: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="vip">VIP Guest</SelectItem>
                    <SelectItem value="urgent">Urgent Room Move</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={newEntry.notes}
                  onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                  placeholder="Reason for waiting, phone number, etc."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={addToQueue.isPending}>Add to Queue</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card variant="elevated">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/30">
                <TableHead>Wait Time</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Requested Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {format(new Date(entry.created_at), "HH:mm")}
                  </TableCell>
                  <TableCell className="font-medium">{entry.guest_name}</TableCell>
                  <TableCell>{entry.requested_room_type}</TableCell>
                  <TableCell>{getPriorityBadge(entry.priority)}</TableCell>
                  <TableCell>{getStatusBadge(entry.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Notify Guest"
                        onClick={() => updateQueueStatus.mutate({ id: entry.id, status: 'notified' })}
                        disabled={entry.status !== 'waiting'}
                      >
                        <Bell className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Mark Checked-in"
                        onClick={() => updateQueueStatus.mutate({ id: entry.id, status: 'checked_in' })}
                        disabled={entry.status === 'checked_in'}
                      >
                        <Check className="h-4 w-4 text-success" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Remove"
                        onClick={() => deleteFromQueue.mutate(entry.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {queue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                    The arrival queue is currently empty.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
