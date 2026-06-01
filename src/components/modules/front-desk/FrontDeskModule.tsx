'use client'

import { useNavigationStore } from '@/lib/store'
import { QuickSearch } from './QuickSearch'
import { ReservationsView } from './ReservationsView'
import { ArrivalsView } from './ArrivalsView'
import { InHouseView } from './InHouseView'
import { DeparturesView } from './DeparturesView'
import { FolioView } from './FolioView'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CalendarDays } from 'lucide-react'

const SUB_MODULE_MAP: Record<string, React.ComponentType> = {
  reservations: ReservationsView,
  arrivals: ArrivalsView,
  'in-house': InHouseView,
  departures: DeparturesView,
  folio: FolioView,
}

const SUB_MODULE_LABELS: Record<string, string> = {
  reservations: 'Reservations',
  arrivals: 'Arrivals',
  'in-house': 'In-House',
  departures: 'Departures',
  folio: 'Folio',
}

export function FrontDeskModule() {
  const { activeSubModule, setActiveSubModule } = useNavigationStore()

  const currentSubModule = activeSubModule || 'reservations'
  const ActiveView = SUB_MODULE_MAP[currentSubModule] || ReservationsView

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 overflow-y-auto">
      {/* Module Header with Quick Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
            <CalendarDays className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Front Desk</h1>
            <p className="text-xs text-muted-foreground">Reservations, arrivals, in-house & departures</p>
          </div>
        </div>
        <QuickSearch />
      </div>

      {/* Sub-module Tabs */}
      <Tabs
        value={currentSubModule}
        onValueChange={setActiveSubModule}
        className="w-full"
      >
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          {Object.entries(SUB_MODULE_LABELS).map(([key, label]) => (
            <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Active View */}
      <ActiveView />
    </div>
  )
}
