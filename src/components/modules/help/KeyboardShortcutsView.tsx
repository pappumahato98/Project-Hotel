'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Navigation, CalendarDays, Settings, Search } from 'lucide-react'

interface Shortcut {
  keys: string[]
  description: string
}

interface ShortcutCategory {
  id: string
  label: string
  icon: React.ElementType
  shortcuts: Shortcut[]
}

const CATEGORIES: ShortcutCategory[] = [
  {
    id: 'navigation',
    label: 'Navigation',
    icon: Navigation,
    shortcuts: [
      { keys: ['⌘/Ctrl', 'K'], description: 'Quick Search' },
      { keys: ['⌘/Ctrl', 'B'], description: 'Toggle Sidebar' },
      { keys: ['⌘/Ctrl', '1-9'], description: 'Switch Module' },
    ],
  },
  {
    id: 'reservations',
    label: 'Reservations',
    icon: CalendarDays,
    shortcuts: [
      { keys: ['⌘/Ctrl', 'N'], description: 'New Reservation' },
      { keys: ['⌘/Ctrl', 'F'], description: 'Find Guest' },
    ],
  },
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    shortcuts: [
      { keys: ['⌘/Ctrl', ','], description: 'Preferences' },
      { keys: ['⌘/Ctrl', 'H'], description: 'Help & Support' },
      { keys: ['⌘/Ctrl', 'D'], description: 'Toggle Dark Mode' },
      { keys: ['Esc'], description: 'Close Dialog / Modal' },
      { keys: ['Tab'], description: 'Next Field' },
      { keys: ['Shift', 'Tab'], description: 'Previous Field' },
    ],
  },
]

function KbdBadge({ label }: { label: string }) {
  return (
    <kbd className="inline-flex items-center rounded border bg-muted px-2 py-1 text-xs font-mono font-medium shadow-sm">
      {label}
    </kbd>
  )
}

export function KeyboardShortcutsView() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return CATEGORIES
    const q = searchQuery.toLowerCase()
    return CATEGORIES
      .map((cat) => ({
        ...cat,
        shortcuts: cat.shortcuts.filter(
          (s) =>
            s.description.toLowerCase().includes(q) ||
            s.keys.some((k) => k.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.shortcuts.length > 0)
  }, [searchQuery])

  const totalShortcuts = filteredCategories.reduce(
    (acc, cat) => acc + cat.shortcuts.length,
    0
  )

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {totalShortcuts} shortcut{totalShortcuts !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCategories.map((category) => {
          const Icon = category.icon
          return (
            <Card key={category.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {category.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {category.shortcuts.map((shortcut, i) => (
                    <div
                      key={`${category.id}-${i}`}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {shortcut.keys.map((key, j) => (
                          <span key={j} className="flex items-center gap-1.5">
                            <KbdBadge label={key} />
                            {j < shortcut.keys.length - 1 && (
                              <span className="text-xs text-muted-foreground">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground text-right shrink-0">
                        {shortcut.description}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredCategories.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No shortcuts match &ldquo;{searchQuery}&rdquo;
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
