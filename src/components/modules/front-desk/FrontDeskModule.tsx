'use client'

import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useRealtime } from '@/hooks/use-realtime'
import { useNavigationStore } from '@/lib/store'
import { QuickSearch } from './QuickSearch'
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
import { CalendarDays, BedDouble } from 'lucide-react'
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
  const queryClient = useQueryClient()

  const { isConnected } = useRealtime({
    modules: ['front-desk'],
    onEvent: (event, _data) => {
      // Invalidate relevant queries based on event type
      if (event.startsWith('reservation:') || event.startsWith('room:')) {
        queryClient.invalidateQueries({ queryKey: ['reservations'] })
        queryClient.invalidateQueries({ queryKey: ['rooms'] })
      }
      if (event.startsWith('folio:')) {
        queryClient.invalidateQueries({ queryKey: ['folio'] })
      }
      if (event === 'dashboard:refresh') {
        queryClient.invalidateQueries()
      }
    },
  })

  const currentSubModule = activeSubModule || 'dashboard'
  const ActiveView = SUB_MODULE_MAP[currentSubModule] || ReservationsView

  // Calendar tab has its own full toolbar — hide module header for it
  // Dashboard always shows the module header
  const showModuleHeader = currentSubModule === 'calendar' ? false : true

  return (
    <div className={cn(
        'flex flex-1 flex-col min-h-0',
        currentSubModule === 'calendar' ? 'overflow-hidden p-0 gap-0' : 'overflow-y-auto p-4 md:p-6 gap-4',
      )}>
      {/* Module Header with Quick Search (hidden when Calendar is active) */}
      {showModuleHeader && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
            <CalendarDays className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Front Desk</h1>
            <p className="text-xs text-muted-foreground">Reservations, arrivals, in-house &amp; departures</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isConnected && (
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Live</span>
            </div>
          )}
          <QuickSearch />
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={() => navigateTo('rooms', 'room-board')}
          >
            <BedDouble className="size-3.5" />
            <span className="hidden sm:inline">Room Board</span>
          </Button>
        </div>
      </div>
      )}

      {/* Sub-module Tabs */}
      <Tabs
        value={currentSubModule}
        onValueChange={setActiveSubModule}
        className={cn('w-full shrink-0', currentSubModule === 'calendar' ? 'px-4 pt-3 pb-0' : '')}
      >
        <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap max-w-full">
          {Object.entries(SUB_MODULE_LABELS).map(([key, label]) => (
            <TabsTrigger key={key} value={key} className="text-xs sm:text-sm whitespace-nowrap shrink-0">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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
