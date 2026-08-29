import { useState, useMemo } from "react";
import { useRooms } from "@/hooks/useRooms";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowUpCircle, Sparkles, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

const db = supabase as any;

export function RoomUpgradeManager() {
  const { data: rooms = [] } = useRooms();
  const { data: reservations = [] } = useQuery({
    queryKey: ["reservations-full"],
    queryFn: async () => {
      const { data, error } = await db
        .from("reservations")
        .select("*, guests(first_name, last_name), rooms(room_number, room_type)")
        .order("check_in_date", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
  const queryClient = useQueryClient();
  const [selectedRes, setSelectedRes] = useState<any>(null);
  const [targetRoomId, setTargetRoomId] = useState("");
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Get checked-in reservations eligible for upgrade
  const eligibleReservations = useMemo(() => {
    return reservations.filter((r: any) => r.status === "checked_in" || r.status === "confirmed");
  }, [reservations]);

  // Available rooms that are a higher tier
  const upgradeOptions = useMemo(() => {
    if (!selectedRes) return [];
    const currentRoom = rooms.find((r) => r.id === selectedRes.room_id);
    if (!currentRoom) return [];
    return rooms.filter(
      (r) => r.status === "available" && r.price_per_night > currentRoom.price_per_night
    ).sort((a, b) => a.price_per_night - b.price_per_night);
  }, [selectedRes, rooms]);

  const handleUpgrade = async () => {
    if (!selectedRes || !targetRoomId) return;
    setIsUpgrading(true);
    try {
      // Update reservation room
      const { error: resError } = await db
        .from("reservations")
        .update({ room_id: targetRoomId })
        .eq("id", selectedRes.id);
      if (resError) throw resError;

      // Free old room
      await db.from("rooms").update({ status: "cleaning" }).eq("id", selectedRes.room_id);
      // Occupy new room
      await db.from("rooms").update({ status: "occupied" }).eq("id", targetRoomId);

      toast.success("Room upgraded successfully!");
      setSelectedRes(null);
      setTargetRoomId("");
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    } catch (e: any) {
      toast.error("Upgrade failed: " + e.message);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold font-display flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-primary" />
            Room Upgrade Manager
          </h3>
          <p className="text-sm text-muted-foreground">Suggest and apply upgrades for checked-in guests</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card variant="glass" className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Available Upgrades</p>
            <p className="text-2xl font-bold text-primary">
              {rooms.filter((r) => r.status === "available").length}
            </p>
            <p className="text-xs text-muted-foreground">rooms available</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Eligible Guests</p>
            <p className="text-2xl font-bold">{eligibleReservations.length}</p>
            <p className="text-xs text-muted-foreground">checked-in / confirmed</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Potential Revenue</p>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(rooms.filter((r) => r.status === "available").reduce((s, r) => s + Number(r.price_per_night), 0))}
            </p>
            <p className="text-xs text-muted-foreground">from available rooms</p>
          </CardContent>
        </Card>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-sm">Eligible Reservations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Current Room</TableHead>
                <TableHead>Room Type</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligibleReservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No eligible reservations for upgrade
                  </TableCell>
                </TableRow>
              ) : (
                eligibleReservations.map((res: any) => {
                  const room = rooms.find((r) => r.id === res.room_id);
                  return (
                    <TableRow key={res.id}>
                      <TableCell className="font-medium">
                        {res.guests?.first_name} {res.guests?.last_name}
                      </TableCell>
                      <TableCell className="font-mono">{room?.room_number || "-"}</TableCell>
                      <TableCell>{room?.room_type || "-"}</TableCell>
                      <TableCell>{formatCurrency(room?.price_per_night || 0)}/night</TableCell>
                      <TableCell><Badge variant="outline">{res.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setSelectedRes(res)}>
                          <Sparkles className="h-3 w-3" /> Upgrade
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRes} onOpenChange={(o) => !o && setSelectedRes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Upgrade Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Current: Room {rooms.find((r) => r.id === selectedRes?.room_id)?.room_number} ({rooms.find((r) => r.id === selectedRes?.room_id)?.room_type})
            </p>
            <Select value={targetRoomId} onValueChange={setTargetRoomId}>
              <SelectTrigger><SelectValue placeholder="Select new room..." /></SelectTrigger>
              <SelectContent>
                {upgradeOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    Room {r.room_number} - {r.room_type} ({formatCurrency(r.price_per_night)}/night)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {upgradeOptions.length === 0 && (
              <p className="text-sm text-warning">No higher-tier rooms available for upgrade.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRes(null)}>Cancel</Button>
            <Button onClick={handleUpgrade} disabled={!targetRoomId || isUpgrading} className="gap-1">
              <Check className="h-4 w-4" />
              {isUpgrading ? "Upgrading..." : "Confirm Upgrade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
