import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  FilePieChart,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Calendar,
  Percent
} from "lucide-react";
import { useTaxRates, useInvoices, useExpenses } from "@/hooks/useFinanceExtended";
import { Button } from "@/components/ui/button";

export function TaxReportingService({ isReadOnly }: { isReadOnly?: boolean }) {
  const { data: taxRates } = useTaxRates();
  const { data: invoices } = useInvoices();
  const { data: expenses } = useExpenses();

  const taxSummary = invoices?.reduce((acc, inv) => {
    acc.output += inv.tax_amount;
    return acc;
  }, { output: 0, input: 0 }) || { output: 0, input: 0 };

  const expenseTax = expenses?.filter(e => e.status === 'paid').reduce((acc, exp) => {
    // Estimate input tax at 10% if not specified
    acc.input += exp.amount * 0.1;
    return acc;
  }, taxSummary) || taxSummary;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" /> Tax Reporting & Compliance
          </h2>
          <p className="text-muted-foreground text-sm">Monitor VAT, Sales Tax, and Withholding obligations.</p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" /> Export Tax Return
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Output Tax (Sales) <ArrowUpRight className="h-4 w-4 text-success" />
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold font-display">${expenseTax.output.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
             <p className="text-[10px] text-muted-foreground mt-1">Payable to tax authority</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Input Tax (Purchases) <ArrowDownRight className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold font-display">${expenseTax.input.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
             <p className="text-[10px] text-muted-foreground mt-1">Claimable/Offsetable amount</p>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Net Tax Liability <FilePieChart className="h-4 w-4 text-success" />
            </CardTitle>
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold font-display text-success">
               ${Math.max(0, expenseTax.output - expenseTax.input).toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </div>
             <p className="text-[10px] text-muted-foreground mt-1">Current period estimate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Tax Configurations</CardTitle>
              <CardDescription>Rules applied to AR/AP transactions</CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" /> Fiscal Period: Q1 2026
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tax Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Applicability</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxRates?.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">{rate.name}</TableCell>
                  <TableCell className="font-mono">{rate.code}</TableCell>
                  <TableCell className="text-right font-bold">{rate.rate}%</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {rate.applies_to.map(target => (
                        <Badge key={target} variant="secondary" className="text-[10px]">{target}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-success/20 text-success border-success/30">Active</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!taxRates || taxRates.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No tax rates configured</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
