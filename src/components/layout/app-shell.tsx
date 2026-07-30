'use client'

import React, { Suspense } from 'react'
import { LayoutDashboard, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavigationStore } from '@/lib/store'
import { NAV_ITEMS } from '@/lib/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/sidebar-nav'
import { AppHeader } from '@/components/layout/header'

// ─── Eagerly loaded: Dashboard (default view, first thing users see) ──
import { DashboardModule } from '@/components/modules/dashboard/DashboardModule'

// ─── Lazy loaded: all other modules (loaded on demand) ──
const FrontDeskModule = React.lazy(() => import('@/components/modules/front-desk/FrontDeskModule').then(m => ({ default: m.FrontDeskModule })))
const SettingsModule = React.lazy(() => import('@/components/modules/settings/SettingsModule').then(m => ({ default: m.SettingsModule })))
const ProfileModule = React.lazy(() => import('@/components/modules/profile/ProfileModule').then(m => ({ default: m.ProfileModule })))
const HousekeepingModule = React.lazy(() => import('@/components/modules/housekeeping/HousekeepingModule').then(m => ({ default: m.HousekeepingModule })))
const CrmModule = React.lazy(() => import('@/components/modules/crm/CrmModule').then(m => ({ default: m.CrmModule })))
const HelpModule = React.lazy(() => import('@/components/modules/help/HelpModule').then(m => ({ default: m.HelpModule })))
const HrModule = React.lazy(() => import('@/components/modules/hr/HrModule'))
const RoomManagementModule = React.lazy(() => import('@/components/modules/rooms/RoomManagementModule'))
const PosModule = React.lazy(() => import('@/components/modules/pos/PosModule'))
const OperationsModule = React.lazy(() => import('@/components/modules/operations/OperationsModule'))
const EventsModule = React.lazy(() => import('@/components/modules/events/EventsModule'))
const AccountingModule = React.lazy(() => import('@/components/modules/accounting/AccountingModule'))
const InventoryModule = React.lazy(() => import('@/components/modules/inventory/InventoryModule'))
const MaintenanceModule = React.lazy(() => import('@/components/modules/maintenance/MaintenanceModule'))
const RevenueModule = React.lazy(() => import('@/components/modules/revenue/RevenueModule'))
const ChannelManagerModule = React.lazy(() => import('@/components/modules/channel-manager/ChannelManagerModule'))

// ─── Module Loading Spinner ──
function ModuleLoader() {
  const { activeModule } = useNavigationStore()
  const navItem = NAV_ITEMS.find((item) => item.id === activeModule)
  const label = navItem?.label ?? activeModule
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading {label}…</p>
    </div>
  )
}

// ─── Placeholder Content ──
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

// ─── Main Content Router ──
function MainContent() {
  const { activeModule, activeSubModule } = useNavigationStore()

  // Eagerly loaded
  if (activeModule === 'dashboard') return <DashboardModule />

  // Lazy loaded modules
  const LazyModules: Record<string, React.LazyExoticComponent<any>> = {
    'front-desk': FrontDeskModule,
    'settings': SettingsModule,
    'profile': ProfileModule,
    'housekeeping': HousekeepingModule,
    'crm': CrmModule,
    'help': HelpModule,
    'hr': HrModule,
    'rooms': RoomManagementModule,
    'pos': PosModule,
    'operations': OperationsModule,
    'events': EventsModule,
    'accounting': AccountingModule,
    'inventory': InventoryModule,
    'maintenance': MaintenanceModule,
    'revenue': RevenueModule,
    'channel-manager': ChannelManagerModule,
  }

  const LazyComponent = LazyModules[activeModule]
  if (LazyComponent) {
    return (
      <Suspense fallback={<ModuleLoader />}>
        <LazyComponent />
      </Suspense>
    )
  }

  return <ModulePlaceholder moduleId={activeModule} subModuleId={activeSubModule} />
}

// ─── AppShell ──
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
