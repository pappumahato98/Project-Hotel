import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from "recharts";
import { useInventoryItems, usePurchaseOrders, useSuppliers } from "@/hooks/inventory";
import { formatCurrency, cn } from "@/lib/utils";
import { ShoppingCart, TrendingDown, TrendingUp, DollarSign, Truck } from "lucide-react";

export function PriceComparisonReport() {
  const { data: items = [] } = useInventoryItems();
  const { data: orders = [] } = usePurchaseOrders();
  const { data: suppliers = [] } = useSuppliers();
  const [selectedItemId, setSelectedItemId] = useState<string>("");

  const comparisonData = useMemo(() => {
    if (!selectedItemId) return [];

    const supplierPrices: Record<string, { lastPrice: number, minPrice: number, maxPrice: number, orders: number }> = {};

    orders.forEach(order => {
      const lineItem = order.items?.find(i => i.item_id === selectedItemId);
      if (lineItem && order.supplier_id) {
        const sName = suppliers.find(s => s.id === order.supplier_id)?.name || "Unknown";
        if (!supplierPrices[sName]) {
          supplierPrices[sName] = {
            lastPrice: lineItem.unit_price,
            minPrice: lineItem.unit_price,
            maxPrice: lineItem.unit_price,
            orders: 0
          };
        }

        supplierPrices[sName].orders += 1;
        supplierPrices[sName].minPrice = Math.min(supplierPrices[sName].minPrice, lineItem.unit_price);
        supplierPrices[sName].maxPrice = Math.max(supplierPrices[sName].maxPrice, lineItem.unit_price);
        // Assuming orders are sorted by date or we update lastPrice correctly
        supplierPrices[sName].lastPrice = lineItem.unit_price;
      }
    });

    return Object.entries(supplierPrices).map(([name, stats]) => ({
      name,
      ...stats
    })).sort((a, b) => a.lastPrice - b.lastPrice);
  }, [selectedItemId, orders, suppliers]);

  const selectedItem = items.find(i => i.id === selectedItemId);
  const COLORS = ['#0066ff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-end bg-muted/20 p-4 rounded-xl border border-dashed">
         <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Market Analysis: Select Item</label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
               <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="Choose an item to compare vendor pricing..." />
               </SelectTrigger>
               <SelectContent>
                  {items.map(i => (
                     <SelectItem key={i.id} value={i.id}>{i.name} ({i.sku})</SelectItem>
                  ))}
               </SelectContent>
            </Select>
         </div>
      </div>

      {!selectedItemId ? (
         <Card className="border-dashed flex flex-col items-center justify-center p-20 text-center bg-muted/10">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <h4 className="text-lg font-bold text-muted-foreground">Price Comparison Matrix</h4>
            <p className="text-sm text-muted-foreground max-w-sm mt-2">Analyze historical purchase prices across different suppliers to optimize your procurement costs.</p>
         </Card>
      ) : (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
               <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                     <TrendingDown className="h-4 w-4 text-primary" />
                     Vendor Price Variance: {selectedItem?.name}
                  </CardTitle>
                  <CardDescription>Comparison of last purchase prices by supplier</CardDescription>
               </CardHeader>
               <CardContent>
                  <div className="h-[300px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                           <XAxis dataKey="name" fontSize={10} tick={{ fill: '#64748b' }} />
                           <YAxis fontSize={10} tick={{ fill: '#64748b' }} tickFormatter={(v) => `$${v}`} />
                           <Tooltip
                              formatter={(value: number) => formatCurrency(value)}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                           />
                           <Bar dataKey="lastPrice" name="Last Price" radius={[4, 4, 0, 0]} barSize={40}>
                              {comparisonData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </CardContent>
            </Card>

            <Card className="lg:col-span-1">
               <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                     <Truck className="h-4 w-4 text-primary" />
                     Supplier Pricing Details
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-0">
                  <Table>
                     <TableHeader className="bg-muted/30">
                        <TableRow>
                           <TableHead className="text-[10px] uppercase">Vendor</TableHead>
                           <TableHead className="text-right text-[10px] uppercase">Last Rate</TableHead>
                        </TableRow>
                     </TableHeader>
                     <TableBody>
                        {comparisonData.length === 0 ? (
                           <TableRow><TableCell colSpan={2} className="text-center py-10 text-xs text-muted-foreground">No purchase history found.</TableCell></TableRow>
                        ) : (
                           comparisonData.map((s, idx) => (
                              <TableRow key={idx}>
                                 <TableCell>
                                    <p className="text-xs font-bold">{s.name}</p>
                                    <p className="text-[9px] text-muted-foreground">{s.orders} orders placed</p>
                                 </TableCell>
                                 <TableCell className="text-right">
                                    <p className="text-xs font-bold font-mono">{formatCurrency(s.lastPrice)}</p>
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                       <span className="text-[8px] text-muted-foreground">Range: {formatCurrency(s.minPrice)}-{formatCurrency(s.maxPrice)}</span>
                                    </div>
                                 </TableCell>
                              </TableRow>
                           ))
                        )}
                     </TableBody>
                  </Table>
               </CardContent>
            </Card>
         </div>
      )}
    </div>
  );
}
