import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, Scale, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { useTrialBalance, useLedger } from "@/hooks/useFinance";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export function FinanceTrialBalanceTab() {
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const { data: trialBalance, isLoading } = useTrialBalance(asOfDate);
  const { data: ledgerEntries, isLoading: isLedgerLoading } = useLedger(selectedAccountId || undefined, { endDate: asOfDate });
  const selectedAccount = trialBalance?.find(t => t.account.id === selectedAccountId)?.account;

  const totalDebits = trialBalance.reduce((sum, t) => sum + t.totalDebit, 0);
  const totalCredits = trialBalance.reduce((sum, t) => sum + t.totalCredit, 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const exportToExcel = () => {
    const rows = [
      ["Trial Balance", `As of ${asOfDate}`],
      [],
      ["Code", "Account", "Type", "Debit", "Credit", "Net Balance"],
      ...trialBalance.map(t => [
        t.account.code, t.account.name, t.account.type,
        t.totalDebit, t.totalCredit, t.totalDebit - t.totalCredit,
      ]),
      [],
      ["", "TOTALS", "", totalDebits, totalCredits, totalDebits - totalCredits],
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Trial Balance");
    XLSX.writeFile(wb, `trial-balance-${asOfDate}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <Label>As of Date</Label>
          <Input type="date" value={asOfDate} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setAsOfDate(e.target.value)} className="w-44" />
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={isBalanced ? "bg-success/10 text-success border-success/20 gap-1.5" : "bg-destructive/10 text-destructive border-destructive/20 gap-1.5"}>
            {isBalanced ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {isBalanced ? "Balanced" : `Out of balance: $${Math.abs(totalDebits - totalCredits).toFixed(2)}`}
          </Badge>
          <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" /> Trial Balance
          </CardTitle>
          <CardDescription>Summary of all account balances as of {asOfDate}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading trial balance...</div>
          ) : trialBalance.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No posted entries found. Create and post journal entries first.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Net Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalance.map((item) => {
                  const net = item.totalDebit - item.totalCredit;
                  return (
                    <TableRow 
                      key={item.account.id} 
                      className="cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => setSelectedAccountId(item.account.id)}
                    >
                      <TableCell className="font-mono">{item.account.code}</TableCell>
                      <TableCell className="font-medium">{item.account.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-xs">{item.account.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">${item.totalDebit.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">${item.totalCredit.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${net >= 0 ? "text-foreground" : "text-destructive"}`}>
                        ${net.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3}>TOTALS</TableCell>
                  <TableCell className="text-right font-mono">${totalDebits.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">${totalCredits.toFixed(2)}</TableCell>
                  <TableCell className={`text-right font-mono ${isBalanced ? "text-success" : "text-destructive"}`}>
                    ${(totalDebits - totalCredits).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedAccountId} onOpenChange={(open) => !open && setSelectedAccountId(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Ledger Details: {selectedAccount?.code} - {selectedAccount?.name}
            </DialogTitle>
            <DialogDescription>
              Detailed transaction history up to {asOfDate}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto mt-4 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLedgerLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Loading ledger entries...
                    </TableCell>
                  </TableRow>
                ) : ledgerEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No transactions found for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  ledgerEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">{entry.date}</TableCell>
                      <TableCell className="font-mono text-xs text-primary">{entry.entry_number}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={entry.description}>{entry.description}</TableCell>
                      <TableCell className="text-right font-mono">{entry.debit > 0 ? entry.debit.toFixed(2) : ""}</TableCell>
                      <TableCell className="text-right font-mono">{entry.credit > 0 ? entry.credit.toFixed(2) : ""}</TableCell>
                      <TableCell className={`text-right font-mono font-semibold ${entry.running_balance >= 0 ? "text-foreground" : "text-destructive"}`}>
                        {Math.abs(entry.running_balance).toFixed(2)}
                        <span className="text-[10px] ml-1 font-normal text-muted-foreground">
                          {entry.running_balance > 0 ? "Dr" : entry.running_balance < 0 ? "Cr" : ""}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => setSelectedAccountId(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
