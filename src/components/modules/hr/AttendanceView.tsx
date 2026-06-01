'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, Users, AlertTriangle, UserX, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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

async function fetchAttendance() {
  const res = await fetch('/api/attendance')
  if (!res.ok) throw new Error('Failed to fetch attendance')
  return res.json()
}

export function AttendanceView() {
  const { data, isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: fetchAttendance,
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Today&apos;s Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Real-time attendance tracking for {data?.date ?? '...'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Present</p>
              <p className="text-2xl font-bold">{data?.summary?.present ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-950">
              <UserX className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Absent</p>
              <p className="text-2xl font-bold">{data?.summary?.absent ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Late Arrivals</p>
              <p className="text-2xl font-bold">{data?.summary?.late ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">On Leave</p>
              <p className="text-2xl font-bold">{data?.summary?.onLeave ?? '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Department-wise Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Department Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[200px]">
            <Table>
              <TableHeader>
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

      {/* Detailed Attendance Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Attendance Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
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
                  : data?.attendance?.map((record: AttendanceRecord) => (
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
                        <TableCell className="text-sm">{record.department}</TableCell>
                        <TableCell className="text-sm">{record.position}</TableCell>
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
