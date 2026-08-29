/**
 * Ledger Transaction View (presentation only).
 *
 * Refactored from a 398-line monolith into a thin component that consumes
 * `useLedgerTransactionView` for state + data and `ledgerService` for pure
 * computations. See docs/FINANCE_SERVICE_SPLIT.md.
 *
 * Responsibilities of this file:
 *   - Render the filter sidebar.
 *   - Render the details table or summary cards based on `showMode`.
 *   - Wire user events to hook callbacks.
 *
 * This file should contain NO business logic. If you find yourself adding
 * a useMemo here, ask whether it belongs in `ledgerService.ts` (pure) or
 * `useLedgerTransactionView.ts` (data fetching).
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Filter, Search, X, BookOpen, ChevronRight } from "lucide-react";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { formatISOasBS } from "@/lib/nepaliDate";
import { TableSkeleton } from "@/components/skeletons";
import { useLedgerTransactionView } from "@/hooks/finance/useLedgerTransactionView";
import { FISCAL_YEARS } from "@/lib/finance/ledgerService";

export function LedgerTransactionService() {
  const [showFilter, setShowFilter] = useState(true);
  const {
    filters,
    setFiscalYear,
    setFromDate,
    setToDate,
    setSelectedAccount,
    setShowMode,
    setLinkedLedger,
    search,
    cancel,
    accounts,
    isLoading,
    linkedAccounts,
    filteredEntries,
    summary,
    summaryGrouped,
  } = useLedgerTransactionView();

  const { selectedAccount, applied, showMode } = filters;

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
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowFilter(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Separator className="mb-3" />

          <div className="space-y-2.5 flex-1">
            <div>
              <Label className="text-xs">Fiscal Year</Label>
              <Select value={filters.fiscalYear} onValueChange={setFiscalYear}>
                <SelectTrigger className="h-7 text-xs mt-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FISCAL_YEARS.map((fy) => (
                    <SelectItem key={fy.value} value={fy.value}>
                      {fy.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <NepaliDateInput
              label="From Date"
              value={filters.fromDate}
              onChange={setFromDate}
              className="text-xs"
            />
            <NepaliDateInput
              label="To Date"
              value={filters.toDate}
              onChange={setToDate}
              className="text-xs"
            />

            <div>
              <Label className="text-xs">Ledger Account</Label>
              <Select
                value={selectedAccount}
                onValueChange={setSelectedAccount}
              >
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
              <Select
                value={showMode}
                onValueChange={(v) => setShowMode(v as "details" | "summary")}
              >
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
                <p className="text-[10px] text-muted-foreground mt-1 italic">
                  Select a ledger first
                </p>
              ) : applied && linkedAccounts.length === 0 ? (
                <p className="text-[10px] text-destructive mt-1 italic">
                  Not Found
                </p>
              ) : (
                <Select
                  value={filters.linkedLedger}
                  onValueChange={setLinkedLedger}
                  disabled={!applied || linkedAccounts.length === 0}
                >
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
            <Button
              size="sm"
              className="flex-1 text-xs h-7"
              onClick={search}
            >
              <Search className="h-3.5 w-3.5 mr-1" /> Search
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-7"
              onClick={cancel}
            >
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
              <span>
                Total Dr:{" "}
                <strong className="text-foreground">
                  {summary.totalDebit.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </span>
              <span>
                Total Cr:{" "}
                <strong className="text-foreground">
                  {summary.totalCredit.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </span>
              <span>
                Balance:{" "}
                <strong className="text-foreground">
                  {summary.closingBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </span>
            </div>
          )}
        </div>

        {!applied ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">
                Use the filter panel to search ledger entries
              </p>
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
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No ledger entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs">{entry.date}</TableCell>
                      <TableCell className="text-xs">
                        {entry.date
                          ? formatISOasBS(entry.date, "short")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {entry.entry_number}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px] truncate">
                        {entry.description}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {entry.debit > 0
                          ? entry.debit.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {entry.credit > 0
                          ? entry.credit.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-semibold">
                        {entry.running_balance.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
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
                        <Badge variant="outline" className="text-xs font-mono">
                          {group.entryNumber}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {group.date}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatISOasBS(group.date, "short")} BS
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span>
                          Dr:{" "}
                          <strong className="font-mono">
                            {group.debit.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </strong>
                        </span>
                        <span>
                          Cr:{" "}
                          <strong className="font-mono">
                            {group.credit.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                            })}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[11px] h-8">
                            Account
                          </TableHead>
                          <TableHead className="text-[11px] h-8">
                            Narration
                          </TableHead>
                          <TableHead className="text-[11px] h-8 text-right">
                            Debit
                          </TableHead>
                          <TableHead className="text-[11px] h-8 text-right">
                            Credit
                          </TableHead>
                          <TableHead className="text-[11px] h-8 text-right">
                            Balance
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.lines.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell className="text-xs py-1.5">
                              <span className="font-mono text-muted-foreground mr-1">
                                {line.account_code}
                              </span>
                              {line.account_name}
                            </TableCell>
                            <TableCell className="text-xs py-1.5 text-muted-foreground italic max-w-[180px] truncate">
                              {line.description || "—"}
                            </TableCell>
                            <TableCell className="text-xs py-1.5 text-right font-mono">
                              {line.debit > 0
                                ? line.debit.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })
                                : "-"}
                            </TableCell>
                            <TableCell className="text-xs py-1.5 text-right font-mono">
                              {line.credit > 0
                                ? line.credit.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                  })
                                : "-"}
                            </TableCell>
                            <TableCell className="text-xs py-1.5 text-right font-mono font-semibold">
                              {line.running_balance.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {group.description && (
                      <div className="px-4 py-2 border-t border-border bg-muted/20">
                        <p className="text-[11px] text-muted-foreground">
                          <span className="font-medium text-foreground">
                            Narration:
                          </span>{" "}
                          {group.description}
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
