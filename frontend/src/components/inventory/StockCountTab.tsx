import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ListChecks, Loader2, Search, CheckCircle2, AlertCircle, Eye, History, Smartphone, ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { useInventoryItems, useInventoryStores, useInventoryStockCounts, InventoryStockCount, InventoryStockCountItem } from "@/hooks/inventory";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function StockCountTab() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isMobileMode, setIsMobileMode] = useState(false);
  const [selectedCount, setSelectedCount] = useState<InventoryStockCount | null>(null);

  const { data: items = [] } = useInventoryItems();
  const { data: stores = [] } = useInventoryStores();
  const { data: auditHistory = [], reconcileCount } = useInventoryStockCounts();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    store_id: "", notes: "",
    counts: [] as { item_id: string, counted_quantity: number, system_quantity: number }[]
  });

  const [mobileSearch, setMobileSearch] = useState("");

  const startNewCount = () => {
    if (!form.store_id) {
      toast.error("Please select a store first");
      return;
    }
    const initialCounts = items.map(item => ({
      item_id: item.id,
      system_quantity: item.current_stock,
      counted_quantity: item.current_stock
    }));
    setForm({ ...form, counts: initialCounts });
  };

  const updateCount = (index: number, value: number) => {
    const newCounts = [...form.counts];
    newCounts[index].counted_quantity = value;
    setForm({ ...form, counts: newCounts });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const countNo = `SC-${Date.now().toString(36).toUpperCase()}`;

      const { data: master, error: masterErr } = await supabase.from('inventory_stock_counts').insert({
        count_number: countNo,
        store_id: form.store_id,
        counted_by: user?.id,
        status: 'submitted',
        notes: form.notes
      }).select().single();

      if (masterErr) throw masterErr;

      const countItems = form.counts.map(c => ({
        stock_count_id: master.id,
        item_id: c.item_id,
        system_quantity: c.system_quantity,
        counted_quantity: c.counted_quantity
      }));

      const { error: itemsErr } = await supabase.from('inventory_stock_count_items').insert(countItems);
      if (itemsErr) throw itemsErr;

      toast.success("Inventory audit submitted");
      setIsAddOpen(false);
      setForm({ store_id: "", notes: "", counts: [] });
    } catch {
      toast.error("Failed to submit stock count");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReconcile = async (id: string) => {
    try {
      await reconcileCount.mutateAsync(id);
      toast.success("Stock levels updated");
      setIsDetailOpen(false);
    } catch {
      toast.error("Reconciliation failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Physical Stock Count</h3>
          <p className="text-sm text-muted-foreground">Perform inventory audits and reconcile variances</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2 h-9" onClick={() => { setIsAddOpen(true); setIsMobileMode(true); }}><Smartphone className="h-4 w-4" /> Mobile Mode</Button>
           <Button variant="blue" className="gap-2 h-9" onClick={() => { setIsAddOpen(true); setIsMobileMode(false); }}><Plus className="h-4 w-4" />New Audit</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4" /> Recent Audit History</CardTitle></CardHeader>
          <CardContent className="p-0">
             <Table>
                <TableHeader>
                   <TableRow>
                      <TableHead>Audit #</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {auditHistory.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground text-xs">No audits recorded</TableCell></TableRow>
                   ) : (
                      auditHistory.map((audit) => (
                         <TableRow key={audit.id}>
                            <TableCell className="font-mono text-xs font-bold">{audit.count_number}</TableCell>
                            <TableCell className="text-xs">{audit.store?.name}</TableCell>
                            <TableCell><Badge variant="outline" className={cn("text-[10px]", audit.status === 'reconciled' ? "text-success border-success/20" : "")}>{audit.status}</Badge></TableCell>
                            <TableCell className="text-right">
                               <Button variant="ghost" size="sm" onClick={() => { setSelectedCount(audit); setIsDetailOpen(true); }}><Eye className="h-4 w-4" /></Button>
                            </TableCell>
                         </TableRow>
                      ))
                   )}
                </TableBody>
             </Table>
          </CardContent>
        </Card>

        <Card className="border-dashed flex flex-col items-center justify-center p-8 bg-muted/20 text-center">
           <ListChecks className="h-10 w-10 text-muted-foreground mb-4" />
           <h4 className="font-bold">Inventory Auditing</h4>
           <p className="text-xs text-muted-foreground max-w-xs mt-2">Physical counts help identify pilferage or damage. Use Mobile Mode for warehouse floor counting.</p>
           <Button variant="outline" className="mt-4 text-xs h-8" onClick={() => setIsAddOpen(true)}>Start Cycle Count</Button>
        </Card>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className={isMobileMode ? "max-w-md" : "max-w-4xl"}>
          <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
                {isMobileMode ? <Smartphone className="h-5 w-5" /> : <ListChecks className="h-5 w-5" />}
                {isMobileMode ? "Mobile Quick Audit" : "Full Inventory Audit"}
             </DialogTitle>
             <DialogDescription>{isMobileMode ? "Optimized for phone screens and barcode scanners" : "Comprehensive physical stock count entry"}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Select Store</Label>
                <Select value={form.store_id} onValueChange={(v) => setForm({ ...form, store_id: v })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Store" /></SelectTrigger>
                  <SelectContent>{stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button variant="secondary" className="h-9" onClick={startNewCount} disabled={!form.store_id}>Load</Button>
            </div>

            {form.counts.length > 0 && (
              <div className="space-y-4">
                {isMobileMode ? (
                   <div className="space-y-3">
                      <div className="relative">
                         <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                         <Input placeholder="Scan SKU / Search..." className="pl-9" value={mobileSearch} onChange={(e) => setMobileSearch(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                         {form.counts.filter(c => {
                            const item = items.find(i => i.id === c.item_id);
                            return !mobileSearch || item?.name.toLowerCase().includes(mobileSearch.toLowerCase());
                         }).map((c, idx) => {
                            const item = items.find(i => i.id === c.item_id);
                            return (
                               <div key={c.item_id} className="p-3 border rounded-xl bg-card shadow-sm space-y-2">
                                  <div className="flex justify-between items-start">
                                     <span className="text-sm font-bold">{item?.name}</span>
                                     <Badge variant="outline" className="text-[10px]">Sys: {c.system_quantity}</Badge>
                                  </div>
                                  <div className="flex items-center gap-3">
                                     <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => updateCount(idx, Math.max(0, c.counted_quantity - 1))}>-</Button>
                                     <Input type="number" className="text-center font-bold h-10" value={c.counted_quantity} onChange={(e) => updateCount(idx, Number(e.target.value))} />
                                     <Button variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={() => updateCount(idx, c.counted_quantity + 1)}>+</Button>
                                  </div>
                               </div>
                            );
                         })}
                      </div>
                   </div>
                ) : (
                   <Table>
                     <TableHeader>
                       <TableRow>
                         <TableHead>Item</TableHead>
                         <TableHead>System Qty</TableHead>
                         <TableHead>Physical Qty</TableHead>
                         <TableHead>Variance</TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {form.counts.map((c, idx) => {
                         const item = items.find(i => i.id === c.item_id);
                         const variance = c.counted_quantity - c.system_quantity;
                         return (
                           <TableRow key={c.item_id}>
                             <TableCell className="font-medium text-xs">{item?.name}</TableCell>
                             <TableCell className="text-xs">{c.system_quantity}</TableCell>
                             <TableCell><Input type="number" className="w-20 h-8 text-xs" value={c.counted_quantity} onChange={(e) => updateCount(idx, Number(e.target.value))} /></TableCell>
                             <TableCell>
                               <Badge variant={variance === 0 ? "outline" : variance > 0 ? "success" : "destructive"} className="text-[10px]">
                                 {variance > 0 ? `+${variance}` : variance}
                               </Badge>
                             </TableCell>
                           </TableRow>
                         );
                       })}
                     </TableBody>
                   </Table>
                )}
                <div className="space-y-1"><Label className="text-xs">Notes</Label><Input className="h-8 text-xs" placeholder="Audit notes..." value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} /></div>
              </div>
            )}
          </div>
          <DialogFooter className={isMobileMode ? "flex-col gap-2" : ""}>
            <Button variant="outline" className={isMobileMode ? "w-full" : ""} onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={form.counts.length === 0 || isSubmitting} variant="blue" className={isMobileMode ? "w-full" : ""}>
               {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
               Submit Audit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
           <DialogHeader><DialogTitle>Audit Review: {selectedCount?.count_number}</DialogTitle></DialogHeader>
           <div className="py-4 space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg text-xs font-semibold">
                 <span>Store: {selectedCount?.store?.name}</span>
                 <span>Date: {selectedCount?.count_date && new Date(selectedCount.count_date).toLocaleDateString()}</span>
              </div>
              <Table>
                 <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>System</TableHead><TableHead>Physical</TableHead><TableHead>Variance</TableHead></TableRow></TableHeader>
                 <TableBody>
                    {selectedCount?.items?.map((item) => {
                       const v = item.counted_quantity - item.system_quantity;
                       return (
                         <TableRow key={item.id}>
                            <TableCell className="text-xs">{item.item?.name}</TableCell>
                            <TableCell className="text-xs">{item.system_quantity}</TableCell>
                            <TableCell className="font-bold text-xs">{item.counted_quantity}</TableCell>
                            <TableCell>
                               <Badge variant={v === 0 ? "outline" : v > 0 ? "success" : "destructive"} className="text-[10px]">{v}</Badge>
                            </TableCell>
                         </TableRow>
                       );
                    })}
                 </TableBody>
              </Table>
           </div>
           <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
              {selectedCount?.status === 'submitted' && (
                <Button variant="success" onClick={() => handleReconcile(selectedCount.id)} disabled={reconcileCount.isPending}>
                   Apply Reconciliation
                </Button>
              )}
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
