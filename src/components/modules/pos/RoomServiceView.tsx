'use client'

import React, { useState, useMemo } from 'react'
import { toast } from 'sonner'

import {
  BellRing, ClipboardCheck, ChefHat, Truck, XCircle, Plus, Clock,
  BedDouble, MessageSquare, DollarSign, Filter, Building2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatNPR, timeAgo, usePosData } from './pos-types'

// ─── Types ────────────────────────────────────────────────────────────
interface RoomServiceItem {
  name: string
  quantity: number
  price: number
}

interface RoomServiceOrder {
  id: string
  roomNumber: string
  floor: number
  guestName: string
  items: RoomServiceItem[]
  status: 'received' | 'preparing' | 'delivered' | 'cancelled'
  total: number
  specialInstructions: string
  createdAt: string
  phone: string
}

// ─── Mock Data ─────────────────────────────────────────────────────────
const MOCK_ORDERS: RoomServiceOrder[] = [
  {
    id: 'RS-001', roomNumber: '301', floor: 3, guestName: 'Rajesh Sharma',
    items: [{ name: 'Chicken Momo (8pc)', quantity: 1, price: 450 }, { name: 'Thali Set', quantity: 2, price: 650 }, { name: 'Masala Tea', quantity: 2, price: 80 }],
    status: 'preparing', total: 1910, specialInstructions: 'Extra spicy please, no onion in salad', createdAt: new Date(Date.now() - 12 * 60000).toISOString(), phone: '+977-9841234567',
  },
  {
    id: 'RS-002', roomNumber: '205', floor: 2, guestName: 'Sarah Mitchell',
    items: [{ name: 'Continental Breakfast', quantity: 1, price: 800 }, { name: 'Fresh Orange Juice', quantity: 1, price: 250 }],
    status: 'delivered', total: 1050, specialInstructions: '', createdAt: new Date(Date.now() - 45 * 60000).toISOString(), phone: '+1-555-0123',
  },
  {
    id: 'RS-003', roomNumber: '412', floor: 4, guestName: 'Anita Gurung',
    items: [{ name: 'Paneer Tikka', quantity: 1, price: 350 }, { name: 'Garlic Naan', quantity: 3, price: 120 }, { name: 'Dal Makhani', quantity: 1, price: 280 }, { name: 'Lassi', quantity: 2, price: 150 }],
    status: 'received', total: 1240, specialInstructions: 'Gluten-free naan if available', createdAt: new Date(Date.now() - 5 * 60000).toISOString(), phone: '+977-9856789012',
  },
  {
    id: 'RS-004', roomNumber: '108', floor: 1, guestName: 'David Chen',
    items: [{ name: 'Club Sandwich', quantity: 1, price: 520 }, { name: 'Iced Coffee', quantity: 1, price: 220 }],
    status: 'preparing', total: 740, specialInstructions: 'No mayo, add mustard', createdAt: new Date(Date.now() - 18 * 60000).toISOString(), phone: '+86-139-5555-1234',
  },
  {
    id: 'RS-005', roomNumber: '506', floor: 5, guestName: 'Priya Patel',
    items: [{ name: 'Biryani (Chicken)', quantity: 1, price: 550 }, { name: 'Raita', quantity: 1, price: 100 }, { name: 'Gulab Jamun', quantity: 2, price: 180 }],
    status: 'delivered', total: 1010, specialInstructions: 'Less salt please', createdAt: new Date(Date.now() - 90 * 60000).toISOString(), phone: '+91-9876543210',
  },
  {
    id: 'RS-006', roomNumber: '318', floor: 3, guestName: 'Michael Johnson',
    items: [{ name: 'Caesar Salad', quantity: 1, price: 420 }, { name: 'Grilled Salmon', quantity: 1, price: 1200 }, { name: 'Red Wine (Glass)', quantity: 2, price: 600 }],
    status: 'received', total: 2820, specialInstructions: 'Well-done salmon, dressing on the side', createdAt: new Date(Date.now() - 3 * 60000).toISOString(), phone: '+1-555-9876',
  },
  {
    id: 'RS-007', roomNumber: '215', floor: 2, guestName: 'Yuki Tanaka',
    items: [{ name: 'Vegetable Tempura', quantity: 1, price: 480 }, { name: 'Miso Soup', quantity: 1, price: 200 }, { name: 'Green Tea', quantity: 2, price: 120 }],
    status: 'cancelled', total: 920, specialInstructions: '', createdAt: new Date(Date.now() - 60 * 60000).toISOString(), phone: '+81-90-1234-5678',
  },
  {
    id: 'RS-008', roomNumber: '401', floor: 4, guestName: 'Arjun Thapa',
    items: [{ name: 'Sel Roti', quantity: 2, price: 150 }, { name: 'Achar Set', quantity: 1, price: 100 }, { name: 'Chiya (Tea)', quantity: 2, price: 80 }],
    status: 'preparing', total: 560, specialInstructions: 'Use traditional recipe', createdAt: new Date(Date.now() - 22 * 60000).toISOString(), phone: '+977-9840000000',
  },
  {
    id: 'RS-009', roomNumber: '102', floor: 1, guestName: 'Emma Wilson',
    items: [{ name: 'Pancake Stack', quantity: 1, price: 380 }, { name: 'Maple Syrup', quantity: 1, price: 80 }, { name: 'Cappuccino', quantity: 1, price: 280 }],
    status: 'delivered', total: 740, specialInstructions: 'Nut-free, dairy-free milk for cappuccino', createdAt: new Date(Date.now() - 120 * 60000).toISOString(), phone: '+44-7911-123456',
  },
  {
    id: 'RS-010', roomNumber: '503', floor: 5, guestName: 'Binod Karki',
    items: [{ name: 'Buff Chow Mein', quantity: 1, price: 320 }, { name: 'Chicken Kebab', quantity: 1, price: 400 }, { name: 'Coca Cola', quantity: 2, price: 120 }],
    status: 'preparing', total: 960, specialInstructions: 'Extra chili sauce on the side', createdAt: new Date(Date.now() - 15 * 60000).toISOString(), phone: '+977-9841234560',
  },
]

