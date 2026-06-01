import { NextResponse } from 'next/server'

// ─── Types ───────────────────────────────────────────────────────────
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
  category: 'appetizer' | 'main_course' | 'beverage' | 'dessert' | 'beer' | 'cocktail' | 'wine' | 'snack'
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
  status: 'open' | 'in_progress' | 'ready' | 'served' | 'closed'
  createdAt: string
  rush?: boolean
  station?: 'hot_kitchen' | 'cold_kitchen' | 'bar'
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
  duration: number // minutes
  price: number
  category: 'massage' | 'facial' | 'body_treatment' | 'wellness'
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
  category: 'workstation' | 'meeting_room' | 'printing' | 'calls' | 'courier'
  pricePerUnit: number
  unit: 'hour' | 'session' | 'page' | 'minute' | 'delivery'
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

// ─── Mock Data ──────────────────────────────────────────────────────
const TABLES: TableItem[] = [
  { id: 1, seats: 2, status: 'available' },
  { id: 2, seats: 4, status: 'occupied', guestCount: 3, orderId: 'ORD-001' },
  { id: 3, seats: 4, status: 'reserved' },
  { id: 4, seats: 6, status: 'available' },
  { id: 5, seats: 2, status: 'needs_cleaning' },
  { id: 6, seats: 8, status: 'occupied', guestCount: 6, orderId: 'ORD-002' },
  { id: 7, seats: 4, status: 'available' },
  { id: 8, seats: 2, status: 'occupied', guestCount: 2, orderId: 'ORD-003' },
  { id: 9, seats: 6, status: 'reserved' },
  { id: 10, seats: 4, status: 'available' },
  { id: 11, seats: 2, status: 'needs_cleaning' },
  { id: 12, seats: 4, status: 'occupied', guestCount: 4, orderId: 'ORD-004' },
  { id: 13, seats: 8, status: 'available' },
  { id: 14, seats: 6, status: 'available' },
  { id: 15, seats: 4, status: 'reserved' },
]

const MENU_ITEMS: MenuItem[] = [
  { id: 'm1', name: 'Momo Platter', price: 580, category: 'appetizer', allergens: ['gluten'], available: true },
  { id: 'm2', name: 'Samosa (3 pcs)', price: 280, category: 'appetizer', allergens: ['gluten'], available: true },
  { id: 'm3', name: 'Spring Rolls', price: 320, category: 'appetizer', allergens: ['gluten'], available: true },
  { id: 'm4', name: 'Tomato Soup', price: 250, category: 'appetizer', available: true },
  { id: 'm5', name: 'Chicken Curry', price: 850, category: 'main_course', allergens: ['dairy'], available: true },
  { id: 'm6', name: 'Mutton Biryani', price: 950, category: 'main_course', allergens: ['nuts'], available: true },
  { id: 'm7', name: 'Grilled Trout', price: 1200, category: 'main_course', allergens: ['fish'], available: true },
  { id: 'm8', name: 'Dal Tarka', price: 450, category: 'main_course', available: true },
  { id: 'm9', name: 'Paneer Tikka Masala', price: 650, category: 'main_course', allergens: ['dairy'], available: true },
  { id: 'm10', name: 'Vegetable Fried Rice', price: 400, category: 'main_course', available: true },
  { id: 'm11', name: 'Garlic Naan', price: 150, category: 'main_course', allergens: ['gluten'], available: true },
  { id: 'm12', name: 'Tandoori Chicken', price: 1100, category: 'main_course', available: true },
  { id: 'm13', name: 'Masala Chai', price: 180, category: 'beverage', available: true },
  { id: 'm14', name: 'Fresh Lime Soda', price: 220, category: 'beverage', available: true },
  { id: 'm15', name: 'Mango Lassi', price: 280, category: 'beverage', allergens: ['dairy'], available: true },
  { id: 'm16', name: 'Nepali Coffee', price: 250, category: 'beverage', available: true },
  { id: 'm17', name: 'Gulab Jamun', price: 350, category: 'dessert', allergens: ['gluten', 'dairy'], available: true },
  { id: 'm18', name: 'Rice Pudding', price: 300, category: 'dessert', allergens: ['dairy'], available: true },
  { id: 'm19', name: 'Barfi Assortment', price: 400, category: 'dessert', allergens: ['dairy', 'nuts'], available: true },
  // Bar items
  { id: 'b1', name: 'Tuborg Lager', price: 450, category: 'beer', available: true },
  { id: 'b2', name: 'Gorkha Beer', price: 500, category: 'beer', available: true },
  { id: 'b3', name: 'Everest Strong', price: 380, category: 'beer', available: true },
  { id: 'b4', name: 'Mojito', price: 650, category: 'cocktail', available: true },
  { id: 'b5', name: 'Margarita', price: 700, category: 'cocktail', available: true },
  { id: 'b6', name: 'Old Fashioned', price: 750, category: 'cocktail', available: true },
  { id: 'b7', name: 'Gin & Tonic', price: 600, category: 'cocktail', available: true },
  { id: 'b8', name: 'Nepali Wine (Glass)', price: 550, category: 'wine', available: true },
  { id: 'b9', name: 'Chardonnay (Glass)', price: 650, category: 'wine', available: true },
  { id: 'b10', name: 'Cabernet Sauvignon (Glass)', price: 700, category: 'wine', available: true },
  { id: 'b11', name: 'Mixed Nuts', price: 350, category: 'snack', allergens: ['nuts'], available: true },
  { id: 'b12', name: 'Olives & Cheese Board', price: 550, category: 'snack', allergens: ['dairy'], available: true },
]

