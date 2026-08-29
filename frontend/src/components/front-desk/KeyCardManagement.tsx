import { useState } from "react";
import { useKeyCards } from "@/hooks/useKeyCards";
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
import { CreditCard, Plus, RotateCcw, ArrowDownToLine } from "lucide-react";
import { format } from "date-fns";
import { formatAD } from "@/lib/utils";

export function KeyCardManagement() {
  const { data: logs = [], issueCard, returnCard, replaceCard } = useKeyCards();
  const { data: rooms = [] } = useRooms();
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [newCardNumber, setNewCardNumber] = useState("");
  const [replaceReason, setReplaceReason] = useState("");
  const [form, setForm] = useState({
    guest_name: "",
    room_number: "",
    card_number: "",
    issued_by: "",
  });

  const occupiedRooms = rooms.filter((r) => r.status === "occupied");
  const activeCards = logs.filter((l) => l.action === "issued" && !l.returned_at);

  const handleIssue = () => {
    issueCard.mutate(
      {
        guest_name: form.guest_name,
        room_number: form.room_number,
        card_number: form.card_number,
        issued_by: form.issued_by || null,
        guest_id: null,
        reservation_id: null,
        room_id: null,
        action: "issued",
        reason: null,
      },
      {
        onSuccess: () => {
          setIsIssueOpen(false);
          setForm({ guest_name: "", room_number: "", card_number: "", issued_by: "" });
        },
      }
    );
  };

  const handleReplace = () => {
    if (!replaceTarget) return;
    replaceCard.mutate(
      { oldId: replaceTarget, newCardNumber, reason: replaceReason },
      {
        onSuccess: () => {
          setIsReplaceOpen(false);
          setReplaceTarget(null);
          setNewCardNumber("");
          setReplaceReason("");
        },
      }
    );
  };

  const actionColors: Record<string, string> = {
    issued: "bg-success/20 text-success border-success/30",
    returned: "bg-secondary text-secondary-foreground border-border",
    replaced: "bg-warning/20 text-warning border-warning/30",
    lost: "bg-destructive/20 text-destructive border-destructive/30",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold font-display flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Key Card Management
          </h3>
          <p className="text-sm text-muted-foreground">{activeCards.length} active cards in circulation</p>
        </div>
        <Dialog open={isIssueOpen} onOpenChange={setIsIssueOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Issue Card</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Key Card</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Guest Name</Label>
                  <Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} />
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
                  <Label>Card Number</Label>
                  <Input value={form.card_number} onChange={(e) => setForm({ ...form, card_number: e.target.value })} placeholder="KC-00001" />
                </div>
                <div className="space-y-2">
                  <Label>Issued By</Label>
                  <Input value={form.issued_by} onChange={(e) => setForm({ ...form, issued_by: e.target.value })} placeholder="Staff name" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsIssueOpen(false)}>Cancel</Button>
              <Button onClick={handleIssue} disabled={!form.guest_name || !form.room_number || !form.card_number || issueCard.isPending}>
                {issueCard.isPending ? "Issuing..." : "Issue Card"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass"><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Total Issued</p>
          <p className="text-2xl font-bold">{logs.filter((l) => l.action === "issued").length}</p>
        </CardContent></Card>
        <Card variant="glass" className="bg-success/5"><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-success">{activeCards.length}</p>
        </CardContent></Card>
        <Card variant="glass"><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Returned</p>
          <p className="text-2xl font-bold">{logs.filter((l) => l.action === "returned").length}</p>
        </CardContent></Card>
        <Card variant="glass" className="bg-warning/5"><CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">Replaced</p>
          <p className="text-2xl font-bold text-warning">{logs.filter((l) => l.action === "replaced").length}</p>
        </CardContent></Card>
      </div>

      <Card variant="elevated">
        <CardHeader><CardTitle className="text-sm">Key Card Log</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card #</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Issued By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No key card records</TableCell></TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono font-bold">{log.card_number}</TableCell>
                    <TableCell className="font-medium">{log.guest_name}</TableCell>
                    <TableCell className="font-mono">{log.room_number}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={actionColors[log.action] || ""}>{log.action}</Badge>
                      {log.reason && <span className="text-[10px] block text-muted-foreground">{log.reason}</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.issued_by || "-"}</TableCell>
                    <TableCell className="text-sm">{formatAD(new Date(log.created_at), "time")}</TableCell>
                    <TableCell className="text-right">
                      {log.action === "issued" && !log.returned_at && (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => returnCard.mutate(log.id)}>
                            <ArrowDownToLine className="h-3 w-3" /> Return
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setReplaceTarget(log.id); setIsReplaceOpen(true); }}>
                            <RotateCcw className="h-3 w-3" /> Replace
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

      {/* Replace Dialog */}
      <Dialog open={isReplaceOpen} onOpenChange={(o) => { if (!o) { setIsReplaceOpen(false); setReplaceTarget(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Replace Key Card</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Card Number</Label>
              <Input value={newCardNumber} onChange={(e) => setNewCardNumber(e.target.value)} placeholder="KC-00002" />
            </div>
            <div className="space-y-2">
              <Label>Reason for Replacement</Label>
              <Input value={replaceReason} onChange={(e) => setReplaceReason(e.target.value)} placeholder="Lost, damaged, demagnetized..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReplaceOpen(false)}>Cancel</Button>
            <Button onClick={handleReplace} disabled={!newCardNumber || !replaceReason || replaceCard.isPending}>
              {replaceCard.isPending ? "Replacing..." : "Replace Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