const MOCK_GUESTS = [
  { id: 'g1', name: 'Rajesh Sharma', room: '301', floor: 3 },
  { id: 'g2', name: 'Sarah Mitchell', room: '205', floor: 2 },
  { id: 'g3', name: 'Anita Gurung', room: '412', floor: 4 },
  { id: 'g4', name: 'David Chen', room: '108', floor: 1 },
  { id: 'g5', name: 'Priya Patel', room: '506', floor: 5 },
  { id: 'g6', name: 'Michael Johnson', room: '318', floor: 3 },
  { id: 'g7', name: 'Emma Wilson', room: '102', floor: 1 },
  { id: 'g8', name: 'Arjun Thapa', room: '401', floor: 4 },
]

const MOCK_MENU_ITEMS = [
  { id: 'm1', name: 'Chicken Momo (8pc)', price: 450, category: 'Appetizer' },
  { id: 'm2', name: 'Thali Set', price: 650, category: 'Main Course' },
  { id: 'm3', name: 'Masala Tea', price: 80, category: 'Beverage' },
  { id: 'm4', name: 'Continental Breakfast', price: 800, category: 'Breakfast' },
  { id: 'm5', name: 'Fresh Orange Juice', price: 250, category: 'Beverage' },
  { id: 'm6', name: 'Paneer Tikka', price: 350, category: 'Appetizer' },
  { id: 'm7', name: 'Garlic Naan', price: 120, category: 'Bread' },
  { id: 'm8', name: 'Dal Makhani', price: 280, category: 'Main Course' },
  { id: 'm9', name: 'Lassi', price: 150, category: 'Beverage' },
  { id: 'm10', name: 'Club Sandwich', price: 520, category: 'Main Course' },
  { id: 'm11', name: 'Iced Coffee', price: 220, category: 'Beverage' },
  { id: 'm12', name: 'Caesar Salad', price: 420, category: 'Salad' },
  { id: 'm13', name: 'Grilled Salmon', price: 1200, category: 'Main Course' },
  { id: 'm14', name: 'Biryani (Chicken)', price: 550, category: 'Main Course' },
  { id: 'm15', name: 'Gulab Jamun', price: 180, category: 'Dessert' },
]

