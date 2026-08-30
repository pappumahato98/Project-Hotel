import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Check, DollarSign, Search } from "lucide-react";
import { useExpenses } from "@/hooks/useFinanceExtended";
import { useAccounts } from "@/hooks/useFinance";
import { toast } from "sonner";
import { NepaliDateInput, NepaliDateSearch } from "@/components/shared/NepaliDateInput";
import { formatISOasBS } from "@/lib/nepaliDate";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  paid: "bg-success/20 text-success border-success/30",
  rejected: "bg-destructive/20 text-destructive border-destructive/30",
};

const categories = ["Operations", "Maintenance", "F&B", "Housekeeping", "Marketing", "Utilities", "Salaries", "Other"];

export function FinanceExpensesTab() {
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string } | null>(null);
  const { data: expenses, isLoading, createExpense, approveExpense, markExpensePaid } = useExpenses();
  const { data: accounts } = useAccounts();

  const [newExpense, setNewExpense] = useState({
    category: "Operations",
    description: "",
    amount: 0,
    expense_date: new Date().toISOString().split("T")[0],
    vendor: null as string | null,
    account_id: null as string | null,
    status: "pending",
    receipt_url: null as string | null,
    notes: null as string | null,
  });

  const filteredExpenses = useMemo(() => {
    let items = expenses || [];
    if (dateFilter) {
      items = items.filter(e => e.expense_date >= dateFilter.from && e.expense_date <= dateFilter.to);
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      items = items.filter(e =>
        e.expense_number?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.vendor?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        formatISOasBS(e.expense_date, "short").toLowerCase().includes(q)
      );
    }
    return items;
  }, [expenses, dateFilter, searchText]);

  const handleCreateExpense = async () => {
    if (!newExpense.description || !newExpense.amount) { toast.error("Description and amount are required"); return; }
    try {
      await createExpense.mutateAsync(newExpense);
      toast.success("Expense recorded");
      setExpenseDialogOpen(false);
      setNewExpense({ category: "Operations", description: "", amount: 0, expense_date: new Date().toISOString().split("T")[0], vendor: null, account_id: null, status: "pending", receipt_url: null, notes: null });
    } catch { toast.error("Failed to create expense"); }
  };

  const totalPending = expenses?.filter(e => e.status === "pending").reduce((s, e) => s + e.amount, 0) || 0;
  const totalPaid = expenses?.filter(e => e.status === "paid").reduce((s, e) => s + e.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Pending: <span className="font-semibold text-amber-400">${totalPending.toFixed(2)}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Paid: <span className="font-semibold text-success">${totalPaid.toFixed(2)}</span>
          </div>
        </div>
        <Button onClick={() => setExpenseDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Record Expense
        </Button>
      </div>

      {/* Search & BS Date Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1">
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Search (AD/BS/Text)</span>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search by expense #, vendor, BS date (e.g. Falgun)..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-8 h-9 text-sm" />
              </div>
            </div>
            <NepaliDateSearch onSearch={(from, to) => setDateFilter({ from, to })} />
            {dateFilter && (
              <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setDateFilter(null)}>Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Expense Register
          </CardTitle>
          <CardDescription>Track and manage all operational expenses</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading expenses...</div>
          ) : !filteredExpenses.length ? (
            <div className="p-8 text-center text-muted-foreground">{dateFilter || searchText ? "No expenses match your search" : "No expenses recorded yet."}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense #</TableHead>
                    <TableHead>Date (AD)</TableHead>
                    <TableHead>मिति (BS)</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-mono text-primary">{exp.expense_number}</TableCell>
                      <TableCell className="text-sm">{exp.expense_date}</TableCell>
                      <TableCell className="text-sm text-primary font-medium">{formatISOasBS(exp.expense_date, "short")}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{exp.category}</Badge></TableCell>
                      <TableCell>{exp.description}</TableCell>
                      <TableCell className="text-muted-foreground">{exp.vendor || "-"}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">${exp.amount.toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColors[exp.status] || ""}>{exp.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {exp.status === "pending" && (
                            <Button variant="ghost" size="sm" onClick={() => approveExpense.mutate({ id: exp.id, approvedBy: "system" })}>
                              <Check className="h-3 w-3 mr-1" /> Approve
                            </Button>
                          )}
                          {exp.status === "approved" && (
                            <Button variant="ghost" size="sm" onClick={() => markExpensePaid.mutate(exp.id)}>
                              <DollarSign className="h-3 w-3 mr-1" /> Pay
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Expense</DialogTitle>
            <DialogDescription>Add a new expense for tracking and approval</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newExpense.category} onValueChange={v => setNewExpense(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <NepaliDateInput
                label="Expense Date"
                value={newExpense.expense_date}
                onChange={(d) => setNewExpense(p => ({ ...p, expense_date: d }))}
                showDual={true}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="What was this expense for?" value={newExpense.description} onChange={e => setNewExpense(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" placeholder="0.00" value={newExpense.amount || ""} onChange={e => setNewExpense(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input placeholder="Vendor name" value={newExpense.vendor || ""} onChange={e => setNewExpense(p => ({ ...p, vendor: e.target.value || null }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Account (Optional)</Label>
              <Select value={newExpense.account_id || "none"} onValueChange={v => setNewExpense(p => ({ ...p, account_id: v === "none" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Link to account" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {accounts.filter(a => a.type === "expense").map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateExpense} disabled={createExpense.isPending}>{createExpense.isPending ? "Recording..." : "Record Expense"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
