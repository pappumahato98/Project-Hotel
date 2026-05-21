import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, Search, X, Landmark, CheckCircle2, ChevronRight } from "lucide-react";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { useAccounts, useLedger } from "@/hooks/useFinance";
import { formatISOasBS } from "@/lib/nepaliDate";
import { TableSkeleton } from "@/components/skeletons";

const FISCAL_YEARS = [
  { value: "2081", label: "2081/82" },
  { value: "2080", label: "2080/81" },
  { value: "2079", label: "2079/80" },
  { value: "2078", label: "2078/79" },
];

const FY_RANGES: Record<string, { start: string; end: string }> = {
  "2081": { start: "2024-07-16", end: "2025-07-15" },
  "2080": { start: "2023-07-16", end: "2024-07-15" },
  "2079": { start: "2022-07-16", end: "2023-07-15" },
  "2078": { start: "2021-07-16", end: "2022-07-15" },
};

export function CashBankReconcileService() {
  const today = new Date().toISOString().slice(0, 10);
  const [showFilter, setShowFilter] = useState(true);
  const [fiscalYear, setFiscalYear] = useState("2081");
  const [selectedAccount, setSelectedAccount] = useState<string>("none");
  const [statementDate, setStatementDate] = useState(today);
  const [fromDate, setFromDate] = useState(FY_RANGES["2081"].start);
  const [toDate, setToDate] = useState(FY_RANGES["2081"].end);
  const [applied, setApplied] = useState(false);
  const [reconciledIds, setReconciledIds] = useState<Set<string>>(new Set());
  const [statementBalance, setStatementBalance] = useState<string>("0");

  const { data: accounts } = useAccounts();

  const cashBankAccounts = useMemo(
    () => accounts.filter((a) => a.type === "asset" && (/cash|bank/i.test(a.name) || /cash|bank/i.test(a.code))),
    [accounts]
  );

  const accountId = selectedAccount !== "none" ? selectedAccount : undefined;
  const { data: ledgerEntries, isLoading } = useLedger(
    applied ? accountId : undefined,
    applied ? { startDate: fromDate, endDate: toDate } : undefined
  );

  const toggleReconciled = (id: string) => {
    setReconciledIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const summary = useMemo(() => {
    const totalDebit = ledgerEntries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = ledgerEntries.reduce((s, e) => s + e.credit, 0);
    const bookBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1]?.running_balance || 0 : 0;
    const stmtBal = parseFloat(statementBalance) || 0;
    const reconciledCount = reconciledIds.size;
    const difference = bookBalance - stmtBal;
    return { totalDebit, totalCredit, bookBalance, stmtBal, reconciledCount, difference };
  }, [ledgerEntries, reconciledIds, statementBalance]);

  const handleFYChange = (fy: string) => {
    setFiscalYear(fy);
    if (FY_RANGES[fy]) {
      setFromDate(FY_RANGES[fy].start);
      setToDate(FY_RANGES[fy].end);
    }
  };

  const handleSearch = () => {
    setApplied(true);
    setReconciledIds(new Set());
  };
  const handleCancel = () => {
    setShowFilter(false);
  };

  return (
    <div className="flex gap-0 h-full relative">
      {/* Collapsed toggle */}
      {!showFilter && (
        <button
          onClick={() => setShowFilter(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-6 h-16 rounded-r-md border border-l-0 border-border bg-muted/60 hover:bg-muted transition-colors"
          title="Open Filter"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Filter Sidebar */}
      {showFilter && (
        <div className="w-64 shrink-0 border-r border-border bg-muted/30 p-3 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4" /> Filter
            </h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowFilter(false)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Separator className="mb-3" />

          <div className="space-y-2.5 flex-1">
            <div>
              <Label className="text-xs">Fiscal Year</Label>
              <Select value={fiscalYear} onValueChange={handleFYChange}>
                <SelectTrigger className="h-7 text-xs mt-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FISCAL_YEARS.map((fy) => (
                    <SelectItem key={fy.value} value={fy.value}>{fy.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Cash/Bank Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="h-7 text-xs mt-0.5">
                  <SelectValue placeholder="Choose Account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Select Account --</SelectItem>
                  {cashBankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <NepaliDateInput label="Statement Date" value={statementDate} onChange={setStatementDate} className="text-xs" />
            <NepaliDateInput label="From Date" value={fromDate} onChange={setFromDate} className="text-xs" />
            <NepaliDateInput label="To Date" value={toDate} onChange={setToDate} className="text-xs" />

            <div>
              <Label className="text-xs">Statement Balance</Label>
              <Input
                type="number"
                className="h-7 text-xs mt-0.5"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
                placeholder="Enter statement balance"
              />
            </div>
          </div>

          <Separator className="my-2" />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 text-xs h-7" onClick={handleSearch}>
              <Search className="h-3.5 w-3.5 mr-1" /> Search
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 min-w-0 p-4 space-y-4 ${!showFilter ? "ml-6" : ""}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Landmark className="h-5 w-5" /> Cash & Bank Reconciliation
            </h2>
          </div>
        </div>

        {!applied ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Landmark className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Select a cash/bank account and date range to reconcile</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs text-muted-foreground">Book Balance</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-lg font-bold font-mono">{summary.bookBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs text-muted-foreground">Statement Balance</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-lg font-bold font-mono">{summary.stmtBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs text-muted-foreground">Difference</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className={`text-lg font-bold font-mono ${Math.abs(summary.difference) < 0.01 ? "text-green-600" : "text-destructive"}`}>
                    {summary.difference.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1 pt-3 px-3">
                  <CardTitle className="text-xs text-muted-foreground">Reconciled</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <p className="text-lg font-bold">
                    {summary.reconciledCount} / {ledgerEntries.length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {isLoading ? (
              <TableSkeleton columns={7} rows={8} />
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-10">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </TableHead>
                      <TableHead className="text-xs">Date (AD)</TableHead>
                      <TableHead className="text-xs">मिति (BS)</TableHead>
                      <TableHead className="text-xs">Voucher #</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs text-right">Debit</TableHead>
                      <TableHead className="text-xs text-right">Credit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No entries found for this account
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledgerEntries.map((entry) => {
                        const isReconciled = reconciledIds.has(entry.id);
                        return (
                          <TableRow key={entry.id} className={isReconciled ? "bg-green-50/50 dark:bg-green-950/20" : ""}>
                            <TableCell>
                              <Checkbox
                                checked={isReconciled}
                                onCheckedChange={() => toggleReconciled(entry.id)}
                              />
                            </TableCell>
                            <TableCell className="text-xs">{entry.date}</TableCell>
                            <TableCell className="text-xs">{entry.date ? formatISOasBS(entry.date, "short") : "-"}</TableCell>
                            <TableCell className="text-xs font-mono">{entry.entry_number}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{entry.description}</TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {entry.debit > 0 ? entry.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {entry.credit > 0 ? entry.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
