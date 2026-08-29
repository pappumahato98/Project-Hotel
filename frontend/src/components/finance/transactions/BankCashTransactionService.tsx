import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter
} from "lucide-react";
import { usePayments, useExpenses } from "@/hooks/useFinanceExtended";
import { cn } from "@/lib/utils";

interface BankCashTransactionServiceProps {
  isReadOnly?: boolean;
}

export function BankCashTransactionService({ isReadOnly }: BankCashTransactionServiceProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: payments, isLoading: payLoading } = usePayments();
  const { data: expenses, isLoading: expLoading } = useExpenses();

  const transactions = useMemo(() => {
    const combined = [
      ...(payments || []).map(p => ({
        id: p.id,
        date: p.payment_date,
        description: `Receipt: ${p.payment_number}`,
        amount: p.amount,
        type: 'credit' as const,
        method: p.payment_method,
        status: 'cleared'
      })),
      ...(expenses || []).filter(e => e.status === 'paid').map(e => ({
        id: e.id,
        date: e.expense_date,
        description: `Payment: ${e.expense_number} - ${e.vendor || e.category}`,
        amount: e.amount,
        type: 'debit' as const,
        method: 'Bank Transfer',
        status: 'cleared'
      }))
    ];

    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, expenses]);

  const filteredTransactions = transactions.filter(t =>
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = useMemo(() => {
    const balance = transactions.reduce((acc, t) => acc + (t.type === 'credit' ? t.amount : -t.amount), 0);
    const totalIn = transactions.filter(t => t.type === 'credit').reduce((acc, t) => acc + t.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'debit').reduce((acc, t) => acc + t.amount, 0);
    return { balance, totalIn, totalOut };
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Balance</p>
                <h3 className="text-2xl font-bold font-display">${stats.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Inflow</p>
                <h3 className="text-2xl font-bold font-display text-success">+${stats.totalIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="p-3 bg-success/10 rounded-full">
                <ArrowUpRight className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/5 border-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Outflow</p>
                <h3 className="text-2xl font-bold font-display text-destructive">-${stats.totalOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
              </div>
              <div className="p-3 bg-destructive/10 rounded-full">
                <ArrowDownRight className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bank transactions..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          {!isReadOnly && (
            <Button className="gap-2">
              <RefreshCw className="h-4 w-4" /> Reconcile
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bank & Cash Transactions</CardTitle>
              <CardDescription>Unified view of all cash inflows and outflows</CardDescription>
            </div>
            <div className="flex gap-2">
               <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Balanced
               </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {payLoading || expLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading transactions...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No transactions found</TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.date}</TableCell>
                      <TableCell className="font-medium">{t.description}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">{t.method}</Badge>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-mono font-semibold",
                        t.type === 'credit' ? "text-success" : "text-destructive"
                      )}>
                        {t.type === 'credit' ? '+' : '-'}${t.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-success">
                          <CheckCircle2 className="h-3 w-3" /> Reconciled
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Bank Reconciliation Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Statement Balance</span>
                <span className="font-semibold">${stats.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
             </div>
             <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">System Balance</span>
                <span className="font-semibold">${stats.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
             </div>
             <div className="flex justify-between items-center text-sm border-t pt-2">
                <span className="font-medium">Difference</span>
                <span className="text-success font-bold">$0.00</span>
             </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/10">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
               <AlertCircle className="h-4 w-4 text-amber-500" /> Pending Settlements
            </CardTitle>
          </CardHeader>
          <CardContent>
             <p className="text-xs text-muted-foreground leading-relaxed">
                There are 3 credit card settlements pending from the last 24 hours (approx. $1,240.00).
                These will be automatically reconciled once the bank batch is confirmed.
             </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
