import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download } from "lucide-react";
import { useAccounts, useLedger } from "@/hooks/useFinance";

interface LedgerInquiryServiceProps {
  isReadOnly?: boolean;
}

export function LedgerInquiryService({ isReadOnly }: LedgerInquiryServiceProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const { data: accounts } = useAccounts();
  const { data: ledgerData, isLoading: ledgerLoading } = useLedger(selectedAccountId || undefined);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 max-w-sm">
          <Select
            value={selectedAccountId || "all"}
            onValueChange={(v) => setSelectedAccountId(v === "all" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account to view ledger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.code} - {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export Ledger
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General Ledger</CardTitle>
          <CardDescription>Detailed transaction inquiry for selected accounts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {ledgerLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading ledger...</div>
          ) : ledgerData.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No ledger entries found. Post some journal entries first.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Entry #</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerData.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell className="font-mono text-primary">
                      {entry.entry_number}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{entry.account_code}</span>{" "}
                      {entry.account_name}
                    </TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.debit > 0 ? `$${entry.debit.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {entry.credit > 0 ? `$${entry.credit.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      ${entry.running_balance.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
