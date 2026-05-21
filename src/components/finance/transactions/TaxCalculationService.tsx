import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calculator, Play, CheckCircle2, Receipt, History } from "lucide-react";
import { useTaxRates, useInvoices, useExpenses } from "@/hooks/useFinanceExtended";

export function TaxCalculationService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { data: taxRates } = useTaxRates();
  const { data: invoices } = useInvoices();
  const { data: expenses } = useExpenses();

  const outputTax = useMemo(() => (invoices || []).reduce((s, i) => s + i.tax_amount, 0), [invoices]);
  const inputTax = useMemo(() => (expenses || []).filter(e => e.status === "paid").reduce((s, e) => s + e.amount * 0.13, 0), [expenses]);
  const netLiability = outputTax - inputTax;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" /> Tax Calculation & Booking
          </h2>
          <p className="text-muted-foreground text-sm">Automated tax computation and liability tracking.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Output Tax (Sales)</p>
            <h3 className="text-xl font-bold">${outputTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Input Tax (Purchases)</p>
            <h3 className="text-xl font-bold">${inputTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
          </CardContent>
        </Card>
        <Card className={netLiability >= 0 ? "bg-amber-500/5 border-amber-500/10" : "bg-success/5 border-success/10"}>
          <CardContent className="pt-4">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Net Liability</p>
            <h3 className="text-xl font-bold">${Math.abs(netLiability).toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
            <p className="text-[10px] text-muted-foreground">{netLiability >= 0 ? "Payable" : "Refundable"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Active Tax Rates</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Applies To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(taxRates || []).length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No tax rates configured</TableCell></TableRow>
              ) : (taxRates || []).map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-right font-bold">{r.rate}%</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(r.applies_to || []).map((t: string) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
