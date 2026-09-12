'use client'

import { useNavigationStore } from '@/lib/store'
import { LedgerView } from './LedgerView'
import { JournalView } from './JournalView'
import { FinancialReportsView } from './FinancialReportsView'
import { InvoicesView } from './InvoicesView'
import { BudgetView } from './BudgetView'
import { TrialBalanceView } from './TrialBalanceView'
import { CashFlowView } from './CashFlowView'
import { AccountsReceivableView } from './AccountsReceivableView'
import { AccountsPayableView } from './AccountsPayableView'
import { ReconciliationView } from './ReconciliationView'
import { PeriodCloseView } from './PeriodCloseView'
import { TaxManagementView } from './TaxManagementView'
import { CostCenterView } from './CostCenterView'

export default function AccountingModule() {
  const { activeSubModule } = useNavigationStore()

  switch (activeSubModule) {
    case 'ledger':
      return <LedgerView />
    case 'journal':
      return <JournalView />
    case 'reports':
      return <FinancialReportsView />
    case 'invoices':
      return <InvoicesView />
    case 'budget':
      return <BudgetView />
    case 'trial-balance':
      return <TrialBalanceView />
    case 'cash-flow':
      return <CashFlowView />
    case 'accounts-receivable':
      return <AccountsReceivableView />
    case 'accounts-payable':
      return <AccountsPayableView />
    case 'reconciliation':
      return <ReconciliationView />
    case 'period-close':
      return <PeriodCloseView />
    case 'tax-management':
      return <TaxManagementView />
    case 'cost-centers':
      return <CostCenterView />
    default:
      return <LedgerView />
  }
}
