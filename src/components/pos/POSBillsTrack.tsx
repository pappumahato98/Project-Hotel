import React, { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Eye,
  Printer,
  XCircle,
  GitMerge,
  Clock,
  User,
  Receipt,
} from "lucide-react";
import { usePOSTransactions, POSTransaction, useVoidTransaction } from "@/hooks/usePOS";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export function POSBillsTrack() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBills, setSelectedBills] = useState<string[]>([]);
  const [selectedBill, setSelectedBill] = useState<POSTransaction | null>(null);

  const { data: transactions = [] } = usePOSTransactions();
  const voidTransaction = useVoidTransaction();

  const filteredBills = useMemo(() => {
    return transactions.filter((t) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        t.transaction_number?.toLowerCase().includes(query) ||
        t.table_number?.toLowerCase().includes(query)
      );
    });
  }, [transactions, searchQuery]);

  const toggleBillSelection = (id: string) => {
    setSelectedBills((prev) =>
      prev.includes(id) ? prev.filter((bid) => bid !== id) : [...prev, id]
    );
  };

  const handleReprint = (bill: POSTransaction) => {
    toast.info(`Generating print preview for bill ${bill.transaction_number}...`);
    setSelectedBill(bill);
    // In a real app, this would trigger a window.print() or similar on the dialog content
  };

  const handleVoid = (bill: POSTransaction) => {
    if (bill.status === "voided") {
      toast.error("This bill is already voided");
      return;
    }

    if (confirm(`Are you sure you want to VOID bill ${bill.transaction_number}? This action is permanent.`)) {
      voidTransaction.mutate({ transactionId: bill.id, reason: "Manual void from Bills Track" });
    }
  };

  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergedContent, setMergedContent] = useState<any>(null);

  const handleMerge = () => {
    if (selectedBills.length < 2) {
      toast.error("Please select at least two bills to merge");
      return;
    }

    const billsToMerge = transactions.filter(t => selectedBills.includes(t.id));
    const tables = new Set(billsToMerge.map(b => b.table_number));

    if (tables.size > 1) {
      toast.warning("Merging bills from multiple tables (T" + Array.from(tables).join(", T") + ")");
    }

    // Calculate consolidated totals
    const consolidated = {
      bills: billsToMerge.map(b => b.transaction_number),
      tables: Array.from(tables),
      items: billsToMerge.flatMap(b => b.items).reduce((acc: any[], item) => {
        const existing = acc.find(i => i.item_name === item.item_name);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          acc.push({ ...item });
        }
        return acc;
      }, []),
      subtotal: billsToMerge.reduce((sum, b) => sum + b.subtotal, 0),
      tax: billsToMerge.reduce((sum, b) => sum + b.tax_amount, 0),
      total: billsToMerge.reduce((sum, b) => sum + b.total, 0),
      timestamp: new Date().toISOString()
    };

    setMergedContent(consolidated);
    setMergeDialogOpen(true);
    toast.success(`Consolidated statement generated for ${selectedBills.length} bills`);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "voided":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">Voided</Badge>;
      case "refunded":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Refunded</Badge>;
      default:
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Paid</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by bill #, table, or guest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-950/50 border-slate-800 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {selectedBills.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedBills([])}
              className="text-slate-400 border-slate-800 hover:bg-slate-800"
            >
              Clear Selection
            </Button>
          )}
          <Button
            variant="blue"
            className={`gap-2 transition-all duration-300 ${selectedBills.length < 2 ? "opacity-50 grayscale" : "shadow-lg shadow-blue-500/20"}`}
            onClick={handleMerge}
            disabled={selectedBills.length < 2}
          >
            <GitMerge className="h-4 w-4" />
            Merge Bills ({selectedBills.length})
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/20 overflow-hidden shadow-xl">
        <Table>
          <TableHeader className="bg-slate-900/50">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="w-12 px-6"></TableHead>
              <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Bill Details</TableHead>
              <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Table/Guest</TableHead>
              <TableHead className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Status</TableHead>
              <TableHead className="text-right text-slate-400 font-bold uppercase text-[10px] tracking-wider">Amount</TableHead>
              <TableHead className="text-right text-slate-400 font-bold uppercase text-[10px] tracking-wider px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-20">
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <Receipt className="h-12 w-12 opacity-20" />
                    <p className="text-lg font-medium">No records found matching your search</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredBills.map((bill) => (
                <TableRow
                  key={bill.id}
                  className={`border-slate-800 transition-colors hover:bg-slate-800/30 ${selectedBills.includes(bill.id) ? "bg-blue-500/5" : ""}`}
                >
                  <TableCell className="px-6">
                    <Checkbox
                      checked={selectedBills.includes(bill.id)}
                      onCheckedChange={() => toggleBillSelection(bill.id)}
                      className="border-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-mono text-sm text-blue-400 font-bold">{bill.transaction_number}</span>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-1">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(bill.created_at), "HH:mm • dd MMM, yyyy")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-slate-950 border-slate-800 text-[10px] px-1.5 h-5">T{bill.table_number}</Badge>
                        <span className="text-sm font-medium text-slate-200">{bill.customer_name || "Walk-in Guest"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(bill.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-lg font-bold text-white font-mono">{formatCurrency(bill.total)}</span>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 transition-all"
                        onClick={() => setSelectedBill(bill)}
                        title="View Bill Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                        onClick={() => handleReprint(bill)}
                        title="Reprint Bill"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all"
                        onClick={() => handleVoid(bill)}
                        disabled={bill.status === "voided"}
                        title="Void Transaction"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Merge/Consolidation Dialog */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 rounded-3xl p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="p-8 pb-4 bg-slate-950/50">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
               <GitMerge className="h-5 w-5 text-blue-500" />
               Consolidated Statement
            </DialogTitle>
          </DialogHeader>
          {mergedContent && (
            <div className="p-8 pt-4 space-y-6">
               <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
                  <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">Merged IDs</p>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">{mergedContent.bills.join(", ")}</p>
               </div>

               <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Consolidated Items</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {mergedContent.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm bg-slate-800/20 p-3 rounded-xl">
                      <span className="text-slate-200 font-medium">{item.quantity}x {item.item_name}</span>
                      <span className="text-white font-mono">{formatCurrency(item.item_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-800">
                 <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-500">Combined Subtotal</span>
                    <span className="text-slate-300">{formatCurrency(mergedContent.subtotal)}</span>
                 </div>
                 <div className="flex justify-between font-bold text-xl pt-3 border-t border-dashed border-slate-700">
                    <span className="text-white">Grand Total</span>
                    <span className="text-blue-500 font-mono">{formatCurrency(mergedContent.total)}</span>
                 </div>
              </div>

              <div className="flex gap-3">
                 <Button variant="outline" className="flex-1 rounded-2xl h-12 border-slate-800" onClick={() => setMergeDialogOpen(false)}>
                    Close
                 </Button>
                 <Button className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20" onClick={() => {
                    toast.success("Printing consolidated statement...");
                    setMergeDialogOpen(false);
                    setSelectedBills([]);
                 }}>
                    Print All
                 </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bill View Dialog */}
      <Dialog open={!!selectedBill} onOpenChange={() => setSelectedBill(null)}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-800 rounded-3xl p-0 overflow-hidden shadow-2xl">
          <DialogHeader>
            <DialogTitle>Bill Review</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4 font-mono text-sm bg-secondary/20 p-4 rounded-lg">
               <div className="text-center border-b pb-2 space-y-1">
                  <h3 className="font-bold text-lg">RESTAURANT RECEIPT</h3>
                  <p>Table {selectedBill.table_number}</p>
                  <p>{selectedBill.transaction_number}</p>
                  <p>{format(parseISO(selectedBill.created_at), "PPP p")}</p>
               </div>
               <div className="space-y-1 py-2 border-b">
                  {selectedBill.items.map((item, i) => (
                    <div key={i} className="flex justify-between">
                       <span>{item.quantity}x {item.item_name}</span>
                       <span>{formatCurrency(item.item_price * item.quantity)}</span>
                    </div>
                  ))}
               </div>
               <div className="space-y-1 pt-2">
                  <div className="flex justify-between">
                     <span>Subtotal</span>
                     <span>{formatCurrency(selectedBill.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                     <span>Tax (10%)</span>
                     <span>{formatCurrency(selectedBill.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t border-dashed">
                     <span>TOTAL</span>
                     <span>{formatCurrency(selectedBill.total)}</span>
                  </div>
               </div>
               <div className="text-center pt-4 text-xs">
                  <p>Processed by {selectedBill.customer_name || "Admin"}</p>
                  <p className="mt-2 font-bold italic">Thank you for your visit!</p>
               </div>
               <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" className="flex-1" onClick={() => handleReprint(selectedBill)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Reprint
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => handleVoid(selectedBill)}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Void
                  </Button>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
