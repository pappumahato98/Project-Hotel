import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock, ArrowRightLeft, ClipboardList, TrendingUp } from "lucide-react";
import { useInventoryRequisitions, useInventoryTransfers, useInventoryItems } from "@/hooks/inventory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface PendingAdjustment {
  id: string;
  item_id: string;
  quantity: number;
  movement_type: string;
  notes: string | null;
  item?: { name: string };
}

export function ApprovalsQueueTab() {
  const { data: requisitions = [], updateRequisitionStatus, refetch: refetchReq } = useInventoryRequisitions();
  const { data: transfers = [], completeTransfer, refetch: refetchTrf } = useInventoryTransfers();
  const { adjustStock } = useInventoryItems();

  const { data: pendingAdjustments = [], refetch: refetchAdj } = useQuery({
     queryKey: ["pending-inventory-adjustments-queue"],
     queryFn: async () => {
        const { data } = await supabase.from('stock_movements').select('*, item:inventory_items(name)').eq('reference_type', 'manual_adjustment').filter('notes', 'ilike', 'PENDING_APPROVAL%');
        return (data || []) as unknown as PendingAdjustment[];
     }
  });

  const pendingReqs = requisitions.filter(r => r.status === 'pending');
  const pendingTrfs = transfers.filter(t => t.status === 'pending');

  const handleApproveAdj = async (adj: PendingAdjustment) => {
     try {
        const [, reason, notes] = adj.notes?.split('|') || [];
        await adjustStock.mutateAsync({
           itemId: adj.item_id,
           quantity: adj.quantity,
           type: (adj.movement_type === 'out' ? 'out' : 'in') as "in" | "out",
           reason: reason || 'Adjustment',
           notes: notes || ''
        });
        await supabase.from('stock_movements').delete().eq('id', adj.id);
        toast.success("Adjustment approved");
        refetchAdj();
     } catch { toast.error("Failed"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h3 className="text-lg font-medium">Unified Approvals Queue</h3>
            <p className="text-sm text-muted-foreground">Manage pending authorizations for all inventory transactions</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Requisitions */}
         <Card>
            <CardHeader className="pb-2 border-b bg-amber-50/30">
               <CardTitle className="text-xs font-bold uppercase flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Requisitions ({pendingReqs.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                  <TableBody>
                     {pendingReqs.map(r => (
                        <TableRow key={r.id}>
                           <TableCell className="py-3">
                              <p className="text-xs font-bold">{r.department}</p>
                              <p className="text-[10px] text-muted-foreground">{r.requisition_number}</p>
                           </TableCell>
                           <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => updateRequisitionStatus.mutateAsync({id: r.id, status: 'approved'}).then(() => refetchReq())}><CheckCircle2 className="h-4 w-4" /></Button>
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateRequisitionStatus.mutateAsync({id: r.id, status: 'rejected'}).then(() => refetchReq())}><XCircle className="h-4 w-4" /></Button>
                              </div>
                           </TableCell>
                        </TableRow>
                     ))}
                     {pendingReqs.length === 0 && <TableRow><TableCell className="text-center py-8 text-xs text-muted-foreground italic">No pending requests</TableCell></TableRow>}
                  </TableBody>
               </Table>
            </CardContent>
         </Card>

         {/* Transfers */}
         <Card>
            <CardHeader className="pb-2 border-b bg-blue-50/30">
               <CardTitle className="text-xs font-bold uppercase flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Transfers ({pendingTrfs.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                  <TableBody>
                     {pendingTrfs.map(t => (
                        <TableRow key={t.id}>
                           <TableCell className="py-3">
                              <p className="text-xs font-bold">{t.item?.name}</p>
                              <p className="text-[10px] text-muted-foreground">Qty: {t.quantity}</p>
                           </TableCell>
                           <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => completeTransfer.mutateAsync(t.id).then(() => refetchTrf())}><CheckCircle2 className="h-4 w-4" /></Button>
                              </div>
                           </TableCell>
                        </TableRow>
                     ))}
                     {pendingTrfs.length === 0 && <TableRow><TableCell className="text-center py-8 text-xs text-muted-foreground italic">No pending transfers</TableCell></TableRow>}
                  </TableBody>
               </Table>
            </CardContent>
         </Card>

         {/* Stock Adjustments */}
         <Card>
            <CardHeader className="pb-2 border-b bg-destructive/5">
               <CardTitle className="text-xs font-bold uppercase flex items-center gap-2 text-destructive"><TrendingUp className="h-4 w-4" /> Adjustments ({pendingAdjustments.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <Table>
                  <TableBody>
                     {pendingAdjustments.map((a) => (
                        <TableRow key={a.id}>
                           <TableCell className="py-3">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <p className="text-xs font-bold">{a.item?.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{a.movement_type.toUpperCase()} - Qty: {a.quantity}</p>
                                 </div>
                                 <Badge variant="outline" className="text-[8px] h-4 uppercase">{a.notes?.split('|')[1] || 'Adj'}</Badge>
                              </div>
                              {a.notes?.split('|')[2] && <p className="text-[9px] mt-1 italic text-muted-foreground">"{a.notes.split('|')[2]}"</p>}
                           </TableCell>
                           <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => handleApproveAdj(a)}><CheckCircle2 className="h-4 w-4" /></Button>
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => supabase.from('stock_movements').delete().eq('id', a.id).then(() => refetchAdj())}><XCircle className="h-4 w-4" /></Button>
                              </div>
                           </TableCell>
                        </TableRow>
                     ))}
                     {pendingAdjustments.length === 0 && <TableRow><TableCell className="text-center py-8 text-xs text-muted-foreground italic">No pending corrections</TableCell></TableRow>}
                  </TableBody>
               </Table>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
