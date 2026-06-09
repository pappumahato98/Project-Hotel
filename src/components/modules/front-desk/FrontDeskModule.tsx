'use client'

import { toast } from 'sonner'
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
import { BedDouble } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const { activeSubModule, setActiveSubModule, navigateTo } = useNavigationStore()

  const currentSubModule = activeSubModule || 'dashboard'
  const ActiveView = SUB_MODULE_MAP[currentSubModule] || ReservationsView

  return (
    <div className={cn(
        'flex flex-1 flex-col min-h-0',
        currentSubModule === 'calendar' ? 'overflow-hidden p-0 gap-0' : 'overflow-y-auto p-4 md:p-6 gap-4',
      )}>
      {/* Sub-module Tabs + Room Board */}
      <div className={cn(
        'flex items-center justify-between gap-3 shrink-0',
        currentSubModule === 'calendar' ? 'px-4 pt-3 pb-0' : '',
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
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-muted-foreground shrink-0"
          onClick={() => navigateTo('rooms', 'room-board')}
        >
          <BedDouble className="size-3.5" />
          <span className="hidden sm:inline">Room Board</span>
        </Button>
      </div>

      {/* Active View */}
      <div className={cn(
        'flex flex-col min-h-0',
        currentSubModule === 'calendar' ? 'flex-1 overflow-hidden px-4 pb-0 pt-2' : '',
      )}>
        <ActiveView />
      </div>
    </div>
  )
}
