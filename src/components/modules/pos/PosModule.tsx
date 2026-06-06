'use client'

import React from 'react'
import { UtensilsCrossed, Wine, Flower2, Monitor, ChefHat, ClipboardList, BellRing, CalendarCheck, TrendingUp } from 'lucide-react'
import { useNavigationStore } from '@/lib/store'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import RestaurantView from './RestaurantView'
import BarView from './BarView'
import SpaView from './SpaView'
import BusinessCenterView from './BusinessCenterView'
import KitchenDisplayView from './KitchenDisplayView'
import OrderHistoryView from './OrderHistoryView'
import RoomServiceView from './RoomServiceView'
import TableReservationsView from './TableReservationsView'
import DailySalesReportView from './DailySalesReportView'

const SUB_TABS = [
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
  { id: 'bar', label: 'Bar & Lounge', icon: Wine },
  { id: 'spa', label: 'Spa', icon: Flower2 },
  { id: 'business-center', label: 'Business Center', icon: Monitor },
  { id: 'kitchen-display', label: 'Kitchen Display', icon: ChefHat },
  { id: 'order-history', label: 'Order History', icon: ClipboardList },
  { id: 'room-service', label: 'Room Service', icon: BellRing },
  { id: 'table-reservations', label: 'Reservations', icon: CalendarCheck },
  { id: 'daily-sales', label: 'Sales Report', icon: TrendingUp },
] as const

export default function PosModule() {
  const { activeSubModule, navigateTo } = useNavigationStore()
  const currentTab = activeSubModule ?? 'restaurant'

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6 overflow-y-auto">
      {/* Module Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Point of Sale</h1>
          <p className="text-sm text-muted-foreground">
            Manage restaurant, bar, spa, and business center transactions
          </p>
        </div>
      </div>

      {/* Sub-module Tabs */}
      <Tabs value={currentTab} onValueChange={(v) => navigateTo('pos', v)} className="w-full">
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
          {currentTab === 'restaurant' && <RestaurantView />}
          {currentTab === 'bar' && <BarView />}
          {currentTab === 'spa' && <SpaView />}
          {currentTab === 'business-center' && <BusinessCenterView />}
          {currentTab === 'kitchen-display' && <KitchenDisplayView />}
          {currentTab === 'order-history' && <OrderHistoryView />}
          {currentTab === 'room-service' && <RoomServiceView />}
          {currentTab === 'table-reservations' && <TableReservationsView />}
          {currentTab === 'daily-sales' && <DailySalesReportView />}
        </div>
      </Tabs>
    </div>
  )
}
