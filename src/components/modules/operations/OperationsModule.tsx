'use client'

import { useEffect, useRef } from 'react'
import { useNavigationStore } from '@/lib/store'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { MoonStar, CalendarClock, Banknote, ArrowRightLeft } from 'lucide-react'
import { NightAuditView } from './NightAuditView'
import { DayCloseView } from './DayCloseView'
import { CashierView } from './CashierView'
import { ShiftHandoverView } from './ShiftHandoverView'

const subTabs = [
  { id: 'night-audit', label: 'Night Audit', icon: MoonStar },
  { id: 'day-close', label: 'Day Close', icon: CalendarClock },
  { id: 'cashier', label: 'Cashier Shifts', icon: Banknote },
  { id: 'shift-handover', label: 'Shift Handover', icon: ArrowRightLeft },
] as const

const SUB_MODULE_MAP: Record<string, React.ComponentType> = {
  'night-audit': NightAuditView,
  'day-close': DayCloseView,
  'cashier': CashierView,
  'shift-handover': ShiftHandoverView,
}

export default function OperationsModule() {
  const { activeSubModule, navigateTo } = useNavigationStore()
  const activeTab = activeSubModule && subTabs.some((t) => t.id === activeSubModule)
    ? activeSubModule
    : 'night-audit'

  const ActiveView = SUB_MODULE_MAP[activeTab] || NightAuditView
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [activeTab])

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Sticky header + tabs */}
        <div className="sticky top-0 z-20 flex flex-col shrink-0 bg-background/70 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/50 border-b shadow-sm px-4 md:px-6 pt-3 pb-3">
          {/* Module title — hidden on mobile, visible on sm+ */}
          <div className="hidden sm:flex flex-col gap-0.5 mb-2">
            <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Operations</h1>
            <p className="text-xs text-muted-foreground">
              Night audit, day close, cashier shifts &amp; shift handover management
            </p>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(v) => navigateTo('operations', v)}
            className="w-full shrink-0"
          >
            <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap max-w-full">
              {subTabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs sm:text-sm whitespace-nowrap shrink-0">
                  <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Content area */}
        <div className="p-4 md:p-6">
          <ActiveView />
        </div>
      </div>
    </div>
  )
}