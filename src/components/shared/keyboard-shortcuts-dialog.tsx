'use client'

import * as React from 'react'
import { useEffect, useState } from 'react'
import {
  Command, Search, SidebarOpen, Keyboard, X,
  LayoutDashboard, CalendarDays, BedDouble, Users, ChevronDown,
  ArrowRight, Escape,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getRegisteredShortcuts, useKeyboardShortcut, type KeyboardShortcut } from '@/hooks/use-keyboard-shortcuts'
import { cn } from '@/lib/utils'

// ─── Shortcuts Display Component ───────────────────────────────────

function ShortcutBadge({ shortcut }: { shortcut: KeyboardShortcut }) {
  const parts: string[] = []
  if (shortcut.meta) parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Ctrl')
  if (shortcut.shift) parts.push('⇧')
  if (shortcut.alt) parts.push('⌥')
  parts.push(shortcut.key === 'Escape' ? 'Esc' : shortcut.key.toUpperCase())

  return (
    <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground shadow-sm">
      {parts.join(' + ')}
    </kbd>
  )
}

const CATEGORY_CONFIG = {
  global: { label: 'Global', icon: Globe, color: 'text-emerald-600' },
  navigation: { label: 'Navigation', icon: Compass, color: 'text-blue-600' },
  action: { label: 'Actions', icon: Zap, color: 'text-amber-600' },
} as const

function Globe({ className }: { className?: string }) { return <GlobeIcon className={className} /> }
function GlobeIcon({ className }: { className?: string }) { return <div className={cn('rounded-full border-2', className)} /> }
function Compass({ className }: { className?: string }) { return <Keyboard className={className} /> }
function Zap({ className }: { className?: string }) { return <ArrowRight className={className} /> }

// ─── Keyboard Shortcuts Dialog ─────────────────────────────────────

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false)

  // Register ? shortcut to open this dialog
  useKeyboardShortcut({
    id: 'keyboard-help',
    label: 'Shift + ?',
    description: 'Show keyboard shortcuts',
    key: '?',
    shift: true,
    handler: () => setOpen((o) => !o),
    category: 'global',
  })

  // Also listen for ⌘/ / Ctrl+/ custom event from GlobalNavigationShortcuts
  useEffect(() => {
    const handler = () => setOpen((o) => !o)
    document.addEventListener('toggle-shortcuts-dialog', handler)
    return () => document.removeEventListener('toggle-shortcuts-dialog', handler)
  }, [])

  const shortcuts = getRegisteredShortcuts()

  // Group by category
  const grouped = shortcuts.reduce<Record<string, KeyboardShortcut[]>>((acc, s) => {
    const cat = s.category || 'action'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  const categoryOrder = ['global', 'navigation', 'action']

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <Keyboard className="size-4 text-muted-foreground" />
            </div>
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and act faster across the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
          {categoryOrder.map((cat) => {
            const items = grouped[cat]
            if (!items?.length) return null
            const config = CATEGORY_CONFIG[cat as keyof typeof CATEGORY_CONFIG]

            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-[10px] font-medium uppercase tracking-wider">
                    {config.label}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  {items.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-muted-foreground">{s.description}</span>
                      <ShortcutBadge shortcut={s} />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
          <span>Press</span>
          <kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium">
            Shift + ?
          </kbd>
          <span>or</span>
          <kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] font-medium">
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + /
          </kbd>
          <span>to toggle this panel</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
