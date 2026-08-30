import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { toast } from "sonner";
import { formatISOasBS } from "@/lib/nepaliDate";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Grid, Flex } from "@/components/ui/grid";
import {
  LayoutDashboard,
  Settings2,
  RefreshCw,
  BookOpen,
  CalendarDays,
  Send,
} from "lucide-react";

// Setup components
import { ChartOfAccountsService } from "@/components/finance/setup/ChartOfAccountsService";
import { FinancialConfigurationService } from "@/components/finance/setup/FinancialConfigurationService";
import { CustomerMasterService } from "@/components/finance/setup/CustomerMasterService";
import { VendorMasterService } from "@/components/finance/setup/VendorMasterService";
import { BankCashSetupService } from "@/components/finance/setup/BankCashSetupService";
import { AssetMasterService } from "@/components/finance/setup/AssetMasterService";
import { TaxConfigurationService } from "@/components/finance/setup/TaxConfigurationService";
import { BudgetSetupService } from "@/components/finance/setup/BudgetSetupService";
import { AccessControlService } from "@/components/finance/setup/AccessControlService";
import { FinancialStatementMappingService } from "@/components/finance/setup/FinancialStatementMappingService";
import { MultiCurrencySetupService } from "@/components/finance/setup/MultiCurrencySetupService";
import { CostCenterSetupService } from "@/components/finance/setup/CostCenterSetupService";

// Transaction components
import { JournalManagementService } from "@/components/finance/transactions/JournalManagementService";
import { ARTransactionService } from "@/components/finance/transactions/ARTransactionService";
import { APTransactionService } from "@/components/finance/transactions/APTransactionService";
import { BankCashTransactionService } from "@/components/finance/transactions/BankCashTransactionService";
import { AssetOperationsService } from "@/components/finance/transactions/AssetOperationsService";
import { TaxCalculationService } from "@/components/finance/transactions/TaxCalculationService";
import { BudgetExecutionService } from "@/components/finance/transactions/BudgetExecutionService";
import { FinancialPeriodCloseService } from "@/components/finance/transactions/FinancialPeriodCloseService";
import { ApprovalWorkflowService } from "@/components/finance/transactions/ApprovalWorkflowService";
import { IntegrationOrchestratorService } from "@/components/finance/transactions/IntegrationOrchestratorService";
import { LedgerTransactionService } from "@/components/finance/transactions/LedgerTransactionService";
import { DayBookService } from "@/components/finance/transactions/DayBookService";
import { CashBankReconcileService } from "@/components/finance/transactions/CashBankReconcileService";
import { FinanceInvoicesTab } from "@/components/finance/tabs/InvoicesTab";
import { FinanceExpensesTab } from "@/components/finance/tabs/ExpensesTab";

// Report components
import { FinancialReportingService } from "@/components/finance/reporting/FinancialReportingService";
import { LedgerInquiryService } from "@/components/finance/reporting/LedgerInquiryService";
import { ARReportingService } from "@/components/finance/reporting/ARReportingService";
import { APReportingService } from "@/components/finance/reporting/APReportingService";
import { CashBankReportingService } from "@/components/finance/reporting/CashBankReportingService";
import { FixedAssetsReportingService } from "@/components/finance/reporting/FixedAssetsReportingService";
import { TaxReportingService } from "@/components/finance/reporting/TaxReportingService";
import { BudgetForecastReportingService } from "@/components/finance/reporting/BudgetForecastReportingService";
import { AuditReportingService } from "@/components/finance/reporting/AuditReportingService";
import { ConsolidationBIService } from "@/components/finance/reporting/ConsolidationBIService";
import { FinanceTrialBalanceTab } from "@/components/finance/tabs/TrialBalanceTab";


import { useBusinessDate } from "@/hooks/useSettings";



