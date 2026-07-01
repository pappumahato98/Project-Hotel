'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ClipboardCheck, Search, ShieldCheck, PackageOpen } from 'lucide-react'
import { TaskBoardView } from './TaskBoardView'
import { InspectionView } from './InspectionView'
import { LostFoundView } from './LostFoundView'
import { useNavigationStore } from '@/lib/store'

const HOUSEKEEPING_TABS = [
  { id: 'tasks', label: 'Task Board', icon: ClipboardCheck },
  { id: 'inspection', label: 'Inspections', icon: ShieldCheck },
  { id: 'lost-found', label: 'Lost & Found', icon: PackageOpen },
]

export function HousekeepingModule() {
  const { activeSubModule, navigateTo } = useNavigationStore()
  const activeTab = activeSubModule === 'inspection' ? 'inspection'
    : activeSubModule === 'lost-found' ? 'lost-found'
    : 'tasks'

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Housekeeping</h1>
          <p className="text-xs text-muted-foreground">
            Manage room cleaning tasks, inspections, and lost &amp; found items
          </p>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => navigateTo('housekeeping', v)}
        className="flex-1"
      >
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
          {HOUSEKEEPING_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="tasks" className="mt-2">
          <TaskBoardView />
        </TabsContent>
        <TabsContent value="inspection" className="mt-2">
          <InspectionView />
        </TabsContent>
        <TabsContent value="lost-found" className="mt-2">
          <LostFoundView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
