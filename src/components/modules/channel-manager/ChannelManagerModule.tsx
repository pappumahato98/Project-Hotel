'use client'

import { useNavigationStore } from '@/lib/store'
import { ChannelsView } from './ChannelsView'
import { BookingsView } from './BookingsView'

export default function ChannelManagerModule() {
  const { activeSubModule } = useNavigationStore()

  switch (activeSubModule) {
    case 'channels':
      return <ChannelsView />
    case 'bookings':
      return <BookingsView />
    default:
      return <ChannelsView />
  }
}
