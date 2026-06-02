'use client'

import React from 'react'
import { useNavigationStore } from '@/lib/store'
import { RoomBoard } from './RoomBoard'
import { RoomTypesView } from './RoomTypesView'
import { RestrictionsView } from './RestrictionsView'
import { BedDouble, LayoutGrid, Tags, ShieldAlert } from 'lucide-react'

const SUB_TABS = [
  { id: 'room-board', label: 'Room Board', icon: LayoutGrid },
  { id: 'room-types', label: 'Room Types', icon: Tags },
  { id: 'restrictions', label: 'Restrictions', icon: ShieldAlert },
] as const

export default function RoomManagementModule() {
  const { activeSubModule, setActiveSubModule } = useNavigationStore()

  // Determine which sub-view to show
  const activeView = activeSubModule && SUB_TABS.some(t => t.id === activeSubModule)
    ? activeSubModule
    : 'room-board'

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Sub-module header */}
      <div className="flex items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <BedDouble className="size-5 text-teal-600" />
          <span className="text-sm font-medium">Room Management</span>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeView === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubModule(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sub-module content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'room-board' && <RoomBoard />}
        {activeView === 'room-types' && <RoomTypesView />}
        {activeView === 'restrictions' && <RestrictionsView />}
      </div>
    </div>
  )
}