const ORDERS: Order[] = [
  {
    id: 'ORD-001',
    tableId: 2,
    items: [
      { id: 'oi1', menuItemId: 'm1', name: 'Momo Platter', price: 580, quantity: 1 },
      { id: 'oi2', menuItemId: 'm5', name: 'Chicken Curry', price: 850, quantity: 2 },
      { id: 'oi3', menuItemId: 'm13', name: 'Masala Chai', price: 180, quantity: 3 },
      { id: 'oi4', menuItemId: 'm11', name: 'Garlic Naan', price: 150, quantity: 3 },
    ],
    status: 'in_progress',
    createdAt: new Date(Date.now() - 22 * 60000).toISOString(),
    station: 'hot_kitchen',
    guestName: 'Sharma Party',
  },
  {
    id: 'ORD-002',
    tableId: 6,
    items: [
      { id: 'oi5', menuItemId: 'm6', name: 'Mutton Biryani', price: 950, quantity: 2 },
      { id: 'oi6', menuItemId: 'm7', name: 'Grilled Trout', price: 1200, quantity: 1 },
      { id: 'oi7', menuItemId: 'm15', name: 'Mango Lassi', price: 280, quantity: 4 },
      { id: 'oi8', menuItemId: 'm3', name: 'Spring Rolls', price: 320, quantity: 1 },
    ],
    status: 'open',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
    station: 'hot_kitchen',
    rush: true,
    guestName: 'Gupta Family',
    specialInstructions: 'No onions in biryani',
  },
  {
    id: 'ORD-003',
    tableId: 8,
    items: [
      { id: 'oi9', menuItemId: 'm4', name: 'Tomato Soup', price: 250, quantity: 2 },
      { id: 'oi10', menuItemId: 'm9', name: 'Paneer Tikka Masala', price: 650, quantity: 1 },
      { id: 'oi11', menuItemId: 'm16', name: 'Nepali Coffee', price: 250, quantity: 2 },
    ],
    status: 'ready',
    createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
    station: 'cold_kitchen',
    guestName: 'Table 8',
  },
  {
    id: 'ORD-004',
    tableId: 12,
    items: [
      { id: 'oi12', menuItemId: 'm12', name: 'Tandoori Chicken', price: 1100, quantity: 1 },
      { id: 'oi13', menuItemId: 'm8', name: 'Dal Tarka', price: 450, quantity: 2 },
      { id: 'oi14', menuItemId: 'm10', name: 'Vegetable Fried Rice', price: 400, quantity: 2 },
      { id: 'oi15', menuItemId: 'm14', name: 'Fresh Lime Soda', price: 220, quantity: 4 },
    ],
    status: 'in_progress',
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
    station: 'hot_kitchen',
    guestName: 'Thapa Group',
  },
]

