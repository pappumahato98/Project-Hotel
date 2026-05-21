import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Filter, Search, X, BookOpen, ChevronRight } from "lucide-react";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { useAccounts, useLedger, useJournalEntries } from "@/hooks/useFinance";
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

export function LedgerTransactionService() {
  const [showFilter, setShowFilter] = useState(true);
  const [fiscalYear, setFiscalYear] = useState("2081");
  const [fromDate, setFromDate] = useState(FY_RANGES["2081"].start);
  const [toDate, setToDate] = useState(FY_RANGES["2081"].end);
  const [selectedAccount, setSelectedAccount] = useState<string>("none");
  const [showMode, setShowMode] = useState<"details" | "summary">("details");
  const [linkedLedger, setLinkedLedger] = useState<string>("none");
  const [applied, setApplied] = useState(false);

  const { data: accounts } = useAccounts();
  const accountId = selectedAccount !== "none" ? selectedAccount : undefined;
  const { data: ledgerEntries, isLoading } = useLedger(
    applied ? accountId : undefined,
    applied ? { startDate: fromDate, endDate: toDate } : undefined
  );

  // Fetch journal entries with lines to find linked accounts
  const { data: journalEntries } = useJournalEntries(
    applied && accountId ? { startDate: fromDate, endDate: toDate } : undefined
  );

  // Compute truly linked accounts: accounts that share journal entries with selected account
  const linkedAccounts = useMemo(() => {
    if (!accountId || !journalEntries.length) return [];

    // Find journal entry IDs that contain the selected account
    const matchingEntryIds = new Set<string>();
    journalEntries.forEach((je) => {
      const hasAccount = (je.lines || []).some((line) => line.account_id === accountId);
      if (hasAccount) matchingEntryIds.add(je.id);
    });

    // Collect all OTHER account IDs from those entries
    const linkedAccountIds = new Set<string>();
    journalEntries.forEach((je) => {
      if (!matchingEntryIds.has(je.id)) return;
      (je.lines || []).forEach((line) => {
        if (line.account_id !== accountId) {
          linkedAccountIds.add(line.account_id);
        }
      });
    });

    return accounts.filter((a) => linkedAccountIds.has(a.id));
  }, [accountId, journalEntries, accounts]);

  // Filter by linked ledger
  const filteredEntries = useMemo(() => {
    if (!applied) return ledgerEntries;
    if (linkedLedger === "none") return ledgerEntries;

    // Find journal entry IDs that contain both selected account AND linked ledger
    const matchingEntryIds = new Set<string>();
    journalEntries.forEach((je) => {
      const hasSelected = (je.lines || []).some((l) => l.account_id === accountId);
      const hasLinked = (je.lines || []).some((l) => l.account_id === linkedLedger);
      if (hasSelected && hasLinked) matchingEntryIds.add(je.id);
    });

    return ledgerEntries.filter((e) => matchingEntryIds.has(e.journal_entry_id));
  }, [ledgerEntries, linkedLedger, applied, journalEntries, accountId]);

  // Summary aggregation
  const summary = useMemo(() => {
    const totalDebit = filteredEntries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = filteredEntries.reduce((s, e) => s + e.credit, 0);
    const closingBalance = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1]?.running_balance || 0 : 0;
    return { totalDebit, totalCredit, closingBalance };
  }, [filteredEntries]);

  // For summary mode: group by journal entry with narration
  const summaryGrouped = useMemo(() => {
    if (showMode !== "summary") return [];
    const map = new Map<string, { entryNumber: string; date: string; description: string; debit: number; credit: number; lines: typeof filteredEntries }>();
    filteredEntries.forEach((entry) => {
      const existing = map.get(entry.journal_entry_id);
      if (existing) {
        existing.debit += entry.debit;
        existing.credit += entry.credit;
        existing.lines.push(entry);
      } else {
        map.set(entry.journal_entry_id, {
          entryNumber: entry.entry_number,
          date: entry.date,
          description: entry.description,
          debit: entry.debit,
          credit: entry.credit,
          lines: [entry],
        });
      }
    });
    return Array.from(map.values());
  }, [filteredEntries, showMode]);

  const handleFYChange = (fy: string) => {
    setFiscalYear(fy);
    if (FY_RANGES[fy]) {
      setFromDate(FY_RANGES[fy].start);
      setToDate(FY_RANGES[fy].end);
    }
  };

  const handleSearch = () => setApplied(true);
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

            <NepaliDateInput label="From Date" value={fromDate} onChange={setFromDate} className="text-xs" />
            <NepaliDateInput label="To Date" value={toDate} onChange={setToDate} className="text-xs" />

            <div>
              <Label className="text-xs">Ledger Account</Label>
              <Select value={selectedAccount} onValueChange={(v) => { setSelectedAccount(v); setLinkedLedger("none"); }}>
                <SelectTrigger className="h-7 text-xs mt-0.5">
                  <SelectValue placeholder="Choose Ledger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- All Accounts --</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Show</Label>
              <Select value={showMode} onValueChange={(v) => setShowMode(v as "details" | "summary")}>
                <SelectTrigger className="h-7 text-xs mt-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="details">Details</SelectItem>
                  <SelectItem value="summary">Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Linked Ledger</Label>
              {selectedAccount === "none" ? (
                <p className="text-[10px] text-muted-foreground mt-1 italic">Select a ledger first</p>
              ) : applied && linkedAccounts.length === 0 ? (
                <p className="text-[10px] text-destructive mt-1 italic">Not Found</p>
              ) : (
                <Select value={linkedLedger} onValueChange={setLinkedLedger} disabled={!applied || linkedAccounts.length === 0}>
                  <SelectTrigger className="h-7 text-xs mt-0.5">
                    <SelectValue placeholder="Choose Linked" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- None --</SelectItem>
                    {linkedAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.code} - {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> Ledger
            </h2>
            {applied && selectedAccount !== "none" && (
              <Badge variant="secondary" className="text-xs">
                {accounts.find((a) => a.id === selectedAccount)?.name}
              </Badge>
            )}
          </div>
          {applied && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Total Dr: <strong className="text-foreground">{summary.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
              <span>Total Cr: <strong className="text-foreground">{summary.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
              <span>Balance: <strong className="text-foreground">{summary.closingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
            </div>
          )}
        </div>

        {!applied ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Use the filter panel to search ledger entries</p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <TableSkeleton columns={7} rows={8} />
        ) : showMode === "details" ? (
          /* Details Mode: Journal-entry style view */
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date (AD)</TableHead>
                  <TableHead className="text-xs">मिति (BS)</TableHead>
                  <TableHead className="text-xs">Voucher #</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs text-right">Debit</TableHead>
                  <TableHead className="text-xs text-right">Credit</TableHead>
                  <TableHead className="text-xs text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No ledger entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
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
                      <TableCell className="text-xs text-right font-mono font-semibold">
                        {entry.running_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          /* Summary Mode: Grouped by journal entry with narration */
          <div className="space-y-3">
            {summaryGrouped.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No entries found
                </CardContent>
              </Card>
            ) : (
              summaryGrouped.map((group) => (
                <Card key={group.entryNumber} className="overflow-hidden">
                  <CardHeader className="py-2.5 px-4 bg-muted/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs font-mono">{group.entryNumber}</Badge>
                        <span className="text-xs text-muted-foreground">{group.date}</span>
                        <span className="text-xs text-muted-foreground">{formatISOasBS(group.date, "short")} BS</span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span>Dr: <strong className="font-mono">{group.debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                        <span>Cr: <strong className="font-mono">{group.credit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px] h-8">Account</TableHead>
                          <TableHead className="text-[11px] h-8">Narration</TableHead>
                          <TableHead className="text-[11px] h-8 text-right">Debit</TableHead>
                          <TableHead className="text-[11px] h-8 text-right">Credit</TableHead>
                          <TableHead className="text-[11px] h-8 text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.lines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell className="text-xs py-1.5">
                              <span className="font-mono text-muted-foreground mr-1">{line.account_code}</span>
                              {line.account_name}
                            </TableCell>
                            <TableCell className="text-xs py-1.5 text-muted-foreground italic max-w-[180px] truncate">
                              {line.description || "—"}
                            </TableCell>
                            <TableCell className="text-xs py-1.5 text-right font-mono">
                              {line.debit > 0 ? line.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                            </TableCell>
                            <TableCell className="text-xs py-1.5 text-right font-mono">
                              {line.credit > 0 ? line.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                            </TableCell>
                            <TableCell className="text-xs py-1.5 text-right font-mono font-semibold">
                              {line.running_balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {group.description && (
                      <div className="px-4 py-2 border-t border-border bg-muted/20">
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">Narration:</span> {group.description}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
