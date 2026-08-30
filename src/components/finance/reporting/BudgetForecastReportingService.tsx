import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PieChart, Download, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBudgets } from "@/hooks/useBudgets";

export function BudgetForecastReportingService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { data: budgets, isLoading } = useBudgets();

  const analysis = useMemo(() => {
    const activeBudgets = (budgets || []).filter((b) => b.status === "active" || b.status === "approved");

    const linesByBudget: Record<string, { budgeted: number; actual: number; name: string }> = {};

    activeBudgets.forEach((b) => {
      const lines = b.lines || [];
      const budgeted = lines.reduce((s, l) => s + l.budgeted_amount, 0);
      const actual = lines.reduce((s, l) => s + l.actual_amount, 0);
      linesByBudget[b.id] = { budgeted, actual, name: b.name };
    });

    const totalBudgeted = Object.values(linesByBudget).reduce((s, v) => s + v.budgeted, 0);
    const totalActual = Object.values(linesByBudget).reduce((s, v) => s + v.actual, 0);
    const variance = totalBudgeted > 0 ? ((totalActual - totalBudgeted) / totalBudgeted) * 100 : 0;

    return { linesByBudget, totalBudgeted, totalActual, variance, activeBudgets };
  }, [budgets]);

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" /> Budget vs. Actual Analysis
          </h2>
          <p className="text-muted-foreground text-sm">Live variance analysis from active budgets.</p>
        </div>
        <Button className="gap-2"><Download className="h-4 w-4" /> Export Analytics</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-success/5 border-success/10">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Total Budgeted</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(analysis.totalBudgeted)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">{analysis.activeBudgets.length} active budget(s)</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Total Actual</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{fmt(analysis.totalActual)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Recorded to date</p>
          </CardContent>
        </Card>
        <Card className={analysis.variance > 5 ? "bg-destructive/5 border-destructive/10" : "bg-success/5 border-success/10"}>
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Variance</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold flex items-center gap-1 ${analysis.variance > 5 ? "text-destructive" : "text-success"}`}>
              {analysis.variance > 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
              {Math.abs(analysis.variance).toFixed(1)}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{analysis.variance > 0 ? "Over budget" : "Under budget"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Budget Performance</CardTitle>
          <CardDescription>{isLoading ? "Loading..." : "Active budgets with variance breakdown"}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Budget</TableHead>
                <TableHead className="text-right">Budgeted</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">% Used</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(analysis.linesByBudget).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No active budgets. Create and activate budgets in Setup → Budget Setup.
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(analysis.linesByBudget).map(([id, data]) => {
                  const variance = data.actual - data.budgeted;
                  const pctUsed = data.budgeted > 0 ? (data.actual / data.budgeted) * 100 : 0;
                  return (
                    <TableRow key={id}>
                      <TableCell className="font-medium">{data.name}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(data.budgeted)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmt(data.actual)}</TableCell>
                      <TableCell className={`text-right font-mono text-xs font-bold ${variance > 0 ? "text-destructive" : "text-success"}`}>
                        {variance > 0 ? "+" : ""}{fmt(variance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={pctUsed > 100 ? "destructive" : "secondary"} className="text-[10px]">
                          {pctUsed.toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
