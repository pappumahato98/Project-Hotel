'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Clock, AlertTriangle, UserX, CheckCircle, CalendarIcon, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toDateOnly, fromDateOnly, formatDate } from '@/lib/format'

// ── Types ────────────────────────────────────────────────────
interface AttendanceRecord {
  employeeId: string
  name: string
  department: string
  position: string
  checkIn: string | null
  checkOut: string | null
  status: string
  late: boolean
}

interface DeptSummary {
  department: string
  total: number
  present: number
  absent: number
  onLeave: number
  late: number
}

export function AttendanceView() {
  const today = toDateOnly(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const dateStr = toDateOnly(selectedDate)

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', dateStr, departmentFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      params.set('date', dateStr)
      if (departmentFilter !== 'all') params.set('department', departmentFilter)
      return apiFetch(`/api/attendance?${params.toString()}`)
    },
  })

  // Filter attendance by search query (client-side)
  const filteredAttendance = useMemo(() => {
    const records = data?.attendance ?? []
    if (!searchQuery) return records
    const q = searchQuery.toLowerCase()
    return records.filter((r: AttendanceRecord) =>
      r.name.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.position.toLowerCase().includes(q),
    )
  }, [data?.attendance, searchQuery])

  const isToday = dateStr === today

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">
            {isToday ? "Today's Attendance" : `Attendance — ${formatDate(dateStr)}`}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isToday ? 'Real-time attendance tracking' : `Attendance records for ${formatDate(dateStr)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date Picker */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                {formatDate(dateStr)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  if (d) {
                    setSelectedDate(d)
                    setCalendarOpen(false)
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Department Filter */}
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[150px] h-7 text-[11px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {data?.departmentSummary?.map((dept: DeptSummary) => (
                <SelectItem key={dept.department} value={dept.department}>{dept.department}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Present</p>
              <p className="text-lg font-bold">{data?.summary?.present ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <UserX className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Absent</p>
              <p className="text-lg font-bold">{data?.summary?.absent ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Late Arrivals</p>
              <p className="text-lg font-bold">{data?.summary?.late ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">On Leave</p>
              <p className="text-lg font-bold">{data?.summary?.onLeave ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Department-wise Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Department Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[200px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Late</TableHead>
                  <TableHead className="text-center">On Leave</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j} className="text-center">
                            <Skeleton className="mx-auto h-4 w-[40px]" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : data?.departmentSummary?.map((dept: DeptSummary) => (
                      <TableRow key={dept.department}>
                        <TableCell className="font-medium">{dept.department}</TableCell>
                        <TableCell className="text-center">{dept.total}</TableCell>
                        <TableCell className="text-center text-green-600 font-medium">{dept.present}</TableCell>
                        <TableCell className={cn('text-center font-medium', dept.absent > 0 && 'text-red-600')}>
                          {dept.absent}
                        </TableCell>
                        <TableCell className={cn('text-center font-medium', dept.late > 0 && 'text-amber-600')}>
                          {dept.late}
                        </TableCell>
                        <TableCell className="text-center text-blue-600">{dept.onLeave}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Employee Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn('pl-9', searchQuery && 'pr-7')}
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              onClick={() => setSearchQuery('')}
            >
              <X className="size-3" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Detailed Attendance Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Attendance Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="hidden md:table-cell">Position</TableHead>
                  <TableHead className="text-center">Check In</TableHead>
                  <TableHead className="text-center">Check Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-[80px]" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : filteredAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        {searchQuery ? 'No employees match your search.' : 'No attendance records found.'}
                      </TableCell>
                    </TableRow>
                  ) : filteredAttendance.map((record: AttendanceRecord) => (
                      <TableRow key={record.employeeId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {record.name}
                            {record.late && (
                              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                                LATE
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{record.department}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{record.position}</TableCell>
                        <TableCell className="text-center">
                          {record.checkIn ? (
                            <span className={cn(record.late && 'text-amber-600 font-medium')}>
                              {record.checkIn}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {record.checkOut ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {record.status === 'present' ? (
                            <Badge variant="outline" className="border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300 text-xs">
                              Present
                            </Badge>
                          ) : record.status === 'absent' ? (
                            <Badge variant="outline" className="border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300 text-xs">
                              Absent
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs">
                              On Leave
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
