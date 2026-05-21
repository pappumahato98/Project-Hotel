import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Download, FileText, CreditCard } from "lucide-react";
import { useInvoices, usePayments } from "@/hooks/useFinanceExtended";

interface ARTransactionServiceProps {
  isReadOnly?: boolean;
}

export function ARTransactionService({ isReadOnly }: ARTransactionServiceProps) {
  const [activeTab, setActiveTab] = useState("invoices");
  const { data: invoices, isLoading: invLoading } = useInvoices();
  const { data: payments, isLoading: payLoading } = usePayments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display">Accounts Receivable</h2>
          <p className="text-muted-foreground text-sm">Manage customer invoices, receipts, and deposits.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
          {!isReadOnly && (
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" /> Invoices
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" /> Receipts & Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Register</CardTitle>
              <CardDescription>Track customer billing and outstanding balances</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {invLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading invoices...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Guest/Client</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No invoices found</TableCell>
                      </TableRow>
                    ) : (
                      invoices?.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                          <TableCell>{inv.guest ? `${inv.guest.first_name} ${inv.guest.last_name}` : "Walk-in"}</TableCell>
                          <TableCell>{inv.invoice_date}</TableCell>
                          <TableCell className="text-right font-mono">${inv.total.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-destructive">${inv.balance_due.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              inv.status === "paid" ? "bg-success/20 text-success" :
                              inv.status === "partial" ? "bg-amber-500/20 text-amber-400" : "bg-muted"
                            }>
                              {inv.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Record of all customer payments and settlements</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {payLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading payments...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment #</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No payments found</TableCell>
                      </TableRow>
                    ) : (
                      payments?.map((pay) => (
                        <TableRow key={pay.id}>
                          <TableCell className="font-mono">{pay.payment_number}</TableCell>
                          <TableCell className="capitalize">{pay.payment_method}</TableCell>
                          <TableCell>{pay.payment_date}</TableCell>
                          <TableCell className="text-muted-foreground">{pay.reference_number || "-"}</TableCell>
                          <TableCell className="text-right font-mono text-success">${pay.amount.toFixed(2)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