const BAR_STOOLS: BarStool[] = [
  { id: 1, status: 'occupied', tabId: 'TAB-001', guestName: 'Mr. Anderson' },
  { id: 2, status: 'occupied', tabId: 'TAB-002', guestName: 'Ms. Sherpa' },
  { id: 3, status: 'available' },
  { id: 4, status: 'available' },
  { id: 5, status: 'reserved' },
  { id: 6, status: 'occupied', tabId: 'TAB-003', guestName: 'Dr. Patel' },
  { id: 7, status: 'available' },
  { id: 8, status: 'occupied', tabId: 'TAB-004', guestName: 'Col. Rai' },
  { id: 9, status: 'available' },
  { id: 10, status: 'available' },
]

const BAR_TABS: BarTab[] = [
  {
    id: 'TAB-001',
    stoolId: 1,
    guestName: 'Mr. Anderson',
    items: [
      { id: 'bi1', menuItemId: 'b4', name: 'Mojito', price: 650, quantity: 2 },
      { id: 'bi2', menuItemId: 'b11', name: 'Mixed Nuts', price: 350, quantity: 1 },
    ],
    total: 1650,
    openedAt: new Date(Date.now() - 45 * 60000).toISOString(),
    status: 'open',
  },
  {
    id: 'TAB-002',
    stoolId: 2,
    guestName: 'Ms. Sherpa',
    items: [
      { id: 'bi3', menuItemId: 'b8', name: 'Nepali Wine (Glass)', price: 550, quantity: 3 },
      { id: 'bi4', menuItemId: 'b12', name: 'Olives & Cheese Board', price: 550, quantity: 1 },
    ],
    total: 2200,
    openedAt: new Date(Date.now() - 60 * 60000).toISOString(),
    status: 'open',
  },
  {
    id: 'TAB-003',
    stoolId: 6,
    guestName: 'Dr. Patel',
    items: [
      { id: 'bi5', menuItemId: 'b6', name: 'Old Fashioned', price: 750, quantity: 1 },
      { id: 'bi6', menuItemId: 'b2', name: 'Gorkha Beer', price: 500, quantity: 2 },
    ],
    total: 1750,
    openedAt: new Date(Date.now() - 25 * 60000).toISOString(),
    status: 'open',
  },
  {
    id: 'TAB-004',
    stoolId: 8,
    guestName: 'Col. Rai',
    items: [
      { id: 'bi7', menuItemId: 'b1', name: 'Tuborg Lager', price: 450, quantity: 4 },
      { id: 'bi8', menuItemId: 'b7', name: 'Gin & Tonic', price: 600, quantity: 2 },
    ],
    total: 3000,
    openedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    status: 'open',
  },
]

const SPA_SERVICES: SpaService[] = [
  { id: 's1', name: 'Swedish Massage', duration: 60, price: 4500, category: 'massage' },
  { id: 's2', name: 'Deep Tissue Massage', duration: 60, price: 5500, category: 'massage' },
  { id: 's3', name: 'Hot Stone Therapy', duration: 90, price: 7000, category: 'massage' },
  { id: 's4', name: 'Aromatherapy Massage', duration: 60, price: 5000, category: 'massage' },
  { id: 's5', name: 'Herbal Facial', duration: 45, price: 3500, category: 'facial' },
  { id: 's6', name: 'Gold Facial', duration: 60, price: 6000, category: 'facial' },
  { id: 's7', name: 'Body Scrub', duration: 45, price: 3000, category: 'body_treatment' },
  { id: 's8', name: 'Body Wrap', duration: 60, price: 4500, category: 'body_treatment' },
  { id: 's9', name: 'Yoga Session', duration: 60, price: 2000, category: 'wellness' },
  { id: 's10', name: 'Meditation Session', duration: 30, price: 1500, category: 'wellness' },
]

