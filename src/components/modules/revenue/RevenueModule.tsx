'use client'

import { useNavigationStore } from '@/lib/store'
import { DemandCalendarView } from './DemandCalendarView'
import { PricingView } from './PricingView'
import { RateIntelligenceView } from './RateIntelligenceView'

export default function RevenueModule() {
  const { activeSubModule } = useNavigationStore()

  switch (activeSubModule) {
    case 'demand-calendar':
      return <DemandCalendarView />
    case 'pricing':
      return <PricingView />
    case 'rate-intelligence':
      return <RateIntelligenceView />
    default:
      return <DemandCalendarView />
  }
}
