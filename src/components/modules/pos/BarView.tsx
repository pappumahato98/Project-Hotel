'use client'
import { toast } from 'sonner'

import React, { useState } from 'react'
import {
  Wine, Plus, Minus, Trash2, CreditCard, Clock, Users, X, Search,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  usePosData, formatNPR, timeAgo,
  type BarStool, type BarTab, type MenuItem,
  type PosData,
} from './pos-types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { optimisticOptions } from '@/lib/optimistic'
import { apiFetch } from '@/lib/api'

// ─── Stool Grid ────────────────────────────────────────────────────
function StoolGrid({
  stools,
  selectedStool,
  onSelect,
  onCreateTab,
}: {
  stools: BarStool[]
  selectedStool: number | null
  onSelect: (id: number) => void
  onCreateTab: (stoolId: number) => void
}) {
  const statusConfig: Record<BarStool['status'], { bg: string; border: string; dot: string }> = {
    available: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-300 dark:border-emerald-700', dot: 'bg-emerald-500' },
    occupied: { bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-300 dark:border-purple-700', dot: 'bg-purple-500' },
    reserved: { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-300 dark:border-amber-700', dot: 'bg-amber-500' },
  }

  return (
    <div className="flex flex-wrap gap-2.5 justify-center">
      {stools.map((stool) => {
        const config = statusConfig[stool.status]
        const isSelected = selectedStool === stool.id
        return (
          <button
            key={stool.id}
            onClick={() => {
              if (stool.status === 'available') {
                onCreateTab(stool.id)
              } else {
                onSelect(stool.id)
              }
            }}
            className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 p-3 transition-all hover:shadow-md w-20 ${config.bg} ${config.border} ${
              isSelected ? 'ring-2 ring-primary ring-offset-1 scale-110 shadow-lg' : ''
            }`}
          >
            <Wine className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="text-sm font-bold">#{stool.id}</span>
            {stool.guestName && (
              <span className="text-[9px] text-muted-foreground truncate w-full text-center">{stool.guestName.split(' ')[0]}</span>
            )}
            <span className={`absolute top-1 right-1 h-2 w-2 rounded-full ${config.dot}`} />
          </button>
        )
      })}
    </div>
  )
}

// ─── Tab Order Panel ────────────────────────────────────────────────
function TabOrderPanel({
  tab,
  barMenuItems,
  onAddItemToTab,
  onCloseTab,
}: {
  tab: BarTab | null
  barMenuItems: MenuItem[]
  onAddItemToTab: (menuItemId: string) => void
  onCloseTab: () => void
}) {
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuSearch, setMenuSearch] = useState('')
  const total = tab?.total ?? 0

  const filteredMenu = barMenuItems.filter((m) =>
    m.available && (!menuSearch || m.name.toLowerCase().includes(menuSearch.toLowerCase()))
  )

  return (
    <>
      <Card className="flex h-full flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="rounded-md bg-purple-100 dark:bg-purple-900/40 p-1">
                <Wine className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </span>
              {tab ? `Stool #${tab.stoolId} — ${tab.guestName}` : 'Select a stool'}
            </CardTitle>
            {tab && (
              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200">
                <Clock className="h-2.5 w-2.5 mr-0.5" />
                Open {timeAgo(tab.openedAt)}
              </Badge>
            )}
          </div>
        </CardHeader>

        {tab && (
          <>
            <CardContent className="flex-1 px-3 pb-0">
              <ScrollArea className="h-[220px]">
                <div className="space-y-2 pr-2">
                  {tab.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 rounded-md border p-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatNPR(item.price)} × {item.quantity}</p>
                      </div>
                      <span className="text-sm font-medium">{formatNPR(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>

            <div className="px-3 pt-2">
              <Separator className="mb-2" />
              <div className="flex justify-between font-bold text-sm mb-2">
                <span>Tab Total</span>
                <span>{formatNPR(total)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 text-xs" onClick={() => setMenuOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
                </Button>
                <Button className="flex-1 text-xs" onClick={() => setPaymentOpen(true)}>
                  <CreditCard className="h-3.5 w-3.5 mr-1" /> Close Tab
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Add Item Menu Dialog */}
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="sm:max-w-md max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add to Tab
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search drinks..."
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-1.5 pr-2">
              {filteredMenu.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onAddItemToTab(item.id); setMenuOpen(false); setMenuSearch('') }}
                  className="flex items-center justify-between w-full rounded-lg border p-2.5 text-left hover:shadow-sm hover:border-primary/20 transition-all"
                >
                  <span className="text-sm font-medium truncate">{item.name}</span>
                  <span className="text-sm font-bold text-primary ml-2">{formatNPR(item.price)}</span>
                </button>
              ))}
              {filteredMenu.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No items found</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Payment/Close Tab Dialog */}
      <PaymentDialog open={paymentOpen} onClose={() => setPaymentOpen(false)} total={total} onConfirm={onCloseTab} />
    </>
  )
}

// ─── Quick Menu Bar ──────────────────────────────────────────────────
function QuickMenuBar({
  items,
  category,
  onAddItem,
}: {
  items: MenuItem[]
  category: string
  onAddItem: (menuItemId: string) => void
}) {
  const filtered = items.filter((i) => i.category === category && i.available)

  if (filtered.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {category.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
      </h3>
      <div className="flex flex-wrap gap-2">
        {filtered.map((item) => (
          <Button
            key={item.id}
            variant="outline"
            size="sm"
            className="h-auto py-2 px-3 gap-1.5"
            onClick={() => onAddItem(item.id)}
          >
            <span className="text-xs">{item.name}</span>
            <Badge variant="secondary" className="text-[10px] px-1 py-0">{formatNPR(item.price)}</Badge>
          </Button>
        ))}
      </div>
    </div>
  )
}

// ─── Running Tabs Overview ─────────────────────────────────────────
function RunningTabsList({
  tabs,
  onSelectStool,
}: {
  tabs: BarTab[]
  onSelectStool: (id: number) => void
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Running Tabs ({tabs.length})
      </h3>
      <div className="space-y-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelectStool(tab.stoolId)}
            className="flex items-center justify-between w-full rounded-lg border p-2.5 text-left transition-all hover:shadow-sm hover:border-primary/20"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                <Wine className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-sm font-medium">{tab.guestName}</p>
                <p className="text-[10px] text-muted-foreground">
                  Stool #{tab.stoolId} · {tab.items.length} items
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">{formatNPR(tab.total)}</p>
              <p className="text-[10px] text-muted-foreground">{timeAgo(tab.openedAt)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Payment Dialog ─────────────────────────────────────────────────
function PaymentDialog({ open, onClose, total, onConfirm }: { open: boolean; onClose: () => void; total: number; onConfirm: (method: string) => void }) {
  const [method, setMethod] = useState('cash')
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Close Tab
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">Tab Total</p>
            <p className="text-3xl font-bold mt-1">{formatNPR(total)}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Payment Method</label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
                <SelectItem value="mobile">Mobile Payment (eSewa/Khalti)</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onConfirm(method); onClose() }}>Close Tab</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── New Tab Dialog (for creating a tab on an available stool) ─────
function NewTabDialog({
  open,
  onClose,
  stoolId,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  stoolId: number
  onConfirm: (guestName: string, stoolId: number) => void
}) {
  const [guestName, setGuestName] = useState('')

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wine className="h-4 w-4" /> Open Tab — Stool #{stoolId}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Guest Name</Label>
            <Input
              placeholder="Enter guest name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="mt-1.5"
              onKeyDown={(e) => { if (e.key === 'Enter' && guestName.trim()) { onConfirm(guestName.trim(), stoolId); setGuestName('') } }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!guestName.trim()} onClick={() => { onConfirm(guestName.trim(), stoolId); setGuestName('') }}>
            Open Tab
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main BarView ───────────────────────────────────────────────────
export default function BarView() {
  const { data, isLoading } = usePosData('bar')
  const queryClient = useQueryClient()
  const [selectedStool, setSelectedStool] = useState<number | null>(null)
  const [newTabDialog, setNewTabDialog] = useState<{ open: boolean; stoolId: number }>({ open: false, stoolId: 0 })

  const stools = data?.barStools ?? []
  const tabs = data?.barTabs ?? []
  const barMenuItems = data?.barMenuItems ?? []

  const currentTab = tabs.find((t) => t.stoolId === selectedStool) ?? null

  // ─── Create Tab Mutation ─────────────────────────────────────
  const createTabMutation = useMutation({
    mutationFn: async ({ guestName, stoolId }: { guestName: string; stoolId: number }) => {
      return apiFetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_order', tableNumber: stoolId, serverName: guestName, guestCount: 1 }),
      })
    },
    onSuccess: () => {
 toast.success('Tab opened successfully')
      queryClient.invalidateQueries({ queryKey: ['pos'] })
      setNewTabDialog({ open: false, stoolId: 0 })
    },
    onError: () => {
      toast.error('Failed to open tab')
    },
  })

  // ─── Add Item to Tab Mutation ────────────────────────────────
  const addItemMutation = useMutation({
    mutationFn: async ({ orderId, menuItemId }: { orderId: string; menuItemId: string }) => {
      return apiFetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_item', orderId, menuItemId, quantity: 1 }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos'] })
    },
    onError: () => {
      toast.error('Failed to add item to tab')
    },
  })

  // ─── Close Tab Mutation ──────────────────────────────────────
  const closeTabMutation = useMutation({
    mutationFn: async ({ orderId, paymentMethod }: { orderId: string; paymentMethod: string }) => {
      return apiFetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close_order', orderId, paymentMethod }),
      })
    },
    ...optimisticOptions<PosData, { orderId: string; paymentMethod: string }>({
      queryClient,
      queryKeys: [['pos', 'bar']],
      updateFn: (oldData, variables) => {
        if (!oldData) return oldData
        const tab = oldData.barTabs?.find((t) => t.id === variables.orderId)
        return {
          ...oldData,
          barTabs: oldData.barTabs?.map((t) =>
            t.id === variables.orderId ? { ...t, status: 'closed' as const } : t
          ),
          barStools: tab
            ? oldData.barStools?.map((s) =>
                s.id === tab.stoolId ? { ...s, status: 'available' as const } : s
              )
            : oldData.barStools,
        }
      },
    }),
    onSuccess: () => {
      toast.success('Tab closed successfully')
      queryClient.invalidateQueries({ queryKey: ['pos'] })
      setSelectedStool(null)
    },
    onError: () => {
      toast.error('Failed to close tab')
    },
  })

  const handleCreateTab = (guestName: string, stoolId: number) => {
    createTabMutation.mutate({ guestName, stoolId })
  }

  const handleAddItemToTab = (menuItemId: string) => {
    if (!currentTab) {
      toast.error('No active tab selected')
      return
    }
    addItemMutation.mutate({ orderId: currentTab.id, menuItemId })
  }

  const handleCloseTab = (method: string) => {
    if (!currentTab) return
    closeTabMutation.mutate({ orderId: currentTab.id, paymentMethod: method })
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[500px] rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="py-3">
          <CardContent className="flex items-center gap-2 px-4 py-0">
            <div className="rounded-lg p-1.5 bg-muted text-purple-600">
              <Wine className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Available Seats</p>
              <p className="text-sm font-bold">{stools.filter((s) => s.status === 'available').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-2 px-4 py-0">
            <div className="rounded-lg p-1.5 bg-muted text-amber-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Running Tabs</p>
              <p className="text-sm font-bold">{tabs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-3">
          <CardContent className="flex items-center gap-2 px-4 py-0">
            <div className="rounded-lg p-1.5 bg-muted text-emerald-600">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Tab Revenue</p>
              <p className="text-sm font-bold">{formatNPR(tabs.reduce((s, t) => s + t.total, 0))}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Layout */}
      <div className="grid gap-2 lg:grid-cols-[1fr_360px]">
        {/* Left */}
        <div className="space-y-2">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Bar Counter</h2>
            <div className="rounded-xl border bg-gradient-to-r from-purple-50 to-amber-50 dark:from-purple-950/20 dark:to-amber-950/20 p-2.5">
              <StoolGrid stools={stools} selectedStool={selectedStool} onSelect={setSelectedStool} onCreateTab={(stoolId) => setNewTabDialog({ open: true, stoolId })} />
            </div>
          </div>

          {/* Quick Menu Access */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Quick Menu Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickMenuBar items={barMenuItems} category="beer" onAddItem={handleAddItemToTab} />
              <QuickMenuBar items={barMenuItems} category="cocktail" onAddItem={handleAddItemToTab} />
              <QuickMenuBar items={barMenuItems} category="wine" onAddItem={handleAddItemToTab} />
              <QuickMenuBar items={barMenuItems} category="snack" onAddItem={handleAddItemToTab} />
            </CardContent>
          </Card>

          {/* Running Tabs */}
          {tabs.length > 0 && (
            <RunningTabsList tabs={tabs} onSelectStool={setSelectedStool} />
          )}
        </div>

        {/* Right: Tab Detail */}
        <TabOrderPanel tab={currentTab} barMenuItems={barMenuItems} onAddItemToTab={handleAddItemToTab} onCloseTab={handleCloseTab} />
      </div>

      {/* New Tab Dialog */}
      <NewTabDialog
        open={newTabDialog.open}
        onClose={() => setNewTabDialog({ open: false, stoolId: 0 })}
        stoolId={newTabDialog.stoolId}
        onConfirm={handleCreateTab}
      />
    </div>
  )
}
