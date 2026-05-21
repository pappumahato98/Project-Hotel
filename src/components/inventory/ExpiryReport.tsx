import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePurchaseOrders } from "@/hooks/inventory";
import { ShieldAlert } from "lucide-react";

export function ExpiryReport() {
  const { data: orders = [] } = usePurchaseOrders('received');

  // Extract items with expiry dates from received POs
  const expiringItems = orders.flatMap(po =>
    (po.items || []).filter(item => item.expiry_date).map(item => ({
      poNumber: po.order_number,
      itemName: item.item?.name,
      batch: item.batch_number,
      expiry: item.expiry_date,
      qty: item.received_quantity,
      daysLeft: Math.ceil((new Date(item.expiry_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    }))
  ).sort((a, b) => (a.daysLeft || 0) - (b.daysLeft || 0));

  const criticalCount = expiringItems.filter(i => i.daysLeft <= 15).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h3 className="text-lg font-medium">Expiry Monitoring Report</h3>
            <p className="text-sm text-muted-foreground">Track items nearing shelf-life expiration by batch</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="pt-4 flex items-center gap-4">
               <div className="h-10 w-10 rounded bg-destructive/10 flex items-center justify-center text-destructive"><ShieldAlert className="h-5 w-5" /></div>
               <div>
                  <p className="text-xs uppercase font-bold text-muted-foreground">Critical (&lt;15 days)</p>
                  <p className="text-2xl font-bold text-destructive">{criticalCount}</p>
               </div>
            </CardContent>
         </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Batch #</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Qty in Batch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiringItems.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">No batch expiry data found</TableCell></TableRow>
              ) : (
                expiringItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell className="font-mono text-[10px]">{item.batch || 'N/A'}</TableCell>
                    <TableCell className="text-xs">{item.expiry}</TableCell>
                    <TableCell className="font-bold">{item.daysLeft} d</TableCell>
                    <TableCell>
                       <Badge variant={item.daysLeft <= 15 ? "destructive" : item.daysLeft <= 30 ? "warning" : "secondary"}>
                          {item.daysLeft <= 0 ? 'Expired' : item.daysLeft <= 15 ? 'Critical' : 'Near Expiry'}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{item.qty}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
