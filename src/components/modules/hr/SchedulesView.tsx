'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  CalendarDays, Download, Sun, Moon, Coffee, Clock,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type ShiftType = 'morning' | 'evening' | 'night' | 'off'

interface ShiftEntry {
  employeeId: string
  name: string
  department: string
  position: string
  monday: ShiftType
  tuesday: ShiftType
  wednesday: ShiftType
  thursday: ShiftType
  friday: ShiftType
  saturday: ShiftType
  sunday: ShiftType
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

const SHIFT_CONFIG: Record<ShiftType, { label: string; time: string; color: string; icon: typeof Sun }> = {
  morning: { label: 'Morning', time: '06:00–14:00', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800', icon: Sun },
  evening: { label: 'Evening', time: '14:00–22:00', color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800', icon: Coffee },
  night: { label: 'Night', time: '22:00–06:00', color: 'bg-slate-700 text-white dark:bg-slate-600 dark:text-slate-100 border-slate-600 dark:border-slate-500', icon: Moon },
  off: { label: 'Off', time: '—', color: 'bg-muted text-muted-foreground border-muted', icon: Clock },
}

const DEPARTMENTS = [
  'All Departments',
  'Front Desk',
  'Housekeeping',
  'Food & Beverage',
  'Kitchen',
  'Engineering',
  'Security',
  'Spa & Wellness',
]

// Placeholder schedule data
const PLACEHOLDER_SCHEDULE: ShiftEntry[] = [
  { employeeId: '1', name: 'Rajesh Shrestha', department: 'Front Desk', position: 'Receptionist', monday: 'morning', tuesday: 'morning', wednesday: 'morning', thursday: 'evening', friday: 'morning', saturday: 'off', sunday: 'off' },
  { employeeId: '2', name: 'Sita Kumari', department: 'Front Desk', position: 'Front Desk Agent', monday: 'evening', tuesday: 'evening', wednesday: 'evening', thursday: 'evening', friday: 'off', saturday: 'morning', sunday: 'morning' },
  { employeeId: '3', name: 'Bikash Thapa', department: 'Front Desk', position: 'Night Auditor', monday: 'night', tuesday: 'night', wednesday: 'off', thursday: 'night', friday: 'night', saturday: 'night', sunday: 'off' },
  { employeeId: '4', name: 'Maya Gurung', department: 'Housekeeping', position: 'HK Supervisor', monday: 'morning', tuesday: 'morning', wednesday: 'morning', thursday: 'morning', friday: 'morning', saturday: 'off', sunday: 'off' },
  { employeeId: '5', name: 'Laxmi Rai', department: 'Housekeeping', position: 'Room Attendant', monday: 'morning', tuesday: 'morning', wednesday: 'evening', thursday: 'morning', friday: 'off', saturday: 'morning', sunday: 'morning' },
  { employeeId: '6', name: 'Deepak Nepal', department: 'Food & Beverage', position: 'F&B Manager', monday: 'morning', tuesday: 'morning', wednesday: 'morning', thursday: 'morning', friday: 'morning', saturday: 'morning', sunday: 'off' },
  { employeeId: '7', name: 'Anita Tamang', department: 'Food & Beverage', position: 'Waitress', monday: 'evening', tuesday: 'evening', wednesday: 'off', thursday: 'evening', friday: 'evening', saturday: 'evening', sunday: 'off' },
  { employeeId: '8', name: 'Hari Bhandari', department: 'Kitchen', position: 'Head Chef', monday: 'morning', tuesday: 'morning', wednesday: 'morning', thursday: 'morning', friday: 'evening', saturday: 'morning', sunday: 'off' },
  { employeeId: '9', name: 'Priti Maharjan', department: 'Kitchen', position: 'Sous Chef', monday: 'morning', tuesday: 'evening', wednesday: 'morning', thursday: 'morning', friday: 'morning', saturday: 'off', sunday: 'morning' },
  { employeeId: '10', name: 'Ramesh Karki', department: 'Engineering', position: 'Maintenance Lead', monday: 'morning', tuesday: 'morning', wednesday: 'morning', thursday: 'morning', friday: 'morning', saturday: 'off', sunday: 'off' },
  { employeeId: '11', name: 'Sunil Basnet', department: 'Security', position: 'Security Guard', monday: 'night', tuesday: 'night', wednesday: 'off', thursday: 'night', friday: 'night', saturday: 'night', sunday: 'night' },
  { employeeId: '12', name: 'Kiran Dahal', department: 'Security', position: 'Security Guard', monday: 'off', tuesday: 'night', wednesday: 'night', thursday: 'night', friday: 'night', saturday: 'night', sunday: 'off' },
  { employeeId: '13', name: 'Srijana Poudel', department: 'Spa & Wellness', position: 'Spa Therapist', monday: 'morning', tuesday: 'evening', wednesday: 'morning', thursday: 'off', friday: 'morning', saturday: 'morning', sunday: 'off' },
]

function ShiftBadge({ shift }: { shift: ShiftType }) {
  const config = SHIFT_CONFIG[shift]
  const Icon = config.icon
  return (
    <div className={cn('flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium leading-none', config.color)}>
      <Icon className="h-3 w-3" />
      <span>{config.time}</span>
    </div>
  )
}

function ShiftLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(Object.entries(SHIFT_CONFIG) as [ShiftType, typeof SHIFT_CONFIG.morning][]).map(([key, config]) => (
        <div key={key} className="flex items-center gap-1 text-xs">
          <div className={cn('h-3 w-3 rounded border', config.color)} />
          <span>{config.label} ({config.time})</span>
        </div>
      ))}
    </div>
  )
}