// ─── Status Config ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<RoomServiceOrder['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  received: { label: 'Received', variant: 'default', className: 'bg-amber-600 hover:bg-amber-600 text-white' },
  preparing: { label: 'Preparing', variant: 'secondary', className: 'bg-blue-600 hover:bg-blue-600 text-white' },
  delivered: { label: 'Delivered', variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-600 text-white' },
  cancelled: { label: 'Cancelled', variant: 'destructive', className: '' },
}

// ─── Summary Cards ───────────────────────────────────────────────────
function SummaryCards({ orders }: { orders: RoomServiceOrder[] }) {
  const active = orders.filter((o) => o.status === 'received' || o.status === 'preparing').length
  const preparing = orders.filter((o) => o.status === 'preparing').length
  const delivered = orders.filter((o) => o.status === 'delivered').length
  const revenue = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)

  const cards = [
    { label: 'Active Orders', value: active, icon: BellRing, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
    { label: 'Preparing Now', value: preparing, icon: ChefHat, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    { label: 'Delivered Today', value: delivered, icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Revenue Today', value: formatNPR(revenue), icon: DollarSign, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/40' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {cards.map((card) => (
        <Card key={card.label} className="py-3">
          <CardContent className="flex items-center gap-2 px-4 py-0">
            <div className={`rounded-lg p-2 ${card.bg} ${card.color}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground truncate">{card.label}</p>
              <p className="text-sm font-bold truncate">{card.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Status Badge ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: RoomServiceOrder['status'] }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge variant={config.variant} className={`text-[10px] ${config.className}`}>
      {config.label}
    </Badge>
  )
}

// ─── Order Card ────────────────────────────────────────────────────────
function OrderCard({
  order,
  onStatusChange,
}: {
  order: RoomServiceOrder
  onStatusChange: (id: string, status: RoomServiceOrder['status']) => void
}) {
  const nextStatus = useMemo(() => {
    if (order.status === 'received') return 'preparing'
    if (order.status === 'preparing') return 'delivered'
    return null
  }, [order.status])

  return (
    <Card className="rounded-lg border">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm">Room {order.roomNumber}</CardTitle>
            <StatusBadge status={order.status} />
          </div>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo(order.createdAt)} ago
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{order.guestName} · {order.phone}</p>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        {/* Items */}
        <div className="space-y-1.5">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {item.name} <span className="font-medium text-foreground">×{item.quantity}</span>
              </span>
              <span className="font-medium">{formatNPR(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <Separator />

        {/* Total & Special Instructions */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">Total</span>
          <span className="text-sm font-bold">{formatNPR(order.total)}</span>
        </div>

        {order.specialInstructions && (
          <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2 flex items-start gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">{order.specialInstructions}</p>
          </div>
        )}

        {/* Action Buttons */}
        {order.status !== 'cancelled' && order.status !== 'delivered' && (
          <div className="flex gap-2 pt-1">
            {nextStatus && (
              <Button
                size="sm"
                className="flex-1 gap-1 text-[11px] h-7"
                onClick={() => onStatusChange(order.id, nextStatus as RoomServiceOrder['status'])}
              >
                {nextStatus === 'preparing' && <ChefHat className="h-3.5 w-3.5" />}
                {nextStatus === 'delivered' && <Truck className="h-3.5 w-3.5" />}
                {nextStatus === 'preparing' ? 'Start Preparing' : 'Mark Delivered'}
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              className="gap-1 text-[11px] h-7"
              onClick={() => onStatusChange(order.id, 'cancelled')}
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── New Order Dialog ─────────────────────────────────────────────────
function NewOrderDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (order: Omit<RoomServiceOrder, 'id' | 'createdAt' | 'status' | 'total'> & { total: number }) => void
}) {
  const [selectedGuest, setSelectedGuest] = useState('')
  const [orderItems, setOrderItems] = useState<{ name: string; quantity: number; price: number }[]>([])
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [selectedMenuCategory, setSelectedMenuCategory] = useState('all')

  const selectedGuestData = MOCK_GUESTS.find((g) => g.id === selectedGuest)

  const menuCategories = ['all', 'Appetizer', 'Main Course', 'Beverage', 'Breakfast', 'Bread', 'Salad', 'Dessert']
  const filteredMenu = MOCK_MENU_ITEMS.filter((m) => selectedMenuCategory === 'all' || m.category === selectedMenuCategory)

  const handleAddItem = (menuItem: typeof MOCK_MENU_ITEMS[0]) => {
    const existing = orderItems.find((i) => i.name === menuItem.name)
    if (existing) {
      setOrderItems(orderItems.map((i) => i.name === menuItem.name ? { ...i, quantity: i.quantity + 1 } : i))
    } else {
      setOrderItems([...orderItems, { name: menuItem.name, quantity: 1, price: menuItem.price }])
    }
  }

  const handleRemoveItem = (name: string) => {
    setOrderItems(orderItems.filter((i) => i.name !== name))
  }

  const handleQtyChange = (name: string, delta: number) => {
    setOrderItems(orderItems.map((i) => {
      if (i.name !== name) return i
      const newQty = Math.max(0, i.quantity + delta)
      return { ...i, quantity: newQty }
    }).filter((i) => i.quantity > 0))
  }

  const total = orderItems.reduce((s, i) => s + i.price * i.quantity, 0)

  const handleSubmit = () => {
    if (!selectedGuest || orderItems.length === 0) {
      toast.error('Please select a guest and add at least one item')
      return
    }
    onSubmit({
      roomNumber: selectedGuestData!.room,
      floor: selectedGuestData!.floor,
      guestName: selectedGuestData!.name,
      phone: '+977-98' + Math.floor(10000000 + Math.random() * 90000000).toString(),
      items: orderItems,
      specialInstructions,
      total,
    })
    setSelectedGuest('')
    setOrderItems([])
    setSpecialInstructions('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-4 w-4" />
            New Room Service Order
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Guest Selection */}
          <div>
            <Label className="text-sm font-medium">Select Guest</Label>
            <Select value={selectedGuest} onValueChange={setSelectedGuest}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Choose in-house guest..." />
              </SelectTrigger>
              <SelectContent>
                {MOCK_GUESTS.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name} — Room {g.room} (Floor {g.floor})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Menu Items */}
          <div>
            <Label className="text-sm font-medium">Add Items from Menu</Label>
            <Select value={selectedMenuCategory} onValueChange={setSelectedMenuCategory}>
              <SelectTrigger className="mt-1.5 mb-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {menuCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat === 'all' ? 'All Categories' : cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ScrollArea className="h-48">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-2">
                {filteredMenu.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleAddItem(item)}
                    className="flex items-center justify-between rounded-md border p-2 text-left text-xs hover:bg-muted/50 transition-colors"
                  >
                    <span className="truncate">{item.name}</span>
                    <span className="ml-2 flex items-center gap-1 flex-shrink-0">
                      <span className="font-medium">{formatNPR(item.price)}</span>
                      <Plus className="h-3 w-3 text-muted-foreground" />
                    </span>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Selected Items */}
          {orderItems.length > 0 && (
            <div>
              <Label className="text-sm font-medium">Order Items</Label>
              <div className="mt-2 space-y-1.5">
                {orderItems.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-md border p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatNPR(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQtyChange(item.name, -1)}>
                        <span className="text-xs">−</span>
                      </Button>
                      <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => handleQtyChange(item.name, 1)}>
                        <span className="text-xs">+</span>
                      </Button>
                    </div>
                    <span className="text-xs font-medium w-16 text-right">{formatNPR(item.price * item.quantity)}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveItem(item.name)}>
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-between pt-1 text-sm font-bold border-t mt-2 pt-2">
                  <span>Total</span>
                  <span>{formatNPR(total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div>
            <Label className="text-sm font-medium">Special Instructions</Label>
            <Input
              placeholder="Any dietary requirements or special requests..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!selectedGuest || orderItems.length === 0}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Place Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main RoomServiceView ────────────────────────────────────────────
export default function RoomServiceView() {
  const { data, isLoading } = usePosData('room-service')
  const [orders, setOrders] = useState<RoomServiceOrder[]>(MOCK_ORDERS)
  const [statusFilter, setStatusFilter] = useState('all')
  const [floorFilter, setFloorFilter] = useState('all')
  const [newOrderOpen, setNewOrderOpen] = useState(false)

  const floors = useMemo(() => {
    const f = [...new Set(orders.map((o) => o.floor))].sort()
    return f
  }, [orders])

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      if (floorFilter !== 'all' && o.floor !== Number(floorFilter)) return false
      return true
    })
  }, [orders, statusFilter, floorFilter])

  const handleStatusChange = (id: string, newStatus: RoomServiceOrder['status']) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: newStatus } : o))
    const actionLabels: Record<string, string> = {
      preparing: 'Order is now being prepared',
      delivered: 'Order marked as delivered',
      cancelled: 'Order has been cancelled',
    }
    toast.success(actionLabels[newStatus] ?? 'Order updated')
  }

  const handleNewOrder = (order: Omit<RoomServiceOrder, 'id' | 'createdAt' | 'status' | 'total'> & { total: number }) => {
    const newOrder: RoomServiceOrder = {
      ...order,
      id: `RS-${String(orders.length + 1).padStart(3, '0')}`,
      status: 'received',
      createdAt: new Date().toISOString(),
    }
    setOrders((prev) => [newOrder, ...prev])
    toast.success(`Room service order placed for Room ${order.roomNumber}`)
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <Skeleton className="h-60 rounded-lg" />
          <Skeleton className="h-60 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Summary Cards */}
      <SummaryCards orders={orders} />

      {/* Filters & Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 data-[size=default]:h-7 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={floorFilter} onValueChange={setFloorFilter}>
            <SelectTrigger className="w-36 data-[size=default]:h-7 text-xs">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Floors</SelectItem>
              {floors.map((f) => (
                <SelectItem key={f} value={String(f)}>Floor {f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="ml-auto gap-1 text-[11px]" onClick={() => setNewOrderOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          New Room Service Order
        </Button>
      </div>

      {/* Floor Sections */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardCheck className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-2 text-sm text-muted-foreground">No room service orders match the selected filters</p>
        </div>
      ) : (
        floors
          .filter((f) => floorFilter === 'all' || f === Number(floorFilter))
          .map((floor) => {
            const floorOrders = filteredOrders.filter((o) => o.floor === floor)
            if (floorOrders.length === 0) return null
            return (
              <div key={floor} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Floor {floor}
                  </h2>
                  <Badge variant="outline" className="text-[10px]">
                    {floorOrders.length} {floorOrders.length === 1 ? 'order' : 'orders'}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {floorOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            )
          })
      )}

      {/* New Order Dialog */}
      <NewOrderDialog
        open={newOrderOpen}
        onClose={() => setNewOrderOpen(false)}
        onSubmit={handleNewOrder}
      />
    </div>
  )
}
