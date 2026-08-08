'use client'

import React, { Suspense, useState, useEffect, ComponentType } from 'react'
import { LayoutDashboard, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavigationStore } from '@/lib/store'
import { NAV_ITEMS } from '@/lib/navigation'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/sidebar-nav'
import { AppHeader } from '@/components/layout/header'

// ─── Module import map — each module is loaded ON DEMAND when selected ──
type ModuleImportFn = () => Promise<{ default: ComponentType<any> }>

const MODULE_IMPORTS: Record<string, ModuleImportFn> = {
  'dashboard': () => import('@/components/modules/dashboard/DashboardModule').then(m => ({ default: m.DashboardModule })),
  'front-desk': () => import('@/components/modules/front-desk/FrontDeskModule').then(m => ({ default: m.FrontDeskModule })),
  'settings': () => import('@/components/modules/settings/SettingsModule').then(m => ({ default: m.SettingsModule })),
  'profile': () => import('@/components/modules/profile/ProfileModule').then(m => ({ default: m.ProfileModule })),
  'housekeeping': () => import('@/components/modules/housekeeping/HousekeepingModule').then(m => ({ default: m.HousekeepingModule })),
  'crm': () => import('@/components/modules/crm/CrmModule').then(m => ({ default: m.CrmModule })),
  'help': () => import('@/components/modules/help/HelpModule').then(m => ({ default: m.HelpModule })),
  'hr': () => import('@/components/modules/hr/HrModule'),
  'rooms': () => import('@/components/modules/rooms/RoomManagementModule'),
  'pos': () => import('@/components/modules/pos/PosModule'),
  'operations': () => import('@/components/modules/operations/OperationsModule'),
  'events': () => import('@/components/modules/events/EventsModule'),
  'accounting': () => import('@/components/modules/accounting/AccountingModule'),
  'inventory': () => import('@/components/modules/inventory/InventoryModule'),
  'maintenance': () => import('@/components/modules/maintenance/MaintenanceModule'),
  'revenue': () => import('@/components/modules/revenue/RevenueModule'),
  'channel-manager': () => import('@/components/modules/channel-manager/ChannelManagerModule'),
}

// Module cache to avoid re-importing
const moduleCache = new Map<string, ComponentType<any>>()

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

// ─── Dynamic Module Loader — loads modules on demand ──
function DynamicModule({ moduleId }: { moduleId: string }) {
  const [modState, setModState] = useState<{ status: 'loading' | 'loaded'; component: ComponentType<any> | null }>(() => {
    const cached = moduleCache.get(moduleId)
    return cached ? { status: 'loaded', component: cached } : { status: 'loading', component: null }
  })

  useEffect(() => {
    if (modState.status === 'loaded') return

    const importFn = MODULE_IMPORTS[moduleId]
    if (!importFn) return

    let cancelled = false
    importFn().then(mod => {
      if (cancelled) return
      const Component = mod.default
      moduleCache.set(moduleId, Component)
      setModState({ status: 'loaded', component: Component })
    }).catch((err) => {
      if (cancelled) return
      console.error(`[module] Failed to load module: ${moduleId}`, err)
      setModState({ status: 'loaded', component: null })
    })

    return () => { cancelled = true }
  }, [moduleId, modState.status])

  if (modState.status === 'loaded' && !modState.component) {
    return <ModulePlaceholder moduleId={moduleId} subModuleId={null} />
  }

  if (!modState.component) return <ModuleLoader />

  return <modState.component />
}

// ─── Main Content Router ──
function MainContent() {
  const { activeModule, activeSubModule } = useNavigationStore()

  if (MODULE_IMPORTS[activeModule]) {
    return <DynamicModule key={activeModule} moduleId={activeModule} />
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
