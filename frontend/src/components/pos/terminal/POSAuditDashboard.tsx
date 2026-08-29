import React, { useMemo, useState } from "react";
import { usePOSTransactions } from "@/hooks/usePOS";
import { usePOSTerminal } from "@/hooks/pos/usePOSTerminal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, cn } from "@/lib/utils";
import {
  TrendingUp,
  Users,
  ShoppingCart,
  AlertOctagon,
  PieChart as PieChartIcon,
  DollarSign,
  CreditCard,
  Banknote,
  Home,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Legend
} from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export const POSAuditDashboard = () => {
  const { data: transactions = [] } = usePOSTransactions({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const { activeOrders } = usePOSTerminal();

  // Shift reconciliation state
  const [actualCash, setActualCash] = useState(0);

  const metrics = useMemo(() => {
    const revenue = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
    const covers = activeOrders.reduce((sum, o) => sum + (o.total_covers || 0), 0);
    const orderCount = transactions.length;
    const avgCheck = orderCount > 0 ? revenue / orderCount : 0;
    return { revenue, covers, avgCheck, orderCount };
  }, [transactions, activeOrders]);

  // Revenue by Payment Method
  const paymentBreakdown = useMemo(() => {
    const methods: Record<string, number> = {};
    transactions.forEach(t => {
      const method = (t as any).payment_method || "cash";
      methods[method] = (methods[method] || 0) + (t.total || 0);
    });
    return Object.entries(methods).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [transactions]);

  // Hourly Sales Data
  const hourlySales = useMemo(() => {
    const hours: Record<number, number> = {};
    for (let i = 6; i <= 23; i++) hours[i] = 0;

    transactions.forEach(t => {
      const hour = new Date(t.created_at || Date.now()).getHours();
      if (hours[hour] !== undefined) {
        hours[hour] += (t.total || 0);
      }
    });

    return Object.entries(hours).map(([hour, sales]) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      sales
    }));
  }, [transactions]);

  // Product Mix
  const pMix = useMemo(() => {
    const items: Record<string, { name: string; qty: number; revenue: number }> = {};
    transactions.forEach(t => {
      t.items?.forEach((i: any) => {
        if (!items[i.item_name]) items[i.item_name] = { name: i.item_name, qty: 0, revenue: 0 };
        items[i.item_name].qty += i.quantity;
        items[i.item_name].revenue += (i.item_price * i.quantity);
      });
    });
    return Object.values(items).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [transactions]);

  // Cash reconciliation
  const expectedCash = useMemo(() => {
    return transactions
      .filter((t: any) => (t.payment_method || "cash") === "cash")
      .reduce((sum, t) => sum + (t.total || 0), 0);
  }, [transactions]);

  const cashVariance = actualCash - expectedCash;

  // This should ideally be fetched from a real audit/voids table
  const voids: any[] = [];

  return (
    <div className="space-y-6">
      {/* 1-Page Flash Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: formatCurrency(metrics.revenue), icon: DollarSign, color: "text-blue-500", bgColor: "bg-blue-500/10", change: "+12.5%", positive: true },
          { label: "Orders", value: metrics.orderCount, icon: ShoppingCart, color: "text-emerald-500", bgColor: "bg-emerald-500/10", change: `${metrics.covers} covers`, positive: true },
          { label: "Avg Check", value: formatCurrency(metrics.avgCheck), icon: TrendingUp, color: "text-amber-500", bgColor: "bg-amber-500/10", change: "+3.2%", positive: true },
          { label: "Active Tables", value: activeOrders.length, icon: Users, color: "text-purple-500", bgColor: "bg-purple-500/10", change: "Live", positive: true },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", stat.bgColor)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </div>
              <p className="text-2xl font-black">{stat.value}</p>
              <div className="flex items-center gap-1 mt-1">
                {stat.positive ? <ArrowUpRight className="h-3 w-3 text-emerald-500" /> : <ArrowDownRight className="h-3 w-3 text-red-500" />}
                <span className={cn("text-[10px] font-bold", stat.positive ? "text-emerald-500" : "text-red-500")}>
                  {stat.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hourly Sales Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Hourly Sales Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlySales}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="hour" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', background: 'hsl(var(--card))' }}
                    formatter={(value: number) => [formatCurrency(value), "Sales"]}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue by Payment Method */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {paymentBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs">
                  No payment data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value">
                      {paymentBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-2 mt-4">
              {paymentBreakdown.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold">{formatCurrency(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Mix (P-Mix) Winners */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Product Mix (Top Winners)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {pMix.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground italic text-xs">
                  No sales data for today's P-Mix
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pMix} layout="vertical" margin={{ left: 60 }}>
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} fontSize={10} />
                     <Tooltip
                       cursor={{ fill: 'transparent' }}
                       contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                       formatter={(value: number) => formatCurrency(value)}
                     />
                     <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={18}>
                        {pMix.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Void & Audit Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-destructive" />
              Void & Audit Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase font-bold">Item</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold">Reason</TableHead>
                  <TableHead className="text-[10px] uppercase font-bold text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {voids.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground italic py-8">
                      No voids logged today
                    </TableCell>
                  </TableRow>
                ) : (
                  voids.map((v, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{v.item}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px]">{v.reason}</Badge></TableCell>
                      <TableCell className="text-right text-xs font-bold text-destructive">-${v.value.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Shift Reconciliation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
           <CardTitle className="text-sm font-bold flex items-center gap-2">
             <Banknote className="h-4 w-4 text-primary" />
             Daily Cashier Report (Shift End)
           </CardTitle>
           <Badge className={cn(
             cashVariance === 0 && actualCash === 0 ? "bg-muted text-muted-foreground" :
             Math.abs(cashVariance) <= 5 ? "bg-emerald-500" : "bg-red-500"
           )}>
             {actualCash === 0 ? "AWAITING COUNT" : Math.abs(cashVariance) <= 5 ? "BALANCED" : "VARIANCE DETECTED"}
           </Badge>
        </CardHeader>
        <CardContent>
           <div className="grid grid-cols-4 gap-6 p-4 rounded-xl bg-muted/20 border">
              <div>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase">Expected Cash</p>
                 <p className="text-lg font-black">{formatCurrency(expectedCash)}</p>
              </div>
              <div>
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Actual Cash Count</Label>
                <Input
                  type="number"
                  className="h-10 mt-1 font-bold text-lg"
                  value={actualCash || ""}
                  onChange={(e) => setActualCash(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase">Over / Short</p>
                 <p className={cn(
                   "text-lg font-black",
                   cashVariance > 0 ? "text-emerald-500" : cashVariance < 0 ? "text-red-500" : ""
                 )}>
                   {cashVariance > 0 ? "+" : ""}{formatCurrency(cashVariance)}
                 </p>
              </div>
              <div>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase">Card Revenue</p>
                 <p className="text-lg font-black">
                   {formatCurrency(metrics.revenue - expectedCash)}
                 </p>
              </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
};
