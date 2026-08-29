import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Overlay } from "@/components/ui/overlay";
import { Filter, Search, X, CalendarDays, FileText, ChevronRight } from "lucide-react";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { useJournalEntries } from "@/hooks/useFinance";
import { formatISOasBS } from "@/lib/nepaliDate";
import { TableSkeleton } from "@/components/skeletons";
import { MetricCard } from "@/components/dashboard/MetricCard";

const FISCAL_YEARS = [
  { value: "2081", label: "2081/82" },
  { value: "2080", label: "2080/81" },
  { value: "2079", label: "2079/80" },
  { value: "2078", label: "2078/79" },
];

export function DayBookService() {
  const today = new Date().toISOString().slice(0, 10);
  const [showFilter, setShowFilter] = useState(true);
  const [fiscalYear, setFiscalYear] = useState("2081");
  const [selectedDate, setSelectedDate] = useState(today);
  const [voucherType, setVoucherType] = useState("all");
  const [applied, setApplied] = useState(false);

  const { data: allEntries, isLoading } = useJournalEntries(
    applied ? { startDate: selectedDate, endDate: selectedDate } : undefined
  );

  const filteredEntries = useMemo(() => {
    if (!applied) return [];
    if (voucherType === "all") return allEntries;
    return allEntries.filter((e) => {
      const num = e.entry_number.toLowerCase();
      if (voucherType === "journal") return num.startsWith("jv") || num.startsWith("je");
      if (voucherType === "receipt") return num.startsWith("rv") || num.startsWith("rc");
      if (voucherType === "payment") return num.startsWith("pv") || num.startsWith("py");
      if (voucherType === "contra") return num.startsWith("cv") || num.startsWith("ct");
      return true;
    });
  }, [allEntries, voucherType, applied]);

  const totals = useMemo(() => {
    let totalDebit = 0, totalCredit = 0;
    filteredEntries.forEach((entry) => {
      (entry.lines || []).forEach((line) => {
        totalDebit += line.debit || 0;
        totalCredit += line.credit || 0;
      });
    });
    return { totalDebit, totalCredit, count: filteredEntries.length };
  }, [filteredEntries]);

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
        <Overlay variant="glass" rounded="none" className="w-64 shrink-0 border-r border-border p-3 flex flex-col">
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
              <Select value={fiscalYear} onValueChange={setFiscalYear}>
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

            <NepaliDateInput label="Date" value={selectedDate} onChange={setSelectedDate} className="text-xs" />

            <div>
              <Label className="text-xs">Voucher Type</Label>
              <Select value={voucherType} onValueChange={setVoucherType}>
                <SelectTrigger className="h-7 text-xs mt-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="journal">Journal</SelectItem>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="contra">Contra</SelectItem>
                </SelectContent>
              </Select>
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
        </Overlay>
      )}

      {/* Main Content */}
      <div className={`flex-1 min-w-0 p-4 space-y-4 ${!showFilter ? "ml-6" : ""}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarDays className="h-5 w-5" /> Day Book
            </h2>
            {applied && (
              <Badge variant="secondary" className="text-xs">
                {selectedDate} ({formatISOasBS(selectedDate, "short")} BS)
              </Badge>
            )}
          </div>
        </div>

        {!applied ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Use the filter panel to view day book entries</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard title="Total Entries" value={totals.count.toString()} change="For selected date" changeType="neutral" icon={FileText} delay={0} />
              <MetricCard title="Total Debits" value={totals.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })} change="Dr" changeType="neutral" icon={CalendarDays} delay={50} />
              <MetricCard title="Total Credits" value={totals.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })} change="Cr" changeType="neutral" icon={CalendarDays} delay={100} />
            </div>

            {isLoading ? (
              <TableSkeleton columns={6} rows={6} />
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Voucher #</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs text-right">Debit Total</TableHead>
                      <TableHead className="text-xs text-right">Credit Total</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No entries for this date
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEntries.map((entry) => {
                        const entryDebit = (entry.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
                        const entryCredit = (entry.lines || []).reduce((s, l) => s + (l.credit || 0), 0);
                        const vType = entry.entry_number.split("-")[0] || "JV";
                        return (
                          <TableRow key={entry.id}>
                            <TableCell className="text-xs font-mono">{entry.entry_number}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{vType}</Badge>
                            </TableCell>
                            <TableCell className="text-xs max-w-[250px] truncate">{entry.description}</TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {entryDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-xs text-right font-mono">
                              {entryCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={entry.is_posted ? "default" : "secondary"} className="text-xs">
                                {entry.is_posted ? "Posted" : "Draft"}
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
          </>
        )}
      </div>
    </div>
  );
}
