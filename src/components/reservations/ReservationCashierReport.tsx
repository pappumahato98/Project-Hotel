import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { exportToPDF, exportToExcel } from "@/lib/reportExport";
import { formatCurrency } from "@/lib/utils";
import { Download, FileText, CreditCard } from "lucide-react";
import { format } from "date-fns";

export const ReservationCashierReport = () => {
  const { data: payments = [] } = useQuery({
    queryKey: ["reservation-cashier-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, reservations:reservation_id(reservation_code)")
        .not("reservation_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const summary = useMemo(() => {
    const total = payments.reduce((s: number, p: any) => s + p.amount, 0);
    const byMethod: Record<string, number> = {};
    payments.forEach((p: any) => {
      byMethod[p.payment_method] = (byMethod[p.payment_method] || 0) + p.amount;
    });
    return { total, byMethod, count: payments.length };
  }, [payments]);

  const handleExportPDF = () => {
    exportToPDF({
      title: "Reservation Payments Report",
      headers: ["Payment #", "Reservation", "Amount", "Method", "Date"],
      rows: payments.map((p: any) => [
        p.payment_number, p.reservations?.reservation_code || "—",
        formatCurrency(p.amount), p.payment_method, p.payment_date,
      ]),
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: "Reservation_Payments",
      headers: ["Payment #", "Reservation", "Amount", "Method", "Date", "Status"],
      rows: payments.map((p: any) => [
        p.payment_number, p.reservations?.reservation_code || "",
        p.amount, p.payment_method, p.payment_date, p.status,
      ]),
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Reservation Cashier Report
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}><Download className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-primary/10 text-center">
            <p className="text-xs text-muted-foreground">Total Collected</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(summary.total)}</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary text-center">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-lg font-bold">{summary.count}</p>
          </div>
          {Object.entries(summary.byMethod).slice(0, 2).map(([method, amount]) => (
            <div key={method} className="p-3 rounded-lg bg-success/10 text-center">
              <p className="text-xs text-muted-foreground capitalize">{method}</p>
              <p className="text-lg font-bold text-success">{formatCurrency(amount)}</p>
            </div>
          ))}
        </div>

        {payments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No reservation payments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment #</TableHead>
                  <TableHead>Reservation</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Method</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.payment_number}</TableCell>
                    <TableCell className="font-mono text-primary">{p.reservations?.reservation_code || "—"}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(p.amount)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="capitalize">{p.payment_method}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{p.payment_date}</TableCell>
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
