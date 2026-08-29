import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRooms } from "@/hooks/useRooms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, LogIn, LogOut, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatAD } from "@/lib/utils";

const db = supabase as any;

export function GroupCheckInOut() {
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
  const { data: rooms = [] } = useRooms();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingCheckIns = useMemo(() => {
    return reservations.filter((r) => r.status === "confirmed");
  }, [reservations]);

  const checkedInGuests = useMemo(() => {
    return reservations.filter((r) => r.status === "checked_in");
  }, [reservations]);

  const filteredCheckIns = useMemo(() => {
    if (!search) return pendingCheckIns;
    const s = search.toLowerCase();
    return pendingCheckIns.filter((r: any) =>
      `${r.guests?.first_name} ${r.guests?.last_name}`.toLowerCase().includes(s) ||
      r.reservation_code?.toLowerCase().includes(s)
    );
  }, [pendingCheckIns, search]);

  const filteredCheckedIn = useMemo(() => {
    if (!search) return checkedInGuests;
    const s = search.toLowerCase();
    return checkedInGuests.filter((r: any) =>
      `${r.guests?.first_name} ${r.guests?.last_name}`.toLowerCase().includes(s) ||
      r.reservation_code?.toLowerCase().includes(s)
    );
  }, [checkedInGuests, search]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = (items: any[]) => {
    setSelectedIds(new Set(items.map((r) => r.id)));
  };

  const handleBulkCheckIn = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      for (const id of selectedIds) {
        const res = reservations.find((r: any) => r.id === id);
        await db.from("reservations").update({ status: "checked_in", actual_check_in: now }).eq("id", id);
        if (res?.room_id) {
          await db.from("rooms").update({ status: "occupied" }).eq("id", res.room_id);
        }
      }
      toast.success(`${selectedIds.size} guests checked in`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    } catch (e: any) {
      toast.error("Bulk check-in failed: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkCheckOut = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      for (const id of selectedIds) {
        const res = reservations.find((r: any) => r.id === id);
        await db.from("reservations").update({ status: "checked_out", actual_check_out: now }).eq("id", id);
        if (res?.room_id) {
          await db.from("rooms").update({ status: "cleaning" }).eq("id", res.room_id);
        }
      }
      toast.success(`${selectedIds.size} guests checked out`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    } catch (e: any) {
      toast.error("Bulk check-out failed: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold font-display flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Group Check-In / Check-Out
          </h3>
          <p className="text-sm text-muted-foreground">Bulk process arrivals and departures</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleBulkCheckIn} disabled={selectedIds.size === 0 || isProcessing} className="gap-1" variant="default">
            <LogIn className="h-4 w-4" /> Check In ({selectedIds.size})
          </Button>
          <Button onClick={handleBulkCheckOut} disabled={selectedIds.size === 0 || isProcessing} className="gap-1" variant="outline">
            <LogOut className="h-4 w-4" /> Check Out ({selectedIds.size})
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by guest name or reservation code..." className="pl-9" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Check-Ins */}
        <Card variant="elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <LogIn className="h-4 w-4 text-success" /> Pending Arrivals ({filteredCheckIns.length})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => selectAll(filteredCheckIns)}>Select All</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCheckIns.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No pending arrivals</TableCell></TableRow>
                ) : (
                  filteredCheckIns.map((res: any) => {
                    const room = rooms.find((r) => r.id === res.room_id);
                    return (
                      <TableRow key={res.id}>
                        <TableCell><Checkbox checked={selectedIds.has(res.id)} onCheckedChange={() => toggleSelect(res.id)} /></TableCell>
                        <TableCell className="font-medium">{res.guests?.first_name} {res.guests?.last_name}</TableCell>
                        <TableCell className="font-mono">{room?.room_number || "-"}</TableCell>
                        <TableCell className="text-sm">{formatAD(new Date(res.check_in_date))}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Checked-In Guests (for checkout) */}
        <Card variant="elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <LogOut className="h-4 w-4 text-warning" /> In-House Guests ({filteredCheckedIn.length})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => selectAll(filteredCheckedIn)}>Select All</Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Checkout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCheckedIn.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No in-house guests</TableCell></TableRow>
                ) : (
                  filteredCheckedIn.map((res: any) => {
                    const room = rooms.find((r) => r.id === res.room_id);
                    return (
                      <TableRow key={res.id}>
                        <TableCell><Checkbox checked={selectedIds.has(res.id)} onCheckedChange={() => toggleSelect(res.id)} /></TableCell>
                        <TableCell className="font-medium">{res.guests?.first_name} {res.guests?.last_name}</TableCell>
                        <TableCell className="font-mono">{room?.room_number || "-"}</TableCell>
                        <TableCell className="text-sm">{formatAD(new Date(res.check_out_date))}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