const THERAPISTS: Therapist[] = [
  { id: 't1', name: 'Anita Gurung', specialties: ['massage', 'body_treatment'], status: 'available' },
  { id: 't2', name: 'Priya Sharma', specialties: ['facial', 'wellness'], status: 'busy' },
  { id: 't3', name: 'Dawa Tenzin', specialties: ['massage'], status: 'available' },
  { id: 't4', name: 'Sunita Rai', specialties: ['facial', 'body_treatment'], status: 'break' },
  { id: 't5', name: 'Bikash Thapa', specialties: ['massage', 'wellness'], status: 'busy' },
]

const SPA_APPOINTMENTS: SpaAppointment[] = [
  {
    id: 'APT-001', serviceId: 's1', serviceName: 'Swedish Massage',
    therapistId: 't2', therapistName: 'Priya Sharma',
    guestName: 'Mrs. Johnson', startTime: '2025-07-10T09:00:00',
    endTime: '2025-07-10T10:00:00', status: 'in_progress', room: 'Spa Room 1',
  },
  {
    id: 'APT-002', serviceId: 's2', serviceName: 'Deep Tissue Massage',
    therapistId: 't5', therapistName: 'Bikash Thapa',
    guestName: 'Mr. Williams', startTime: '2025-07-10T09:30:00',
    endTime: '2025-07-10T10:30:00', status: 'in_progress', room: 'Spa Room 2',
  },
  {
    id: 'APT-003', serviceId: 's5', serviceName: 'Herbal Facial',
    therapistId: 't1', therapistName: 'Anita Gurung',
    guestName: 'Ms. Gurung', startTime: '2025-07-10T10:30:00',
    endTime: '2025-07-10T11:15:00', status: 'scheduled', room: 'Spa Room 3',
  },
  {
    id: 'APT-004', serviceId: 's9', serviceName: 'Yoga Session',
    therapistId: 't3', therapistName: 'Dawa Tenzin',
    guestName: 'Mr. Baker', startTime: '2025-07-10T11:00:00',
    endTime: '2025-07-10T12:00:00', status: 'scheduled', room: 'Wellness Studio',
  },
  {
    id: 'APT-005', serviceId: 's3', serviceName: 'Hot Stone Therapy',
    therapistId: 't1', therapistName: 'Anita Gurung',
    guestName: 'Mrs. Chen', startTime: '2025-07-10T14:00:00',
    endTime: '2025-07-10T15:30:00', status: 'scheduled', room: 'Spa Room 1',
  },
  {
    id: 'APT-006', serviceId: 's6', serviceName: 'Gold Facial',
    therapistId: 't4', therapistName: 'Sunita Rai',
    guestName: 'Ms. Tamang', startTime: '2025-07-10T15:00:00',
    endTime: '2025-07-10T16:00:00', status: 'scheduled', room: 'Spa Room 3',
  },
]

