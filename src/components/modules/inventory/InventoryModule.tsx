'use client'

import React from 'react'
import { Package, PackageSearch, Truck, ClipboardList, ArrowUpDown, FileText, LayoutDashboard } from 'lucide-react'
import { useNavigationStore } from '@/lib/store'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StockView } from './StockView'
import { VendorsView } from './VendorsView'
import { RequisitionsView } from './RequisitionsView'
import { StockAdjustmentsView } from './StockAdjustmentsView'
import { PurchaseOrdersView } from './PurchaseOrdersView'
import { InventoryDashboardView } from './InventoryDashboardView'

const SUB_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'stock', label: 'Stock', icon: PackageSearch },
  { id: 'vendors', label: 'Vendors', icon: Truck },
  { id: 'requisitions', label: 'Requisitions', icon: ClipboardList },
  { id: 'adjustments', label: 'Stock Adjustments', icon: ArrowUpDown },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: FileText },
] as const

export default function InventoryModule() {
  const { activeSubModule, navigateTo } = useNavigationStore()
  const currentTab = activeSubModule ?? 'dashboard'

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 overflow-y-auto">
      {/* Module Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-950">
            <Package className="size-5 text-cyan-700 dark:text-cyan-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Inventory Management</h1>
            <p className="text-xs text-muted-foreground">Track stock levels, vendors, requisitions &amp; adjustments</p>
          </div>
        </div>
      </div>

      {/* Sub-module Tabs */}
      <Tabs value={currentTab} onValueChange={(v) => navigateTo('inventory', v)} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          {SUB_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs sm:text-sm">
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Views */}
        <div className="mt-4">
          {currentTab === 'dashboard' && <InventoryDashboardView />}
          {currentTab === 'stock' && <StockView />}
          {currentTab === 'vendors' && <VendorsView />}
          {currentTab === 'requisitions' && <RequisitionsView />}
          {currentTab === 'adjustments' && <StockAdjustmentsView />}
          {currentTab === 'purchase-orders' && <PurchaseOrdersView />}
        </div>
      </Tabs>
    </div>
  )
}
