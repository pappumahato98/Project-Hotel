import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Package, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, Boxes, ShoppingCart, Activity,
  PieChart as PieChartIcon, BarChart3, ArrowUpRight,
  ShieldCheck, RefreshCw, Zap
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell, BarChart, Bar
} from "recharts";
import {
  useInventoryStats, useInventoryItems, useStockMovements,
  useInventoryCategories, useInventoryWastage
} from "@/hooks/inventory";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function InventoryDashboard() {
  const stats = useInventoryStats();
  const { data: items = [] } = useInventoryItems();
  const { data: categories = [] } = useInventoryCategories();
  const { data: movements = [] } = useStockMovements();
  const { data: wastage = [] } = useInventoryWastage();

  const categoryDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    items.forEach(item => {
      const catName = categories.find(c => c.id === item.category_id)?.name || "Uncategorized";
      dist[catName] = (dist[catName] || 0) + (item.current_stock * (item.avg_cost || item.cost_price));
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [items, categories]);

  const topItemsByValue = useMemo(() => {
    return items
      .map(i => ({
        name: i.name,
        value: i.current_stock * (i.avg_cost || i.cost_price)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [items]);

  const COLORS = ['#0066ff', '#00d1ff', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden group">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Asset Value</p>
                <p className="text-3xl font-black mt-1 text-primary">{formatCurrency(stats.totalValue)}</p>
                <div className="flex items-center gap-1 mt-2 text-xs font-medium text-success">
                  <TrendingUp className="h-3 w-3" />
                  <span>+2.4% vs last month</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Critical Stock</p>
                <p className="text-3xl font-black mt-1 text-amber-500">{stats.lowStock}</p>
                <div className="flex items-center gap-1 mt-2 text-xs font-medium text-amber-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Requires replenishment</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Boxes className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">MTD Consumption</p>
                <p className="text-3xl font-black mt-1 text-emerald-600 font-mono">
                  {formatCurrency(movements.filter(m => m.movement_type === 'out').reduce((s, m) => s + (m.quantity * ((m.item as any)?.avg_cost || 0)), 0))}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs font-medium text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  <span>Across all departments</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden group">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Wastage Loss</p>
                <p className="text-3xl font-black mt-1 text-destructive">
                   {formatCurrency(wastage.reduce((s, w) => s + w.cost_impact, 0))}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs font-medium text-destructive">
                  <TrendingDown className="h-3 w-3" />
                  <span>-1.2% from previous week</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Distribution Pie */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Value by Category
            </CardTitle>
            <CardDescription>Asset distribution across item groups</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={categoryDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                     >
                        {categoryDistribution.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                     />
                  </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
               {categoryDistribution.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                     <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{cat.name}</span>
                     </div>
                     <span className="font-bold">{formatCurrency(cat.value)}</span>
                  </div>
               ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Items Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                High Value Inventory
              </CardTitle>
              <CardDescription>Top 6 SKUs by total carrying value</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold h-7 gap-1">
              View All Items <ArrowUpRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full pt-4">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topItemsByValue} layout="vertical" margin={{ left: 40 }}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
                     <XAxis type="number" hide />
                     <YAxis
                        dataKey="name"
                        type="category"
                        fontSize={10}
                        width={100}
                        tick={{ fill: '#64748b' }}
                     />
                     <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        cursor={{ fill: '#f1f5f9' }}
                     />
                     <Bar dataKey="value" fill="#0066ff" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-dashed hover:border-primary hover:bg-primary/5 transition-all">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div className="text-center">
               <p className="text-xs font-bold">Pending Approvals</p>
               <p className="text-[10px] text-muted-foreground">3 items awaiting review</p>
            </div>
         </Button>

         <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-dashed hover:border-blue-500 hover:bg-blue-50 transition-all">
            <RefreshCw className="h-6 w-6 text-blue-500" />
            <div className="text-center">
               <p className="text-xs font-bold">Run Stock Audit</p>
               <p className="text-[10px] text-muted-foreground">Last audit 12 days ago</p>
            </div>
         </Button>

         <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-dashed hover:border-amber-500 hover:bg-amber-50 transition-all">
            <ShoppingCart className="h-6 w-6 text-amber-500" />
            <div className="text-center">
               <p className="text-xs font-bold">Generate Bulk POs</p>
               <p className="text-[10px] text-muted-foreground">{stats.lowStock} items below reorder</p>
            </div>
         </Button>

         <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl border-dashed hover:border-emerald-500 hover:bg-emerald-50 transition-all">
            <Zap className="h-6 w-6 text-emerald-500" />
            <div className="text-center">
               <p className="text-xs font-bold">AI Stock Forecast</p>
               <p className="text-[10px] text-muted-foreground">Trend: {stats.demandForecast}</p>
            </div>
         </Button>
      </div>
    </div>
  );
}
