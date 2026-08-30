import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChefHat, Plus, Loader2, Play, CheckCircle, Clock, Trash2, ArrowRight } from "lucide-react";
import { useInventoryRecipes, useInventoryProduction, InventoryRecipe } from "@/hooks/inventory";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function ProductionOrdersTab() {
  const queryClient = useQueryClient();
  const { data: recipes = [] } = useInventoryRecipes();
  const { produceBatch } = useInventoryProduction();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({ recipe_id: "", target_quantity: 1, notes: "" });

  const { data: orders = [], isLoading } = useQuery({
     queryKey: ["inventory-production-orders"],
     queryFn: async () => {
        const { data } = await supabase.from('inventory_production_logs').select('*, recipe:inventory_recipes(*)').order('created_at', { ascending: false });
        return data || [];
     }
  });

  const handleCreateOrder = async () => {
     try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('inventory_production_logs').insert({
           recipe_id: form.recipe_id,
           quantity_produced: 0, // Not yet produced
           target_quantity: form.target_quantity,
           status: 'planned',
           produced_by: user?.id,
           notes: form.notes
        } as any);
        toast.success("Production order planned");
        setIsAddOpen(false);
        queryClient.invalidateQueries({ queryKey: ["inventory-production-orders"] });
     } catch { toast.error("Failed"); }
  };

  const handleFinalize = async (order: any) => {
     try {
        await produceBatch.mutateAsync({
           recipeId: order.recipe_id,
           quantity: order.target_quantity || 1,
           producedBy: order.produced_by
        });
        await supabase.from('inventory_production_logs').update({
           status: 'completed',
           quantity_produced: order.target_quantity
        } as any).eq('id', order.id);
        toast.success("Production completed and stock deducted");
        queryClient.invalidateQueries({ queryKey: ["inventory-production-orders"] });
     } catch { toast.error("Failed to finalize"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><ChefHat className="h-5 w-5 text-primary" /> Kitchen Production Orders</h3>
          <p className="text-sm text-muted-foreground">Manage preparation tasks and ingredient consumption</p>
        </div>
        <Button variant="blue" className="gap-2" onClick={() => setIsAddOpen(true)}><Plus className="h-4 w-4" />Plan Production</Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
         <Card>
            <CardContent className="p-0">
               <Table>
                  <TableHeader>
                     <TableRow>
                        <TableHead>Target Recipe</TableHead>
                        <TableHead>Target Qty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {isLoading ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                     ) : orders.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No production orders currently tracked.</TableCell></TableRow>
                     ) : orders.map((order: any) => (
                        <TableRow key={order.id}>
                           <TableCell>
                              <div className="font-bold text-xs">{order.recipe?.name}</div>
                              <p className="text-[10px] text-muted-foreground">{order.notes || "No notes"}</p>
                           </TableCell>
                           <TableCell className="font-mono text-xs font-bold">{order.target_quantity || order.quantity_produced}</TableCell>
                           <TableCell>
                              <Badge variant="outline" className={cn(
                                 "text-[8px] uppercase",
                                 order.status === 'completed' ? "bg-success/10 text-success border-success/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              )}>
                                 {order.status || 'completed'}
                              </Badge>
                           </TableCell>
                           <TableCell className="text-[10px]">{new Date(order.created_at).toLocaleString()}</TableCell>
                           <TableCell className="text-right">
                              {order.status === 'planned' && (
                                 <Button variant="success" size="xs" className="h-7 gap-1" onClick={() => handleFinalize(order)}>
                                    <Play className="h-3 w-3" /> Finalize
                                 </Button>
                              )}
                              {order.status === 'completed' && <CheckCircle className="h-4 w-4 text-success ml-auto" />}
                           </TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>
            </CardContent>
         </Card>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
         <DialogContent>
            <DialogHeader><DialogTitle>Plan Production Task</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
               <div className="space-y-1">
                  <Label>Select Recipe (BOM)</Label>
                  <Select value={form.recipe_id} onValueChange={(v) => setForm({...form, recipe_id: v})}>
                     <SelectTrigger><SelectValue placeholder="Recipe" /></SelectTrigger>
                     <SelectContent>{recipes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                  </Select>
               </div>
               <div className="space-y-1">
                  <Label>Target Portions</Label>
                  <Input type="number" value={form.target_quantity} onChange={(e) => setForm({...form, target_quantity: Number(e.target.value)})} />
               </div>
               <div className="space-y-1">
                  <Label>Instructions / Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
               </div>
            </div>
            <DialogFooter>
               <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
               <Button variant="blue" onClick={handleCreateOrder}>Create Task</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
