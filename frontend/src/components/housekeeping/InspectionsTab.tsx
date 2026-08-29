import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { 
  Plus, ClipboardCheck, Star, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useHousekeepingInspections } from "@/hooks/useHousekeeping";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatAD } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground" },
  passed: { label: "Passed", color: "bg-success/20 text-success" },
  failed: { label: "Failed", color: "bg-destructive/20 text-destructive" },
  needs_attention: { label: "Needs Attention", color: "bg-amber-500/20 text-amber-400" },
};

export function InspectionsTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: inspections = [], isLoading, createInspection } = useHousekeepingInspections();

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id, room_number, room_type").order("room_number");
      if (error) throw error;
      return data;
    },
  });

  const [newInspection, setNewInspection] = useState({
    room_id: "",
    cleanliness_score: 80,
    amenities_score: 80,
    maintenance_score: 80,
    notes: "",
  });

  const calculateOverall = () => {
    return Math.round((newInspection.cleanliness_score + newInspection.amenities_score + newInspection.maintenance_score) / 3);
  };

  const getStatus = (score: number) => {
    if (score >= 90) return "passed";
    if (score >= 70) return "needs_attention";
    return "failed";
  };

  const handleCreate = async () => {
    if (!newInspection.room_id) {
      toast.error("Please select a room");
      return;
    }
    
    try {
      const overall = calculateOverall();
      await createInspection.mutateAsync({
        room_id: newInspection.room_id,
        cleanliness_score: newInspection.cleanliness_score,
        amenities_score: newInspection.amenities_score,
        maintenance_score: newInspection.maintenance_score,
        overall_score: overall,
        status: getStatus(overall),
        notes: newInspection.notes,
        inspection_date: new Date().toISOString(),
        issues: [],
      } as any);
      toast.success("Inspection recorded");
      setDialogOpen(false);
      setNewInspection({ room_id: "", cleanliness_score: 80, amenities_score: 80, maintenance_score: 80, notes: "" });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-amber-500";
    return "text-destructive";
  };

  return (
    <div className="space-y-6">
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Room Inspections
              </CardTitle>
              <CardDescription>Quality control and inspection records</CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="blue" className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Inspection
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>New Room Inspection</DialogTitle>
                  <DialogDescription>Score each category from 0-100</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label>Room</Label>
                    <Select value={newInspection.room_id} onValueChange={(v) => setNewInspection({ ...newInspection, room_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                      <SelectContent>
                        {rooms.map((r: any) => (
                          <SelectItem key={r.id} value={r.id}>{r.room_number} - {r.room_type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Cleanliness</Label>
                        <span className={`font-bold ${getScoreColor(newInspection.cleanliness_score)}`}>
                          {newInspection.cleanliness_score}%
                        </span>
                      </div>
                      <Slider
                        value={[newInspection.cleanliness_score]}
                        onValueChange={([v]) => setNewInspection({ ...newInspection, cleanliness_score: v })}
                        max={100}
                        step={5}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Amenities</Label>
                        <span className={`font-bold ${getScoreColor(newInspection.amenities_score)}`}>
                          {newInspection.amenities_score}%
                        </span>
                      </div>
                      <Slider
                        value={[newInspection.amenities_score]}
                        onValueChange={([v]) => setNewInspection({ ...newInspection, amenities_score: v })}
                        max={100}
                        step={5}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Maintenance</Label>
                        <span className={`font-bold ${getScoreColor(newInspection.maintenance_score)}`}>
                          {newInspection.maintenance_score}%
                        </span>
                      </div>
                      <Slider
                        value={[newInspection.maintenance_score]}
                        onValueChange={([v]) => setNewInspection({ ...newInspection, maintenance_score: v })}
                        max={100}
                        step={5}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Overall Score</p>
                    <p className={`text-3xl font-bold ${getScoreColor(calculateOverall())}`}>
                      {calculateOverall()}%
                    </p>
                    <Badge className={statusConfig[getStatus(calculateOverall())]?.color}>
                      {statusConfig[getStatus(calculateOverall())]?.label}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes / Issues</Label>
                    <Textarea 
                      value={newInspection.notes} 
                      onChange={(e) => setNewInspection({ ...newInspection, notes: e.target.value })}
                      placeholder="Any issues or observations..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={!newInspection.room_id || createInspection.isPending}>
                    {createInspection.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Record Inspection
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
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
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Cleanliness</TableHead>
                    <TableHead className="text-center">Amenities</TableHead>
                    <TableHead className="text-center">Maintenance</TableHead>
                    <TableHead className="text-center">Overall</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No inspections recorded yet. Click "New Inspection" to start.
                      </TableCell>
                    </TableRow>
                  ) : (
                    inspections.map((insp) => (
                      <TableRow key={insp.id}>
                        <TableCell className="font-medium">{insp.room?.room_number || "N/A"}</TableCell>
                        <TableCell className="text-sm">
                          {formatAD(new Date(insp.inspection_date))}
                        </TableCell>
                        <TableCell className={`text-center font-medium ${getScoreColor(insp.cleanliness_score)}`}>
                          {insp.cleanliness_score || "-"}
                        </TableCell>
                        <TableCell className={`text-center font-medium ${getScoreColor(insp.amenities_score)}`}>
                          {insp.amenities_score || "-"}
                        </TableCell>
                        <TableCell className={`text-center font-medium ${getScoreColor(insp.maintenance_score)}`}>
                          {insp.maintenance_score || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className={`h-4 w-4 ${getScoreColor(insp.overall_score)}`} />
                            <span className={`font-bold ${getScoreColor(insp.overall_score)}`}>
                              {insp.overall_score || "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusConfig[insp.status]?.color}>
                            {statusConfig[insp.status]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {insp.notes || "-"}
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
    </div>
  );
}
