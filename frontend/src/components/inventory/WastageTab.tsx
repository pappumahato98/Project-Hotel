import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2, AlertTriangle, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useInventoryWastage, useInventoryItems } from "@/hooks/inventory";
import { formatCurrency } from "@/lib/utils";

export function WastageTab() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { data: wastageList = [], isLoading, reportWastage } = useInventoryWastage();
  const { data: items = [] } = useInventoryItems();

  const [form, setForm] = useState({
    item_id: "", quantity: 0, wastage_type: "expired", reason: "", cost_impact: 0
  });

  const handleCreate = async () => {
    try {
      if (!form.item_id || form.quantity <= 0) {
        toast.error("Please select an item and enter quantity");
        return;
      }

      const item = items.find(i => i.id === form.item_id);
      const costImpact = (item?.cost_price || 0) * form.quantity;

      await reportWastage.mutateAsync({ ...form, cost_impact: costImpact });
      toast.success("Wastage reported");
      setIsAddOpen(false);
      setForm({ item_id: "", quantity: 0, wastage_type: "expired", reason: "", cost_impact: 0 });
    } catch { toast.error("Failed to report wastage"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Waste Management</h3>
          <p className="text-sm text-muted-foreground">Track and analyze stock losses, expiration, and damages</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild><Button variant="destructive" className="gap-2"><Plus className="h-4 w-4" />Report Waste</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Report Wastage</DialogTitle><DialogDescription>Deduct damaged or expired items from stock</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Item *</Label>
                <Select value={form.item_id} onValueChange={(v) => setForm({ ...form, item_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                  <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.current_stock} available)</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Type</Label>
                  <Select value={form.wastage_type} onValueChange={(v) => setForm({ ...form, wastage_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="spillage">Spillage / Loss</SelectItem>
                      <SelectItem value="production">Production Waste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Reason / Notes</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={reportWastage.isPending} variant="destructive">
                {reportWastage.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Report Loss
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Cost Impact</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wastageList.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No wastage records found</TableCell></TableRow>
                ) : (
                  wastageList.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-sm">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{w.item?.name}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{w.wastage_type}</Badge></TableCell>
                      <TableCell>{w.quantity} {w.item?.unit}</TableCell>
                      <TableCell className="text-destructive font-mono">{formatCurrency(w.cost_impact)}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{w.status}</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
