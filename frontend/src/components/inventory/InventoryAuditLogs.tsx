import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ClipboardList, ShieldCheck, User } from "lucide-react";
import { formatAD } from "@/lib/utils";

export function InventoryAuditLogs() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["inventory-audit-logs"],
    queryFn: async () => {
      // Fetching from stock_movements as it contains the most granular history
      const { data } = await supabase
        .from('stock_movements')
        .select('*, item:inventory_items(name, sku)')
        .order('created_at', { ascending: false })
        .limit(100);
      return data || [];
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> System Audit Trail</h3>
          <p className="text-sm text-muted-foreground">Historical log of all inventory adjustments and movements</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
               <TableHeader className="bg-muted/30">
                  <TableRow>
                     <TableHead className="text-[10px] uppercase font-bold">Timestamp</TableHead>
                     <TableHead className="text-[10px] uppercase font-bold">Action / Reference</TableHead>
                     <TableHead className="text-[10px] uppercase font-bold">Target Item</TableHead>
                     <TableHead className="text-[10px] uppercase font-bold">Delta</TableHead>
                     <TableHead className="text-[10px] uppercase font-bold">Notes</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {logs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic">No system logs available.</TableCell></TableRow>
                  ) : (
                    logs.map((log: any) => (
                      <TableRow key={log.id} className="hover:bg-muted/5">
                        <TableCell className="text-[10px] font-mono whitespace-nowrap">{formatAD(new Date(log.created_at), "time")}</TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[8px] h-4 uppercase">{log.movement_type}</Badge>
                              <span className="text-[10px] font-medium">{log.reference_type?.replace('_', ' ') || 'Internal'}</span>
                           </div>
                        </TableCell>
                        <TableCell>
                           <div className="font-bold text-[10px]">{log.item?.name}</div>
                           <div className="text-[9px] text-muted-foreground">{log.item?.sku}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">
                           {log.movement_type === 'out' ? '-' : '+'}{log.quantity}
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground italic truncate max-w-[200px]">
                           {log.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
               </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
