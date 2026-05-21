import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventoryItems, useInventoryStores } from "@/hooks/inventory";
import { formatCurrency } from "@/lib/utils";
import { Download, MapPin } from "lucide-react";
import { exportToExcel } from "@/lib/reportExport";

export function InventoryValuationReport() {
  const { data: items = [], isLoading } = useInventoryItems();
  const { data: stores = [] } = useInventoryStores();
  const [storeFilter, setStoreFilter] = useState("all");

  const filteredItems = storeFilter === "all"
    ? items
    : items.filter(i => i.department === storeFilter || i.location === storeFilter); // Fallback logic as store-item relation is in separate table

  const totalValue = filteredItems.reduce((sum, item) => sum + (item.current_stock * (item.avg_cost || item.cost_price)), 0);

  const handleExport = () => {
    const data = {
      title: `Inventory Valuation Report - ${storeFilter === 'all' ? 'All Locations' : storeFilter}`,
      headers: ["Item", "Category", "Stock", "Unit", "Valuation"],
      rows: filteredItems.map(i => [
        i.name, i.category?.name || "-", i.current_stock, i.uom?.abbreviation || i.unit,
        formatCurrency(i.current_stock * (i.avg_cost || i.cost_price))
      ])
    };
    exportToExcel(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-muted/20 p-4 rounded-xl border border-dashed border-primary/20">
         <div className="flex items-center gap-4">
            <div>
               <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Real-time Asset Valuation</h3>
               <p className="text-[10px] text-muted-foreground">Current property value based on weighted costs</p>
            </div>
            <div className="flex items-center gap-2 border-l pl-4">
               <MapPin className="h-4 w-4 text-muted-foreground" />
               <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger className="w-40 h-8 text-xs bg-background"><SelectValue placeholder="All Stores" /></SelectTrigger>
                  <SelectContent>
                     <SelectItem value="all">All Stores (Master)</SelectItem>
                     {stores.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
               </Select>
            </div>
         </div>
         <Button variant="blue" className="gap-2 h-9 shadow-3d-blue" onClick={handleExport}><Download className="h-4 w-4" /> Export Assets</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="border-l-4 border-l-blue-500 shadow-sm">
            <CardHeader className="pb-1 pt-3"><CardTitle className="text-[10px] uppercase text-muted-foreground font-bold">Consolidated Value</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-primary">{formatCurrency(totalValue)}</p></CardContent>
         </Card>
      </div>

      <Card variant="elevated">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-[11px] font-bold">Item Name</TableHead>
                <TableHead className="text-[11px] font-bold">Category</TableHead>
                <TableHead className="text-right text-[11px] font-bold">Stock</TableHead>
                <TableHead className="text-right text-[11px] font-bold">Weighted Cost</TableHead>
                <TableHead className="text-right text-[11px] font-bold">Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/10 transition-colors">
                  <TableCell className="font-medium text-xs">{item.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.category?.name || "-"}</TableCell>
                  <TableCell className="text-right text-xs font-bold">{item.current_stock} <span className="text-[9px] text-muted-foreground font-normal uppercase">{item.uom?.abbreviation || item.unit}</span></TableCell>
                  <TableCell className="text-right font-mono text-[10px]">{formatCurrency(item.avg_cost || item.cost_price)}</TableCell>
                  <TableCell className="text-right font-bold text-xs text-primary">{formatCurrency(item.current_stock * (item.avg_cost || item.cost_price))}</TableCell>
                </TableRow>
              ))}
              {filteredItems.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-10 text-xs italic text-muted-foreground">No items in selected store</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
