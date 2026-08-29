import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StripeConnect } from "@/components/finance/StripeConnect";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CreditCard, ArrowUpRight } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { usePayments, useBillingStats } from "@/hooks/useBillingData";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

const Payments = () => {
  const { data: payments = [], isLoading } = usePayments();
  const { data: stats } = useBillingStats();

  return (
    <MainLayout title="Payments" subtitle="Manage transactions and payment processing">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCard
            title="Total Collected"
            value={stats ? formatCurrency(payments.reduce((s: number, p: any) => s + (p.amount || 0), 0)) : "—"}
            change="All payments"
            changeType="positive"
            icon={DollarSign}
          />
          <MetricCard
            title="Successful Payments"
            value={String(payments.filter((p: any) => p.status === "completed").length)}
            change={`of ${payments.length} total`}
            changeType="positive"
            icon={CreditCard}
          />
          <MetricCard
            title="Pending"
            value={String(payments.filter((p: any) => p.status === "pending").length)}
            change="Awaiting completion"
            changeType="neutral"
            icon={ArrowUpRight}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card variant="elevated">
              <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : payments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No payments recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment #</TableHead>
                        <TableHead>Guest</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-xs">{payment.payment_number}</TableCell>
                          <TableCell>{payment.guest ? `${payment.guest.first_name} ${payment.guest.last_name}` : "—"}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(payment.amount || 0)}</TableCell>
                          <TableCell>
                            <Badge variant={payment.status === "completed" ? "success" : "warning"}>
                              {payment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{payment.payment_method}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1"><StripeConnect /></div>
        </div>
      </div>
    </MainLayout>
  );
};

const PaymentsPage = () => (
  <ErrorBoundary>
    <Payments />
  </ErrorBoundary>
);

export default PaymentsPage;
