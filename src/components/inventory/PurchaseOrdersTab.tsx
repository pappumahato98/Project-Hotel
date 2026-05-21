import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Warehouse, PackageCheck, Eye, X, CheckCircle, ShieldAlert, Calendar, RotateCcw, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { usePurchaseOrders, useSuppliers, useInventoryItems, PurchaseOrder, useInventoryUoMs, PurchaseOrderItem } from "@/hooks/inventory";
import { formatAD, formatCurrency, cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface POLineItem { item_id: string; quantity: number; unit_price: number; }

export function PurchaseOrdersTab() {
  const { data: orders = [], createPurchaseOrder, updatePurchaseOrderStatus, receivePurchaseOrder } = usePurchaseOrders();
  const { data: suppliers = [] } = useSuppliers();
  const { data: items = [] } = useInventoryItems();
  const { data: uoms = [], conversions = [] } = useInventoryUoMs();

  const [createOpen, setCreateOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [isMobileMode, setIsMobileMode] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const [form, setForm] = useState({ supplier_id: "", expected_delivery: "", notes: "" });
  const [lineItems, setLineItems] = useState<POLineItem[]>([{ item_id: "", quantity: 1, unit_price: 0 }]);
  const [receiveData, setReceiveData] = useState<Record<string, { qty: number, uom_id: string, batch: string, expiry: string, damaged: number, quality: string }>>({});
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState("");

  const subtotal = (lineItems || []).reduce((s, li) => s + li.quantity * li.unit_price, 0);
  const taxAmount = subtotal * 0.13;
  const total = subtotal + taxAmount;

  const addLine = () => setLineItems([...lineItems, { item_id: "", quantity: 1, unit_price: 0 }]);
  const removeLine = (i: number) => setLineItems(lineItems.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: keyof POLineItem, value: string | number) => {
    const updated = [...lineItems];
    if (field === "item_id") {
      updated[i].item_id = value as string;
      const item = items.find((it) => it.id === value);
      if (item) updated[i].unit_price = item.cost_price;
    } else if (field === "quantity") {
      updated[i].quantity = value as number;
    } else if (field === "unit_price") {
      updated[i].unit_price = value as number;
    }
    setLineItems(updated);
  };

  const handleCreate = async () => {
    try {
      const validLines = lineItems.filter((l) => l.item_id && l.quantity > 0);
      if (!form.supplier_id || validLines.length === 0) { toast.error("Select supplier and add items"); return; }
      await createPurchaseOrder.mutateAsync({
        supplier_id: form.supplier_id,
        status: "draft",
        order_date: new Date().toISOString().split('T')[0],
        subtotal,
        tax_amount: taxAmount,
        total,
        notes: form.notes || undefined,
        items: validLines,
      });
      toast.success("Purchase order created");
      setCreateOpen(false);
      setForm({ supplier_id: "", expected_delivery: "", notes: "" });
      setLineItems([{ item_id: "", quantity: 1, unit_price: 0 }]);
    } catch { toast.error("Failed to create PO"); }
  };

  const openReceive = (po: PurchaseOrder) => {
    setSelectedPO(po);
    const initialData: Record<string, { qty: number, uom_id: string, batch: string, expiry: string, damaged: number, quality: string }> = {};
    po.items?.forEach((pi) => {
      initialData[pi.id] = {
        qty: pi.quantity - (pi.received_quantity || 0),
        uom_id: pi.item?.uom_id || "",
        batch: "",
        expiry: "",
        damaged: 0,
        quality: "passed"
      };
    });
    setReceiveData(initialData);
    setReceiveOpen(true);
  };

  const handleReceive = async () => {
    if (!selectedPO?.items) return;
    try {
      const receivedItems = selectedPO.items.map((pi) => {
         const data = receiveData[pi.id];
         let finalQty = data?.qty || 0;

         if (data?.uom_id && pi.item?.uom_id && data.uom_id !== pi.item.uom_id) {
            const conversion = conversions.find(c => c.from_uom_id === data.uom_id && c.to_uom_id === pi.item?.uom_id);
            if (conversion) finalQty = finalQty * conversion.conversion_factor;
         }

         return {
            poItemId: pi.id,
            itemId: pi.item_id,
            receivedQty: finalQty,
            batchNumber: data?.batch,
            expiryDate: data?.expiry,
            damagedQty: data?.damaged || 0,
            qualityStatus: data?.quality || 'passed'
         };
      });

      const filteredReceived = receivedItems.filter(ri => ri.receivedQty > 0 || ri.damagedQty > 0);
      await receivePurchaseOrder.mutateAsync({ poId: selectedPO.id, receivedItems: filteredReceived });
      toast.success("GRN Processed");
      setReceiveOpen(false);
    } catch { toast.error("Failed"); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updatePurchaseOrderStatus.mutateAsync({ id, status });
      toast.success(`Status updated to ${status}`);
    } catch { toast.error("Failed"); }
  };

  const openReturn = (po: PurchaseOrder) => {
    setSelectedPO(po);
    const initial: Record<string, number> = {};
    po.items?.forEach(pi => initial[pi.id] = 0);
    setReturnQtys(initial);
    setReturnOpen(true);
  };

  const confirmReturn = async () => {
     if (!selectedPO) return;
     try {
        const { data: { user } } = await supabase.auth.getUser();
        const returnNo = `RET-${Date.now().toString(36).toUpperCase()}`;

        let totalVal = 0;
        const returnItems: { item_id: string, quantity: number, unit_price: number }[] = [];

        for (const pi of (selectedPO.items || [])) {
           const qty = returnQtys[pi.id] || 0;
           if (qty > 0) {
              const val = qty * pi.unit_price;
              totalVal += val;
              returnItems.push({ item_id: pi.item_id, quantity: qty, unit_price: pi.unit_price });

              const { data: item } = await supabase.from('inventory_items').select('current_stock').eq('id', pi.item_id).single();
              await supabase.from('inventory_items').update({ current_stock: Math.max(0, (item?.current_stock || 0) - qty) }).eq('id', pi.item_id);

              await supabase.from('stock_movements').insert({
                 item_id: pi.item_id,
                 movement_type: 'out',
                 quantity: qty,
                 reference_type: 'purchase_order',
                 reference_id: selectedPO.id,
                 notes: `Supplier Return: ${selectedPO.supplier?.name}`
              });
           }
        }

        if (returnItems.length > 0) {
           const { data: retHeader } = await supabase.from('inventory_supplier_returns').insert({
              purchase_order_id: selectedPO.id,
              return_number: returnNo,
              supplier_id: selectedPO.supplier_id,
              reason: returnReason,
              status: 'completed',
              total_amount: totalVal,
              created_by: user?.id
           } as Database["public"]["Tables"]["inventory_supplier_returns"]["Insert"]).select().single();

           if (retHeader) {
             const header = retHeader as { id: string };
             await supabase.from('inventory_supplier_return_items').insert(returnItems.map(i => ({ ...i, supplier_return_id: header.id })));
           }
           toast.success("Supplier return processed successfully");
           setReturnOpen(false);
        }
     } catch { toast.error("Return failed"); }
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle className="flex items-center gap-2"><Warehouse className="h-5 w-5" />Purchase Orders & GRN</CardTitle><CardDescription>Manage procurement lifecycle and warehouse receiving</CardDescription></div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button variant="blue" className="gap-2"><Plus className="h-4 w-4" />New Order</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Supplier *</Label>
                    <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                      <SelectContent>{suppliers.filter((s) => s.is_active).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Expected Delivery</Label><Input type="date" value={form.expected_delivery} onChange={(e) => setForm({ ...form, expected_delivery: e.target.value })} /></div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between"><Label>Line Items</Label><Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Add</Button></div>
                  {lineItems.map((li, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end">
                      <Select value={li.item_id} onValueChange={(v) => updateLine(i, "item_id", v)}>
                        <SelectTrigger><SelectValue placeholder="Item" /></SelectTrigger>
                        <SelectContent>{items.map((it) => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <Input type="number" min={1} value={li.quantity} onChange={(e) => updateLine(i, "quantity", Number(e.target.value))} placeholder="Qty" />
                      <Input type="number" min={0} value={li.unit_price} onChange={(e) => updateLine(i, "unit_price", Number(e.target.value))} placeholder="Price" />
                      {lineItems.length > 1 && <Button variant="ghost" size="sm" onClick={() => removeLine(i)}><X className="h-4 w-4" /></Button>}
                    </div>
                  ))}
                </div>

                <div className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm font-bold">
                  <div className="flex justify-between"><span>Total Estimate</span><span>{formatCurrency(total)}</span></div>
                </div>

                <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createPurchaseOrder.isPending} variant="blue">Create PO</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No purchase orders yet</TableCell></TableRow>
            ) : (
              orders.map((po) => (
                <TableRow key={po.id}>
                  <TableCell className="font-mono font-bold text-primary">{po.order_number}</TableCell>
                  <TableCell>{po.supplier?.name || "-"}</TableCell>
                  <TableCell className="text-xs">{formatAD(new Date(po.order_date))}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      po.status === 'received' ? "bg-success/10 text-success border-success/20" :
                      po.status === 'sent' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : ""
                    )}>{po.status.replace("_", " ")}</Badge>
                  </TableCell>
                  <TableCell className="font-bold">{formatCurrency(po.total)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedPO(po); setDetailOpen(true); }}><Eye className="h-4 w-4" /></Button>
                      {po.status === "draft" && <Button variant="blue" size="sm" onClick={() => handleStatusChange(po.id, "sent")}>Send</Button>}
                      {(po.status === "sent" || po.status === "partially_received") && (
                        <div className="flex gap-1">
                           <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => { setIsMobileMode(true); openReceive(po); }} title="Mobile Receipt"><Smartphone className="h-4 w-4" /></Button>
                           <Button variant="success" size="sm" onClick={() => { setIsMobileMode(false); openReceive(po); }}><PackageCheck className="h-4 w-4 mr-1" />GRN</Button>
                        </div>
                      )}
                      {po.status === 'received' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => openReturn(po)} title="Return Items"><RotateCcw className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>PO Details: {selectedPO?.order_number}</DialogTitle></DialogHeader>
          <div className="py-4">
             {selectedPO?.items && (
              <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Ordered</TableHead><TableHead>Price</TableHead><TableHead>Recv</TableHead></TableRow></TableHeader>
                <TableBody>
                  {selectedPO.items.map((pi) => (
                    <TableRow key={pi.id}>
                      <TableCell className="text-xs">{pi.item?.name}</TableCell>
                      <TableCell className="text-xs">{pi.quantity}</TableCell>
                      <TableCell className="text-xs">{formatCurrency(pi.unit_price)}</TableCell>
                      <TableCell><Badge variant="secondary">{pi.received_quantity || 0}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Return Modal */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
         <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Supplier Return — {selectedPO?.supplier?.name}</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
               <Table>
                  <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Received</TableHead><TableHead>Return</TableHead></TableRow></TableHeader>
                  <TableBody>
                     {selectedPO?.items?.map(pi => (
                        <TableRow key={pi.id}>
                           <TableCell className="text-xs">{pi.item?.name}</TableCell>
                           <TableCell className="text-xs font-bold">{pi.received_quantity}</TableCell>
                           <TableCell><Input type="number" className="h-7 w-20 text-xs"
                              max={pi.received_quantity}
                              value={returnQtys[pi.id] || 0}
                              onChange={(e) => setReturnQtys({...returnQtys, [pi.id]: Number(e.target.value)})} /></TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>
               <div className="space-y-1"><Label className="text-xs">Reason for Return</Label><Input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="Damaged, wrong item..." /></div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button>
               <Button variant="blue" onClick={confirmReturn}>Post Return</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      {/* Advanced GRN Dialog */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className={isMobileMode ? "max-w-md" : "max-w-4xl"}>
          <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
                {isMobileMode ? <Smartphone className="h-5 w-5" /> : <PackageCheck className="h-5 w-5" />}
                Goods Receiving Note (GRN)
             </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {selectedPO?.items?.map((pi) => (
              <div key={pi.id} className={cn("border p-4 rounded-xl bg-muted/20 space-y-4", isMobileMode ? "p-3" : "p-4")}>
                <div className="flex justify-between items-start border-b pb-2">
                  <div>
                    <h4 className="font-bold text-base flex items-center gap-2 text-primary"><PackageCheck className="h-4 w-4" /> {pi.item?.name}</h4>
                    <p className="text-xs text-muted-foreground font-mono uppercase">{pi.item?.uom?.name || pi.item?.unit}</p>
                  </div>
                  <div className="flex gap-4 items-end">
                    <div className="space-y-1 text-right">
                       <Label className="text-[10px] uppercase font-bold text-muted-foreground">Qty Recv</Label>
                       <Input type="number" className="w-24 h-10 text-center font-bold"
                         value={receiveData[pi.id]?.qty || 0}
                         onChange={(e) => setReceiveData({ ...receiveData, [pi.id]: { ...receiveData[pi.id], qty: Number(e.target.value) } })} />
                    </div>
                  </div>
                </div>

                <div className={isMobileMode ? "grid grid-cols-2 gap-3" : "grid grid-cols-4 gap-4"}>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Batch #</Label><Input className={cn("text-xs", isMobileMode ? "h-10" : "h-8")} value={receiveData[pi.id]?.batch || ""} onChange={(e) => setReceiveData({ ...receiveData, [pi.id]: { ...receiveData[pi.id], batch: e.target.value } })} /></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Expiry</Label><Input type="date" className={cn("text-xs", isMobileMode ? "h-10" : "h-8")} value={receiveData[pi.id]?.expiry || ""} onChange={(e) => setReceiveData({ ...receiveData, [pi.id]: { ...receiveData[pi.id], expiry: e.target.value } })} /></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Damaged</Label><Input type="number" className={cn("text-xs", isMobileMode ? "h-10" : "h-8")} value={receiveData[pi.id]?.damaged || 0} onChange={(e) => setReceiveData({ ...receiveData, [pi.id]: { ...receiveData[pi.id], damaged: Number(e.target.value) } })} /></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold text-muted-foreground">Quality</Label>
                    <Select value={receiveData[pi.id]?.quality || "passed"} onValueChange={(v) => setReceiveData({ ...receiveData, [pi.id]: { ...receiveData[pi.id], quality: v } })}>
                      <SelectTrigger className={cn("text-xs", isMobileMode ? "h-10" : "h-8")}><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="passed">Passed</SelectItem><SelectItem value="failed">Rejected</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancel</Button>
            <Button onClick={handleReceive} disabled={receivePurchaseOrder.isPending} variant="blue">Confirm GRN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
