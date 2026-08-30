import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Package, Search, Loader2, AlertTriangle, Plus
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";

export function SuppliesTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [useDialogOpen, setUseDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [useQuantity, setUseQuantity] = useState(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: supplies = [], isLoading } = useQuery({
    queryKey: ["housekeeping-supplies"],
    queryFn: async () => {
      const { data, error } = await db
        .from("inventory_items")
        .select("*")
        .eq("department", "Housekeeping")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const useSupplyMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      // Deduct from inventory
      const item = supplies.find((s: any) => s.id === itemId);
      if (!item) throw new Error("Item not found");
      
      const newStock = Math.max(0, item.current_stock - quantity);
      const { error } = await db
        .from("inventory_items")
        .update({ current_stock: newStock })
        .eq("id", itemId);
      if (error) throw error;

      // Log the usage in stock movements table if available
      try {
        await db.from("stock_movements").insert({
          item_id: itemId,
          movement_type: "out",
          quantity: quantity,
          reference_type: "housekeeping_usage",
          notes: "Housekeeping supply usage",
        });
      } catch {
        // Stock movements table may not exist, ignore
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping-supplies"] });
      toast.success("Supply usage recorded");
      setUseDialogOpen(false);
      setSelectedItem(null);
      setUseQuantity(1);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredSupplies = supplies.filter((item: any) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = supplies.filter((item: any) => item.current_stock <= item.reorder_point);

  const openUseDialog = (item: any) => {
    setSelectedItem(item);
    setUseQuantity(1);
    setUseDialogOpen(true);
  };

  const handleUseSupply = () => {
    if (!selectedItem || useQuantity <= 0) return;
    useSupplyMutation.mutate({ itemId: selectedItem.id, quantity: useQuantity });
  };

  return (
    <div className="space-y-6">
      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-500">Low Stock Alert</p>
                <p className="text-sm text-muted-foreground">
                  {lowStockItems.length} item(s) below reorder point: {lowStockItems.slice(0, 3).map((i: any) => i.name).join(", ")}
                  {lowStockItems.length > 3 && ` and ${lowStockItems.length - 3} more`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card variant="elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Cleaning Supplies
              </CardTitle>
              <CardDescription>Track and manage housekeeping inventory</CardDescription>
            </div>
            <Button variant="outline" onClick={() => window.location.href = "/inventory"}>
              Go to Inventory
            </Button>
          </div>
          
          <div className="mt-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search supplies..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSupplies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No housekeeping supplies found.</p>
              <p className="text-sm">Add items with "Housekeeping" department in Inventory module.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-center">Current Stock</TableHead>
                    <TableHead className="text-center">Reorder Point</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSupplies.map((item: any) => {
                    const isLow = item.current_stock <= item.reorder_point;
                    const isEmpty = item.current_stock === 0;
                    return (
                      <TableRow key={item.id} className={isEmpty ? "bg-destructive/5" : isLow ? "bg-amber-500/5" : ""}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tight">
                            {item.category_name || "General"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.item_code || "-"}</TableCell>
                        <TableCell className={`text-center font-medium ${isEmpty ? "text-destructive" : isLow ? "text-amber-500" : ""}`}>
                          {item.current_stock}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">{item.reorder_point}</TableCell>
                        <TableCell className="capitalize">{item.unit}</TableCell>
                        <TableCell>{formatCurrency(item.cost_price)}</TableCell>
                        <TableCell>
                          {isEmpty ? (
                            <Badge className="bg-destructive/20 text-destructive">Out of Stock</Badge>
                          ) : isLow ? (
                            <Badge className="bg-amber-500/20 text-amber-400">Low Stock</Badge>
                          ) : (
                            <Badge className="bg-success/20 text-success">In Stock</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openUseDialog(item)}
                            disabled={isEmpty}
                          >
                            Use
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Use Supply Dialog */}
      <Dialog open={useDialogOpen} onOpenChange={setUseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use Supply</DialogTitle>
            <DialogDescription>
              Record usage of: {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="text-2xl font-bold">{selectedItem?.current_stock} {selectedItem?.unit}</p>
            </div>
            <div className="space-y-2">
              <Label>Quantity to Use</Label>
              <Input 
                type="number"
                min={1}
                max={selectedItem?.current_stock || 1}
                value={useQuantity}
                onChange={(e) => setUseQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUseDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleUseSupply} 
              disabled={useQuantity <= 0 || useQuantity > (selectedItem?.current_stock || 0) || useSupplyMutation.isPending}
            >
              {useSupplyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Record Usage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
