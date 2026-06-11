'use client'

import { useEffect, useRef } from 'react'

import { useNavigationStore } from '@/lib/store'
import { FrontDeskDashboard } from './FrontDeskDashboard'
import { ReservationsView } from './ReservationsView'
import { ArrivalsView } from './ArrivalsView'
import { InHouseView } from './InHouseView'
import { DeparturesView } from './DeparturesView'
import { FolioView } from './FolioView'
import { CalendarView } from './CalendarView'
import { ReportsView } from './ReportsView'
import { CheckInView } from './CheckInView'
import { WaitlistView } from './WaitlistView'
import { WakeUpCallsView } from './WakeUpCallsView'
import { GuestDirectoryView } from './GuestDirectoryView'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const SUB_MODULE_MAP: Record<string, React.ComponentType> = {
  'check-in': CheckInView,
  dashboard: FrontDeskDashboard,
  reservations: ReservationsView,
  arrivals: ArrivalsView,
  'in-house': InHouseView,
  departures: DeparturesView,
  folio: FolioView,
  calendar: CalendarView,
  reports: ReportsView,
  waitlist: WaitlistView,
  'wake-up-calls': WakeUpCallsView,
  'guest-directory': GuestDirectoryView,
}

const SUB_MODULE_LABELS: Record<string, string> = {
  'check-in': 'Check-In Wizard',
  dashboard: 'Dashboard',
  reservations: 'Reservations',
  arrivals: 'Arrivals',
  'in-house': 'In-House',
  departures: 'Departures',
  folio: 'Folio',
  calendar: 'Calendar',
  reports: 'Reports',
  waitlist: 'Waitlist',
  'wake-up-calls': 'Wake-up Calls',
  'guest-directory': 'Guest Directory',
}

export function FrontDeskModule() {
  const { activeSubModule, setActiveSubModule } = useNavigationStore()

  const currentSubModule = activeSubModule || 'dashboard'
  const ActiveView = SUB_MODULE_MAP[currentSubModule] || ReservationsView
  const isCalendar = currentSubModule === 'calendar'
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset scroll to top whenever the sub-module tab changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [currentSubModule])

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Tabs bar — always fixed at top, never scrolled */}
      <div className={cn(
        'z-20 flex items-center shrink-0 bg-background/70 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/50 border-b shadow-sm',
        isCalendar ? 'px-4 pt-3 pb-2' : 'px-4 md:px-6 pt-3 pb-3',
      )}>
        <Tabs
          value={currentSubModule}
          onValueChange={setActiveSubModule}
          className="w-full shrink-0"
        >
          <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap max-w-full">
            {Object.entries(SUB_MODULE_LABELS).map(([key, label]) => (
              <TabsTrigger key={key} value={key} className="text-xs sm:text-sm whitespace-nowrap shrink-0">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Content area — Calendar manages its own scroll; others use parent scroll */}
      {isCalendar ? (
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <ActiveView />
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
          <ActiveView />
        </div>
      )}
    </div>
  )
}
