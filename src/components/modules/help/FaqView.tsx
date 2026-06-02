'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  ChevronUp,
  Search,
  HelpCircle,
  CalendarDays,
  Settings,
  Monitor,
  MessageCircleQuestion,
} from 'lucide-react'

interface FaqItem {
  question: string
  answer: string
}

interface FaqCategory {
  id: string
  label: string
  icon: React.ElementType
  items: FaqItem[]
}

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'general',
    label: 'General',
    icon: HelpCircle,
    items: [
      {
        question: 'What is Meridian PMS?',
        answer:
          'Meridian PMS (Property Management System) is a comprehensive hotel management solution that handles reservations, guest management, room inventory, operations, accounting, and more. It is designed to streamline daily hotel operations and improve guest experience.',
      },
      {
        question: 'How do I log in?',
        answer:
          'Use your email address and password provided by your IT administrator. Default credentials are set up during onboarding. Contact IT Support (ext. 1000 or it@meridian.com) if you need password assistance.',
      },
      {
        question: 'Can I access the system from mobile?',
        answer:
          'Yes, Meridian PMS is fully responsive and works on mobile devices and tablets. Open the system URL in your mobile browser for full functionality.',
      },
      {
        question: 'What browsers are supported?',
        answer:
          'Meridian PMS supports all modern browsers including Google Chrome, Mozilla Firefox, Microsoft Edge, and Safari. We recommend Chrome for the best experience.',
      },
      {
        question: 'How often is data backed up?',
        answer:
          'System data is backed up automatically every 6 hours. Daily backups are retained for 30 days. Contact IT for manual backup requests for critical operations.',
      },
    ],
  },
  {
    id: 'reservations',
    label: 'Reservations',
    icon: CalendarDays,
    items: [
      {
        question: 'How do I create a new reservation?',
        answer:
          "Navigate to Front Desk > Reservations and click 'New Reservation'. Fill in guest details, select room type, dates, and rate. The system will auto-assign an available room.",
      },
      {
        question: 'Can I modify an existing reservation?',
        answer:
          "Yes. Click on any reservation row and select 'Edit' from the dropdown menu. You can modify dates, room type, guests, and special requests.",
      },
      {
        question: 'How do I handle walk-in guests?',
        answer:
          'Go to Front Desk > Arrivals and click \'Walk-in Check-in\'. The system will create a guest profile and reservation automatically, assigning the first available room.',
      },
      {
        question: 'What is the difference between confirmed and tentative?',
        answer:
          'Confirmed reservations are guaranteed bookings. Tentative reservations are hold bookings that may be cancelled without penalty if not confirmed by the deadline.',
      },
      {
        question: 'How do I cancel a reservation?',
        answer:
          "Open the reservation details, click the dropdown menu, and select 'Cancel'. The room will be released back to available inventory automatically.",
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Settings,
    items: [
      {
        question: 'When should I run the night audit?',
        answer:
          'Night audit should be run after the last front desk posting of the day, typically between 11 PM and midnight. It verifies revenue, posts room charges, and prepares the system for the next business day.',
      },
      {
        question: 'What does the day close procedure do?',
        answer:
          'Day close finalizes all daily transactions, generates end-of-day reports, and prepares the system for the next business day. Complete all pending tasks before running day close.',
      },
      {
        question: 'How do cashier shifts work?',
        answer:
          'Each cashier opens a shift with a float amount. All payments processed during the shift are tracked. At shift end, the cashier reconciles the float, payments, and any variance.',
      },
    ],
  },
  {
    id: 'technical',
    label: 'Technical',
    icon: Monitor,
    items: [
      {
        question: 'What should I do if the system is slow?',
        answer:
          'Try clearing your browser cache first. If issues persist, check your internet connection. For persistent issues, contact IT Support at ext. 1000.',
      },
      {
        question: 'How do I report a bug?',
        answer:
          "Go to Help & Support > Contact Support and submit a support ticket with 'Bug Report' category. Include steps to reproduce the issue and screenshots if possible.",
      },
      {
        question: 'Can I customize my dashboard?',
        answer:
          'Yes! Use the preferences menu (top-right profile icon > My Preferences) to customize language, currency, timezone, date format, notification settings, and theme.',
      },
    ],
  },
]

export function FaqView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const toggleItem = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const filteredCategories = useMemo(() => {
    const cats = activeCategory
      ? FAQ_CATEGORIES.filter((c) => c.id === activeCategory)
      : FAQ_CATEGORIES

    if (!searchQuery.trim()) return cats

    const q = searchQuery.toLowerCase()
    return cats
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.question.toLowerCase().includes(q) ||
            item.answer.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.items.length > 0)
  }, [searchQuery, activeCategory])

  const totalItems = filteredCategories.reduce((acc, cat) => acc + cat.items.length, 0)

  return (
    <div className="space-y-6">
      {/* Search & Category filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (e.target.value) setActiveCategory(null)
            }}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer border',
              activeCategory === null
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground hover:bg-accent'
            )}
          >
            All
            <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
              {FAQ_CATEGORIES.reduce((a, c) => a + c.items.length, 0)}
            </Badge>
          </button>
          {FAQ_CATEGORIES.map((cat) => {
            const Icon = cat.icon
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer border',
                  activeCategory === cat.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground hover:bg-accent'
                )}
              >
                <Icon className="h-3 w-3" />
                {cat.label}
                <Badge variant="secondary" className="ml-0.5 h-4 px-1 text-[10px]">
                  {cat.items.length}
                </Badge>
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {totalItems} question{totalItems !== 1 ? 's' : ''} found
      </p>

      {/* FAQ Items */}
      <div className="space-y-4">
        {filteredCategories.map((category) => {
          const CatIcon = category.icon
          return (
            <div key={category.id} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CatIcon className="h-4 w-4" />
                {category.label}
              </div>
              {category.items.map((item, i) => {
                const key = `${category.id}-${i}`
                const isExpanded = expandedItems.has(key)
                return (
                  <Card key={key} className="overflow-hidden">
                    <button
                      onClick={() => toggleItem(key)}
                      className="flex items-center justify-between w-full p-4 text-left cursor-pointer hover:bg-accent/30 transition-colors"
                    >
                      <span className="text-sm font-medium pr-4">{item.question}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <div className="border-t pt-3">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {filteredCategories.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MessageCircleQuestion className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No questions match &ldquo;{searchQuery}&rdquo;
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
