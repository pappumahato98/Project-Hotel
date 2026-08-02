'use client'

import { useNavigationStore } from '@/lib/store'
import { LedgerView } from './LedgerView'
import { JournalView } from './JournalView'
import { FinancialReportsView } from './FinancialReportsView'
import { BudgetView } from './BudgetView'
import { InvoicesView } from './InvoicesView'
import { TrialBalanceView } from './TrialBalanceView'
import { CashFlowView } from './CashFlowView'

export default function AccountingModule() {
  const { activeSubModule } = useNavigationStore()

  switch (activeSubModule) {
    case 'ledger':
      return <LedgerView />
    case 'journal':
      return <JournalView />
    case 'reports':
      return <FinancialReportsView />
    case 'budget':
      return <BudgetView />
    case 'invoices':
      return <InvoicesView />
    case 'trial-balance':
      return <TrialBalanceView />
    case 'cash-flow':
      return <CashFlowView />
    default:
      return <LedgerView />
  }
}
