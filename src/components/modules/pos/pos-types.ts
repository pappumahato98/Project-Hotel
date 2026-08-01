import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface TableItem {
  id: number
  seats: number
  status: 'available' | 'occupied' | 'reserved' | 'needs_cleaning'
  guestCount?: number
  orderId?: string
}

export interface MenuItem {
  id: string
  name: string
  price: number
  category: string
  allergens?: string[]
  available: boolean
}

export interface OrderItem {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  notes?: string
}

export interface Order {
  id: string
  tableId: number
  items: OrderItem[]
  status: string
  createdAt: string
  rush?: boolean
  station?: string
  guestName?: string
  specialInstructions?: string
}

export interface BarStool {
  id: number
  status: 'available' | 'occupied' | 'reserved'
  tabId?: string
  guestName?: string
}

export interface BarTab {
  id: string
  stoolId: number
  guestName: string
  items: OrderItem[]
  total: number
  openedAt: string
  status: 'open' | 'closed'
}

export interface SpaService {
  id: string
  name: string
  duration: number
  price: number
  category: string
}

export interface Therapist {
  id: string
  name: string
  specialties: string[]
  status: 'available' | 'busy' | 'break'
}

export interface SpaAppointment {
  id: string
  serviceId: string
  serviceName: string
  therapistId: string
  therapistName: string
  guestName: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  room: string
}

export interface BizService {
  id: string
  name: string
  category: string
  pricePerUnit: number
  unit: string
  description: string
}

export interface MeetingRoom {
  id: string
  name: string
  capacity: number
  hourlyRate: number
  status: 'available' | 'occupied' | 'maintenance'
}

export interface ActiveRental {
  id: string
  serviceId: string
  serviceName: string
  guestName: string
  roomNumber: string
  startedAt: string
  estimatedEnd: string
  charges: number
}

export interface KitchenTicket {
  id: string
  orderId: string
  tableId: number
  items: { name: string; quantity: number }[]
  station: 'hot_kitchen' | 'cold_kitchen' | 'bar'
  status: 'pending' | 'preparing' | 'ready' | 'served'
  rush: boolean
  specialInstructions?: string
  createdAt: string
  completedAt?: string
}

export interface PosStats {
  openTables: number
  totalCovers: number
  revenueToday: number
  openOrders: number
  completedOrders: number
}

export interface GuestReservation {
  id: string
  guestName: string
  roomNumber: string
}

export interface PosData {
  tables?: TableItem[]
  menuItems?: MenuItem[]
  orders?: Order[]
  guestReservations?: GuestReservation[]
  barStools?: BarStool[]
  barTabs?: BarTab[]
  barMenuItems?: MenuItem[]
  spaServices?: SpaService[]
  therapists?: Therapist[]
  appointments?: SpaAppointment[]
  bizServices?: BizService[]
  meetingRooms?: MeetingRoom[]
  activeRentals?: ActiveRental[]
  kitchenTickets?: KitchenTicket[]
  stats: PosStats
}

// ─── NPR Currency Formatter ──────────────────────────────────────────
export function formatNPR(amount: number): string {
  return `NPR ${amount.toLocaleString('en-NP')}`
}

// ─── Time ago helper ─────────────────────────────────────────────────
export function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

// ─── TanStack Query Hook ─────────────────────────────────────────────
export function usePosData(section: string = 'all') {
  return useQuery<PosData>({
    queryKey: ['pos', section],
    queryFn: () => apiFetch(`/api/pos?section=${section}`),
    refetchInterval: 60000, // Auto refresh every 60 seconds
  })
}
