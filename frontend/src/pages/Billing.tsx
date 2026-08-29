import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, Filter, Download, CreditCard, Receipt, DollarSign, TrendingUp,
  CalendarPlus, Users, FileText, ShoppingCart, Loader2
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ModuleQuickActions, QuickAction } from "@/components/shared";
import { useInvoices, useBillingStats } from "@/hooks/useBillingData";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

const statusColors: Record<string, string> = {
  paid: "bg-success/20 text-success border-success/30",
  pending: "bg-warning/20 text-warning border-warning/30",
  partial: "bg-primary/20 text-primary border-primary/30",
  overdue: "bg-destructive/20 text-destructive border-destructive/30",
  draft: "bg-muted text-muted-foreground",
};

const Billing = () => {
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: stats } = useBillingStats();

  const quickActions: QuickAction[] = [
    { icon: CalendarPlus, label: "New Booking", to: "/reservations", color: "text-primary" },
    { icon: ShoppingCart, label: "POS Sale", to: "/pos", color: "text-amber-400" },
    { icon: Users, label: "Guest Accounts", to: "/guests", color: "text-purple-400" },
    { icon: FileText, label: "Financial Reports", to: "/reports", color: "text-blue-400" },
  ];

  return (
    <MainLayout fixedHeight title="Billing" subtitle="Manage invoices, payments and financial reports">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-2xl h-full overflow-hidden">
        <div className="xl:col-span-3 layout-section overflow-y-auto pr-2 scrollbar-hide">
          <div className="metric-grid">
            <MetricCard
              title="Total Revenue"
              value={stats ? formatCurrency(stats.totalRevenue) : "—"}
              change="From all invoices"
              changeType="positive"
              icon={DollarSign}
              delay={0}
            />
            <MetricCard
              title="Pending Payments"
              value={stats ? formatCurrency(stats.pendingAmount) : "—"}
              change={stats ? `${stats.pendingCount} invoices` : ""}
              changeType="neutral"
              icon={Receipt}
              delay={50}
            />
            <MetricCard
              title="Avg. Invoice"
              value={stats && invoices.length > 0 ? formatCurrency(Math.round(stats.totalRevenue / Math.max(invoices.length, 1))) : "—"}
              change="Per invoice"
              changeType="positive"
              icon={TrendingUp}
              delay={100}
            />
            <MetricCard
              title="Payment Success Rate"
              value={stats ? `${stats.successRate}%` : "—"}
              change="Completed payments"
              changeType="positive"
              icon={CreditCard}
              delay={150}
            />
          </div>

          <Card variant="elevated" className="overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <CardTitle>Recent Invoices</CardTitle>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search invoices..." className="w-full sm:w-48 lg:w-64 pl-9 bg-secondary" />
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" /><span className="hidden sm:inline">Filter</span>
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {isLoading ? (
                <div className="space-y-3 p-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="whitespace-nowrap">Invoice #</TableHead>
                        <TableHead className="whitespace-nowrap">Guest</TableHead>
                        <TableHead className="whitespace-nowrap hidden md:table-cell">Reservation</TableHead>
                        <TableHead className="whitespace-nowrap hidden lg:table-cell">Date</TableHead>
                        <TableHead className="whitespace-nowrap">Amount</TableHead>
                        <TableHead className="whitespace-nowrap">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No invoices found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        invoices.map((inv: any) => (
                          <TableRow key={inv.id} className="border-border hover:bg-secondary/50">
                            <TableCell className="font-mono text-sm text-primary whitespace-nowrap">{inv.invoice_number}</TableCell>
                            <TableCell className="font-medium whitespace-nowrap">
                              {inv.guest ? `${inv.guest.first_name} ${inv.guest.last_name}` : "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground hidden md:table-cell">
                              {inv.reservation?.reservation_code || "—"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">{inv.invoice_date}</TableCell>
                            <TableCell className="font-semibold whitespace-nowrap">{formatCurrency(inv.total || 0)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusColors[inv.status] || statusColors.draft}>
                                {inv.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 p-4 sm:p-6 overflow-y-auto">
          <ModuleQuickActions actions={quickActions} variant="list" />
        </div>
      </div>
    </MainLayout>
  );
};

const BillingPage = () => (
  <ErrorBoundary>
    <Billing />
  </ErrorBoundary>
);

export default BillingPage;
