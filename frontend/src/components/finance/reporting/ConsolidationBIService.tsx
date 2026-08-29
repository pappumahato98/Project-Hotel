import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, TrendingUp, DollarSign, Receipt, CreditCard, Users } from "lucide-react";
import { useFinancialStats, useInvoices, useExpenses } from "@/hooks/useFinanceExtended";
import { useAccounts, useTrialBalance } from "@/hooks/useFinance";

export function ConsolidationBIService({ isReadOnly }: { isReadOnly?: boolean }) {
  const stats = useFinancialStats();
  const { data: invoices } = useInvoices();
  const { data: expenses } = useExpenses();
  const { data: accounts } = useAccounts();
  const { data: trialBalance } = useTrialBalance();

  const kpis = useMemo(() => {
    const totalRevenue = stats.totalRevenue;
    const totalExpenses = stats.totalExpenses;
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
    const collectionRate = totalRevenue > 0 ? (stats.totalCollected / totalRevenue) * 100 : 0;

    // Expense breakdown by category
    const catMap: Record<string, number> = {};
    (expenses || []).forEach((e) => {
      catMap[e.category] = (catMap[e.category] || 0) + e.amount;
    });
    const topCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Revenue from invoices by month
    const monthMap: Record<string, number> = {};
    (invoices || []).forEach((inv) => {
      const month = inv.invoice_date.slice(0, 7);
      monthMap[month] = (monthMap[month] || 0) + inv.total;
    });

    return { profitMargin, collectionRate, topCategories, monthMap };
  }, [stats, invoices, expenses]);

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Financial Intelligence Dashboard
          </h2>
          <p className="text-muted-foreground text-sm">Key performance indicators from live financial data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Revenue</p>
            <p className="text-2xl font-bold font-display">{fmt(stats.totalRevenue)}</p>
            <div className="flex items-center text-[10px] text-success font-bold">
              <TrendingUp className="h-3 w-3 mr-1" /> {stats.invoiceCount} invoices
            </div>
          </CardContent>
        </Card>
        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Net Income</p>
            <p className="text-2xl font-bold font-display">{fmt(stats.netIncome)}</p>
            <p className="text-[10px] text-muted-foreground">Revenue - Expenses</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Profit Margin</p>
            <p className="text-2xl font-bold font-display">{kpis.profitMargin.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">Operating margin</p>
          </CardContent>
        </Card>
        <Card className="bg-secondary/5 border-secondary/20">
          <CardContent className="p-4 space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Collection Rate</p>
            <p className="text-2xl font-bold font-display">{kpis.collectionRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground">Collected / Invoiced</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Top Expense Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {kpis.topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expense data yet</p>
            ) : (
              kpis.topCategories.map(([cat, amount]) => {
                const total = (expenses || []).reduce((s, e) => s + e.amount, 0);
                const pct = total > 0 ? (amount / total) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium capitalize">{cat}</span>
                      <span className="font-mono">{fmt(amount)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Financial Health Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Outstanding Receivables</span>
              </div>
              <span className="text-sm font-bold">{fmt(stats.outstandingReceivables)}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Pending Expenses</span>
              </div>
              <span className="text-sm font-bold">{fmt(stats.pendingExpenses)}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium">Chart of Accounts</span>
              </div>
              <span className="text-sm font-bold">{accounts.length} accounts</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
