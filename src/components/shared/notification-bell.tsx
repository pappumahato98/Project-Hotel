'use client'

import * as React from 'react'
import {
  Bell, CheckCheck, Trash2,
  Radio, Wifi, WifiOff,
  LogIn, BedDouble, CreditCard,
  Wrench, AlertTriangle, ShoppingCart,
  ClipboardList, Shield, Package,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { useNotificationStore, formatRelativeTime, getSeverityDotClass } from '@/lib/realtime-notifications'
import { useNavigationStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { NotificationCategory } from '@/lib/realtime-notifications'

// ─── Category icon map ─────────────────────────────────────────────

const categoryIconMap: Record<NotificationCategory, React.ReactNode> = {
  room: <BedDouble className="size-3.5" />,
  reservation: <LogIn className="size-3.5" />,
  payment: <CreditCard className="size-3.5" />,
  housekeeping: <ClipboardList className="size-3.5" />,
  maintenance: <Wrench className="size-3.5" />,
  inventory: <Package className="size-3.5" />,
  security: <Shield className="size-3.5" />,
  pos: <ShoppingCart className="size-3.5" />,
  activity: <AlertTriangle className="size-3.5" />,
  system: <Radio className="size-3.5" />,
}

// ─── Realtime Status Indicator ────────────────────────────────────

function RealtimeStatusIndicator() {
  const isConnected = useNotificationStore((s) => s.isConnected)

  return (
    <div className="flex items-center gap-1.5 text-[10px]">
      {isConnected ? (
        <>
          <Wifi className="size-3 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400">Live</span>
        </>
      ) : (
        <>
          <WifiOff className="size-3 text-muted-foreground" />
          <span className="text-muted-foreground">Offline</span>
        </>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────

function EmptyNotifications() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-3">
        <Bell className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">No notifications</p>
      <p className="text-xs text-muted-foreground mt-1">
        Real-time updates will appear here
      </p>
    </div>
  )
}

// ─── Notification Bell ────────────────────────────────────────────

export function NotificationBell() {
  const [open, setOpen] = React.useState(false)
  const { notifications, unreadCount, isConnected, markAsRead, markAllAsRead, clearNotification, clearAll } =
    useNotificationStore()
  const { navigateTo } = useNavigationStore()

  const displayCount = unreadCount > 99 ? '99+' : unreadCount

  const handleNotificationClick = (id: string, action?: { module: string; subModule?: string }) => {
    markAsRead(id)
    if (action) {
      navigateTo(action.module, action.subModule)
      setOpen(false)
    }
  }

  const handleMarkAllRead = () => {
    markAllAsRead()
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className={cn(
              'absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full text-[9px] font-bold text-white px-1',
              unreadCount > 5 ? 'bg-red-500' : 'bg-amber-500'
            )}>
              {displayCount}
            </span>
          )}
          {/* Connection indicator dot */}
          <span className={cn(
            'absolute bottom-0.5 right-0.5 flex size-2 rounded-full border border-background',
            isConnected ? 'bg-emerald-500' : 'bg-gray-400'
          )} />
          <span className="sr-only">Notifications ({unreadCount} unread)</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-foreground" />
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <RealtimeStatusIndicator />
        </div>
        <DropdownMenuSeparator />

        {/* Action bar */}
        {notifications.length > 0 && (
          <>
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="size-3" />
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={clearAll}
              >
                <Trash2 className="size-3" />
                Clear all
              </Button>
            </div>
          </>
        )}

        {/* Notification list */}
        {notifications.length === 0 ? (
          <EmptyNotifications />
        ) : (
          <ScrollArea className="max-h-72">
            <DropdownMenuGroup>
              {notifications.slice(0, 20).map((notif) => (
                <DropdownMenuItem
                  key={notif.id}
                  className={cn(
                    'flex flex-col items-start gap-1.5 p-3 cursor-pointer transition-colors',
                    !notif.read && 'bg-primary/5'
                  )}
                  onClick={() => handleNotificationClick(notif.id, notif.action)}
                >
                  <div className="flex items-center gap-2 w-full">
                    {/* Category dot + severity indicator */}
                    <span className={cn(
                      'flex h-2 w-2 rounded-full shrink-0',
                      getSeverityDotClass(notif.severity)
                    )} />
                    {/* Category icon */}
                    <span className="text-muted-foreground shrink-0">
                      {categoryIconMap[notif.category]}
                    </span>
                    {/* Title */}
                    <span className={cn(
                      'text-sm leading-tight flex-1 truncate',
                      !notif.read ? 'font-medium' : 'font-normal'
                    )}>
                      {notif.title}
                    </span>
                    {/* Unread indicator */}
                    {!notif.read && (
                      <span className="flex h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  {/* Description */}
                  {notif.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed pl-6 line-clamp-2">
                      {notif.description}
                    </p>
                  )}
                  {/* Timestamp */}
                  <span className="text-[10px] text-muted-foreground/70 pl-6">
                    {formatRelativeTime(notif.timestamp)}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </ScrollArea>
        )}

        {/* Footer */}
        {notifications.length > 20 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm font-medium text-primary cursor-pointer py-2.5">
              View all {notifications.length} notifications
            </DropdownMenuItem>
          </>
        )}

        {/* Realtime branding footer */}
        <DropdownMenuSeparator />
        <div className="px-3 py-2 bg-muted/20">
          <div className="flex items-center justify-center gap-1.5">
            <Radio className={cn('size-3', isConnected ? 'text-emerald-500' : 'text-muted-foreground')} />
            <span className="text-[10px] text-muted-foreground">
              {isConnected ? 'Realtime connected' : 'Waiting for connection...'}
            </span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ─── Live Activity Feed (for Dashboard sidebar) ──────────────────

export function LiveActivityFeed({ maxHeight = 'max-h-96' }: { maxHeight?: string }) {
  const notifications = useNotificationStore((s) => s.notifications)
  const isConnected = useNotificationStore((s) => s.isConnected)

  const recentNotifications = notifications.slice(0, 15)

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Live Activity</h3>
          <span className={cn(
            'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
            isConnected
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          )}>
            <span className={cn(
              'h-1.5 w-1.5 rounded-full',
              isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
            )} />
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Feed */}
      {recentNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Radio className="size-8 text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">
            Waiting for realtime events...
          </p>
        </div>
      ) : (
        <div className={cn('space-y-1 overflow-y-auto', maxHeight)}>
          {recentNotifications.map((notif) => (
            <div
              key={notif.id}
              className={cn(
                'flex items-start gap-2.5 rounded-lg px-3 py-2 transition-colors text-left',
                !notif.read ? 'bg-primary/5' : 'hover:bg-muted/50'
              )}
            >
              {/* Severity dot */}
              <span className={cn(
                'flex h-2 w-2 rounded-full mt-1.5 shrink-0',
                getSeverityDotClass(notif.severity)
              )} />
              {/* Icon */}
              <span className="text-muted-foreground mt-0.5 shrink-0">
                {categoryIconMap[notif.category]}
              </span>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-tight truncate">
                  {notif.title}
                </p>
                {notif.description && (
                  <p className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">
                    {notif.description}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  {formatRelativeTime(notif.timestamp)}
                </p>
              </div>
              {/* Category badge */}
              <span className="text-[9px] text-muted-foreground/60 shrink-0">
                {notif.category}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
