'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  Loader2,
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

// ─── Secondary modules: lazy-loaded (chunks fetched on first navigation) ──
const RoomManagementModule = React.lazy(() =>
  import('@/components/modules/rooms/RoomManagementModule').then(m => ({ default: m.default }))
)
const PosModule = React.lazy(() =>
  import('@/components/modules/pos/PosModule').then(m => ({ default: m.default }))
)
const OperationsModule = React.lazy(() =>
  import('@/components/modules/operations/OperationsModule').then(m => ({ default: m.default }))
)
const EventsModule = React.lazy(() =>
  import('@/components/modules/events/EventsModule').then(m => ({ default: m.default }))
)
const AccountingModule = React.lazy(() =>
  import('@/components/modules/accounting/AccountingModule').then(m => ({ default: m.default }))
)
const InventoryModule = React.lazy(() =>
  import('@/components/modules/inventory/InventoryModule').then(m => ({ default: m.default }))
)
const MaintenanceModule = React.lazy(() =>
  import('@/components/modules/maintenance/MaintenanceModule').then(m => ({ default: m.default }))
)
const RevenueModule = React.lazy(() =>
  import('@/components/modules/revenue/RevenueModule').then(m => ({ default: m.default }))
)
const ChannelManagerModule = React.lazy(() =>
  import('@/components/modules/channel-manager/ChannelManagerModule').then(m => ({ default: m.default }))
)

// ─── Preload secondary chunks in background after first paint ──
if (typeof window !== 'undefined') {
  const preloader = () => {
    // Use requestIdleCallback for background preloading (non-blocking)
    const chunks = [
      import('@/components/modules/rooms/RoomManagementModule'),
      import('@/components/modules/pos/PosModule'),
      import('@/components/modules/operations/OperationsModule'),
      import('@/components/modules/accounting/AccountingModule'),
      import('@/components/modules/inventory/InventoryModule'),
      import('@/components/modules/events/EventsModule'),
      import('@/components/modules/maintenance/MaintenanceModule'),
      import('@/components/modules/revenue/RevenueModule'),
      import('@/components/modules/channel-manager/ChannelManagerModule'),
    ]
    // Fire and forget — chunks will be cached by browser
    Promise.allSettled(chunks).catch(() => {})
    window.removeEventListener('load', preloader)
  }
  window.addEventListener('load', preloader)
}

// ─── Module Loading Spinner ──────────────────────────────────────────
function ModuleLoader() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm">Loading...</p>
      </div>
    </div>
  )
}

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

  // Core modules — render immediately, no Suspense spinner
  if (activeModule === 'dashboard') return <DashboardModule />
  if (activeModule === 'front-desk') return <FrontDeskModule />
  if (activeModule === 'settings') return <SettingsModule />
  if (activeModule === 'profile') return <ProfileModule />
  if (activeModule === 'housekeeping') return <HousekeepingModule />
  if (activeModule === 'crm') return <CrmModule />
  if (activeModule === 'help') return <HelpModule />
  if (activeModule === 'hr') return <HrModule />

  // Secondary modules — wrapped in Suspense with fallback spinner
  return (
    <React.Suspense fallback={<ModuleLoader />}>
      {activeModule === 'rooms' && <RoomManagementModule />}
      {activeModule === 'pos' && <PosModule />}
      {activeModule === 'operations' && <OperationsModule />}
      {activeModule === 'events' && <EventsModule />}
      {activeModule === 'accounting' && <AccountingModule />}
      {activeModule === 'inventory' && <InventoryModule />}
      {activeModule === 'maintenance' && <MaintenanceModule />}
      {activeModule === 'revenue' && <RevenueModule />}
      {activeModule === 'channel-manager' && <ChannelManagerModule />}
      {![ 'rooms','pos','operations','events','accounting','inventory','maintenance','revenue','channel-manager'].includes(activeModule) && (
        <ModulePlaceholder moduleId={activeModule} subModuleId={activeSubModule} />
      )}
    </React.Suspense>
  )
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