export function SchedulesView() {
  const [filterDept, setFilterDept] = useState('All Departments')
  const [weekOffset, setWeekOffset] = useState(0)

  // Calculate current week dates
  const today = new Date()
  const currentDayOfWeek = today.getDay()
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek
  const mondayDate = new Date(today)
  mondayDate.setDate(today.getDate() + mondayOffset + (weekOffset * 7))
  const sundayDate = new Date(mondayDate)
  sundayDate.setDate(mondayDate.getDate() + 6)

  const weekLabel = `${mondayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} – ${sundayDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`

  const filteredSchedule = filterDept === 'All Departments'
    ? PLACEHOLDER_SCHEDULE
    : PLACEHOLDER_SCHEDULE.filter((s) => s.department === filterDept)

  // Count shifts for summary
  const shiftCounts = filteredSchedule.reduce((acc, entry) => {
    for (const day of DAY_SHORT) {
      const shift = entry[day.toLowerCase() as keyof ShiftEntry] as ShiftType
      acc[shift] = (acc[shift] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  function handleExport() {
    const headers = ['Employee', 'Department', 'Position', ...DAYS]
    const rows = filteredSchedule.map((entry) => [
      entry.name,
      entry.department,
      entry.position,
      ...DAY_SHORT.map((day) => {
        const shift = entry[day.toLowerCase() as keyof ShiftEntry] as ShiftType
        return SHIFT_CONFIG[shift].label
      }),
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `schedule-${weekLabel.replace(/\s/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Schedule exported as CSV')
  }

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Staff Schedules</h1>
          <p className="text-xs text-muted-foreground">Weekly shift planning and assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((w) => w - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{weekLabel}</span>
        </div>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setWeekOffset((w) => w + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {weekOffset !== 0 && (
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', SHIFT_CONFIG.morning.color.split(' ')[0])}>
              <Sun className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Morning Shifts</p>
              <p className="text-lg font-bold">{shiftCounts['morning'] ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950">
              <Coffee className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Evening Shifts</p>
              <p className="text-lg font-bold">{shiftCounts['evening'] ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-700">
              <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Night Shifts</p>
              <p className="text-lg font-bold">{shiftCounts['night'] ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Days Off</p>
              <p className="text-lg font-bold">{shiftCounts['off'] ?? 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters + Legend */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="h-7 rounded-md border bg-background px-3 text-xs max-w-xs"
        >
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <ShiftLegend />
      </div>

      {/* Schedule Grid */}
      <Card className="py-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[600px]">
            <div className="min-w-[900px]">
              {/* Day Headers */}
              <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b bg-muted/50 sticky top-0 z-10">
                <div className="p-3 text-xs font-medium text-muted-foreground flex items-center">Employee</div>
                {DAY_SHORT.map((day, i) => (
                  <div key={day} className="p-3 text-center">
                    <p className="text-xs font-medium text-muted-foreground">{day}</p>
                    <p className="text-xs text-muted-foreground/70">
                      {new Date(mondayDate.getTime() + i * 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                ))}
              </div>
              {/* Rows */}
              {filteredSchedule.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">No staff found for this department</div>
              ) : (
                filteredSchedule.map((entry) => (
                  <div key={entry.employeeId} className="grid grid-cols-[200px_repeat(7,1fr)] border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                    <div className="p-3 flex flex-col justify-center">
                      <p className="text-sm font-medium truncate">{entry.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{entry.position}</p>
                    </div>
                    {DAY_SHORT.map((day) => (
                      <div key={day} className="p-2 flex items-center justify-center">
                        <ShiftBadge shift={entry[day.toLowerCase() as keyof ShiftEntry] as ShiftType} />
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