const BIZ_SERVICES: BizService[] = [
  { id: 'ws1', name: 'Workstation (Basic)', category: 'workstation', pricePerUnit: 200, unit: 'hour', description: 'Desktop with internet access' },
  { id: 'ws2', name: 'Workstation (Premium)', category: 'workstation', pricePerUnit: 400, unit: 'hour', description: 'Laptop, printer, scanner access' },
  { id: 'mr1', name: 'Meeting Room A', category: 'meeting_room', pricePerUnit: 3000, unit: 'hour', description: 'Seats 8, projector, whiteboard' },
  { id: 'mr2', name: 'Meeting Room B', category: 'meeting_room', pricePerUnit: 5000, unit: 'hour', description: 'Seats 16, AV system, video conferencing' },
  { id: 'mr3', name: 'Board Room', category: 'meeting_room', pricePerUnit: 8000, unit: 'hour', description: 'Seats 24, full AV suite, catering available' },
  { id: 'p1', name: 'B&W Print', category: 'printing', pricePerUnit: 10, unit: 'page', description: 'A4 black & white' },
  { id: 'p2', name: 'Color Print', category: 'printing', pricePerUnit: 50, unit: 'page', description: 'A4 color' },
  { id: 'p3', name: 'A3 Print', category: 'printing', pricePerUnit: 80, unit: 'page', description: 'A3 color' },
  { id: 'c1', name: 'Local Call', category: 'calls', pricePerUnit: 5, unit: 'minute', description: 'Local landline calls' },
  { id: 'c2', name: 'International Call', category: 'calls', pricePerUnit: 30, unit: 'minute', description: 'ISD calls' },
  { id: 'cu1', name: 'Same-Day Courier', category: 'courier', pricePerUnit: 500, unit: 'delivery', description: 'Within Kathmandu Valley' },
  { id: 'cu2', name: 'Next-Day Courier', category: 'courier', pricePerUnit: 300, unit: 'delivery', description: 'Domestic delivery' },
]

const MEETING_ROOMS: MeetingRoom[] = [
  { id: 'mr1', name: 'Meeting Room A', capacity: 8, hourlyRate: 3000, status: 'available' },
  { id: 'mr2', name: 'Meeting Room B', capacity: 16, hourlyRate: 5000, status: 'occupied' },
  { id: 'mr3', name: 'Board Room', capacity: 24, hourlyRate: 8000, status: 'available' },
]

const ACTIVE_RENTALS: ActiveRental[] = [
  {
    id: 'RNT-001', serviceId: 'ws2', serviceName: 'Workstation (Premium)',
    guestName: 'Mr. Nakamura', roomNumber: '502',
    startedAt: new Date(Date.now() - 90 * 60000).toISOString(),
    estimatedEnd: new Date(Date.now() + 30 * 60000).toISOString(),
    charges: 600,
  },
  {
    id: 'RNT-002', serviceId: 'mr2', serviceName: 'Meeting Room B',
    guestName: 'ABC Corp', roomNumber: '—',
    startedAt: new Date(Date.now() - 120 * 60000).toISOString(),
    estimatedEnd: new Date(Date.now() + 60 * 60000).toISOString(),
    charges: 15000,
  },
  {
    id: 'RNT-003', serviceId: 'ws1', serviceName: 'Workstation (Basic)',
    guestName: 'Ms. Limbu', roomNumber: '312',
    startedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    estimatedEnd: new Date(Date.now() + 60 * 60000).toISOString(),
    charges: 100,
  },
]

