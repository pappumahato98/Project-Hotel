import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportToPDF, exportToExcel } from "@/lib/reportExport";
import { formatCurrency } from "@/lib/utils";
import { Download, FileText, Banknote } from "lucide-react";

interface BanquetCashierReportProps {
  events: {
    id: string;
    event_name: string;
    client_name: string;
    event_date: string;
    total_amount: number;
    deposit_amount?: number | null;
    status: string;
  }[];
}

export function BanquetCashierReport({ events }: BanquetCashierReportProps) {
  const summary = useMemo(() => {
    const totalDeposits = events.reduce((s, e) => s + (e.deposit_amount || 0), 0);
    const totalAmount = events.reduce((s, e) => s + e.total_amount, 0);
    const outstanding = totalAmount - totalDeposits;
    const confirmed = events.filter(e => e.status === "confirmed");
    const completed = events.filter(e => e.status === "completed");
    return { totalDeposits, totalAmount, outstanding, confirmedCount: confirmed.length, completedCount: completed.length };
  }, [events]);

  const handleExportPDF = () => {
    exportToPDF({
      title: "Banquet Cashier Report",
      headers: ["Event", "Client", "Date", "Total", "Deposit", "Balance", "Status"],
      rows: events.map(e => [
        e.event_name, e.client_name, e.event_date,
        formatCurrency(e.total_amount), formatCurrency(e.deposit_amount || 0),
        formatCurrency(e.total_amount - (e.deposit_amount || 0)), e.status,
      ]),
    });
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: "Banquet_Cashier",
      headers: ["Event", "Client", "Date", "Total", "Deposit", "Balance", "Status"],
      rows: events.map(e => [
        e.event_name, e.client_name, e.event_date,
        e.total_amount, e.deposit_amount || 0,
        e.total_amount - (e.deposit_amount || 0), e.status,
      ]),
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" /> Banquet Cashier Report
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
            <p className="text-xs text-muted-foreground">Deposits Collected</p>
            <p className="text-lg font-bold text-success">{formatCurrency(summary.totalDeposits)}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-center">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(summary.totalAmount)}</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 text-center">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-lg font-bold text-destructive">{formatCurrency(summary.outstanding)}</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary text-center">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-lg font-bold">{summary.completedCount}</p>
          </div>
        </div>

        {events.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No events found.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Deposit</TableHead>
                  <TableHead className="hidden sm:table-cell">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.event_name}</TableCell>
                    <TableCell>{e.client_name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{e.event_date}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(e.total_amount)}</TableCell>
                    <TableCell className="text-success">{formatCurrency(e.deposit_amount || 0)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-destructive">
                      {formatCurrency(e.total_amount - (e.deposit_amount || 0))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{e.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
