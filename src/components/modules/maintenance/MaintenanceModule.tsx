'use client'

import { useNavigationStore } from '@/lib/store'
import { WorkOrdersView } from './WorkOrdersView'
import { AssetRegisterView } from './AssetRegisterView'

export default function MaintenanceModule() {
  const { activeSubModule } = useNavigationStore()

  switch (activeSubModule) {
    case 'work-orders':
      return <WorkOrdersView />
    case 'assets':
      return <AssetRegisterView />
    default:
      return <WorkOrdersView />
  }
}
