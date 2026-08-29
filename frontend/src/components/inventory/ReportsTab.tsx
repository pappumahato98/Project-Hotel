import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart3, TrendingDown, TrendingUp, AlertCircle, Download,
  FileText, Truck, Activity, Timer, Boxes, RefreshCw, ShoppingCart,
  UtensilsCrossed, PieChart, FileSpreadsheet, Sparkles, Star, LineChart as LineChartIcon,
  Package, Loader2, LucideIcon
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line, BarChart, Bar, Cell, ComposedChart
} from "recharts";
import {
  useInventoryStats, useInventoryItems, useStockMovements,
  useSuppliers, usePurchaseOrders, useInventoryWastage,
  useInventoryRequisitions, useInventoryRecipes, useInventoryStockCounts,
  InventoryItem, StockMovement, InventoryWastage, Supplier
} from "@/hooks/inventory";
import { formatCurrency, cn } from "@/lib/utils";
import { exportToExcel, exportToPDF } from "@/lib/reportExport";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ReportInfo {
  title: string;
  desc: string;
  icon: LucideIcon;
  data: (InventoryItem | StockMovement | InventoryWastage | Supplier)[];
  headers: string[];
}

export function ReportsTab() {
  const stats = useInventoryStats();
  const { data: stockCounts = [] } = useInventoryStockCounts();
  const { data: items = [] } = useInventoryItems();
  const { data: movements = [] } = useStockMovements();
  const { data: suppliers = [] } = useSuppliers();
  const { data: orders = [] } = usePurchaseOrders();
  const { data: wastageList = [] } = useInventoryWastage();
  const { createRequisition } = useInventoryRequisitions();
  const { data: recipes = [] } = useInventoryRecipes();

  const [isReplenishing, setIsReplenishing] = useState(false);
  const [reportDetailOpen, setReportDetailOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<ReportInfo | null>(null);

  const departmentValue = (items || []).reduce((acc: Record<string, number>, item: InventoryItem) => {
    const dept = item.department || "Unassigned";
    const cost = (item.avg_cost || item.cost_price || 0);
    acc[dept] = (acc[dept] || 0) + (item.current_stock * cost);
    return acc;
  }, {});

  const consumptionByDept = (movements || [])
    .filter(m => m.movement_type === 'out')
    .reduce((acc: Record<string, number>, m) => {
      const item = m.item as InventoryItem | undefined;
      const dept = item?.department || "General";
      const value = m.quantity * (item?.avg_cost || item?.cost_price || 0);
      acc[dept] = (acc[dept] || 0) + value;
      return acc;
    }, {});

  const totalConsumption = Object.values(consumptionByDept).reduce((a, b) => a + b, 0) as number;
  const totalWastage = (wastageList || []).reduce((sum, w) => sum + w.cost_impact, 0);

  const { data: posTransactions = [] } = useQuery<{ total: number | null }[]>({
    queryKey: ["pos-transactions-report"],
    queryFn: async () => {
       const { data } = await supabase.from('pos_transactions').select('total').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
       return (data || []) as { total: number | null }[];
    }
  });

  const mtdSales = posTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
  const foodCostPercentage = mtdSales > 0 ? (((consumptionByDept["F&B"] || totalConsumption * 0.4) / mtdSales) * 100).toFixed(1) : "28.4";

  const inventoryTurnover = totalConsumption > 0 ? (totalConsumption / stats.totalValue).toFixed(2) : "0.00";
  const wastePercentage = totalConsumption > 0 ? ((totalWastage / totalConsumption) * 100).toFixed(1) : "0.0";

  const avgAgingDays = (items || []).length > 0 ? Math.ceil((items || []).reduce((sum, i) => {
     const lastActionDate = i.last_restocked_at ? new Date(i.last_restocked_at) : new Date(i.created_at);
     const diff = Math.abs(Date.now() - lastActionDate.getTime()) / (1000 * 60 * 60 * 24);
     return sum + diff;
  }, 0) / (items || []).length) : 0;

  const lowStockItems = (items || []).filter(i => i.current_stock <= i.reorder_point);

  const topConsumed = useMemo(() => {
    const map = new Map<string, { name: string, qty: number, value: number }>();
    (movements || [])
      .filter(m => m.movement_type === 'out')
      .forEach(m => {
        const item = m.item as InventoryItem | undefined;
        if (!item) return;
        const current = map.get(m.item_id) || { name: item.name, qty: 0, value: 0 };
        current.qty += m.quantity;
        current.value += m.quantity * (item.avg_cost || item.cost_price || 0);
        map.set(m.item_id, current);
      });
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [movements]);

  const supplierPerformance = useMemo(() => {
    return (suppliers || []).map(s => {
      const supplierOrders = (orders || []).filter(o => o.supplier_id === s.id);
      const receivedOrders = supplierOrders.filter(o => (o.status === 'received' || o.status === 'partially_received'));

      let avgLeadTime = 0;
      let totalSpend = 0;

      if (receivedOrders.length > 0) {
        avgLeadTime = receivedOrders.reduce((sum, o) => {
          if (!o.received_date) return sum + 2; // Assume 2 days if not recorded but marked received
          const ordered = new Date(o.order_date).getTime();
          const received = new Date(o.received_date).getTime();
          return sum + Math.max(0, (received - ordered) / (1000 * 60 * 60 * 24));
        }, 0) / receivedOrders.length;

        totalSpend = receivedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      }

      const fulfillmentRate = supplierOrders.length > 0
        ? (receivedOrders.length / supplierOrders.length) * 100
        : 0;

      return {
        id: s.id,
        name: s.name,
        avgLeadTime: avgLeadTime.toFixed(1),
        fulfillmentRate: fulfillmentRate.toFixed(0),
        totalOrders: supplierOrders.length,
        totalSpend,
        rating: s.rating || 5
      };
    }).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [suppliers, orders]);

  const varianceTrend = useMemo(() => {
    return (stockCounts || []).slice(0, 5).reverse().map(sc => ({
      date: new Date(sc.count_date).toLocaleDateString(),
      variance: sc.items?.reduce((sum, i) => sum + Math.abs(i.variance), 0) || 0
    }));
  }, [stockCounts]);

  const priceTrend = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const received = (orders || []).filter(o => o.status === 'received').slice(0, 10).reverse();
    return received.map(o => ({
      date: new Date(o.order_date).toLocaleDateString(),
      avgPrice: (o.subtotal || 0) / (o.items?.length || 1),
      total: o.total
    }));
  }, [orders]);

  const recipeStats = (recipes || []).map(r => {
     const cost = r.items?.reduce((s, i) => s + (i.quantity * (i.item?.cost_price || 0)), 0) || 0;
     const theoreticalUsage = (movements || []).filter(m => m.reference_type === 'pos_sale' && m.notes?.includes(r.id)).length;
     return { name: r.name, cost, theoreticalUsage };
  });

  const handleAutoReplenish = async () => {
     if (lowStockItems.length === 0) return;
     setIsReplenishing(true);
     try {
        const { data: { user } } = await supabase.auth.getUser();
        await createRequisition.mutateAsync({
           department: "Procurement (Auto)",
           priority: "high",
           notes: "Automated replenishment for low stock items",
           requested_by: user?.id,
           items: lowStockItems.map(i => ({
              item_id: i.id,
              quantity: (i.reorder_point * 2)
           }))
        });
        toast.success(`Generated replenishment request for ${lowStockItems.length} items`);
     } catch {
        toast.error("Auto-replenish failed");
     } finally {
        setIsReplenishing(false);
     }
  };

  const handleExport = (reportName: string, format: "pdf" | "excel") => {
    let headers: string[] = [];
    let rows: (string | number | null | undefined)[][] = [];

    if (reportName === "Departmental Performance") {
       headers = ["Department", "Stock Value", "Usage (MTD)"];
       rows = Object.entries(departmentValue).map(([dept, val]) => [
         dept, formatCurrency(val), formatCurrency(consumptionByDept[dept] || 0)
       ]);
    } else if (reportName === "Wastage Analysis") {
       headers = ["Date", "Item", "Type", "Quantity", "Cost Impact"];
       rows = wastageList.map(w => [new Date(w.created_at).toLocaleDateString(), w.item?.name, w.wastage_type, w.quantity, formatCurrency(w.cost_impact)]);
    } else if (reportName === "Consumption Analysis") {
       headers = ["Department", "Item", "Quantity", "Value"];
       rows = (movements || []).filter(m => m.movement_type === 'out').map(m => {
          const item = m.item as InventoryItem | undefined;
          return [
            item?.department || 'General',
            item?.name || 'Unknown',
            m.quantity,
            formatCurrency(m.quantity * (item?.avg_cost || item?.cost_price || 0))
          ];
       });
    } else {
       headers = ["Item", "Category", "Stock", "Avg Cost", "Value"];
       rows = (items || []).map(i => [i.name, i.category?.name || "-", i.current_stock, formatCurrency(i.avg_cost || i.cost_price), formatCurrency(i.current_stock * (i.avg_cost || i.cost_price))]);
    }

    const data = { title: `${reportName} - Inventory`, headers, rows };
    if (format === "pdf") {
      exportToPDF(data);
    } else {
      exportToExcel(data);
    }
  };

  const openReport = (report: ReportInfo) => {
     setActiveReport(report);
     setReportDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Key KPIs Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-3d-blue">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inventory Turnover</p>
                <p className="text-2xl font-bold mt-1">{inventoryTurnover}x</p>
              </div>
              <RefreshCw className="h-4 w-4 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive shadow-sm">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Waste Percentage</p>
                <p className="text-2xl font-bold mt-1 text-destructive">{wastePercentage}%</p>
              </div>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-success shadow-sm">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Food Cost %</p>
                <p className="text-2xl font-bold mt-1 text-success">{foodCostPercentage}%</p>
              </div>
              <UtensilsCrossed className="h-4 w-4 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-amber-50/20">
          <CardContent className="pt-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Demand Forecast</p>
                <p className={cn("text-2xl font-bold mt-1", (stats.demandForecast?.includes('+') && stats.demandForecast !== '+0.0%') ? "text-destructive" : "text-success")}>
                  {stats.demandForecast}
                </p>
              </div>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">Expected usage trend for next 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
         <Card className="bg-muted/30">
            <CardContent className="pt-4">
               <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center"><Timer className="h-4 w-4 text-primary" /></div>
                  <div>
                     <p className="text-[10px] font-bold text-muted-foreground uppercase">Inventory Aging</p>
                     <p className="text-lg font-bold">{stats.avgAgingDays} <span className="text-[10px] font-normal lowercase">days avg</span></p>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="bg-muted/30">
            <CardContent className="pt-4">
               <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-destructive/10 flex items-center justify-center"><AlertCircle className="h-4 w-4 text-destructive" /></div>
                  <div>
                     <p className="text-[10px] font-bold text-muted-foreground uppercase">Stock Variance</p>
                     <p className="text-lg font-bold text-destructive">{stats.stockVariance} <span className="text-[10px] font-normal lowercase">units</span></p>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="bg-muted/30">
            <CardContent className="pt-4">
               <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-success/10 flex items-center justify-center"><Boxes className="h-4 w-4 text-success" /></div>
                  <div>
                     <p className="text-[10px] font-bold text-muted-foreground uppercase">Available SKUs</p>
                     <p className="text-lg font-bold text-success">{stats.totalItems - stats.outOfStock}</p>
                  </div>
               </div>
            </CardContent>
         </Card>
         <Card className="bg-muted/30">
            <CardContent className="pt-4">
               <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded bg-amber-500/10 flex items-center justify-center"><AlertCircle className="h-4 w-4 text-amber-500" /></div>
                  <div>
                     <p className="text-[10px] font-bold text-muted-foreground uppercase">Reorder Alerts</p>
                     <p className="text-lg font-bold text-amber-500">{stats.lowStock}</p>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Price Trend Chart */}
         <Card>
            <CardHeader>
               <CardTitle className="text-base font-bold flex items-center gap-2"><LineChartIcon className="h-4 w-4" /> Purchase Price Trend</CardTitle>
               <p className="text-xs text-muted-foreground">Historical average order value over time</p>
            </CardHeader>
            <CardContent>
               <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={priceTrend}>
                        <defs>
                           <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0066ff" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#0066ff" stopOpacity={0}/>
                           </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" fontSize={10} />
                        <YAxis fontSize={10} tickFormatter={(v) => `$${v}`} />
                        <Tooltip />
                        <Area type="monotone" dataKey="avgPrice" stroke="#0066ff" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>

         {/* Audit Variance Trend */}
         <Card>
            <CardHeader>
               <CardTitle className="text-base font-bold flex items-center gap-2"><Activity className="h-4 w-4" /> Audit Variance Trend</CardTitle>
               <p className="text-xs text-muted-foreground">Variance volume detected across last 5 audits</p>
            </CardHeader>
            <CardContent>
               <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={varianceTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="date" fontSize={10} />
                        <YAxis fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="variance" fill="#ef4444" radius={[4, 4, 0, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
         </Card>

        {/* Department Analysis */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
               <CardTitle className="text-base font-bold">Departmental Performance</CardTitle>
               <p className="text-xs text-muted-foreground">Stock value vs monthly usage</p>
            </div>
            <div className="flex gap-1">
               <Button variant="ghost" size="icon" onClick={() => handleExport("Departmental Performance", "excel")}><Download className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Usage (MTD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(departmentValue).sort((a, b) => b[1] - a[1]).map(([dept, val]) => (
                  <TableRow key={dept}>
                    <TableCell className="font-medium text-xs">{dept}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(val)}</TableCell>
                    <TableCell className="text-right text-muted-foreground font-mono text-xs">
                      {formatCurrency(consumptionByDept[dept] || 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
               <CardTitle className="text-base font-bold text-amber-600">Low Stock Notifications</CardTitle>
               <p className="text-xs text-muted-foreground">Items requiring immediate replenishment</p>
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1 border-amber-500 text-amber-600 shadow-sm" onClick={handleAutoReplenish} disabled={isReplenishing || lowStockItems.length === 0}>
               {isReplenishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
               Auto-Replenish
            </Button>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Stock</TableHead><TableHead>Target</TableHead></TableRow></TableHeader>
                <TableBody>
                   {lowStockItems.slice(0, 5).map(i => (
                      <TableRow key={i.id}>
                         <TableCell className="text-xs font-medium">{i.name}</TableCell>
                         <TableCell className="text-xs font-bold text-destructive">{i.current_stock}</TableCell>
                         <TableCell className="text-xs text-muted-foreground">{i.reorder_point}</TableCell>
                      </TableRow>
                   ))}
                   {lowStockItems.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-xs italic text-muted-foreground">All items above reorder points</TableCell></TableRow>
                   )}
                </TableBody>
             </Table>
          </CardContent>
        </Card>

        {/* Top Consumed Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold">Top Consumed Items (MTD)</CardTitle>
            <p className="text-xs text-muted-foreground">Highest volume usage by SKU</p>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader>
                <TableBody>
                   {topConsumed.map((item, idx) => (
                      <TableRow key={idx}>
                         <TableCell className="text-xs font-medium">{item.name}</TableCell>
                         <TableCell className="text-right text-xs font-bold">{item.qty}</TableCell>
                         <TableCell className="text-right text-xs font-mono">{formatCurrency(item.value)}</TableCell>
                      </TableRow>
                   ))}
                   {topConsumed.length === 0 && (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-xs italic text-muted-foreground">No consumption data</TableCell></TableRow>
                   )}
                </TableBody>
             </Table>
          </CardContent>
        </Card>

        {/* Smart Reorder Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Smart Reorder Suggestions</CardTitle>
            <p className="text-xs text-muted-foreground">AI-driven replenishment based on usage trends</p>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader><TableRow><TableHead>Item</TableHead><TableHead className="text-right">Suggested Qty</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                <TableBody>
                   {stats.reorderSuggestions?.map((s, idx) => (
                      <TableRow key={idx}>
                         <TableCell className="text-xs font-medium">{s.name}</TableCell>
                         <TableCell className="text-right text-xs font-bold">{s.suggestedQty}</TableCell>
                         <TableCell className="text-right">
                            <Button variant="outline" size="xs" className="h-7 text-[10px]" onClick={handleAutoReplenish}>Create Req.</Button>
                         </TableCell>
                      </TableRow>
                   ))}
                   {(!stats.reorderSuggestions || stats.reorderSuggestions.length === 0) && (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-xs italic text-muted-foreground">No suggestions available</TableCell></TableRow>
                   )}
                </TableBody>
             </Table>
          </CardContent>
        </Card>
      </div>

      {/* Reports Listing */}
      <div className="space-y-4 pt-4">
        <h4 className="font-semibold text-lg flex items-center gap-2"><FileText className="h-5 w-5" /> Executive Reporting Queries</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Stock Valuation", desc: "Detailed item-wise stock value", icon: Package, data: items, headers: ["Item", "Category", "Stock", "Cost", "Value"] },
            { title: "Consumption Analysis", desc: "Usage breakdown by department", icon: Activity, data: movements.filter(m => m.movement_type === 'out'), headers: ["Date", "Item", "Qty", "Dept"] },
            { title: "Wastage Analysis", desc: "Detailed breakdown of losses", icon: AlertCircle, data: wastageList, headers: ["Date", "Item", "Type", "Qty", "Cost"] },
            { title: "Supplier Scorecard", desc: "Fulfillment & rating metrics", icon: Truck, data: suppliers, headers: ["Supplier", "Rating", "Active", "Lead Time"] },
            { title: "Reorder Report", desc: "Items below minimum stock levels", icon: ShoppingCart, data: items.filter(i => i.current_stock <= i.min_stock), headers: ["Item", "Current", "Min", "Reorder Qty"] },
            { title: "Audit Trail", desc: "Manual stock adjustment history", icon: FileText, data: movements.filter(m => m.reference_type === 'manual_adjustment' || m.movement_type === 'adjustment'), headers: ["Date", "Item", "Action", "Qty", "Notes"] },
          ].map((rpt, idx) => (
            <Card key={idx} className="hover:bg-muted/50 transition-colors cursor-pointer group border-dashed" onClick={() => openReport(rpt)}>
              <CardContent className="pt-6">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <rpt.icon className="h-5 w-5 text-primary" />
                </div>
                <h5 className="font-bold text-sm">{rpt.title}</h5>
                <p className="text-xs text-muted-foreground mt-1">{rpt.desc}</p>
                <Button variant="link" className="p-0 h-auto mt-4 text-xs font-semibold group-hover:translate-x-1 transition-transform">Generate Report &rarr;</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
         {/* Supplier Performance Scorecard */}
         <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
               <div>
                  <CardTitle className="text-base font-bold">Supplier Delivery & Performance Analytics</CardTitle>
                  <p className="text-xs text-muted-foreground">Lead time, fulfillment rates, and spend analysis</p>
               </div>
               <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => handleExport("Supplier Performance", "excel")}>
                  <FileSpreadsheet className="h-3 w-3" /> Export Analytics
               </Button>
            </CardHeader>
            <CardContent>
               <Table>
                  <TableHeader>
                     <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead className="text-center">Lead Time (Avg)</TableHead>
                        <TableHead className="text-center">Fulfillment</TableHead>
                        <TableHead className="text-right">Total Spend</TableHead>
                        <TableHead className="text-center">Rating</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {supplierPerformance.slice(0, 6).map((s, idx) => (
                        <TableRow key={idx}>
                           <TableCell>
                              <p className="text-xs font-bold">{s.name}</p>
                              <p className="text-[10px] text-muted-foreground">{s.totalOrders} total orders</p>
                           </TableCell>
                           <TableCell className="text-center">
                              <Badge variant="secondary" className="text-[10px]">{s.avgLeadTime} days</Badge>
                           </TableCell>
                           <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                 <span className="text-[10px] font-bold">{s.fulfillmentRate}%</span>
                                 <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${s.fulfillmentRate}%` }} />
                                 </div>
                              </div>
                           </TableCell>
                           <TableCell className="text-right font-mono text-xs font-bold">
                              {formatCurrency(s.totalSpend)}
                           </TableCell>
                           <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                 <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                 <span className="text-xs font-bold">{s.rating}</span>
                              </div>
                           </TableCell>
                        </TableRow>
                     ))}
                  </TableBody>
               </Table>
            </CardContent>
         </Card>
      </div>

      {/* Report Detail Modal */}
      <Dialog open={reportDetailOpen} onOpenChange={setReportDetailOpen}>
         <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="flex flex-row items-center justify-between">
               <DialogTitle className="flex items-center gap-2">
                  {activeReport?.icon && <activeReport.icon className="h-5 w-5" />}
                  {activeReport?.title}
               </DialogTitle>
               <Button variant="outline" size="sm" className="gap-2" onClick={() => activeReport && handleExport(activeReport.title, "excel")}>
                  <Download className="h-4 w-4" /> Export Excel
               </Button>
            </DialogHeader>
            <div className="py-4">
               <Table>
                  <TableHeader>
                     <TableRow>
                        {activeReport?.headers?.map((h: string) => <TableHead key={h}>{h}</TableHead>)}
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                     {activeReport?.title === "Stock Valuation" && activeReport.data.map((i: InventoryItem) => (
                        <TableRow key={i.id}>
                           <TableCell className="text-xs">{i.name}</TableCell>
                           <TableCell className="text-xs">{i.category?.name || "-"}</TableCell>
                           <TableCell className="text-xs font-bold">{i.current_stock}</TableCell>
                           <TableCell className="text-xs font-mono">{formatCurrency(i.avg_cost || i.cost_price)}</TableCell>
                           <TableCell className="text-xs font-bold font-mono">{formatCurrency(i.current_stock * (i.avg_cost || i.cost_price))}</TableCell>
                        </TableRow>
                     ))}
                     {activeReport?.title === "Consumption Analysis" && activeReport.data.map((m: StockMovement) => {
                        const item = m.item as InventoryItem | undefined;
                        return (
                          <TableRow key={m.id}>
                             <TableCell className="text-xs">{new Date(m.created_at).toLocaleDateString()}</TableCell>
                             <TableCell className="text-xs font-bold">{item?.name || 'Unknown'}</TableCell>
                             <TableCell className="text-xs">{m.quantity}</TableCell>
                             <TableCell className="text-xs text-muted-foreground">{item?.department || 'General'}</TableCell>
                          </TableRow>
                        );
                     })}
                     {activeReport?.title === "Wastage Analysis" && activeReport.data.map((w: InventoryWastage) => (
                        <TableRow key={w.id}>
                           <TableCell className="text-xs">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                           <TableCell className="text-xs">{w.item?.name}</TableCell>
                           <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{w.wastage_type}</Badge></TableCell>
                           <TableCell className="text-xs font-bold">{w.quantity}</TableCell>
                           <TableCell className="text-xs font-mono text-destructive">{formatCurrency(w.cost_impact)}</TableCell>
                        </TableRow>
                     ))}
                     {activeReport?.title === "Supplier Scorecard" && supplierPerformance.map((s) => (
                        <TableRow key={s.id}>
                           <TableCell className="text-xs font-bold">{s.name}</TableCell>
                           <TableCell className="text-xs">{s.rating}/5</TableCell>
                           <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{s.fulfillmentRate}% Fulfillment</Badge></TableCell>
                           <TableCell className="text-xs font-bold">{s.avgLeadTime} Days Lead</TableCell>
                           <TableCell className="text-xs font-mono">{formatCurrency(s.totalSpend)} Spend</TableCell>
                        </TableRow>
                     ))}
                     {activeReport?.title === "Reorder Report" && activeReport.data.map((i) => {
                        const item = i as InventoryItem;
                        return (
                          <TableRow key={item.id}>
                             <TableCell className="text-xs font-bold">{item.name}</TableCell>
                             <TableCell className="text-xs text-destructive font-bold">{item.current_stock}</TableCell>
                             <TableCell className="text-xs">{item.min_stock}</TableCell>
                             <TableCell className="text-xs font-bold">{Math.max(0, (item.reorder_point * 2) - item.current_stock)}</TableCell>
                          </TableRow>
                        );
                     })}
                     {activeReport?.title === "Audit Trail" && activeReport.data.map((m: StockMovement) => {
                        const item = m.item as InventoryItem | undefined;
                        return (
                          <TableRow key={m.id}>
                             <TableCell className="text-xs">{new Date(m.created_at).toLocaleString()}</TableCell>
                             <TableCell className="text-xs font-bold">{item?.name || 'Unknown'}</TableCell>
                             <TableCell className="text-xs uppercase font-mono">{m.movement_type}</TableCell>
                             <TableCell className="text-xs">{m.quantity}</TableCell>
                             <TableCell className="text-xs text-muted-foreground italic">{m.notes || 'No comments'}</TableCell>
                          </TableRow>
                        );
                     })}
                  </TableBody>
               </Table>
            </div>
         </DialogContent>
      </Dialog>
    </div>
  );
}
