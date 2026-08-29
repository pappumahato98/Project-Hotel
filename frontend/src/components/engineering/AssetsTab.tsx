import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { 
  Package, Search, Loader2, Settings, AlertTriangle
} from "lucide-react";
import { useFixedAssets } from "@/hooks/useFixedAssets";
import { formatCurrency, formatAD } from "@/lib/utils";

const categoryColors: Record<string, string> = {
  "HVAC": "bg-blue-500/20 text-blue-400",
  "Electrical": "bg-amber-500/20 text-amber-400",
  "Plumbing": "bg-cyan-500/20 text-cyan-400",
  "Kitchen Equipment": "bg-orange-500/20 text-orange-400",
  "Furniture": "bg-purple-500/20 text-purple-400",
  "IT Equipment": "bg-green-500/20 text-green-400",
  "default": "bg-muted text-muted-foreground",
};

export function AssetsTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: assets = [], isLoading } = useFixedAssets();

  const filteredAssets = assets.filter((asset) =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.asset_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeAssets = assets.filter(a => a.status === "active");
  const needsMaintenanceCount = activeAssets.filter(a => {
    // Simple heuristic: if asset is older than useful life / 2, flag it
    const monthsOld = Math.floor(
      (new Date().getTime() - new Date(a.acquisition_date).getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    return monthsOld > a.useful_life_months / 2;
  }).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="text-2xl font-bold">{assets.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-success">{activeAssets.length}</p>
              </div>
              <Settings className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Attention</p>
                <p className="text-2xl font-bold text-amber-500">{needsMaintenanceCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(activeAssets.reduce((sum, a) => sum + (a.cost - a.accumulated_depreciation), 0))}
                </p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card variant="elevated">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Equipment & Assets
              </CardTitle>
              <CardDescription>Manage property equipment and maintenance tracking</CardDescription>
            </div>
            <Button variant="outline" onClick={() => window.location.href = "/finance"}>
              Go to Fixed Assets
            </Button>
          </div>
          
          <div className="mt-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search assets..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Acquired</TableHead>
                    <TableHead>Useful Life</TableHead>
                    <TableHead>Net Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No assets found. Add assets in the Finance module.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssets.map((asset) => {
                      const monthsOld = Math.floor(
                        (new Date().getTime() - new Date(asset.acquisition_date).getTime()) / (30 * 24 * 60 * 60 * 1000)
                      );
                      const lifeRemaining = Math.max(0, asset.useful_life_months - monthsOld);
                      const needsAttention = monthsOld > asset.useful_life_months / 2;
                      const netValue = asset.cost - asset.accumulated_depreciation;
                      
                      return (
                        <TableRow key={asset.id}>
                          <TableCell className="font-mono text-sm">{asset.asset_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{asset.name}</p>
                              {asset.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{asset.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={categoryColors[asset.category] || categoryColors.default}>
                              {asset.category}
                            </Badge>
                          </TableCell>
                          <TableCell>{asset.location || "-"}</TableCell>
                          <TableCell className="text-sm">{formatAD(new Date(asset.acquisition_date))}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={needsAttention ? "text-amber-500" : ""}>
                                {lifeRemaining} mo remaining
                              </span>
                              {needsAttention && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(netValue)}</TableCell>
                          <TableCell>
                            <Badge className={
                              asset.status === "active" 
                                ? "bg-success/20 text-success" 
                                : asset.status === "disposed" 
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-amber-500/20 text-amber-400"
                            }>
                              {asset.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