export default function Finance() {
  const { data: businessDate } = useBusinessDate();

  const [activeSetupTab, setActiveSetupTab] = useState("chart-of-accounts");
  const [activeTransactionTab, setActiveTransactionTab] = useState("journal-management");
  const [activeReportTab, setActiveReportTab] = useState("trial-balance");

  return (
    <MainLayout
      fixedHeight
      title="Finance & Accounting"
      subtitle={`Business Date: ${businessDate || "Loading..."} ${businessDate ? `(${formatISOasBS(businessDate, "short")} BS)` : ""}`}
      actions={
        <Badge variant="outline" className="hidden sm:inline-flex gap-1.5 bg-primary/10 text-primary border-primary/20 text-xs">
          <CalendarDays className="h-3 w-3" />
          {businessDate ? `${businessDate} | ${formatISOasBS(businessDate, "short")} BS` : "Today"}
        </Badge>
      }
    >
      <div className="flex flex-col h-full overflow-hidden p-4 sm:p-6">
        <Tabs defaultValue="dashboard" className="w-full h-full flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 mb-4 flex-shrink-0">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="flex-1 overflow-y-auto scrollbar-hide space-y-6 min-h-0">
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Finance & Accounting Dashboard</p>
              <p className="text-sm">Use the tabs above to navigate to Setup, Transactions, or Reports</p>
            </div>
          </TabsContent>

          <TabsContent value="setup" className="flex-1 h-full overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col md:flex-row gap-4">
            <Card className="w-full md:w-64 flex-shrink-0 h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                  <Button variant={activeSetupTab === "chart-of-accounts" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveSetupTab("chart-of-accounts")}>Chart of Accounts</Button>
                  <Button variant={activeSetupTab === "financial-config" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveSetupTab("financial-config")}>Financial Config</Button>
                  <Button variant={activeSetupTab === "customers" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveSetupTab("customers")}>Customer Master</Button>
                  <Button variant={activeSetupTab === "vendors" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveSetupTab("vendors")}>Vendor Master</Button>
                  <Button variant={activeSetupTab === "bank-cash" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveSetupTab("bank-cash")}>Bank/Cash Setup</Button>
                  <Button variant={activeSetupTab === "assets" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveSetupTab("assets")}>Asset Master</Button>
                  <Button variant={activeSetupTab === "tax-config" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveSetupTab("tax-config")}>Tax Config</Button>
                  <Button variant={activeSetupTab === "budget-setup" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveSetupTab("budget-setup")}>Budget Setup</Button>
                  <Button variant={activeSetupTab === "access-control" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveSetupTab("access-control")}>Access Control</Button>
                  <Button variant={activeSetupTab === "statement-mapping" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveSetupTab("statement-mapping")}>Statement Mapping</Button>
                  <Button variant={activeSetupTab === "multi-currency" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveSetupTab("multi-currency")}>Multi-Currency & FX</Button>
                  <Button variant={activeSetupTab === "cost-centers" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveSetupTab("cost-centers")}>Cost Centers</Button>
                </div>
            </Card>
            <Card className="flex-1 overflow-hidden flex flex-col h-full min-w-0">
              <CardContent className="p-4 flex-1 overflow-y-auto">
                {activeSetupTab === "chart-of-accounts" && <ChartOfAccountsService />}
                {activeSetupTab === "financial-config" && <FinancialConfigurationService />}
                {activeSetupTab === "customers" && <CustomerMasterService />}
                {activeSetupTab === "vendors" && <VendorMasterService />}
                {activeSetupTab === "bank-cash" && <BankCashSetupService />}
                {activeSetupTab === "assets" && <AssetMasterService />}
                {activeSetupTab === "tax-config" && <TaxConfigurationService />}
                {activeSetupTab === "budget-setup" && <BudgetSetupService />}
                {activeSetupTab === "access-control" && <AccessControlService />}
                {activeSetupTab === "statement-mapping" && <FinancialStatementMappingService />}
                {activeSetupTab === "multi-currency" && <MultiCurrencySetupService />}
                {activeSetupTab === "cost-centers" && <CostCenterSetupService />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="flex-1 h-full overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col md:flex-row gap-4">
            <Card className="w-full md:w-64 flex-shrink-0 h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                  <Button variant={activeTransactionTab === "journal-management" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTransactionTab("journal-management")}>Journal Management</Button>
                  <Button variant={activeTransactionTab === "ar" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTransactionTab("ar")}>A/R Transactions</Button>
                  <Button variant={activeTransactionTab === "ap" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTransactionTab("ap")}>A/P Transactions</Button>
                  <Button variant={activeTransactionTab === "bank-cash" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTransactionTab("bank-cash")}>Bank/Cash Transactions</Button>
                  <Button variant={activeTransactionTab === "asset-operations" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTransactionTab("asset-operations")}>Asset Operations</Button>
                  <Button variant={activeTransactionTab === "tax-calculation" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTransactionTab("tax-calculation")}>Tax Calculation</Button>
                  <Button variant={activeTransactionTab === "budget-execution" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTransactionTab("budget-execution")}>Budget Execution</Button>
                  <Button variant={activeTransactionTab === "period-close" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTransactionTab("period-close")}>Period Close</Button>
                  <Button variant={activeTransactionTab === "approval-workflow" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTransactionTab("approval-workflow")}>Approval Workflow</Button>
                  <Button variant={activeTransactionTab === "integrations" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTransactionTab("integrations")}>Integrations</Button>
                  <Button variant={activeTransactionTab === "ledger-transaction" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTransactionTab("ledger-transaction")}>Ledger Transaction</Button>
                  <Button variant={activeTransactionTab === "day-book" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTransactionTab("day-book")}>Day Book</Button>
                  <Button variant={activeTransactionTab === "reconcile" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveTransactionTab("reconcile")}>Cash/Bank Reconcile</Button>
                </div>
            </Card>
            <Card className="flex-1 overflow-hidden flex flex-col h-full min-w-0">
              <CardContent className="p-4 flex-1 overflow-y-auto">
                {activeTransactionTab === "journal-management" && <JournalManagementService />}
                {activeTransactionTab === "ar" && <ARTransactionService />}
                {activeTransactionTab === "ap" && <APTransactionService />}
                {activeTransactionTab === "bank-cash" && <BankCashTransactionService />}
                {activeTransactionTab === "asset-operations" && <AssetOperationsService />}
                {activeTransactionTab === "tax-calculation" && <TaxCalculationService />}
                {activeTransactionTab === "budget-execution" && <BudgetExecutionService />}
                {activeTransactionTab === "period-close" && <FinancialPeriodCloseService />}
                {activeTransactionTab === "approval-workflow" && <ApprovalWorkflowService />}
                {activeTransactionTab === "integrations" && <IntegrationOrchestratorService />}
                {activeTransactionTab === "ledger-transaction" && <LedgerTransactionService />}
                {activeTransactionTab === "day-book" && <DayBookService />}
                {activeTransactionTab === "reconcile" && <CashBankReconcileService />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="flex-1 h-full overflow-hidden min-h-0 m-0 data-[state=active]:flex flex-col md:flex-row gap-4">
            <Card className="w-full md:w-64 flex-shrink-0 h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                  <Button variant={activeReportTab === "trial-balance" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveReportTab("trial-balance")}>Trial Balance</Button>
                  <Button variant={activeReportTab === "financial" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveReportTab("financial")}>Financial Reporting</Button>
                  <Button variant={activeReportTab === "ledger-inquiry" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveReportTab("ledger-inquiry")}>Ledger Inquiry</Button>
                  <Button variant={activeReportTab === "ar" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveReportTab("ar")}>A/R Reporting</Button>
                  <Button variant={activeReportTab === "ap" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveReportTab("ap")}>A/P Reporting</Button>
                  <Button variant={activeReportTab === "cash-bank" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveReportTab("cash-bank")}>Cash/Bank Reporting</Button>
                  <Button variant={activeReportTab === "fixed-assets" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveReportTab("fixed-assets")}>Fixed Assets</Button>
                  <Button variant={activeReportTab === "tax" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveReportTab("tax")}>Tax Reporting</Button>
                  <Button variant={activeReportTab === "budget" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveReportTab("budget")}>Budget Forecast</Button>
                  <Button variant={activeReportTab === "audit" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveReportTab("audit")}>Audit Reporting</Button>
                  <Button variant={activeReportTab === "consolidation" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveReportTab("consolidation")}>Consolidation BI</Button>
                  <Button variant={activeReportTab === "day-book" ? "default" : "ghost"} className="justify-start" onClick={() => setActiveReportTab("day-book")}>Day Book</Button>
                </div>
            </Card>
            <Card className="flex-1 overflow-hidden flex flex-col h-full min-w-0">
              <CardContent className="p-4 flex-1 overflow-y-auto">
                {activeReportTab === "trial-balance" && <FinanceTrialBalanceTab />}
                {activeReportTab === "financial" && <FinancialReportingService />}
                {activeReportTab === "ledger-inquiry" && <LedgerInquiryService />}
                {activeReportTab === "ar" && <ARReportingService />}
                {activeReportTab === "ap" && <APReportingService />}
                {activeReportTab === "cash-bank" && <CashBankReportingService />}
                {activeReportTab === "fixed-assets" && <FixedAssetsReportingService />}
                {activeReportTab === "tax" && <TaxReportingService />}
                {activeReportTab === "budget" && <BudgetForecastReportingService />}
                {activeReportTab === "audit" && <AuditReportingService />}
                {activeReportTab === "consolidation" && <ConsolidationBIService />}
                {activeReportTab === "day-book" && <DayBookService />}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
