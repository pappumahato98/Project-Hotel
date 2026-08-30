import React, { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Receipt,
  Search,
  Download,
  Calendar,
  Eye,
  FileSpreadsheet,
  FileText,
  CreditCard,
  Banknote,
  Wallet,
  Building2,
  TrendingUp,
  ShoppingCart,
  Users,
} from "lucide-react";
import { usePOSTransactions, POSTransaction, POSOrderItem } from "@/hooks/usePOS";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parseISO, isValid } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];

const paymentMethodIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  digital: <Wallet className="h-4 w-4" />,
  room: <Building2 className="h-4 w-4" />,
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  digital: "Digital Wallet",
  room: "Room Charge",
};

export function POSCombinedHistory() {
  const [period, setPeriod] = useState<"today" | "week" | "month" | "custom">("week");
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<POSTransaction | null>(null);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case "today":
        return { start: format(startOfDay(now), "yyyy-MM-dd"), end: format(endOfDay(now), "yyyy-MM-dd") };
      case "week":
        return { start: format(subDays(now, 7), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
      case "month":
        return { start: format(subDays(now, 30), "yyyy-MM-dd"), end: format(now, "yyyy-MM-dd") };
      case "custom":
        return { start: startDate, end: endDate };
      default:
        return { start: startDate, end: endDate };
    }
  }, [period, startDate, endDate]);

  const { data: transactions = [], isLoading } = usePOSTransactions({
    startDate: dateRange.start,
    endDate: dateRange.end,
  });

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        t.transaction_number?.toLowerCase().includes(query) ||
        t.table_number?.toLowerCase().includes(query) ||
        t.customer_name?.toLowerCase().includes(query)
      );
    });
  }, [transactions, searchQuery]);

  const metrics = useMemo(() => {
    const totalRevenue = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
    const totalTransactions = transactions.length;
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
    return { totalRevenue, totalTransactions, avgTransaction };
  }, [transactions]);

  const revenueByDay = useMemo(() => {
    try {
      const days = eachDayOfInterval({
        start: parseISO(dateRange.start),
        end: parseISO(dateRange.end),
      });

      return days.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayTransactions = transactions.filter(t =>
          t.created_at.startsWith(dayStr)
        );
        return {
          date: format(day, "dd/MM"),
          revenue: dayTransactions.reduce((sum, t) => sum + (t.total || 0), 0),
        };
      });
    } catch (e) {
      return [];
    }
  }, [transactions, dateRange]);

  const exportToExcel = () => {
    const data = filteredTransactions.map((t) => ({
      "Transaction #": t.transaction_number,
      Date: format(parseISO(t.created_at), "dd/MM/yyyy HH:mm"),
      Table: t.table_number,
      Customer: t.customer_name || "-",
      Total: t.total,
      "Payment Method": paymentMethodLabels[t.payment_method] || t.payment_method,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "History");
    XLSX.writeFile(wb, "pos-history.xlsx");
  };

  const formatDateSafe = (dateStr: string, formatStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return "Invalid Date";
      return format(date, formatStr);
    } catch (e) {
      return "Invalid Date";
    }
  };

  const revenueByMethod = useMemo(() => {
    const methods: Record<string, number> = {};
    transactions.forEach(t => {
      methods[t.payment_method] = (methods[t.payment_method] || 0) + (t.total || 0);
    });
    return Object.entries(methods).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Sales & Performance</h2>
          <p className="text-sm text-slate-400">Integrated history and real-time visual reports</p>
        </div>
        <div className="flex items-center gap-3">
           <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
              <SelectTrigger className="w-[160px] bg-slate-950 border-slate-800 rounded-xl h-10 focus:ring-blue-500/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Past 7 Days</SelectItem>
                <SelectItem value="month">Past 30 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
           </Select>
           <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            className="border-slate-800 bg-slate-950 hover:bg-slate-800 rounded-xl h-10"
          >
             <Download className="h-4 w-4 mr-2" />
             Export Data
           </Button>
        </div>
      </div>

      {/* Visual Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2 bg-slate-900/20 border-slate-800 rounded-3xl overflow-hidden shadow-lg">
          <CardHeader className="pb-0 pt-6 px-6">
             <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-6">
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByDay} margin={{ top: 20, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--slate-800)/0.5)" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    tick={{dy: 10}}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `NPR ${v}`}
                  />
                  <Tooltip
                    cursor={{fill: 'rgba(59, 130, 246, 0.1)'}}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: "16px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                    }}
                    itemStyle={{ color: "#3b82f6" }}
                    formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Mini Stats & Payment Split */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="p-5 rounded-3xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Total Sales</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(metrics.totalRevenue)}</p>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="p-5 rounded-3xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Total Bills</p>
                <p className="text-2xl font-bold text-white mt-1">{metrics.totalTransactions}</p>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/40">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>

          <Card className="bg-slate-900/20 border-slate-800 rounded-3xl overflow-hidden shadow-lg h-[calc(100%-156px)]">
            <CardHeader className="pb-0 pt-6 px-6">
               <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wider">Payment Split</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex items-center justify-center">
               <div className="h-[180px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueByMethod}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={8}
                        dataKey="value"
                      >
                        {revenueByMethod.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: "12px"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Transaction List */}
      <Card className="bg-slate-900/20 border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <CardHeader className="border-b border-slate-800 flex flex-row items-center justify-between px-8 py-6">
          <div>
            <CardTitle className="text-white">Detailed Transaction Log</CardTitle>
            <CardDescription className="text-slate-500">History of all processed bills and orders</CardDescription>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search by ID, Table, Guest..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-950/50 border-slate-800 h-10 rounded-xl focus:ring-blue-500/20"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          <Receipt className="h-10 w-10 opacity-20 mb-2" />
                          <p className="text-lg font-medium">No sales records found</p>
                          <p className="text-sm opacity-60">Try adjusting your filters or date range</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((t) => (
                      <TableRow key={t.id} className="border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <TableCell className="px-8 py-4 font-mono text-xs text-blue-400 font-bold">{t.transaction_number}</TableCell>
                        <TableCell className="py-4 text-xs text-slate-400">{formatDateSafe(t.created_at, "dd MMM yyyy, HH:mm")}</TableCell>
                        <TableCell className="py-4"><Badge variant="outline" className="bg-slate-950 border-slate-800 text-[10px]">T{t.table_number}</Badge></TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-1.5 text-xs capitalize text-slate-300">
                            {paymentMethodIcons[t.payment_method]}
                            {t.payment_method}
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-right font-bold text-white font-mono">{formatCurrency(t.total)}</TableCell>
                        <TableCell className="px-8 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl"
                            onClick={() => setSelectedTransaction(t)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
        </CardContent>
      </Card>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 rounded-3xl p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 pb-4 bg-slate-950/50">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
               <Receipt className="h-5 w-5 text-blue-500" />
               Bill Details
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="p-8 pt-4 space-y-6">
              <div className="flex justify-between items-center bg-slate-800/30 p-4 rounded-2xl">
                <div>
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">{selectedTransaction.transaction_number}</p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">{formatDateSafe(selectedTransaction.created_at, "PPP p")}</p>
                </div>
                <Badge variant="outline" className="bg-slate-950 border-slate-700 text-slate-200 py-1 px-3">Table {selectedTransaction.table_number}</Badge>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Order Items</p>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedTransaction.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm bg-slate-800/20 p-3 rounded-xl">
                      <span className="text-slate-200 font-medium">{item.quantity}x {item.item_name}</span>
                      <span className="text-white font-mono">{formatCurrency(item.item_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800">
                 <div className="flex justify-between text-xs font-medium px-1">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="text-slate-300">{formatCurrency(selectedTransaction.subtotal)}</span>
                 </div>
                 <div className="flex justify-between text-xs font-medium px-1">
                    <span className="text-slate-500">Service Tax (10%)</span>
                    <span className="text-slate-300">{formatCurrency(selectedTransaction.tax_amount)}</span>
                 </div>
                 <div className="flex justify-between font-bold text-xl pt-4 border-t border-dashed border-slate-700 px-1">
                    <span className="text-white">Total Amount</span>
                    <span className="text-blue-500 font-mono">{formatCurrency(selectedTransaction.total)}</span>
                 </div>
              </div>

              <div className="pt-2">
                 <Button className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all">
                    Print Receipt
                 </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
