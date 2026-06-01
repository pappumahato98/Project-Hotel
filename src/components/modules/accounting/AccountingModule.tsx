'use client'

import { useNavigationStore } from '@/lib/store'
import { LedgerView } from './LedgerView'
import { JournalView } from './JournalView'
import { FinancialReportsView } from './FinancialReportsView'

export default function AccountingModule() {
  const { activeSubModule } = useNavigationStore()

  switch (activeSubModule) {
    case 'ledger':
      return <LedgerView />
    case 'journal':
      return <JournalView />
    case 'reports':
      return <FinancialReportsView />
    default:
      return <LedgerView />
  }
}
