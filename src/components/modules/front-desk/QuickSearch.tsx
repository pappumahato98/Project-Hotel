'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Search, User, BedDouble, CalendarCheck, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useNavigationStore } from '@/lib/store'

interface SearchResult {
  type: string
  id: string
  label: string
  sublabel: string
}

const TYPE_CONFIG: Record<string, { icon: typeof User; color: string; navigate: (id: string) => void }> = {
  guest: { icon: User, color: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300', navigate: (id: string) => { /* navigate to CRM */ } },
  room: { icon: BedDouble, color: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300', navigate: (id: string) => { /* navigate to room board */ } },
  reservation: { icon: CalendarCheck, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300', navigate: (id: string) => { /* navigate to reservations */ } },
}

export function QuickSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const { navigateTo } = useNavigationStore()

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/front-desk/search?q=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
      }
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchResults(query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, fetchResults])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleResultClick = (result: SearchResult) => {
    setOpen(false)
    setQuery('')
    if (result.type === 'reservation') {
      navigateTo('front-desk', 'reservations')
    } else if (result.type === 'room') {
      navigateTo('front-desk', 'in-house')
    } else if (result.type === 'guest') {
      navigateTo('front-desk', 'folio')
    }
  }

  const typeLabels: Record<string, string> = {
    guest: 'Guest',
    room: 'Room',
    reservation: 'Reservation',
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search guests, rooms, reservations..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          className="pl-9 pr-3 h-9"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto p-1">
            {results.map((result) => {
              const config = TYPE_CONFIG[result.type]
              const Icon = config?.icon || Search
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleResultClick(result)}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                >
                  <div className={`flex size-8 items-center justify-center rounded-md ${config?.color || 'bg-muted'}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{result.sublabel}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                    {typeLabels[result.type] || result.type}
                  </Badge>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {open && query.length >= 2 && !loading && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg p-4 text-center text-sm text-muted-foreground">
          No results found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  )
}
