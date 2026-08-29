import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ClipboardList, Loader2, CheckCircle, XCircle, ShoppingCart, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useInventoryRequisitions, useInventoryItems, usePurchaseOrders, useSuppliers, InventoryRequisition, PurchaseOrderItem } from "@/hooks/inventory";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export function RequisitionsTab() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPOConvertOpen, setIsPOConvertOpen] = useState(false);
  const [selectedReqForPO, setSelectedReqForPO] = useState<InventoryRequisition | null>(null);
  const [poSupplierId, setPoSupplierId] = useState("");

  const { data: requisitions = [], isLoading, createRequisition, updateRequisitionStatus } = useInventoryRequisitions();
  const { data: items = [] } = useInventoryItems();
  const { data: suppliers = [] } = useSuppliers();
  const { createPurchaseOrder } = usePurchaseOrders();

  const [form, setForm] = useState({
    department: "", required_date: "", priority: "normal", notes: "",
    items: [] as { item_id: string, quantity: number }[]
  });

  const { data: budgets } = useQuery({
    queryKey: ["department-budgets"],
    queryFn: async () => {
       const { data } = await supabase.from('budgets').select('*').eq('status', 'active');
       return data || [];
    }
  });

  const calculateTotalValue = () => {
    return form.items.reduce((sum, ri) => {
       const item = items.find(i => i.id === ri.item_id);
       return sum + (ri.quantity * (item?.avg_cost || item?.cost_price || 0));
    }, 0);
  };

  const addItemToReq = () => {
    setForm({ ...form, items: [...form.items, { item_id: "", quantity: 1 }] });
  };

  const updateItemInReq = (index: number, field: "item_id" | "quantity", value: string | number) => {
    const newItems = [...form.items];
    if (field === "item_id") {
      newItems[index].item_id = value as string;
    } else {
      newItems[index].quantity = value as number;
    }
    setForm({ ...form, items: newItems });
  };

  const handleCreate = async () => {
    try {
      if (form.items.length === 0) {
        toast.error("Please add at least one item");
        return;
      }

      const totalValue = calculateTotalValue();
      const deptBudget = budgets?.find(b => b.name === form.department || b.type === form.department);

      if (deptBudget && totalValue > (deptBudget.total_amount || 0)) {
         toast.error(`Warning: This requisition (${formatCurrency(totalValue)}) exceeds the departmental budget of ${formatCurrency(deptBudget.total_amount)}`);
      }

      const { data: { user } } = await supabase.auth.getUser();
      await createRequisition.mutateAsync({
        ...form,
        requested_by: user?.id
      });
      toast.success("Requisition submitted for approval");
      setIsAddOpen(false);
      setForm({ department: "", required_date: "", priority: "normal", notes: "", items: [] });
    } catch { toast.error("Failed to submit requisition"); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await updateRequisitionStatus.mutateAsync({ id, status });
      toast.success(`Requisition ${status}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleOpenPOConvert = (req: InventoryRequisition) => {
     setSelectedReqForPO(req);
     // Try to guess supplier from first item
     const guessedSupplier = req.items?.[0]?.item?.supplier_id || "";
     setPoSupplierId(guessedSupplier);
     setIsPOConvertOpen(true);
  };

  const handleConvertToPO = async () => {
     if (!selectedReqForPO || !poSupplierId) {
        toast.error("Please select a supplier");
        return;
     }

     try {
        const poItems: Partial<PurchaseOrderItem>[] = (selectedReqForPO.items || []).map((i) => ({
           item_id: i.item_id,
           quantity: i.quantity,
           unit_price: i.item?.cost_price || 0
        }));

        await createPurchaseOrder.mutateAsync({
           supplier_id: poSupplierId,
           status: "draft",
           order_date: new Date().toISOString().split('T')[0],
           subtotal: poItems.reduce((s: number, i) => s + (i.quantity * i.unit_price), 0),
           tax_amount: 0,
           total: poItems.reduce((s: number, i) => s + (i.quantity * i.unit_price), 0),
           notes: `Generated from Requisition ${selectedReqForPO.requisition_number}`,
           items: poItems
        });

        await updateRequisitionStatus.mutateAsync({ id: selectedReqForPO.id, status: "partially_ordered" });
        toast.success("Purchase Order draft created from requisition");
        setIsPOConvertOpen(false);
        setSelectedReqForPO(null);
     } catch {
        toast.error("Failed to convert to PO");
     }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Internal Requisitions</h3>
          <p className="text-sm text-muted-foreground">Departmental requests for stock fulfillment</p>
        </div>
        <Button variant="blue" className="gap-2" onClick={() => setIsAddOpen(true)}><Plus className="h-4 w-4" />New Request</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Req #</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Required Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requisitions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No requisitions found</TableCell></TableRow>
                ) : (
                  requisitions.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-mono font-bold text-primary">{req.requisition_number}</TableCell>
                      <TableCell>{req.department}</TableCell>
                      <TableCell>
                         <Badge variant="outline" className={
                           req.status === 'approved' ? "text-success border-success/20" :
                           req.status === 'rejected' ? "text-destructive border-destructive/20" : ""
                         }>{req.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{req.required_date ? new Date(req.required_date).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>{req.items?.length || 0} items</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {req.status === 'pending' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => handleStatusUpdate(req.id, 'approved')}><CheckCircle className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleStatusUpdate(req.id, 'rejected')}><XCircle className="h-4 w-4" /></Button>
                            </>
                          )}
                          {req.status === 'approved' && (
                             <Button variant="outline" size="sm" className="gap-1 h-8" onClick={() => handleOpenPOConvert(req)}>
                                <ShoppingCart className="h-3 w-3" /> Create PO
                             </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPOConvertOpen} onOpenChange={setIsPOConvertOpen}>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Convert Requisition to PO</DialogTitle>
               <DialogDescription>Select a supplier to generate a draft Purchase Order for Requisition {selectedReqForPO?.requisition_number}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
               <div className="space-y-2">
                  <Label>Supplier *</Label>
                  <Select value={poSupplierId} onValueChange={setPoSupplierId}>
                     <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                     <SelectContent>
                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                     </SelectContent>
                  </Select>
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsPOConvertOpen(false)}>Cancel</Button>
               <Button variant="blue" onClick={handleConvertToPO}>Create Draft PO</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create Requisition</DialogTitle><DialogDescription>Submit a request for items from the main store</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Department *</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            <div className="space-y-2"><Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Required Date</Label><Input type="date" value={form.required_date} onChange={(e) => setForm({ ...form, required_date: e.target.value })} /></div>
            <div className="space-y-2 col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

            <div className="col-span-2 space-y-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <div>
                   <Label className="text-base">Requested Items</Label>
                   <p className="text-xs text-muted-foreground italic">Estimated Value: {formatCurrency(calculateTotalValue())}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItemToReq}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
              </div>
              {form.items.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Item</Label>
                    <Select value={item.item_id} onValueChange={(v) => updateItemInReq(idx, "item_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                      <SelectContent>{items.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="w-32 space-y-1">
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" value={item.quantity} onChange={(e) => updateItemInReq(idx, "quantity", Number(e.target.value))} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createRequisition.isPending} variant="blue">
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
