import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Map,
  LayoutTemplate,
  ArrowRightLeft,
  Settings,
  Save
} from "lucide-react";
import { useAccounts } from "@/hooks/useFinance";

export function FinancialStatementMappingService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { data: accounts } = useAccounts();

  // Auto-generate mappings from actual account ranges
  const mappings = useMemo(() => {
    const typeMap: Record<string, { statement: string; section: string }> = {
      asset: { statement: "Balance Sheet", section: "Assets" },
      liability: { statement: "Balance Sheet", section: "Liabilities" },
      equity: { statement: "Balance Sheet", section: "Equity" },
      revenue: { statement: "P&L", section: "Revenue" },
      expense: { statement: "P&L", section: "Expenses" },
    };

    const grouped = accounts.reduce((acc, a) => {
      const key = a.type;
      if (!acc[key]) acc[key] = { codes: [], count: 0 };
      acc[key].codes.push(a.code);
      acc[key].count++;
      return acc;
    }, {} as Record<string, { codes: string[]; count: number }>);

    return Object.entries(grouped).map(([type, data]) => {
      const sorted = data.codes.sort();
      const info = typeMap[type] || { statement: "Other", section: type };
      return {
        id: type,
        statement: info.statement,
        section: info.section,
        accountRange: sorted.length > 0 ? `${sorted[0]} – ${sorted[sorted.length - 1]}` : "-",
        accountCount: data.count,
      };
    });
  }, [accounts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" /> Financial Statement Mapping
          </h2>
          <p className="text-muted-foreground text-sm">Auto-generated mappings from your Chart of Accounts.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" disabled={isReadOnly}>
            <LayoutTemplate className="h-4 w-4" /> Designer
          </Button>
          <Button size="sm" className="gap-2" disabled={isReadOnly}>
            <Save className="h-4 w-4" /> Save Mappings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" /> Mapping Logic
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 border rounded-lg flex items-center justify-between bg-secondary/10 text-xs">
              <span>Auto-map new accounts by type</span>
              <Badge>Enabled</Badge>
            </div>
            <div className="p-3 border rounded-lg flex items-center justify-between bg-secondary/10 text-xs">
              <span>Total mapped accounts</span>
              <Badge variant="secondary">{accounts.length}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="text-xs h-16 flex-col gap-1" disabled={isReadOnly}>
              <span>Import Mapping</span>
              <span className="text-[10px] text-muted-foreground">CSV/JSON</span>
            </Button>
            <Button variant="outline" className="text-xs h-16 flex-col gap-1" disabled={isReadOnly}>
              <span>Sync IFRS</span>
              <span className="text-[10px] text-muted-foreground">Standard Templates</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account-to-Statement Mapping</CardTitle>
          <CardDescription>Derived from your Chart of Accounts by account type.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statement</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Account Range</TableHead>
                <TableHead className="text-right">Accounts</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No accounts in Chart of Accounts yet.
                  </TableCell>
                </TableRow>
              ) : (
                mappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.statement}</TableCell>
                    <TableCell>{m.section}</TableCell>
                    <TableCell className="font-mono text-xs">{m.accountRange}</TableCell>
                    <TableCell className="text-right font-bold">{m.accountCount}</TableCell>
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
