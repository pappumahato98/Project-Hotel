import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, TrendingUp, TrendingDown, Search, Download, MapPin } from "lucide-react";
import { useStockMovements, useInventoryStores } from "@/hooks/inventory";
import { formatAD, cn } from "@/lib/utils";
import { exportToExcel, exportToPDF } from "@/lib/reportExport";

export function StockMovementsTab() {
  const { data: movements = [] } = useStockMovements();
  const { data: stores = [] } = useInventoryStores();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [storeFilter, setStoreFilter] = useState("all");

  const filtered = (movements || []).filter((m) => {
    const item = m.item as Record<string, unknown> | undefined;
    const matchesSearch = !search || (item?.name as string)?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || m.movement_type === typeFilter;
    const matchesStore = storeFilter === "all" || m.store_id === storeFilter;
    return matchesSearch && matchesType && matchesStore;
  });

  const handleExport = (format: "pdf" | "excel") => {
    const data = {
      title: "Stock Movements Audit Ledger",
      headers: ["Date", "Item", "Store", "Type", "Quantity", "Ref"],
      rows: filtered.map((m) => {
        const item = m.item as Record<string, unknown> | undefined;
        return [
          formatAD(new Date(m.created_at), "time"),
          (item?.name as string) || "-",
          stores.find(s => s.id === m.store_id)?.name || "Main",
          m.movement_type,
          m.quantity,
          m.reference_type || "Manual",
        ];
      }),
    };
    if (format === "pdf") {
      exportToPDF(data);
    } else {
      exportToExcel(data);
    }
  };

  return (
    <div className="space-y-6">
      <Card variant="elevated">
        <CardHeader className="bg-muted/10">
          <div className="flex items-center justify-between">
            <div><CardTitle className="text-sm font-bold uppercase flex items-center gap-2 tracking-widest"><ArrowUpDown className="h-4 w-4" /> Comprehensive Transaction Ledger</CardTitle></div>
            <div className="flex gap-2">
              <Button variant="outline" size="xs" className="h-8" onClick={() => handleExport("excel")}><Download className="h-3 w-3 mr-1" />Excel</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search item..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-48 h-9 text-xs" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 h-9 text-xs"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="in">Stock In</SelectItem>
                <SelectItem value="out">Stock Out</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="w-40 h-9 text-xs"><SelectValue placeholder="All Stores" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="text-[10px] font-bold">Timestamp</TableHead>
                <TableHead className="text-[10px] font-bold">Item</TableHead>
                <TableHead className="text-[10px] font-bold">Store</TableHead>
                <TableHead className="text-[10px] font-bold">Action</TableHead>
                <TableHead className="text-[10px] font-bold">Qty</TableHead>
                <TableHead className="text-[10px] font-bold">Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs italic">No matching movements</TableCell></TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow key={m.id} className="hover:bg-muted/5 transition-colors">
                    <TableCell className="text-[10px] font-mono">{formatAD(new Date(m.created_at), "time")}</TableCell>
                    <TableCell className="text-xs font-semibold">{(m.item as Record<string, unknown>)?.name as string || "-"}</TableCell>
                    <TableCell className="text-[10px]"><Badge variant="outline" className="h-4 font-normal">{stores.find(s => s.id === m.store_id)?.name || "Main"}</Badge></TableCell>
                    <TableCell>
                      <Badge className={cn("text-[9px] h-4", m.movement_type === "in" ? "bg-success/10 text-success border-success/20" : m.movement_type === "out" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-muted text-muted-foreground")}>
                        {m.movement_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-bold">{m.quantity}</TableCell>
                    <TableCell className="text-[10px] text-muted-foreground truncate max-w-[120px]">{m.reference_type || "Manual Adjustment"}</TableCell>
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
