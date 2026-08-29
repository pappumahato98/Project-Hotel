import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Download, Search } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFixedAssets } from "@/hooks/useFixedAssets";

export function FixedAssetsReportingService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { data: assets, isLoading } = useFixedAssets();

  const { totalCost, totalDepreciation, netBookValue } = useMemo(() => {
    const active = (assets || []).filter((a) => a.status === "active");
    return {
      totalCost: active.reduce((s, a) => s + a.cost, 0),
      totalDepreciation: active.reduce((s, a) => s + a.accumulated_depreciation, 0),
      netBookValue: active.reduce((s, a) => s + (a.cost - a.accumulated_depreciation), 0),
    };
  }, [assets]);

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Fixed Asset Register
          </h2>
          <p className="text-muted-foreground text-sm">Comprehensive listing and valuation of all non-current assets.</p>
        </div>
        <Button className="gap-2"><Download className="h-4 w-4" /> Export Register</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Total Asset Cost</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-display">{fmt(totalCost)}</div></CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Accumulated Depreciation</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-display text-destructive">-{fmt(totalDepreciation)}</div></CardContent>
        </Card>
        <Card className="bg-success/5 border-success/10">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase text-muted-foreground">Net Book Value</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold font-display text-success">{fmt(netBookValue)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asset Register Table</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${(assets || []).length} registered assets`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Asset #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Original Cost</TableHead>
                <TableHead className="text-right">Accum. Depr.</TableHead>
                <TableHead className="text-right">Net Book Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(assets || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No fixed assets registered
                  </TableCell>
                </TableRow>
              ) : (
                (assets || []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs font-bold text-primary">{a.asset_number}</TableCell>
                    <TableCell className="text-sm font-medium">{a.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{a.category}</Badge></TableCell>
                    <TableCell className="text-xs capitalize">{a.depreciation_method.replace("_", " ")}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmt(a.cost)}</TableCell>
                    <TableCell className="text-right font-mono text-xs text-destructive">{fmt(a.accumulated_depreciation)}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-bold">{fmt(a.cost - a.accumulated_depreciation)}</TableCell>
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
