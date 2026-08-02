import {
  LayoutDashboard, CalendarDays, BedDouble, Clock, UtensilsCrossed,
  ClipboardCheck, Users, UserCog, PartyPopper, Calculator, Package,
  Wrench, TrendingUp, Globe, LifeBuoy, BarChart3, Settings, UserCircle,
} from 'lucide-react'

export interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string // tailwind color class
  badge?: number
  children?: NavChild[]
}

export interface NavChild {
  id: string
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    color: 'text-emerald-600',
  },
  {
    id: 'front-desk',
    label: 'Front Desk',
    icon: CalendarDays,
    color: 'text-blue-600',
    children: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'new-reservation', label: 'New Reservation' },
      { id: 'reservations', label: 'Reservations' },
      { id: 'check-in', label: 'Check-In' },
      { id: 'arrivals', label: 'Arrivals' },
      { id: 'in-house', label: 'In-House Guests' },
      { id: 'departures', label: 'Departures' },
      { id: 'folio', label: 'Guest Folio' },
      { id: 'calendar', label: 'Calendar' },
      { id: 'reports', label: 'Reports' },
    ],
  },
  {
    id: 'rooms',
    label: 'Room Management',
    icon: BedDouble,
    color: 'text-teal-600',
    children: [
      { id: 'room-board', label: 'Room Board' },
      { id: 'room-types', label: 'Room Types' },
      { id: 'restrictions', label: 'Restrictions' },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Clock,
    color: 'text-amber-600',
    children: [
      { id: 'night-audit', label: 'Night Audit' },
      { id: 'day-close', label: 'Day Close' },
      { id: 'cashier', label: 'Cashier Shifts' },
      { id: 'shift-handover', label: 'Shift Handover' },
    ],
  },
  {
    id: 'pos',
    label: 'Point of Sale',
    icon: UtensilsCrossed,
    color: 'text-orange-600',
    children: [
      { id: 'restaurant', label: 'Restaurant' },
      { id: 'bar', label: 'Bar & Lounge' },
      { id: 'spa', label: 'Spa' },
      { id: 'business-center', label: 'Business Center' },
      { id: 'kitchen-display', label: 'Kitchen Display' },
      { id: 'order-history', label: 'Order History' },
    ],
  },
  {
    id: 'housekeeping',
    label: 'Housekeeping',
    icon: ClipboardCheck,
    color: 'text-green-600',
    children: [
      { id: 'tasks', label: 'Task Board' },
      { id: 'workflow', label: 'Work Flow' },
      { id: 'inspection', label: 'Inspections' },
      { id: 'lost-found', label: 'Lost & Found' },
    ],
  },
  {
    id: 'crm',
    label: 'Guest CRM',
    icon: Users,
    color: 'text-rose-600',
    children: [
      { id: 'profiles', label: 'Guest Profiles' },
      { id: 'loyalty', label: 'Loyalty Program' },
      { id: 'campaigns', label: 'Campaigns' },
    ],
  },
  {
    id: 'hr',
    label: 'HR & Payroll',
    icon: UserCog,
    color: 'text-pink-600',
    children: [
      { id: 'employees', label: 'Staff Directory' },
      { id: 'departments', label: 'Departments' },
      { id: 'attendance', label: 'Attendance' },
      { id: 'payroll', label: 'Payroll' },
      { id: 'schedules', label: 'Schedules' },
      { id: 'performance', label: 'Performance' },
      { id: 'leave', label: 'Leave Management' },
      { id: 'training', label: 'Training' },
      { id: 'shift-exchange', label: 'Shift Exchange' },
      { id: 'recruitment', label: 'Recruitment' },
    ],
  },
  {
    id: 'events',
    label: 'Events & Banquet',
    icon: PartyPopper,
    color: 'text-orange-500',
    children: [
      { id: 'events', label: 'Events' },
      { id: 'banquet-orders', label: 'BEO / Orders' },
    ],
  },
  {
    id: 'accounting',
    label: 'Accounting',
    icon: Calculator,
    color: 'text-purple-600',
    children: [
      { id: 'ledger', label: 'General Ledger' },
      { id: 'journal', label: 'Journal Entries' },
      { id: 'reports', label: 'Financial Reports' },
      { id: 'budget', label: 'Budget Management' },
      { id: 'invoices', label: 'Invoices' },
      { id: 'trial-balance', label: 'Trial Balance' },
      { id: 'cash-flow', label: 'Cash Flow' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    color: 'text-cyan-700',
    children: [
      { id: 'stock', label: 'Stock Levels' },
      { id: 'vendors', label: 'Vendors' },
      { id: 'requisitions', label: 'Requisitions' },
      { id: 'adjustments', label: 'Stock Adjustments' },
      { id: 'purchase-orders', label: 'Purchase Orders' },
    ],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    color: 'text-orange-700',
    children: [
      { id: 'work-orders', label: 'Work Orders' },
      { id: 'assets', label: 'Asset Register' },
    ],
  },
  {
    id: 'revenue',
    label: 'Revenue Mgmt',
    icon: TrendingUp,
    color: 'text-emerald-700',
    children: [
      { id: 'demand-calendar', label: 'Demand Calendar' },
      { id: 'pricing', label: 'Pricing Rules' },
      { id: 'rate-intelligence', label: 'Rate Intelligence' },
    ],
  },
  {
    id: 'channel-manager',
    label: 'Channel Manager',
    icon: Globe,
    color: 'text-sky-600',
    children: [
      { id: 'channels', label: 'Channels' },
      { id: 'bookings', label: 'Bookings' },
    ],
  },
  {
    id: 'help',
    label: 'Help & Support',
    icon: LifeBuoy,
    color: 'text-violet-600',
    children: [
      { id: 'getting-started', label: 'Getting Started' },
      { id: 'shortcuts', label: 'Keyboard Shortcuts' },
      { id: 'manual', label: 'User Manual' },
      { id: 'faq', label: 'FAQ' },
      { id: 'contact', label: 'Contact Support' },
    ],
  },
  {
    id: 'profile',
    label: 'My Profile',
    icon: UserCircle,
    color: 'text-violet-600',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    color: 'text-slate-600',
  },
]

// ─── Extra Sub-Module Labels ─────────────────────────────────
// Internal sub-modules that exist in the app but aren't in the sidebar NAV_ITEMS children
export const EXTRA_SUB_MODULE_LABELS: Record<string, Record<string, string>> = {
  'front-desk': {
    'check-in-process': 'Check-In Process',
    'guest-ledger': 'Guest Ledger',
    'rate-posting': 'Rate Posting',
    settlement: 'Settlement',
  },
}

/**
 * Resolve the display label for a sub-module within a given module.
 * Checks NAV_ITEMS children first, then falls back to EXTRA_SUB_MODULE_LABELS.
 */
export function getSubModuleLabel(moduleId: string, subModuleId: string): string | null {
  const navItem = NAV_ITEMS.find(n => n.id === moduleId)
  const fromNav = navItem?.children?.find(c => c.id === subModuleId)
  if (fromNav) return fromNav.label
  const fromExtra = EXTRA_SUB_MODULE_LABELS[moduleId]?.[subModuleId]
  return fromExtra ?? null
}

/**
 * Get the default sub-module for a given module (first child or null).
 */
export function getDefaultSubModule(moduleId: string): string | null {
  const navItem = NAV_ITEMS.find(n => n.id === moduleId)
  return navItem?.children?.[0]?.id ?? null
}
