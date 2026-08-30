/**
 * Asset Operations View (presentation only).
 * Refactored to consume useAssetOperationsView.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Play } from "lucide-react";
import { useAssetOperationsView } from "@/hooks/finance/useAssetOperationsView";
import { formatDollar } from "@/lib/finance/assetOperationsService";

export function AssetOperationsService({ isReadOnly }: { isReadOnly?: boolean }) {
  const {
    activeAssets,
    isLoading,
    summary,
    getMonthlyDepreciation,
    getAssetBookValue,
    runDepreciation,
    isRunningDepreciation,
  } = useAssetOperationsView();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" /> Asset Operations
          </h2>
          <p className="text-muted-foreground text-sm">Execute depreciation runs, transfers, and disposals.</p>
        </div>
        {!isReadOnly && (
          <Button className="gap-2" onClick={runDepreciation} disabled={isRunningDepreciation}>
            <Play className="h-4 w-4" /> {isRunningDepreciation ? "Running..." : "Run Monthly Depreciation"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Active Assets</p>
            <h3 className="text-xl font-bold">{summary.activeCount}</h3>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Est. Monthly Depreciation</p>
            <h3 className="text-xl font-bold">{formatDollar(summary.totalMonthlyDepreciation)}</h3>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Accum. Depreciation</p>
            <h3 className="text-xl font-bold text-success">{formatDollar(summary.totalAccumulatedDepreciation)}</h3>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Depreciation Schedule</CardTitle>
          <CardDescription>Current depreciation status for all active assets</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset #</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Accum. Depr.</TableHead>
                <TableHead className="text-right">Monthly Depr.</TableHead>
                <TableHead className="text-right">Book Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : activeAssets.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No active assets</TableCell></TableRow>
              ) : activeAssets.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs text-primary font-bold">{a.asset_number}</TableCell>
                  <TableCell className="text-sm">{a.name}</TableCell>
                  <TableCell className="text-xs capitalize">{a.depreciation_method.replace("_", " ")}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatDollar(a.cost)}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-destructive">
                    -{formatDollar(a.accumulated_depreciation)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {formatDollar(getMonthlyDepreciation(a))}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold">
                    {formatDollar(getAssetBookValue(a))}
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
