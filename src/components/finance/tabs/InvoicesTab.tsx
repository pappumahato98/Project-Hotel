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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CreditCard, FileText, Send, Search } from "lucide-react";
import { useInvoices, usePayments, type Invoice } from "@/hooks/useFinanceExtended";
import { useGuests } from "@/hooks/useGuests";
import { toast } from "sonner";
import { NepaliDateInput, NepaliDateSearch } from "@/components/shared/NepaliDateInput";
import { formatISOasBS } from "@/lib/nepaliDate";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  partial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  paid: "bg-success/20 text-success border-success/30",
  overdue: "bg-destructive/20 text-destructive border-destructive/30",
  completed: "bg-success/20 text-success border-success/30",
};

export function FinanceInvoicesTab() {
  const [subTab, setSubTab] = useState("invoices");
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const getPreviousDue = (guestId: string | null) => {
    if (!guestId || !invoices) return 0;
    return invoices
      .filter(inv => inv.guest_id === guestId && inv.status !== 'paid')
      .reduce((sum, inv) => sum + (inv.balance_due || 0), 0);
  };
  const [searchText, setSearchText] = useState("");
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string } | null>(null);

  const { data: invoices, isLoading: invLoading, createInvoice, updateInvoiceStatus } = useInvoices();
  const { data: payments, isLoading: payLoading, recordPayment } = usePayments();
  const { data: guests } = useGuests();

  const [newInvoice, setNewInvoice] = useState({
    guest_id: null as string | null,
    due_date: null as string | null,
    discount_amount: 0,
    amount_paid: 0,
    status: "draft",
    notes: null as string | null,
    terms: null as string | null,
    items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 0, tax_amount: 0, total: 0 }],
  });

  const [newPayment, setNewPayment] = useState({
    invoice_id: null as string | null,
    guest_id: null as string | null,
    reservation_id: null as string | null,
    amount: 0,
    payment_method: "cash",
    payment_date: new Date().toISOString().split("T")[0],
    reference_number: null as string | null,
    status: "completed",
    notes: null as string | null,
  });

  const filteredInvoices = useMemo(() => {
    let items = invoices || [];
    if (dateFilter) {
      items = items.filter(i => i.invoice_date >= dateFilter.from && i.invoice_date <= dateFilter.to);
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      items = items.filter(i =>
        i.invoice_number?.toLowerCase().includes(q) ||
        formatISOasBS(i.invoice_date, "short").toLowerCase().includes(q) ||
        (i.guest && `${i.guest.first_name} ${i.guest.last_name}`.toLowerCase().includes(q))
      );
    }
    return items;
  }, [invoices, dateFilter, searchText]);

  const filteredPayments = useMemo(() => {
    let items = payments || [];
    if (dateFilter) {
      items = items.filter(p => p.payment_date >= dateFilter.from && p.payment_date <= dateFilter.to);
    }
    if (searchText) {
      const q = searchText.toLowerCase();
      items = items.filter(p =>
        p.payment_number?.toLowerCase().includes(q) ||
        formatISOasBS(p.payment_date, "short").toLowerCase().includes(q)
      );
    }
    return items;
  }, [payments, dateFilter, searchText]);

  const handleCreateInvoice = async () => {
    if (newInvoice.items.every(i => !i.description)) { toast.error("Add at least one line item"); return; }
    const items = newInvoice.items.filter(i => i.description).map(i => ({ ...i, total: i.quantity * i.unit_price + i.tax_amount }));
    try {
      await createInvoice.mutateAsync({
        guest_id: newInvoice.guest_id, reservation_id: null, company_id: null,
        invoice_date: new Date().toISOString().split("T")[0], due_date: newInvoice.due_date,
        status: newInvoice.status, subtotal: 0, tax_amount: 0, discount_amount: newInvoice.discount_amount,
        total: 0, amount_paid: 0, balance_due: 0, notes: newInvoice.notes, terms: newInvoice.terms, items,
      });
      toast.success("Invoice created");
      setInvoiceDialogOpen(false);
      setNewInvoice({ guest_id: null, due_date: null, discount_amount: 0, amount_paid: 0, status: "draft", notes: null, terms: null, items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 0, tax_amount: 0, total: 0 }] });
    } catch { toast.error("Failed to create invoice"); }
  };

  const handleRecordPayment = async () => {
    if (!newPayment.amount) { toast.error("Enter an amount"); return; }
    try {
      await recordPayment.mutateAsync(newPayment);
      toast.success("Payment recorded");
      setPaymentDialogOpen(false);
      setNewPayment({ invoice_id: null, guest_id: null, reservation_id: null, amount: 0, payment_method: "cash", payment_date: new Date().toISOString().split("T")[0], reference_number: null, status: "completed", notes: null });
    } catch { toast.error("Failed to record payment"); }
  };

  const updateLineItem = (idx: number, field: string, value: any) => {
    setNewInvoice(prev => ({ ...prev, items: prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item) }));
  };

  return (
    <div className="space-y-6">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="invoices" className="gap-2"><FileText className="h-4 w-4" /> Invoices</TabsTrigger>
            <TabsTrigger value="payments" className="gap-2"><CreditCard className="h-4 w-4" /> Payments</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPaymentDialogOpen(true)} className="gap-2">
              <Send className="h-4 w-4" /> Record Payment
            </Button>
            <Button onClick={() => setInvoiceDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </div>
        </div>

        {/* Search & BS Date Filter */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3 items-end">
              <div className="flex-1 space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Search (AD/BS/Text)</span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search by invoice #, BS date (e.g. Falgun), or guest..." value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-8 h-9 text-sm" />
                </div>
              </div>
              <NepaliDateSearch onSearch={(from, to) => setDateFilter({ from, to })} />
              {dateFilter && (
                <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setDateFilter(null)}>Clear</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Manage guest and corporate invoices</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {invLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading invoices...</div>
              ) : !filteredInvoices.length ? (
                <div className="p-8 text-center text-muted-foreground">{dateFilter || searchText ? "No invoices match your search" : "No invoices yet."}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Guest</TableHead>
                        <TableHead>Date (AD)</TableHead>
                        <TableHead>मिति (BS)</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-primary">{inv.invoice_number}</TableCell>
                          <TableCell>{inv.guest ? `${inv.guest.first_name} ${inv.guest.last_name}` : "-"}</TableCell>
                          <TableCell className="text-sm">{inv.invoice_date}</TableCell>
                          <TableCell className="text-sm text-primary font-medium">{formatISOasBS(inv.invoice_date, "short")}</TableCell>
                          <TableCell className="text-right font-mono">${inv.total.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">${inv.balance_due.toFixed(2)}</TableCell>
                          <TableCell><Badge variant="outline" className={statusColors[inv.status] || ""}>{inv.status}</Badge></TableCell>
                          <TableCell>
                            {inv.status === "draft" && (
                              <Button variant="ghost" size="sm" onClick={() => updateInvoiceStatus.mutate({ id: inv.id, status: "sent" })}>
                                <Send className="h-3 w-3 mr-1" /> Send
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Records</CardTitle>
              <CardDescription>All received payments and transactions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {payLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading payments...</div>
              ) : !filteredPayments.length ? (
                <div className="p-8 text-center text-muted-foreground">{dateFilter || searchText ? "No payments match your search" : "No payments recorded yet."}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment #</TableHead>
                        <TableHead>Date (AD)</TableHead>
                        <TableHead>मिति (BS)</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((pay) => (
                        <TableRow key={pay.id}>
                          <TableCell className="font-mono text-primary">{pay.payment_number}</TableCell>
                          <TableCell className="text-sm">{pay.payment_date}</TableCell>
                          <TableCell className="text-sm text-primary font-medium">{formatISOasBS(pay.payment_date, "short")}</TableCell>
                          <TableCell className="capitalize">{pay.payment_method}</TableCell>
                          <TableCell className="text-right font-mono font-semibold">${pay.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-muted-foreground">{pay.reference_number || "-"}</TableCell>
                          <TableCell><Badge variant="outline" className={statusColors[pay.status] || ""}>{pay.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Generate a new invoice for a guest or company</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Guest</Label>
                <Select value={newInvoice.guest_id || ""} onValueChange={(v) => setNewInvoice(p => ({ ...p, guest_id: v || null }))}>
                  <SelectTrigger><SelectValue placeholder="Select guest" /></SelectTrigger>
                  <SelectContent>{guests?.map(g => <SelectItem key={g.id} value={g.id}>{g.first_name} {g.last_name}</SelectItem>)}</SelectContent>
                </Select>
                {newInvoice.guest_id && getPreviousDue(newInvoice.guest_id) > 0 && (
                  <p className="text-[10px] text-destructive font-bold flex items-center gap-1 mt-1 animate-pulse">
                     <FileText className="h-3 w-3" />
                     Previous Outstanding: {formatCurrency(getPreviousDue(newInvoice.guest_id))}
                  </p>
                )}
              </div>
              <NepaliDateInput
                label="Due Date"
                value={newInvoice.due_date || new Date().toISOString().split("T")[0]}
                onChange={(d) => setNewInvoice(p => ({ ...p, due_date: d }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Line Items</Label>
              {newInvoice.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2">
                  <Input className="col-span-2" placeholder="Description" value={item.description} onChange={e => updateLineItem(idx, "description", e.target.value)} />
                  <Input type="number" placeholder="Qty" value={item.quantity || ""} onChange={e => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)} />
                  <Input type="number" placeholder="Unit price" value={item.unit_price || ""} onChange={e => updateLineItem(idx, "unit_price", parseFloat(e.target.value) || 0)} />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setNewInvoice(p => ({ ...p, items: [...p.items, { description: "", quantity: 1, unit_price: 0, tax_rate: 0, tax_amount: 0, total: 0 }] }))}>
                <Plus className="h-4 w-4 mr-1" /> Add Line
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input placeholder="Additional notes..." value={newInvoice.notes || ""} onChange={e => setNewInvoice(p => ({ ...p, notes: e.target.value || null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateInvoice} disabled={createInvoice.isPending}>{createInvoice.isPending ? "Creating..." : "Create Invoice"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Record a payment against an invoice or as standalone</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Invoice (Optional)</Label>
              <Select value={newPayment.invoice_id || "none"} onValueChange={v => setNewPayment(p => ({ ...p, invoice_id: v === "none" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Standalone payment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No invoice (standalone)</SelectItem>
                  {invoices?.filter(i => i.status !== "paid").map(i => (
                    <SelectItem key={i.id} value={i.id}>{i.invoice_number} — ${i.balance_due.toFixed(2)} due</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" placeholder="0.00" value={newPayment.amount || ""} onChange={e => setNewPayment(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={newPayment.payment_method} onValueChange={v => setNewPayment(p => ({ ...p, payment_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <NepaliDateInput
              label="Payment Date"
              value={newPayment.payment_date}
              onChange={(d) => setNewPayment(p => ({ ...p, payment_date: d }))}
            />
            <div className="space-y-2">
              <Label>Reference #</Label>
              <Input placeholder="Check #, Ref #..." value={newPayment.reference_number || ""} onChange={e => setNewPayment(p => ({ ...p, reference_number: e.target.value || null }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={recordPayment.isPending}>{recordPayment.isPending ? "Recording..." : "Record Payment"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
