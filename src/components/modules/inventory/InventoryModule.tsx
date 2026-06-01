'use client'

import { useNavigationStore } from '@/lib/store'
import { StockView } from './StockView'
import { VendorsView } from './VendorsView'
import { RequisitionsView } from './RequisitionsView'

export default function InventoryModule() {
  const { activeSubModule } = useNavigationStore()

  switch (activeSubModule) {
    case 'stock':
      return <StockView />
    case 'vendors':
      return <VendorsView />
    case 'requisitions':
      return <RequisitionsView />
    default:
      return <StockView />
  }
}
