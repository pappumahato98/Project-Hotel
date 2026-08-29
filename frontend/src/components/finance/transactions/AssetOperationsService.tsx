import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Plus, ArrowRightLeft, Trash2, Play } from "lucide-react";
import { useFixedAssets } from "@/hooks/useFixedAssets";
import { toast } from "sonner";

export function AssetOperationsService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { data: assets, isLoading, runDepreciation, calculateDepreciation } = useFixedAssets();

  const activeAssets = (assets || []).filter(a => a.status === "active");
  const totalMonthlyDep = activeAssets.reduce((s, a) => s + calculateDepreciation(a), 0);

  const handleRunDepreciation = async () => {
    try {
      const count = await runDepreciation.mutateAsync();
      toast.success(`Depreciation run completed for ${count} assets`);
    } catch (e: any) { toast.error(e.message); }
  };

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
          <Button className="gap-2" onClick={handleRunDepreciation} disabled={runDepreciation.isPending}>
            <Play className="h-4 w-4" /> {runDepreciation.isPending ? "Running..." : "Run Monthly Depreciation"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Active Assets</p>
            <h3 className="text-xl font-bold">{activeAssets.length}</h3>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Est. Monthly Depreciation</p>
            <h3 className="text-xl font-bold">${totalMonthlyDep.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Accum. Depreciation</p>
            <h3 className="text-xl font-bold text-success">
              ${(assets || []).reduce((s, a) => s + a.accumulated_depreciation, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
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
                  <TableCell className="text-right font-mono text-xs">${a.cost.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-destructive">
                    -${a.accumulated_depreciation.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    ${calculateDepreciation(a).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-bold">
                    ${(a.cost - a.accumulated_depreciation).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
