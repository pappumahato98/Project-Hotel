'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

import { useNavigationStore, useFrontDeskContextStore } from '@/lib/store'
import { FrontDeskDashboard } from './FrontDeskDashboard'
import { ReservationsView } from './ReservationsView'
import { ArrivalsView } from './ArrivalsView'
import { InHouseView } from './InHouseView'
import { DeparturesView } from './DeparturesView'
import { FolioView } from './FolioView'
import { CalendarView } from './CalendarView'
import { ReportsView } from './ReportsView'
import { CheckInWizard } from './CheckInWizard'
import { NewReservationPage } from './NewReservationPage'
import { WaitlistView } from './WaitlistView'
import { WakeUpCallsView } from './WakeUpCallsView'
import { GuestDirectoryView } from './GuestDirectoryView'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const SUB_MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  'new-reservation': 'New Reservation',
  reservations: 'Reservations',
  'check-in': 'Check-In',
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
  const { prefillReservationId, setPrefillReservationId, showNewReservation, setShowNewReservation } = useFrontDeskContextStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Handle showNewReservation override
  useEffect(() => {
    if (showNewReservation && activeSubModule !== 'new-reservation') {
      setActiveSubModule('new-reservation')
      setShowNewReservation(false)
    }
  }, [showNewReservation, activeSubModule, setActiveSubModule, setShowNewReservation])

  // Handle prefill reservation for check-in
  useEffect(() => {
    if (prefillReservationId && activeSubModule !== 'check-in') {
      setActiveSubModule('check-in')
    }
  }, [prefillReservationId, activeSubModule, setActiveSubModule])

  const currentSubModule = activeSubModule || 'dashboard'
  const isCalendar = currentSubModule === 'calendar'
  const isFullPage = currentSubModule === 'new-reservation' || currentSubModule === 'check-in'

  // Reset scroll to top whenever the sub-module tab changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [currentSubModule])

  // Clear prefill when leaving check-in
  useEffect(() => {
    if (currentSubModule !== 'check-in' && prefillReservationId) {
      setPrefillReservationId(null)
    }
  }, [currentSubModule, prefillReservationId, setPrefillReservationId])

  const handleBackFromSubPage = useCallback(() => {
    setActiveSubModule('reservations')
  }, [setActiveSubModule])

  // Full-page views (no tab bar): New Reservation & Check-In Wizard
  if (currentSubModule === 'new-reservation') {
    return (
      <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
        <NewReservationPage
          onBack={handleBackFromSubPage}
        />
      </div>
    )
  }

  if (currentSubModule === 'check-in') {
    return (
      <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
        <CheckInWizard
          onBack={handleBackFromSubPage}
          prefillReservationId={prefillReservationId || undefined}
        />
      </div>
    )
  }

  // Standard views with tab bar
  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Tabs bar — always fixed at top, never scrolled */}
      <div className={cn(
        'z-20 flex items-center shrink-0 bg-background/70 backdrop-blur-xl backdrop-saturate-150 supports:[backdrop-filter]:bg-background/50 border-b shadow-sm',
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
          <CalendarView />
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">
          <StandardView subModule={currentSubModule} />
        </div>
      )}
    </div>
  )
}

// Lazy sub-module renderer for standard views
function StandardView({ subModule }: { subModule: string }) {
  switch (subModule) {
    case 'dashboard':
      return <FrontDeskDashboard />
    case 'reservations':
      return <ReservationsView />
    case 'arrivals':
      return <ArrivalsView />
    case 'in-house':
      return <InHouseView />
    case 'departures':
      return <DeparturesView />
    case 'folio':
      return <FolioView />
    case 'reports':
      return <ReportsView />
    case 'waitlist':
      return <WaitlistView />
    case 'wake-up-calls':
      return <WakeUpCallsView />
    case 'guest-directory':
      return <GuestDirectoryView />
    default:
      return <ReservationsView />
  }
}