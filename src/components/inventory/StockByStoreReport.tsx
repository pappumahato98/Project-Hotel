import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Warehouse, MapPin } from "lucide-react";
import { useStockByStore } from "@/hooks/inventory/useReportingService";
import { formatCurrency } from "@/lib/utils";

export function StockByStoreReport() {
  const { data: stockData = [], isLoading } = useStockByStore();

  // Group data by store
  const groupedByStore = useMemo(() => {
    const groups: Record<string, { store: any, items: any[], totalValue: number }> = {};
    
    stockData.forEach((row) => {
      const storeId = row.store_id;
      if (!groups[storeId]) {
        groups[storeId] = {
          store: row.store,
          items: [],
          totalValue: 0
        };
      }
      
      groups[storeId].items.push(row);
      groups[storeId].totalValue += (row.current_stock * (row.item?.cost_price || 0));
    });
    
    return Object.values(groups);
  }, [stockData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Stock by Store (Multi-Warehouse)
          </h2>
          <p className="text-muted-foreground text-sm">Real-time visibility into inventory distribution across all locations</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : groupedByStore.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12">
            <Warehouse className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <p className="text-lg font-medium text-muted-foreground">No stock data found</p>
            <p className="text-sm text-muted-foreground">Process Goods Receiving Notes (GRN) or stock transfers to populate stores.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedByStore.map((group, idx) => (
            <Card key={idx} className="overflow-hidden border-primary/10">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-primary" />
                      {group.store?.name || "Unknown Store"}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {group.store?.location || "Internal"} 
                      <Badge variant="outline" className="ml-2 text-[10px]">{group.store?.code}</Badge>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Store Value</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(group.totalValue)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Unit Value</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <p className="font-medium">{row.item?.name}</p>
                          <p className="text-xs text-muted-foreground">{row.item?.sku || "-"}</p>
                        </TableCell>
                        <TableCell className="capitalize">
                          <Badge variant="secondary" className="text-[10px]">{row.item?.category}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold">
                          {row.current_stock} <span className="text-xs font-normal text-muted-foreground">{row.item?.unit}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatCurrency(row.item?.cost_price || 0)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium text-primary">
                          {formatCurrency(row.current_stock * (row.item?.cost_price || 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
