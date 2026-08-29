import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  Bed,
  Wrench,
  Sparkles,
  DoorOpen,
  Lock,
  Unlock,
  Settings,
  Tag,
  MessageSquare,
  ArrowRightLeft,
  Users,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { useHousekeepingTasks } from "@/hooks/useHousekeeping";

type Room = Tables<"rooms">;

interface RoomActionsPanelProps {
  selectedRoom: Room | null;
  onClearSelection: () => void;
}

export function RoomActionsPanel({ selectedRoom, onClearSelection }: RoomActionsPanelProps) {
  const { createTask } = useHousekeepingTasks();
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("normal");
  const [assignTo, setAssignTo] = useState("");
  const [priceAdjustment, setPriceAdjustment] = useState("");

  const room = selectedRoom;

  if (!room) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Room Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Select a room to view actions
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleAction = (action: string) => {
    setCurrentAction(action);
    setActionDialogOpen(true);
  };

  const executeAction = async () => {
    try {
      switch (currentAction) {
        case "cleaning":
          await createTask.mutateAsync({
            room_id: room.id,
            task_type: "housekeeping",
            priority: priority,
            status: "pending",
            scheduled_date: new Date().toISOString().split("T")[0],
            scheduled_time: null,
            assigned_to: null,
            started_at: null,
            completed_at: null,
            notes: notes,
            inspection_notes: null,
            inspection_score: null,
          });
          toast.success(`Room ${room.room_number} marked for cleaning`);
          break;
        case "maintenance":
          await createTask.mutateAsync({
            room_id: room.id,
            task_type: "maintenance",
            priority: priority,
            status: "pending",
            scheduled_date: new Date().toISOString().split("T")[0],
            scheduled_time: null,
            assigned_to: null,
            started_at: null,
            completed_at: null,
            notes: notes,
            inspection_notes: null,
            inspection_score: null,
          });
          toast.success(`Maintenance request created for Room ${room.room_number}`);
          break;
        case "available":
          toast.success(`Room ${room.room_number} is now available`);
          break;
        case "block":
          toast.success(`Room ${room.room_number} has been blocked`);
          break;
        case "price":
          toast.success(`Price updated for Room ${room.room_number}`);
          break;
        case "message":
          toast.success(`Message sent regarding Room ${room.room_number}`);
          break;
        case "transfer":
          toast.success(`Guest transfer initiated from Room ${room.room_number}`);
          break;
      }
    } catch (error) {
      toast.error("Action failed");
    }
    setActionDialogOpen(false);
    setNotes("");
    setPriority("normal");
    setAssignTo("");
    onClearSelection();
  };

  const quickActions = [
    {
      id: "cleaning",
      label: "Request Cleaning",
      icon: Sparkles,
      color: "text-amber-400",
      show: room.status !== "cleaning",
    },
    {
      id: "maintenance",
      label: "Report Issue",
      icon: Wrench,
      color: "text-destructive",
      show: room.status !== "maintenance",
    },
    {
      id: "available",
      label: "Mark Available",
      icon: DoorOpen,
      color: "text-success",
      show: room.status !== "available" && room.status !== "occupied",
    },
    {
      id: "block",
      label: "Block Room",
      icon: Lock,
      color: "text-muted-foreground",
      show: room.status === "available",
    },
    {
      id: "price",
      label: "Adjust Price",
      icon: Tag,
      color: "text-primary",
      show: true,
    },
    {
      id: "message",
      label: "Send Message",
      icon: MessageSquare,
      color: "text-blue-400",
      show: room.status === "occupied",
    },
    {
      id: "transfer",
      label: "Transfer Guest",
      icon: ArrowRightLeft,
      color: "text-purple-400",
      show: room.status === "occupied",
    },
  ];

  const getActionContent = () => {
    switch (currentAction) {
      case "cleaning":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Standard cleaning</SelectItem>
                  <SelectItem value="normal">Normal - Regular turnover</SelectItem>
                  <SelectItem value="high">High - Express cleaning</SelectItem>
                  <SelectItem value="urgent">Urgent - Immediate attention</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Special Instructions</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any specific cleaning requirements..."
                rows={3}
              />
            </div>
          </div>
        );
      case "maintenance":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Issue Description *</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the maintenance issue..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Non-urgent</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High - Affects guest</SelectItem>
                  <SelectItem value="urgent">Urgent - Room unusable</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "price":
        return (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-secondary/50">
              <p className="text-sm text-muted-foreground">Current Price</p>
              <p className="text-2xl font-bold">${room.price_per_night}/night</p>
            </div>
            <div className="space-y-2">
              <Label>New Price</Label>
              <Input
                type="number"
                value={priceAdjustment}
                onChange={(e) => setPriceAdjustment(e.target.value)}
                placeholder="Enter new price..."
              />
            </div>
            <div className="space-y-2">
              <Label>Reason for Change</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Seasonal, promotion, etc..."
                rows={2}
              />
            </div>
          </div>
        );
      case "message":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Message to Guest</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type your message..."
                rows={4}
              />
            </div>
          </div>
        );
      case "transfer":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target Room</Label>
              <Select value={assignTo} onValueChange={setAssignTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="201">Room 201 - Deluxe</SelectItem>
                  <SelectItem value="305">Room 305 - Suite</SelectItem>
                  <SelectItem value="402">Room 402 - Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason for Transfer</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Guest request, maintenance, upgrade..."
                rows={2}
              />
            </div>
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>
        );
    }
  };

  const getActionTitle = () => {
    switch (currentAction) {
      case "cleaning":
        return "Request Cleaning";
      case "maintenance":
        return "Report Maintenance Issue";
      case "available":
        return "Mark Room Available";
      case "block":
        return "Block Room";
      case "price":
        return "Adjust Room Price";
      case "message":
        return "Send Guest Message";
      case "transfer":
        return "Transfer Guest";
      default:
        return "Room Action";
    }
  };

  return (
    <>
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bed className="h-5 w-5" />
              Room {room.room_number}
            </div>
            <Badge
              variant="outline"
              className={
                room.status === "available"
                  ? "bg-success/20 text-success"
                  : room.status === "occupied"
                  ? "bg-primary/20 text-primary"
                  : room.status === "cleaning"
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-destructive/20 text-destructive"
              }
            >
              {room.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Type</p>
              <p className="font-medium">{room.room_type}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Floor</p>
              <p className="font-medium">{room.floor}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Capacity</p>
              <p className="font-medium flex items-center gap-1">
                <Users className="h-4 w-4" /> {room.capacity}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Price</p>
              <p className="font-medium text-primary">${room.price_per_night}/night</p>
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <p className="text-sm font-medium mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {quickActions
                .filter((a) => a.show)
                .map((action) => (
                  <Button
                    key={action.id}
                    variant="outline"
                    size="sm"
                    className="gap-2 justify-start"
                    onClick={() => handleAction(action.id)}
                  >
                    <action.icon className={`h-4 w-4 ${action.color}`} />
                    {action.label}
                  </Button>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{getActionTitle()}</DialogTitle>
            <DialogDescription>Room {room.room_number} - {room.room_type}</DialogDescription>
          </DialogHeader>
          {getActionContent()}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="blue" onClick={executeAction}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
