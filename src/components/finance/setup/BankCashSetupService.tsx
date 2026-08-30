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
  Building2,
  Plus,
  Landmark,
  Wallet,
  ShieldCheck
} from "lucide-react";
import { useAccounts } from "@/hooks/useFinance";
import { useMemo } from "react";

export function BankCashSetupService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { data: accounts } = useAccounts();

  const bankCashAccounts = useMemo(() => {
    return accounts.filter(a =>
      a.type === 'asset' && (
        a.name.toLowerCase().includes('bank') ||
        a.name.toLowerCase().includes('cash') ||
        a.code.startsWith('110') ||
        a.code.startsWith('111')
      )
    );
  }, [accounts]);

  const bankCount = bankCashAccounts.filter(a => a.name.toLowerCase().includes('bank')).length;
  const cashCount = bankCashAccounts.filter(a => a.name.toLowerCase().includes('cash')).length || bankCashAccounts.length - bankCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Bank & Cash Setup
          </h2>
          <p className="text-muted-foreground text-sm">Manage bank accounts, cash registers, and signatory rules.</p>
        </div>
        <Button size="sm" className="gap-2" disabled={isReadOnly}>
          <Plus className="h-4 w-4" /> Add Account
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Bank Accounts</p>
              <p className="text-lg font-bold">{bankCount} Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center text-success">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Cash Registers</p>
              <p className="text-lg font-bold">{cashCount} Registered</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent/30 flex items-center justify-center text-accent-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Accounts</p>
              <p className="text-lg font-bold">{bankCashAccounts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Registry</CardTitle>
          <CardDescription>Bank & cash accounts from the Chart of Accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bankCashAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No bank/cash accounts found. Add asset accounts with "Bank" or "Cash" in the name via Chart of Accounts.
                  </TableCell>
                </TableRow>
              ) : (
                bankCashAccounts.map((acc) => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-mono text-xs">{acc.code}</TableCell>
                    <TableCell className="font-medium">{acc.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {acc.name.toLowerCase().includes('bank') ? 'Bank' : 'Cash'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={acc.is_active ? "text-success border-success/20" : "text-muted-foreground"}>
                        {acc.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
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
