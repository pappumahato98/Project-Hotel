'use client'

import { useNavigationStore } from '@/lib/store'
import { EventsView } from './EventsView'
import { BanquetOrdersView } from './BanquetOrdersView'

export default function EventsModule() {
  const { activeSubModule } = useNavigationStore()

  switch (activeSubModule) {
    case 'events':
      return <EventsView />
    case 'banquet-orders':
      return <BanquetOrdersView />
    default:
      return <EventsView />
  }
}
