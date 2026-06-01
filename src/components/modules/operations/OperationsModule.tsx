'use client'

import { useNavigationStore } from '@/lib/store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

export default function OperationsModule() {
  const { activeSubModule, navigateTo } = useNavigationStore()
  const activeTab = activeSubModule && subTabs.some((t) => t.id === activeSubModule)
    ? activeSubModule
    : 'night-audit'

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Operations</h1>
          <p className="text-sm text-muted-foreground">
            Night audit, day close, cashier shifts &amp; shift handover management
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => navigateTo('operations', v)}
        className="flex flex-1 flex-col gap-6"
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          {subTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="night-audit" className="flex-1">
          <NightAuditView />
        </TabsContent>

        <TabsContent value="day-close" className="flex-1">
          <DayCloseView />
        </TabsContent>

        <TabsContent value="cashier" className="flex-1">
          <CashierView />
        </TabsContent>

        <TabsContent value="shift-handover" className="flex-1">
          <ShiftHandoverView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
