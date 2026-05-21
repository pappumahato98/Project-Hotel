import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, ArrowRightLeft, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useInventoryTransfers, useInventoryItems } from "@/hooks/inventory";
import { formatAD } from "@/lib/utils";

const LOCATIONS = ["Main Store", "Kitchen", "Housekeeping", "F&B", "Engineering", "Bar", "Laundry", "Front Office"];

export function TransfersTab() {
  const { data: transfers = [], createTransfer, completeTransfer, cancelTransfer } = useInventoryTransfers();
  const { data: items = [] } = useInventoryItems();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ item_id: "", quantity: 1, from_location: "", to_location: "", notes: "" });

  const handleCreate = async () => {
    if (!form.item_id || !form.from_location || !form.to_location) { toast.error("Fill all required fields"); return; }
    if (form.from_location === form.to_location) { toast.error("Locations must differ"); return; }
    try {
      await createTransfer.mutateAsync({ ...form, quantity: Number(form.quantity), notes: form.notes || undefined });
      toast.success("Transfer created");
      setOpen(false);
      setForm({ item_id: "", quantity: 1, from_location: "", to_location: "", notes: "" });
    } catch { toast.error("Failed to create transfer"); }
  };

  const handleComplete = async (id: string) => {
    try { await completeTransfer.mutateAsync(id); toast.success("Transfer completed"); } catch { toast.error("Failed"); }
  };

  const handleCancel = async (id: string) => {
    try { await cancelTransfer.mutateAsync(id); toast.success("Transfer cancelled"); } catch { toast.error("Failed"); }
  };

  const statusColor = (s: string) => s === "completed" ? "bg-success/20 text-success" : s === "cancelled" ? "bg-destructive/20 text-destructive" : "bg-amber-500/20 text-amber-400";

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" />Stock Transfers</CardTitle><CardDescription>{transfers.length} transfers</CardDescription></div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="blue" className="gap-2"><Plus className="h-4 w-4" />New Transfer</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Stock Transfer</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Item *</Label>
                  <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                    <SelectContent>{items.map((it) => <SelectItem key={it.id} value={it.id}>{it.name} ({it.current_stock} {it.unit})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Quantity</Label><Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>From *</Label>
                    <Select value={form.from_location} onValueChange={(v) => setForm({ ...form, from_location: v })}>
                      <SelectTrigger><SelectValue placeholder="From" /></SelectTrigger>
                      <SelectContent>{LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>To *</Label>
                    <Select value={form.to_location} onValueChange={(v) => setForm({ ...form, to_location: v })}>
                      <SelectTrigger><SelectValue placeholder="To" /></SelectTrigger>
                      <SelectContent>{LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createTransfer.isPending}>
                  {createTransfer.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transfer #</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>From → To</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transfers.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transfers yet</TableCell></TableRow>
            ) : (
              transfers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono">{t.transfer_number}</TableCell>
                  <TableCell className="font-medium">{t.item?.name || "-"}</TableCell>
                  <TableCell>{t.quantity} {t.item?.unit}</TableCell>
                  <TableCell>{t.from_location} → {t.to_location}</TableCell>
                  <TableCell>{formatAD(new Date(t.created_at))}</TableCell>
                  <TableCell><Badge className={statusColor(t.status)}>{t.status}</Badge></TableCell>
                  <TableCell>
                    {t.status === "pending" && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleComplete(t.id)}><Check className="h-4 w-4 text-success" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleCancel(t.id)}><X className="h-4 w-4 text-destructive" /></Button>
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
  );
}
