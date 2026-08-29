import React, { useState } from "react";
import { cn, formatAD, formatCurrency } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  DollarSign, BarChart3, TrendingUp, Lock, Unlock, Receipt,
  Utensils, Bed, Sparkles, ChevronRight, Printer, FileText, Banknote, CreditCard, Wallet
} from "lucide-react";
import { toast } from "sonner";
import { useNightAudit } from "@/hooks/useNightAudit";
import { useReportStats } from "@/hooks/useReportStats";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";

export function DayClosePanel() {
  const queryClient = useQueryClient();
  const { businessDate } = useNightAudit();
  const { data: reportStats, isLoading: statsLoading } = useReportStats();
  const [isClosed, setIsClosed] = useState(false);

  // Fetch audit history from night_audit_logs
  const { data: auditHistory = [] } = useQuery({
    queryKey: ["day-close-history"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("night_audit_logs")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch payment method breakdown from today's pos_transactions
  const { data: paymentBreakdown = [] } = useQuery({
    queryKey: ["day-close-payments", businessDate],
    queryFn: async () => {
      const today = businessDate || new Date().toISOString().split("T")[0];
      const { data, error } = await (supabase as any)
        .from("pos_transactions")
        .select("payment_method, total")
        .gte("created_at", `${today}T00:00:00`)
        .lt("created_at", `${today}T23:59:59`);
      if (error) throw error;
      
      const breakdown: Record<string, { count: number; total: number }> = {};
      (data || []).forEach((t: any) => {
        const method = t.payment_method || "other";
        if (!breakdown[method]) breakdown[method] = { count: 0, total: 0 };
        breakdown[method].count++;
        breakdown[method].total += t.total || 0;
      });
      return Object.entries(breakdown).map(([method, stats]) => ({ method, ...stats }));
    },
    enabled: !!businessDate,
  });

  // Fetch today's expenses
  const { data: todayExpenses = 0 } = useQuery({
    queryKey: ["day-close-expenses", businessDate],
    queryFn: async () => {
      const today = businessDate || new Date().toISOString().split("T")[0];
      const { data, error } = await (supabase as any)
        .from("expenses")
        .select("amount")
        .eq("expense_date", today);
      if (error) throw error;
      return (data || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
    },
    enabled: !!businessDate,
  });

  // Persist day close
  const persistClose = useMutation({
    mutationFn: async () => {
      const today = businessDate || new Date().toISOString().split("T")[0];
      const totalRevenue = (reportStats?.totalReservationRevenue || 0) + (reportStats?.totalPOSRevenue || 0) + (reportStats?.totalInvoiceRevenue || 0);
      const { error } = await (supabase as any)
        .from("night_audit_logs")
        .insert({
          business_date: today,
          total_charges_posted: (reportStats?.reservationCount || 0) + (reportStats?.posCount || 0),
          total_room_revenue: totalRevenue,
          occupancy_rate: reportStats?.occupancyRate || 0,
          status: "completed",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["day-close-history"] });
    },
  });

  const handleCloseDay = async () => {
    try {
      await persistClose.mutateAsync();
      setIsClosed(true);
      toast.success("Day has been successfully balanced and closed for accounting.");
    } catch (e: any) {
      toast.error("Failed to close day: " + e.message);
    }
  };

  const totalRevenue = (reportStats?.totalReservationRevenue || 0) + (reportStats?.totalPOSRevenue || 0) + (reportStats?.totalInvoiceRevenue || 0);
  const netProfit = totalRevenue - todayExpenses;

  const departmentRevenue = [
    { id: 1, name: "Rooms & Lodging", code: "ROOM", amount: reportStats?.totalReservationRevenue || 0, transactions: reportStats?.reservationCount || 0, icon: Bed, color: "text-blue-500" },
    { id: 2, name: "Restaurant (POS)", code: "REST", amount: reportStats?.totalPOSRevenue || 0, transactions: reportStats?.posCount || 0, icon: Utensils, color: "text-orange-500" },
    { id: 3, name: "Invoiced Revenue", code: "INV", amount: reportStats?.totalInvoiceRevenue || 0, transactions: reportStats?.invoiceCount || 0, icon: Receipt, color: "text-green-500" },
  ];

  const paymentIcons: Record<string, any> = { cash: Banknote, card: CreditCard, digital: Wallet };

  const exportDailySummary = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Daily Summary Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Business Date: ${businessDate ? formatAD(parseISO(businessDate)) : "N/A"}`, 14, 32);
    doc.text(`Total Revenue: ${formatCurrency(totalRevenue)}`, 14, 42);
    doc.text(`Total Expenses: ${formatCurrency(todayExpenses)}`, 14, 48);
    doc.text(`Net Profit: ${formatCurrency(netProfit)}`, 14, 54);
    departmentRevenue.forEach((dept, i) => {
      doc.text(`${dept.name}: ${formatCurrency(dept.amount)} (${dept.transactions} txn)`, 14, 66 + i * 6);
    });
    doc.save(`daily-summary-${businessDate || "report"}.pdf`);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col h-full overflow-y-auto pr-2 scrollbar-hide p-4 sm:p-6 space-y-6">
        {/* Status Card */}
        <Card className={cn("border-l-4 transition-all", isClosed ? "border-l-success" : "border-l-amber-500")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isClosed ? <Lock className="h-5 w-5 text-success" /> : <Unlock className="h-5 w-5 text-amber-500" />}
                Accounting Status: {isClosed ? "Closed" : "Open"}
              </CardTitle>
              <CardDescription>
                Business Date: {businessDate ? formatAD(parseISO(businessDate)) : "---"}
              </CardDescription>
            </div>
            {isClosed ? (
              <Button variant="outline" onClick={exportDailySummary} className="gap-2">
                <FileText className="h-4 w-4" /> Export PDF
              </Button>
            ) : (
              <Button onClick={handleCloseDay} disabled={persistClose.isPending} className="gap-2 bg-amber-600 hover:bg-amber-700">
                <Lock className="h-4 w-4" /> Finalize & Balance Day
              </Button>
            )}
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Revenue Summary */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" /> Department Revenue Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentRevenue.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg bg-secondary/50", dept.color)}>
                            <dept.icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium">{dept.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><code className="text-xs">{dept.code}</code></TableCell>
                      <TableCell className="text-right">{dept.transactions}</TableCell>
                      <TableCell className="text-right font-mono font-bold">{formatCurrency(dept.amount)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-secondary/30 font-bold">
                    <TableCell colSpan={3} className="text-right uppercase text-xs tracking-wider opacity-60">Total Daily Revenue</TableCell>
                    <TableCell className="text-right text-lg text-primary font-display">{formatCurrency(totalRevenue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Quick Metrics + Payment Breakdown */}
          <div className="space-y-6">
            <Card variant="elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn("text-2xl font-bold", netProfit >= 0 ? "text-success" : "text-destructive")}>
                  {statsLoading ? <Skeleton className="h-8 w-24" /> : formatCurrency(netProfit)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Revenue minus expenses</p>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Expenses Today</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(todayExpenses)}</p>
                <p className="text-xs text-muted-foreground mt-1">All departments</p>
              </CardContent>
            </Card>

            {/* Payment Method Breakdown */}
            <Card variant="glass" className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentBreakdown.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No POS transactions today</p>
                ) : (
                  <div className="space-y-3">
                    {paymentBreakdown.map((item: any) => {
                      const Icon = paymentIcons[item.method] || Receipt;
                      return (
                        <div key={item.method} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="capitalize">{item.method}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold">{formatCurrency(item.total)}</span>
                            <span className="text-xs text-muted-foreground ml-2">({item.count})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity History from DB */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Day Close History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No day close history yet.</p>
              ) : auditHistory.map((log: any, i: number) => (
                <div key={log.id} className="flex items-center justify-between p-4 rounded-lg border bg-secondary/20 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center border">
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{formatAD(log.business_date)}</p>
                      <p className="text-xs text-muted-foreground">Occupancy: {Math.round(log.occupancy_rate || 0)}%</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(log.total_room_revenue || 0)}</p>
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      {log.status?.toUpperCase() || "COMPLETED"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


