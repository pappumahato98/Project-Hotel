/**
 * Budget Execution View (presentation only).
 *
 * Refactored from a 115-line monolith into a thin component that consumes
 * `useBudgetExecutionView` for data and `budgetExecutionService` for pure
 * computations. See docs/FINANCE_SERVICE_SPLIT.md.
 *
 * This file should contain NO business logic.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, BarChart3, AlertCircle, ArrowDownRight } from "lucide-react";
import { useBudgetExecutionView } from "@/hooks/finance/useBudgetExecutionView";
import { cn } from "@/lib/utils";

export function BudgetExecutionService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { summary, departments } = useBudgetExecutionView();
  const { utilization, variance, totalBudgeted, totalActual } = summary;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Budget Execution
        </h2>
        <p className="text-muted-foreground text-sm">Monitor real-time variance and departmental spending.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold font-display">{utilization.toFixed(1)}%</h3>
              <p className="text-[10px] text-muted-foreground">Budget utilization</p>
            </div>
            <div className="p-2 bg-primary/10 rounded-full"><BarChart3 className="h-5 w-5 text-primary" /></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <h3 className={cn("text-2xl font-bold font-display", variance >= 0 ? "text-success" : "text-destructive")}>
                {variance >= 0 ? "+" : ""}${variance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-muted-foreground">{variance >= 0 ? "Under budget" : "Over budget"}</p>
            </div>
            <div className={cn("p-2 rounded-full", variance >= 0 ? "bg-success/10" : "bg-destructive/10")}>
              {variance >= 0 ? <ArrowDownRight className="h-5 w-5 text-success" /> : <AlertCircle className="h-5 w-5 text-destructive" />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold font-display">${totalActual.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
              <p className="text-[10px] text-muted-foreground">Actual spend (of ${totalBudgeted.toLocaleString()})</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Variance</CardTitle>
          <CardDescription>Actual vs estimated spend by expense category</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Budgeted</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No expense data available</TableCell></TableRow>
              ) : departments.map(item => (
                <TableRow key={item.dept}>
                  <TableCell className="font-medium text-sm capitalize">{item.dept}</TableCell>
                  <TableCell className="text-right font-mono text-xs">${item.budgeted.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right font-mono text-xs">${item.actual.toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className={cn("text-right font-mono text-xs font-bold", item.variance >= 0 ? "text-success" : "text-destructive")}>
                    {item.variance >= 0 ? "+" : ""}${item.variance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn("text-[10px] uppercase",
                      item.status === "Under" ? "text-success border-success/20 bg-success/5" : "text-destructive border-destructive/20 bg-destructive/5"
                    )}>{item.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