const KITCHEN_TICKETS: KitchenTicket[] = [
  {
    id: 'KT-001', orderId: 'ORD-002', tableId: 6,
    items: [
      { name: 'Mutton Biryani', quantity: 2 },
      { name: 'Grilled Trout', quantity: 1 },
      { name: 'Spring Rolls', quantity: 1 },
    ],
    station: 'hot_kitchen', status: 'pending', rush: true,
    specialInstructions: 'No onions in biryani',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'KT-002', orderId: 'ORD-001', tableId: 2,
    items: [
      { name: 'Chicken Curry', quantity: 2 },
      { name: 'Momo Platter', quantity: 1 },
      { name: 'Garlic Naan', quantity: 3 },
    ],
    station: 'hot_kitchen', status: 'preparing',
    createdAt: new Date(Date.now() - 22 * 60000).toISOString(),
  },
  {
    id: 'KT-003', orderId: 'ORD-004', tableId: 12,
    items: [
      { name: 'Tandoori Chicken', quantity: 1 },
      { name: 'Dal Tarka', quantity: 2 },
      { name: 'Vegetable Fried Rice', quantity: 2 },
    ],
    station: 'hot_kitchen', status: 'preparing',
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: 'KT-004', orderId: 'ORD-003', tableId: 8,
    items: [
      { name: 'Tomato Soup', quantity: 2 },
      { name: 'Paneer Tikka Masala', quantity: 1 },
    ],
    station: 'cold_kitchen', status: 'ready',
    createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
  },
  {
    id: 'KT-005', orderId: 'ORD-001', tableId: 2,
    items: [
      { name: 'Masala Chai', quantity: 3 },
    ],
    station: 'bar', status: 'ready',
    createdAt: new Date(Date.now() - 22 * 60000).toISOString(),
  },
  {
    id: 'KT-006', orderId: 'ORD-004', tableId: 12,
    items: [
      { name: 'Fresh Lime Soda', quantity: 4 },
    ],
    station: 'bar', status: 'pending',
    createdAt: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: 'KT-007', orderId: 'ORD-002', tableId: 6,
    items: [
      { name: 'Mango Lassi', quantity: 4 },
    ],
    station: 'bar', status: 'preparing',
    createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 'KT-008', orderId: 'ORD-005', tableId: 4,
    items: [
      { name: 'Grilled Trout', quantity: 1 },
      { name: 'Dal Tarka', quantity: 1 },
    ],
    station: 'hot_kitchen', status: 'served',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
  {
    id: 'KT-009', orderId: 'ORD-006', tableId: 10,
    items: [
      { name: 'Mutton Biryani', quantity: 1 },
      { name: 'Garlic Naan', quantity: 2 },
      { name: 'Nepali Coffee', quantity: 2 },
    ],
    station: 'hot_kitchen', status: 'served',
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 30 * 60000).toISOString(),
  },
  {
    id: 'KT-010', orderId: 'ORD-007', tableId: 7,
    items: [
      { name: 'Tomato Soup', quantity: 1 },
      { name: 'Spring Rolls', quantity: 2 },
    ],
    station: 'cold_kitchen', status: 'served',
    createdAt: new Date(Date.now() - 70 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 20 * 60000).toISOString(),
  },
]

const GUEST_RESERVATIONS = [
  { id: 'RES-001', guestName: 'Raj Sharma', roomNumber: '301' },
  { id: 'RES-002', guestName: 'Emily Johnson', roomNumber: '502' },
  { id: 'RES-003', guestName: 'Chen Wei', roomNumber: '415' },
  { id: 'RES-004', guestName: 'Maria Garcia', roomNumber: '208' },
  { id: 'RES-005', guestName: 'Ahmed Hassan', roomNumber: '610' },
]

const POS_STATS: PosStats = {
  openTables: 4,
  totalCovers: 15,
  revenueToday: 48750,
  openOrders: 4,
  completedOrders: 12,
}

// ─── GET Handler ─────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const section = searchParams.get('section') ?? 'all'

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 300))

  const data: Record<string, unknown> = {}

  if (section === 'all' || section === 'restaurant') {
    data.tables = TABLES
    data.menuItems = MENU_ITEMS
    data.orders = ORDERS.filter((o) => o.status !== 'closed')
    data.guestReservations = GUEST_RESERVATIONS
  }

  if (section === 'all' || section === 'bar') {
    data.barStools = BAR_STOOLS
    data.barTabs = BAR_TABS.filter((t) => t.status === 'open')
    data.barMenuItems = MENU_ITEMS.filter((m) => ['beer', 'cocktail', 'wine', 'snack'].includes(m.category))
  }

  if (section === 'all' || section === 'spa') {
    data.spaServices = SPA_SERVICES
    data.therapists = THERAPISTS
    data.appointments = SPA_APPOINTMENTS
  }

  if (section === 'all' || section === 'business-center') {
    data.bizServices = BIZ_SERVICES
    data.meetingRooms = MEETING_ROOMS
    data.activeRentals = ACTIVE_RENTALS
  }

  if (section === 'all' || section === 'kitchen-display') {
    data.kitchenTickets = KITCHEN_TICKETS
  }

  data.stats = POS_STATS

  return NextResponse.json(data)
}
