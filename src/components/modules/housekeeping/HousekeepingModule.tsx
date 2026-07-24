'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ClipboardCheck, ShieldCheck, PackageOpen, GitBranch } from 'lucide-react'
import { TaskBoardView } from './TaskBoardView'
import { WorkflowView } from './WorkflowView'
import { InspectionView } from './InspectionView'
import { LostFoundView } from './LostFoundView'
import { useNavigationStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const HOUSEKEEPING_TABS = [
  { id: 'tasks', label: 'Task Board', icon: ClipboardCheck },
  { id: 'workflow', label: 'Work Flow', icon: GitBranch },
  { id: 'inspection', label: 'Inspections', icon: ShieldCheck },
  { id: 'lost-found', label: 'Lost & Found', icon: PackageOpen },
]

export function HousekeepingModule() {
  const { activeSubModule, navigateTo } = useNavigationStore()
  const activeTab = activeSubModule === 'workflow' ? 'workflow'
    : activeSubModule === 'inspection' ? 'inspection'
    : activeSubModule === 'lost-found' ? 'lost-found'
    : 'tasks'

  return (
    <div className="flex flex-1 flex-col gap-2 p-3 sm:p-6 overflow-y-auto">
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
        <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-grid h-9 sm:h-10">
          {HOUSEKEEPING_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 sm:gap-2">
              <tab.icon className="h-4 w-4 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline text-xs">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="tasks" forceMount className={cn("mt-2", activeTab !== 'tasks' && 'hidden')}>
          <TaskBoardView />
        </TabsContent>
        <TabsContent value="workflow" forceMount className={cn("mt-2", activeTab !== 'workflow' && 'hidden')}>
          <WorkflowView />
        </TabsContent>
        <TabsContent value="inspection" forceMount className={cn("mt-2", activeTab !== 'inspection' && 'hidden')}>
          <InspectionView />
        </TabsContent>
        <TabsContent value="lost-found" forceMount className={cn("mt-2", activeTab !== 'lost-found' && 'hidden')}>
          <LostFoundView />
        </TabsContent>
      </Tabs>
    </div>
  )
}