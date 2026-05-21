import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BarChart3, TrendingUp, ArrowUpRight, Download, Calendar } from "lucide-react";
import { usePayments, useExpenses } from "@/hooks/useFinanceExtended";
import { format } from "date-fns";

export function CashBankReportingService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { data: payments } = usePayments();
  const { data: expenses } = useExpenses({ status: "paid" });

  const { movements, totalInflow, totalOutflow, balance } = useMemo(() => {
    type Movement = { date: string; desc: string; inflow: number; outflow: number; balance: number };
    const all: Movement[] = [];

    (payments || []).forEach((p) => {
      all.push({ date: p.payment_date, desc: `Payment ${p.payment_number} (${p.payment_method})`, inflow: p.amount, outflow: 0, balance: 0 });
    });

    (expenses || []).forEach((e) => {
      all.push({ date: e.expense_date, desc: `${e.description} - ${e.vendor || e.category}`, inflow: 0, outflow: e.amount, balance: 0 });
    });

    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const inf = all.reduce((s, m) => s + m.inflow, 0);
    const out = all.reduce((s, m) => s + m.outflow, 0);

    // Running balance from oldest to newest
    const sorted = [...all].reverse();
    let running = 0;
    sorted.forEach((m) => {
      running += m.inflow - m.outflow;
      m.balance = running;
    });

    return { movements: all.slice(0, 20), totalInflow: inf, totalOutflow: out, balance: running };
  }, [payments, expenses]);

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Cash & Bank Reporting
          </h2>
          <p className="text-muted-foreground text-sm">Liquidity monitoring from actual payment and expense records.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" /> Net Cash Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{fmt(balance)}</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Running balance</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/10">
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase">Total Inflows</p>
            <p className="text-xl font-bold text-success">{fmt(totalInflow)}</p>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/10">
          <CardContent className="pt-4">
            <p className="text-[10px] text-muted-foreground uppercase">Total Outflows</p>
            <p className="text-xl font-bold text-destructive">{fmt(totalOutflow)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Cash Movements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Inflow</TableHead>
                <TableHead className="text-right">Outflow</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No cash movements recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs">{m.date}</TableCell>
                    <TableCell className="font-medium text-sm">{m.desc}</TableCell>
                    <TableCell className="text-right text-success font-mono text-xs">
                      {m.inflow > 0 ? fmt(m.inflow) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-destructive font-mono text-xs">
                      {m.outflow > 0 ? fmt(m.outflow) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(m.balance)}</TableCell>
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
