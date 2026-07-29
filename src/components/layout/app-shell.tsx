'use client'

import {
  LayoutDashboard,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useNavigationStore } from '@/lib/store'
import { NAV_ITEMS } from '@/lib/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/sidebar-nav'
import { AppHeader } from '@/components/layout/header'

// ─── Core modules: direct imports (always fast, no loading spinner) ──
import { DashboardModule } from '@/components/modules/dashboard/DashboardModule'
import { FrontDeskModule } from '@/components/modules/front-desk/FrontDeskModule'
import { SettingsModule } from '@/components/modules/settings/SettingsModule'
import { ProfileModule } from '@/components/modules/profile/ProfileModule'
import { HousekeepingModule } from '@/components/modules/housekeeping/HousekeepingModule'
import { CrmModule } from '@/components/modules/crm/CrmModule'
import { HelpModule } from '@/components/modules/help/HelpModule'
import HrModule from '@/components/modules/hr/HrModule'
import RoomManagementModule from '@/components/modules/rooms/RoomManagementModule'
import PosModule from '@/components/modules/pos/PosModule'
import OperationsModule from '@/components/modules/operations/OperationsModule'
import EventsModule from '@/components/modules/events/EventsModule'
import AccountingModule from '@/components/modules/accounting/AccountingModule'
import InventoryModule from '@/components/modules/inventory/InventoryModule'
import MaintenanceModule from '@/components/modules/maintenance/MaintenanceModule'
import RevenueModule from '@/components/modules/revenue/RevenueModule'
import ChannelManagerModule from '@/components/modules/channel-manager/ChannelManagerModule'

// ─── Placeholder Content for Modules ─────────────────────────────────
function ModulePlaceholder({ moduleId, subModuleId }: { moduleId: string; subModuleId: string | null }) {
  const navItem = NAV_ITEMS.find((item) => item.id === moduleId)
  const subItem = navItem?.children?.find((c) => c.id === subModuleId ?? '')
  const label = subItem ? subItem.label : navItem?.label ?? moduleId
  const Icon = navItem?.icon ?? LayoutDashboard
  const color = navItem?.color ?? 'text-emerald-600'

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className={cn(
          'flex size-16 items-center justify-center rounded-2xl bg-muted/50',
          color.replace('text-', 'text-').replace('600', '100')
        )}>
          <Icon className={cn('size-8', color)} />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {subItem ? `${navItem?.label} > ${subItem.label}` : `${navItem?.label} module`}
          </p>
        </div>
        <p className="max-w-md text-sm text-muted-foreground">
          This module is ready to be implemented. Navigate using the sidebar to explore different sections of the hotel management system.
        </p>
      </div>
    </div>
  )
}

// ─── Main Content Router ─────────────────────────────────────────────
function MainContent() {
  const { activeModule, activeSubModule } = useNavigationStore()

  if (activeModule === 'dashboard') return <DashboardModule />
  if (activeModule === 'front-desk') return <FrontDeskModule />
  if (activeModule === 'settings') return <SettingsModule />
  if (activeModule === 'profile') return <ProfileModule />
  if (activeModule === 'housekeeping') return <HousekeepingModule />
  if (activeModule === 'crm') return <CrmModule />
  if (activeModule === 'help') return <HelpModule />
  if (activeModule === 'hr') return <HrModule />

  if (activeModule === 'rooms') return <RoomManagementModule />
  if (activeModule === 'pos') return <PosModule />
  if (activeModule === 'operations') return <OperationsModule />
  if (activeModule === 'events') return <EventsModule />
  if (activeModule === 'accounting') return <AccountingModule />
  if (activeModule === 'inventory') return <InventoryModule />
  if (activeModule === 'maintenance') return <MaintenanceModule />
  if (activeModule === 'revenue') return <RevenueModule />
  if (activeModule === 'channel-manager') return <ChannelManagerModule />
  return <ModulePlaceholder moduleId={activeModule} subModuleId={activeSubModule} />
}

// ─── AppShell ───────────────────────────────────────────────────────
export function AppShell() {
  return (
    <SidebarProvider className="h-svh max-h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="min-h-0">
        <AppHeader />
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
          <MainContent />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
