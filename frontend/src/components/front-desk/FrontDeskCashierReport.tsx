import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToPDF, exportToExcel } from "@/lib/reportExport";
import { formatCurrency } from "@/lib/utils";
import { Download, FileText, DollarSign } from "lucide-react";
import { format } from "date-fns";

export const FrontDeskCashierReport = () => {
  const today = new Date().toISOString().split("T")[0];

  const { data: payments = [] } = useQuery({
    queryKey: ["frontdesk-cashier-payments", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .gte("payment_date", today)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const summary = useMemo(() => {
    const cash = payments.filter((p: any) => p.payment_method === "cash").reduce((s: number, p: any) => s + p.amount, 0);
    const card = payments.filter((p: any) => p.payment_method === "card").reduce((s: number, p: any) => s + p.amount, 0);
    const digital = payments.filter((p: any) => !["cash", "card"].includes(p.payment_method)).reduce((s: number, p: any) => s + p.amount, 0);
    return { cash, card, digital, total: cash + card + digital };
  }, [payments]);

  const handleExportPDF = () => {
    exportToPDF({
      title: "Front Desk Cashier Report",
      headers: ["Payment #", "Amount", "Method", "Reference", "Date"],
      rows: payments.map((p: any) => [
        p.payment_number, formatCurrency(p.amount), p.payment_method,
        p.reference_number || "—", format(new Date(p.created_at), "HH:mm"),
      ]),
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: "FrontDesk_Cashier",
      headers: ["Payment #", "Amount", "Method", "Reference", "Date"],
      rows: payments.map((p: any) => [
        p.payment_number, p.amount, p.payment_method,
        p.reference_number || "", format(new Date(p.created_at), "HH:mm"),
      ]),
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Cashier Report — Today
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-success/10 text-center">
            <p className="text-xs text-muted-foreground">Cash</p>
            <p className="text-lg font-bold text-success">{formatCurrency(summary.cash)}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-center">
            <p className="text-xs text-muted-foreground">Card</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(summary.card)}</p>
          </div>
          <div className="p-3 rounded-lg bg-warning/10 text-center">
            <p className="text-xs text-muted-foreground">Digital</p>
            <p className="text-lg font-bold text-warning">{formatCurrency(summary.digital)}</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary text-center">
            <p className="text-xs text-muted-foreground">Grand Total</p>
            <p className="text-lg font-bold">{formatCurrency(summary.total)}</p>
          </div>
        </div>

        {payments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No payments recorded today.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="hidden sm:table-cell">Reference</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.payment_number}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(p.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{p.payment_method}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{p.reference_number || "—"}</TableCell>
                    <TableCell>{format(new Date(p.created_at), "HH:mm")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
