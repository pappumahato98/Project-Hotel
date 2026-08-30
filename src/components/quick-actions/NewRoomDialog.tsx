import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface NewRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface RoomFormData {
  room_number: string;
  room_type: string;
  floor: number;
  capacity: number;
  price_per_night: number;
  status: string;
  description: string;
}

const initialFormData: RoomFormData = {
  room_number: "",
  room_type: "standard",
  floor: 1,
  capacity: 2,
  price_per_night: 100,
  status: "available",
  description: "",
};

const roomTypes = [
  { value: "standard", label: "Standard" },
  { value: "deluxe", label: "Deluxe" },
  { value: "suite", label: "Suite" },
  { value: "presidential", label: "Presidential Suite" },
];

const roomStatuses = [
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "cleaning", label: "Cleaning" },
  { value: "maintenance", label: "Maintenance" },
];

export function NewRoomDialog({ open, onOpenChange, onSuccess }: NewRoomDialogProps) {
  const [formData, setFormData] = useState<RoomFormData>(initialFormData);
  const queryClient = useQueryClient();

  const createRoomMutation = useMutation({
    mutationFn: async (data: RoomFormData) => {
      const { data: room, error } = await supabase
        .from("rooms")
        .insert({
          room_number: data.room_number,
          room_type: data.room_type,
          floor: data.floor,
          capacity: data.capacity,
          price_per_night: data.price_per_night,
          status: data.status,
          description: data.description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return room;
    },
    onSuccess: () => {
      toast.success("Room created successfully");
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      onOpenChange(false);
      setFormData(initialFormData);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("Failed to create room: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.room_number) {
      toast.error("Room number is required");
      return;
    }
    createRoomMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData(initialFormData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
            <DialogDescription>
              Create a new room in the property. Press Ctrl+R to open this dialog.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room_number">Room Number *</Label>
                <Input
                  id="room_number"
                  placeholder="e.g., 101"
                  value={formData.room_number}
                  onChange={(e) =>
                    setFormData({ ...formData, room_number: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  type="number"
                  min={1}
                  value={formData.floor}
                  onChange={(e) =>
                    setFormData({ ...formData, floor: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room_type">Room Type</Label>
                <Select
                  value={formData.room_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, room_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roomTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roomStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity (guests)</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: parseInt(e.target.value) || 2 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_per_night">Price per Night ($)</Label>
                <Input
                  id="price_per_night"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.price_per_night}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_per_night: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Room description..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createRoomMutation.isPending}>
              {createRoomMutation.isPending ? "Creating..." : "Create Room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
