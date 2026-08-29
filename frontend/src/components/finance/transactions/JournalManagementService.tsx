import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Search, Eye, Pencil, Printer, Trash2, MoreHorizontal,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Send,
} from "lucide-react";
import {
  useJournalEntries, usePostJournalEntry, useAccounts, useBatchPostJournalEntries
} from "@/hooks/useFinance";
import { toast } from "sonner";
import { NepaliDateSearch } from "@/components/shared/NepaliDateInput";
import { formatISOasBS, isoToBS, formatBSDate } from "@/lib/nepaliDate";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface JournalManagementServiceProps {
  isReadOnly?: boolean;
}

type SortField = "reference" | "date" | "description" | "debit" | "credit";
type SortDir = "asc" | "desc";

export function JournalManagementService({ isReadOnly }: JournalManagementServiceProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string } | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchMode, setSearchMode] = useState<"BS" | "AD">("BS");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageSizeInput, setPageSizeInput] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewEntry, setViewEntry] = useState<any | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<"All" | "Standard" | "Adjustments" | "Allocations">("All");

  const { data: journalEntries, isLoading } = useJournalEntries();
  const { data: accounts } = useAccounts();
  const postJournalEntry = usePostJournalEntry();
  const batchPostJournalEntries = useBatchPostJournalEntries();

  const filteredEntries = useMemo(() => {
    let entries = journalEntries || [];
    if (dateFilter) {
      entries = entries.filter(e => e.date >= dateFilter.from && e.date <= dateFilter.to);
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      if (searchMode === "AD") {
        entries = entries.filter(e => {
          const adIso = (e.date || "").toLowerCase();
          const adFormatted = e.date
            ? new Date(`${e.date}T00:00:00`).toLocaleDateString("en-GB").toLowerCase()
            : "";
          return (
            adIso.includes(q) ||
            adFormatted.includes(q) ||
            e.description?.toLowerCase().includes(q) ||
            e.entry_number?.toLowerCase().includes(q) ||
            e.reference?.toLowerCase().includes(q)
          );
        });
      } else {
        entries = entries.filter(e =>
          e.description?.toLowerCase().includes(q) ||
          e.entry_number?.toLowerCase().includes(q) ||
          e.reference?.toLowerCase().includes(q) ||
          formatISOasBS(e.date, "short").toLowerCase().includes(q)
        );
      }
    }
    if (categoryFilter !== "All") {
      entries = entries.filter(e => {
        const desc = (e.description || "").toLowerCase();
        const ref = (e.reference || "").toLowerCase();
        if (categoryFilter === "Adjustments") return desc.includes("adjustment") || ref.includes("adj");
        if (categoryFilter === "Allocations") return desc.includes("allocation") || ref.includes("alloc");
        return !desc.includes("adjustment") && !ref.includes("adj") && !desc.includes("allocation") && !ref.includes("alloc");
      });
    }
    // Sort
    if (sortField) {
      entries = [...entries].sort((a, b) => {
        let av: any, bv: any;
        if (sortField === "debit") {
          av = a.lines?.reduce((s: number, l: any) => s + (l.debit || 0), 0) || 0;
          bv = b.lines?.reduce((s: number, l: any) => s + (l.debit || 0), 0) || 0;
        } else if (sortField === "credit") {
          av = a.lines?.reduce((s: number, l: any) => s + (l.credit || 0), 0) || 0;
          bv = b.lines?.reduce((s: number, l: any) => s + (l.credit || 0), 0) || 0;
        } else if (sortField === "reference") {
          av = (a.reference || a.entry_number || "").toLowerCase();
          bv = (b.reference || b.entry_number || "").toLowerCase();
        } else if (sortField === "date") {
          av = a.date; bv = b.date;
        } else {
          av = (a[sortField] || "").toString().toLowerCase();
          bv = (b[sortField] || "").toString().toLowerCase();
        }
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return entries;
  }, [journalEntries, dateFilter, searchText, searchMode, sortField, sortDir, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const paginatedEntries = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, currentPage, pageSize]);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [searchText, dateFilter, pageSize]);

  // Keep date filter aligned with selected calendar mode
  useEffect(() => { setDateFilter(null); }, [searchMode]);

  const handleDelete = async () => {
    if (!deleteId) return;
    // Delete lines first, then entry
    await supabase.from("journal_lines").delete().eq("journal_entry_id", deleteId);
    const { error } = await supabase.from("journal_entries").delete().eq("id", deleteId);
    if (error) { toast.error("Delete failed"); }
    else { toast.success("Entry deleted"); queryClient.invalidateQueries({ queryKey: ["journal-entries"] }); }
    setDeleteId(null);
  };

  const handlePost = async (id: string) => {
    postJournalEntry.mutate(id, {
      onSuccess: () => toast.success("Entry posted successfully")
    });
  };

  const handleBatchPost = () => {
    if (selectedIds.size === 0) return;
    batchPostJournalEntries.mutate(Array.from(selectedIds), {
      onSuccess: () => setSelectedIds(new Set())
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedEntries.filter(e => !e.is_posted).length && selectedIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      const newSet = new Set<string>();
      paginatedEntries.filter(e => !e.is_posted).forEach(e => newSet.add(e.id));
      setSelectedIds(newSet);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handlePrint = (entry: any) => {
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      toast.error("Please allow popups to print voucher");
      return;
    }

    const rows = (entry.lines || []).map((line: any) => `
      <tr>
        <td style="padding:6px;border:1px solid #ddd;">${line.account?.name || getAccountName(line.account_id)}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right;">${(line.debit || 0).toFixed(2)}</td>
        <td style="padding:6px;border:1px solid #ddd;text-align:right;">${(line.credit || 0).toFixed(2)}</td>
      </tr>
    `).join("");

    win.document.write(`
      <html>
        <head><title>Voucher ${entry.reference || entry.entry_number}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Voucher: ${entry.reference || entry.entry_number}</h2>
          <p><strong>Date (AD):</strong> ${entry.date}</p>
          <p><strong>मिति (BS):</strong> ${formatISOasBS(entry.date, "short")}</p>
          <p><strong>Description:</strong> ${entry.description || "-"}</p>
          <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
            <thead>
              <tr>
                <th style="padding:6px;border:1px solid #ddd;text-align:left;">Account</th>
                <th style="padding:6px;border:1px solid #ddd;text-align:right;">Debit</th>
                <th style="padding:6px;border:1px solid #ddd;text-align:right;">Credit</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const handlePageSizeManual = () => {
    const val = parseInt(pageSizeInput);
    if (val > 0 && val <= 500) { setPageSize(val); setPageSizeInput(""); }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortField(null); setSortDir("asc"); }
    } else {
      setSortField(field); setSortDir("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  const formatPostedInfo = (entry: any) => {
    if (!entry.is_posted) return null;
    const by = entry.created_by ? entry.created_by.substring(0, 8) + "…" : "System";
    const dt = entry.updated_at || entry.created_at;
    if (!dt) return by;
    const d = new Date(dt);
    const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return (
      <div className="text-[10px] leading-tight">
        <div className="font-medium text-foreground">{by}</div>
        <div className="text-muted-foreground">{time}</div>
        <div className="text-muted-foreground">{date}</div>
      </div>
    );
  };

  const getAccountName = (accountId: string) => {
    const acct = accounts?.find((a: any) => a.id === accountId);
    return acct ? `${acct.code} - ${acct.name}` : accountId;
  };

  return (
    <div className="space-y-3">
      <Card>
        {/* Row 1: Title left, + New Entry right */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div>
            <h3 className="text-base font-semibold text-foreground">Journal Register</h3>
            <p className="text-muted-foreground text-xs mt-0.5">All journal, receipt, payment & contra vouchers</p>
          </div>
          {!isReadOnly && (
            <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={() => navigate("/finance/journal/new")}>
              <Plus className="h-3.5 w-3.5" /> New Entry
            </Button>
          )}
        </div>

        {/* Row 2: Search, AD/BS toggle, From (BS), To (BS), Search btn, Clear */}
        <div className="flex items-end gap-2 px-5 pb-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={`Search entries (${searchMode})...`}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="pl-8 h-9 text-sm w-[180px]"
            />
          </div>
          {/* Category Filter */}
          <div className="flex h-9 rounded-md border border-border overflow-hidden">
            {["All", "Standard", "Adjustments", "Allocations"].map(cat => (
              <button
                key={cat}
                className={cn(
                  "px-3 text-xs font-medium transition-colors border-r last:border-r-0 border-border",
                  categoryFilter === cat ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-accent"
                )}
                onClick={() => setCategoryFilter(cat as any)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* AD/BS Switcher */}
          <div className="flex h-9 rounded-md border border-border overflow-hidden">
            <button
              className={cn(
                "px-2.5 text-xs font-medium transition-colors",
                searchMode === "AD" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setSearchMode("AD")}
            >
              AD
            </button>
            <button
              className={cn(
                "px-2.5 text-xs font-medium transition-colors",
                searchMode === "BS" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
              )}
              onClick={() => setSearchMode("BS")}
            >
              BS
            </button>
          </div>
          <NepaliDateSearch mode={searchMode} onSearch={(from, to) => setDateFilter({ from, to })} />
          {dateFilter && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setDateFilter(null)}>
              Clear Filter
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button size="sm" variant="default" className="h-9 ml-auto text-xs gap-1.5 bg-primary/90" onClick={handleBatchPost} disabled={batchPostJournalEntries.isPending}>
              <Send className="h-3.5 w-3.5" /> Post {selectedIds.size} Entries
            </Button>
          )}
        </div>

        {/* Table */}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No entries found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px]">
                      <Checkbox 
                        checked={paginatedEntries.filter(e => !e.is_posted).length > 0 && selectedIds.size === paginatedEntries.filter(e => !e.is_posted).length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-[50px]">Action</TableHead>
                    <TableHead className="w-[90px] cursor-pointer select-none" onClick={() => toggleSort("reference")}>
                      <span className="flex items-center">Voucher # <SortIcon field="reference" /></span>
                    </TableHead>
                    <TableHead className="w-[95px] cursor-pointer select-none" onClick={() => toggleSort("date")}>
                      <span className="flex items-center">Date (AD) <SortIcon field="date" /></span>
                    </TableHead>
                    <TableHead className="w-[110px]">मिति (BS)</TableHead>
                    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("description")}>
                      <span className="flex items-center">Description <SortIcon field="description" /></span>
                    </TableHead>
                    <TableHead className="text-right w-[90px] cursor-pointer select-none" onClick={() => toggleSort("debit")}>
                      <span className="flex items-center justify-end">Debit <SortIcon field="debit" /></span>
                    </TableHead>
                    <TableHead className="text-right w-[90px] cursor-pointer select-none" onClick={() => toggleSort("credit")}>
                      <span className="flex items-center justify-end">Credit <SortIcon field="credit" /></span>
                    </TableHead>
                    <TableHead className="w-[90px]">Posted By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEntries.map(entry => {
                    const d = entry.lines?.reduce((s: number, l: any) => s + (l.debit || 0), 0) || 0;
                    const c = entry.lines?.reduce((s: number, l: any) => s + (l.credit || 0), 0) || 0;
                    return (
                      <TableRow key={entry.id} className={selectedIds.has(entry.id) ? "bg-primary/5" : ""}>
                        <TableCell className="py-1.5 px-2">
                          {!entry.is_posted && (
                            <Checkbox 
                              checked={selectedIds.has(entry.id)}
                              onCheckedChange={() => toggleSelect(entry.id)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="py-1.5 px-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-36">
                              <DropdownMenuItem className="text-xs gap-2" onSelect={() => setViewEntry(entry)}>
                                <Eye className="h-3 w-3" /> View
                              </DropdownMenuItem>
                              {!isReadOnly && !entry.is_posted && (
                                <DropdownMenuItem className="text-xs gap-2" onSelect={() => handlePost(entry.id)}>
                                  <Send className="h-3 w-3" /> Post Entry
                                </DropdownMenuItem>
                              )}
                              {!isReadOnly && !entry.is_posted && (
                                <DropdownMenuItem className="text-xs gap-2" onSelect={() => navigate(`/finance/journal/new?edit=${entry.id}`)}>
                                  <Pencil className="h-3 w-3" /> Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-xs gap-2" onSelect={() => handlePrint(entry)}>
                                <Printer className="h-3 w-3" /> Print
                              </DropdownMenuItem>
                              {!isReadOnly && (
                                <DropdownMenuItem
                                  className="text-xs gap-2 text-destructive focus:text-destructive"
                                  onSelect={() => setDeleteId(entry.id)}
                                >
                                  <Trash2 className="h-3 w-3" /> Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-primary py-1.5 px-2">{entry.reference || entry.entry_number}</TableCell>
                        <TableCell className="text-xs py-1.5 px-2">{entry.date}</TableCell>
                        <TableCell className="text-xs text-primary font-medium py-1.5 px-2">{formatISOasBS(entry.date, "short")}</TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate py-1.5">{entry.description}</TableCell>
                        <TableCell className="text-right font-mono text-xs py-1.5">{d.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-xs py-1.5">{c.toFixed(2)}</TableCell>
                        <TableCell className="py-1.5">
                          {entry.is_posted ? (
                            formatPostedInfo(entry)
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-warning/20 text-warning">Draft</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Footer: Pagination */}
          {filteredEntries.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Show</span>
                <Select value={String(pageSize)} onValueChange={v => setPageSize(Number(v))}>
                  <SelectTrigger className="h-7 w-[60px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 40, 50].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>or</span>
                <Input
                  placeholder="#"
                  value={pageSizeInput}
                  onChange={e => setPageSizeInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handlePageSizeManual()}
                  className="h-7 w-[50px] text-xs text-center"
                />
                <span>entries</span>
                <span className="ml-2">
                  ({(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredEntries.length)} of {filteredEntries.length})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs px-2 text-muted-foreground">
                  Page {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Journal Entry?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The entry and all its lines will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Dialog */}
      <Dialog open={!!viewEntry} onOpenChange={open => !open && setViewEntry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              Voucher: <span className="font-mono text-primary">{viewEntry?.reference || viewEntry?.entry_number}</span>
              {viewEntry?.is_posted ? (
                <Badge className="text-[10px]">Posted</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-warning/20 text-warning">Draft</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/30 border">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Date (AD)</p>
                  <p className="text-sm font-medium">{viewEntry.date}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">मिति (BS)</p>
                  <p className="text-sm font-medium text-primary">{formatISOasBS(viewEntry.date, "short")}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Status</p>
                  <p className="text-sm font-medium">{viewEntry.is_posted ? "Posted" : "Draft"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Created</p>
                  <p className="text-sm font-medium">{viewEntry.created_at ? new Date(viewEntry.created_at).toLocaleDateString() : "—"}</p>
                </div>
              </div>

              {/* Description */}
              <div className="p-3 rounded-lg border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Narration / Description</p>
                <p className="text-sm">{viewEntry.description || "—"}</p>
              </div>

              {/* Lines Table */}
              {viewEntry.lines && viewEntry.lines.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs font-semibold">Account</TableHead>
                        <TableHead className="text-xs font-semibold text-right w-[120px]">Debit</TableHead>
                        <TableHead className="text-xs font-semibold text-right w-[120px]">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewEntry.lines.map((line: any) => (
                        <TableRow key={line.id}>
                          <TableCell className="text-xs py-2">
                            <span className="font-medium">{line.account?.name || getAccountName(line.account_id)}</span>
                            {line.description && <span className="block text-[10px] text-muted-foreground mt-0.5">{line.description}</span>}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono py-2">{(line.debit || 0) > 0 ? (line.debit || 0).toFixed(2) : "—"}</TableCell>
                          <TableCell className="text-xs text-right font-mono py-2">{(line.credit || 0) > 0 ? (line.credit || 0).toFixed(2) : "—"}</TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="border-t-2 bg-muted/20">
                        <TableCell className="text-xs font-bold py-2">Total</TableCell>
                        <TableCell className="text-xs text-right font-mono font-bold py-2">
                          {viewEntry.lines.reduce((s: number, l: any) => s + (l.debit || 0), 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono font-bold py-2">
                          {viewEntry.lines.reduce((s: number, l: any) => s + (l.credit || 0), 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {!isReadOnly && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setViewEntry(null); navigate(`/finance/journal/new?edit=${viewEntry?.id}`); }}>
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { if (viewEntry) handlePrint(viewEntry); }}>
              <Printer className="h-3 w-3" /> Print
            </Button>
            <Button size="sm" onClick={() => setViewEntry(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
