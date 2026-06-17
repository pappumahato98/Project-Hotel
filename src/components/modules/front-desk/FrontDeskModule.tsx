'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  LayoutDashboard,
  PlusCircle,
  CalendarDays,
  LogIn,
  PlaneLanding,
  Users,
  PlaneTakeoff,
  Receipt,
  CalendarRange,
  BarChart3,
  Clock,
  BellRing,
  BookUser,
  BookOpen,
  Settings2,
  DollarSign,
} from 'lucide-react'

import { useNavigationStore, useFrontDeskContextStore, useFrontDeskTabsStore } from '@/lib/store'
import { FrontDeskDashboard } from './FrontDeskDashboard'
import { ReservationsView } from './ReservationsView'
import { ArrivalsView } from './ArrivalsView'
import { InHouseView } from './InHouseView'
import { DeparturesView } from './DeparturesView'
import { FolioView } from './FolioView'
import { CalendarView } from './CalendarView'
import { ReportsView } from './ReportsView'
import { CheckInLookup } from './CheckInLookup'
import { CheckInProcess } from './CheckInProcess'
import { NewReservationPage } from './NewReservationPage'
import { WaitlistView } from './WaitlistView'
import { WakeUpCallsView } from './WakeUpCallsView'
import { GuestDirectoryView } from './GuestDirectoryView'
import { GuestLedgerView } from './GuestLedgerView'
import { RoomRatePostingPage } from './RoomRatePostingPage'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// ─── Tab definitions ─────────────────────────────────────────
// 'check-in-process' is intentionally NOT in this map — it's hidden from the tab bar
interface TabDef {
  label: string
  icon: LucideIcon
}

const SUB_MODULES: Record<string, TabDef> = {
  dashboard:        { label: 'Dashboard',      icon: LayoutDashboard },
  'new-reservation':{ label: 'New Res.',       icon: PlusCircle },
  reservations:     { label: 'Reservations',   icon: CalendarDays },
  'check-in':       { label: 'Check-In',       icon: LogIn },
  arrivals:         { label: 'Arrivals',       icon: PlaneLanding },
  'in-house':       { label: 'In-House',       icon: Users },
  departures:       { label: 'Departures',     icon: PlaneTakeoff },
  folio:            { label: 'Folio',          icon: Receipt },
  calendar:         { label: 'Calendar',       icon: CalendarRange },
  reports:          { label: 'Reports',        icon: BarChart3 },
  waitlist:         { label: 'Waitlist',       icon: Clock },
  'wake-up-calls':  { label: 'Wake-up Calls', icon: BellRing },
  'guest-directory':{ label: 'Guest Dir.',     icon: BookUser },
  'guest-ledger':  { label: 'Guest Ledger',  icon: BookOpen },
  'rate-posting': { label: 'Rate Posting',  icon: DollarSign },
}

const TAB_KEYS = Object.keys(SUB_MODULES)

export function FrontDeskModule() {
  const { activeSubModule, setActiveSubModule } = useNavigationStore()
  const { prefillReservationId, setPrefillReservationId, showNewReservation, setShowNewReservation, clearCheckInSession } = useFrontDeskContextStore()
  const { disabledSubModules, toggleSubModule, resetSubModules } = useFrontDeskTabsStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // If the active tab gets disabled, fall back to dashboard
  useEffect(() => {
    if (activeSubModule && activeSubModule !== 'dashboard' && disabledSubModules.includes(activeSubModule)) {
      setActiveSubModule('dashboard')
    }
  }, [activeSubModule, disabledSubModules, setActiveSubModule])

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
  const isFullPage = currentSubModule === 'new-reservation' || currentSubModule === 'check-in' || currentSubModule === 'check-in-process'

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

  // Clear check-in session when navigating away from check-in-process
  useEffect(() => {
    if (currentSubModule !== 'check-in-process') {
      clearCheckInSession()
    }
  }, [currentSubModule, clearCheckInSession])

  const handleBackFromSubPage = useCallback(() => {
    setActiveSubModule('reservations')
  }, [setActiveSubModule])

  const handleBackToLookup = useCallback(() => {
    clearCheckInSession()
    setPrefillReservationId(null)
    setActiveSubModule('check-in')
  }, [setActiveSubModule, clearCheckInSession, setPrefillReservationId])

  // ─── Full-page views (no tab bar) ─────────────────────────

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
        <CheckInLookup
          onBack={handleBackFromSubPage}
          prefillReservationId={prefillReservationId || undefined}
        />
      </div>
    )
  }

  if (currentSubModule === 'check-in-process') {
    return (
      <div className="flex flex-1 flex-col min-h-0 overflow-y-auto">
        <CheckInProcess
          onBack={handleBackToLookup}
        />
      </div>
    )
  }

  // ─── Standard views with tab bar ─────────────────────────
  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Tabs bar — responsive wrap, all tabs always visible */}
      <div className={cn(
        'z-20 flex items-center shrink-0 bg-background/70 backdrop-blur-xl backdrop-saturate-150 supports:[backdrop-filter]:bg-background/50 border-b shadow-sm',
        isCalendar ? 'px-4 pt-3 pb-2' : 'px-4 md:px-6 pt-3 pb-3',
      )}>
        <div className="flex items-center gap-2 flex-wrap w-full">
          <Tabs
            value={currentSubModule}
            onValueChange={setActiveSubModule}
            className="w-full"
          >
            <TabsList className="flex flex-wrap gap-1 sm:gap-1.5 w-full h-auto bg-muted/50 rounded-lg p-1 items-start">
              {TAB_KEYS.filter((key) => !disabledSubModules.includes(key)).map((key) => {
                const def = SUB_MODULES[key]
                const Icon = def.icon

                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="h-7 sm:h-8 flex-none text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3"
                  >
                    <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-0.5 sm:mr-1 shrink-0" />
                    <span className="truncate">{def.label}</span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>

          {/* Gear icon — customize tabs */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="h-4 w-4" />
                <span className="sr-only">Customize tabs</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0">
              <div className="px-4 py-3 border-b">
                <h4 className="text-sm font-semibold">Customize Tabs</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Toggle tabs on or off
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto overscroll-contain">
                <div className="p-2">
                  {TAB_KEYS.map((key) => {
                    const def = SUB_MODULES[key]
                    const Icon = def.icon
                    const isChecked = !disabledSubModules.includes(key)

                    return (
                      <label
                        key={key}
                        className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm truncate">{def.label}</span>
                        </div>
                        <Switch
                          checked={isChecked}
                          onCheckedChange={() => toggleSubModule(key)}
                          className="shrink-0"
                        />
                      </label>
                    )
                  })}
                </div>
              </div>
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={resetSubModules}
                >
                  Reset All
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
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
    case 'guest-ledger':
      return <GuestLedgerView />
    case 'rate-posting':
      return <RoomRatePostingPage />
    default:
      return <ReservationsView />
  }
}