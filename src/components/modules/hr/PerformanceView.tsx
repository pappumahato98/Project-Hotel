'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  TrendingUp, UserCheck, Clock, Star, Award, Target,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmployeePerformance {
  employeeId: string
  name: string
  department: string
  position: string
  avatar: string
  attendanceRate: number
  tasksCompleted: number
  guestSatisfaction: number
  punctuality: number
  overallScore: number
  rank: number
}

interface DeptPerformance {
  department: string
  avgAttendance: number
  avgTasks: number
  avgSatisfaction: number
  avgPunctuality: number
  employeeCount: number
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

const TIME_PERIODS = ['This Month', 'Last Month', 'Last 3 Months', 'This Year']

// Placeholder performance data
const EMPLOYEE_PERFORMANCE: EmployeePerformance[] = [
  { employeeId: '1', name: 'Rajesh Shrestha', department: 'Front Desk', position: 'Receptionist', avatar: 'RS', attendanceRate: 98, tasksCompleted: 45, guestSatisfaction: 4.8, punctuality: 97, overallScore: 96, rank: 1 },
  { employeeId: '2', name: 'Maya Gurung', department: 'Housekeeping', position: 'HK Supervisor', avatar: 'MG', attendanceRate: 97, tasksCompleted: 52, guestSatisfaction: 4.7, punctuality: 96, overallScore: 94, rank: 2 },
  { employeeId: '3', name: 'Deepak Nepal', department: 'Food & Beverage', position: 'F&B Manager', avatar: 'DN', attendanceRate: 96, tasksCompleted: 38, guestSatisfaction: 4.9, punctuality: 98, overallScore: 93, rank: 3 },
  { employeeId: '4', name: 'Hari Bhandari', department: 'Kitchen', position: 'Head Chef', avatar: 'HB', attendanceRate: 95, tasksCompleted: 60, guestSatisfaction: 4.6, punctuality: 94, overallScore: 92, rank: 4 },
  { employeeId: '5', name: 'Sita Kumari', department: 'Front Desk', position: 'Front Desk Agent', avatar: 'SK', attendanceRate: 94, tasksCompleted: 41, guestSatisfaction: 4.5, punctuality: 95, overallScore: 91, rank: 5 },
  { employeeId: '6', name: 'Laxmi Rai', department: 'Housekeeping', position: 'Room Attendant', avatar: 'LR', attendanceRate: 93, tasksCompleted: 55, guestSatisfaction: 4.4, punctuality: 92, overallScore: 88, rank: 6 },
  { employeeId: '7', name: 'Anita Tamang', department: 'Food & Beverage', position: 'Waitress', avatar: 'AT', attendanceRate: 92, tasksCompleted: 35, guestSatisfaction: 4.3, punctuality: 93, overallScore: 87, rank: 7 },
  { employeeId: '8', name: 'Ramesh Karki', department: 'Engineering', position: 'Maintenance Lead', avatar: 'RK', attendanceRate: 91, tasksCompleted: 28, guestSatisfaction: 4.2, punctuality: 90, overallScore: 85, rank: 8 },
  { employeeId: '9', name: 'Sunil Basnet', department: 'Security', position: 'Security Guard', avatar: 'SB', attendanceRate: 96, tasksCompleted: 20, guestSatisfaction: 4.1, punctuality: 98, overallScore: 84, rank: 9 },
  { employeeId: '10', name: 'Srijana Poudel', department: 'Spa & Wellness', position: 'Spa Therapist', avatar: 'SP', attendanceRate: 94, tasksCompleted: 30, guestSatisfaction: 4.7, punctuality: 91, overallScore: 83, rank: 10 },
  { employeeId: '11', name: 'Bikash Thapa', department: 'Front Desk', position: 'Night Auditor', avatar: 'BT', attendanceRate: 90, tasksCompleted: 32, guestSatisfaction: 4.0, punctuality: 89, overallScore: 80, rank: 11 },
  { employeeId: '12', name: 'Priti Maharjan', department: 'Kitchen', position: 'Sous Chef', avatar: 'PM', attendanceRate: 89, tasksCompleted: 48, guestSatisfaction: 4.5, punctuality: 88, overallScore: 78, rank: 12 },
  { employeeId: '13', name: 'Kiran Dahal', department: 'Security', position: 'Security Guard', avatar: 'KD', attendanceRate: 88, tasksCompleted: 18, guestSatisfaction: 3.9, punctuality: 87, overallScore: 76, rank: 13 },
]

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 80) return 'text-teal-600 dark:text-teal-400'
  if (score >= 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function getScoreBg(score: number): string {
  if (score >= 90) return 'bg-emerald-500'
  if (score >= 80) return 'bg-teal-500'
  if (score >= 70) return 'bg-amber-500'
  return 'bg-red-500'
}

function getRankBadge(rank: number) {
  if (rank === 1) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800">🥇 1st</Badge>
  if (rank === 2) return <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600">🥈 2nd</Badge>
  if (rank === 3) return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800">🥉 3rd</Badge>
  return <Badge variant="outline">#{rank}</Badge>
}

function computeDeptPerformance(employees: EmployeePerformance[]): DeptPerformance[] {
  const map = new Map<string, EmployeePerformance[]>()
  for (const emp of employees) {
    if (!map.has(emp.department)) map.set(emp.department, [])
    map.get(emp.department)!.push(emp)
  }
  const result: DeptPerformance[] = []
  for (const [department, emps] of map) {
    const n = emps.length
    result.push({
      department,
      avgAttendance: Math.round(emps.reduce((s, e) => s + e.attendanceRate, 0) / n),
      avgTasks: Math.round(emps.reduce((s, e) => s + e.tasksCompleted, 0) / n),
      avgSatisfaction: Math.round((emps.reduce((s, e) => s + e.guestSatisfaction, 0) / n) * 10) / 10,
      avgPunctuality: Math.round(emps.reduce((s, e) => s + e.punctuality, 0) / n),
      employeeCount: n,
    })
  }
  result.sort((a, b) => b.avgAttendance - a.avgAttendance)
  return result
}

function BarChart({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue: number }) {
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-28 truncate text-right">{item.label}</span>
          <div className="flex-1 h-6 bg-muted rounded-md overflow-hidden">
            <div
              className={cn('h-full rounded-md transition-all duration-500 flex items-center px-2', item.color)}
              style={{ width: `${Math.max((item.value / maxValue) * 100, 8)}%` }}
            >
              <span className="text-[10px] font-medium text-white ml-auto">{item.value}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function PerformanceView() {
  const [filterDept, setFilterDept] = useState('All Departments')
  const [timePeriod, setTimePeriod] = useState('This Month')

  const filteredData = filterDept === 'All Departments'
    ? EMPLOYEE_PERFORMANCE
    : EMPLOYEE_PERFORMANCE.filter((e) => e.department === filterDept)

  const deptPerformance = computeDeptPerformance(EMPLOYEE_PERFORMANCE)

  // Top performers
  const topPerformers = filteredData.slice(0, 3)
  const avgOverall = filteredData.length > 0
    ? Math.round(filteredData.reduce((s, e) => s + e.overallScore, 0) / filteredData.length)
    : 0
  const avgSatisfaction = filteredData.length > 0
    ? Math.round((filteredData.reduce((s, e) => s + e.guestSatisfaction, 0) / filteredData.length) * 10) / 10
    : 0
  const avgAttendance = filteredData.length > 0
    ? Math.round(filteredData.reduce((s, e) => s + e.attendanceRate, 0) / filteredData.length)
    : 0

  const deptChartData = deptPerformance.map((d) => ({
    label: d.department,
    value: d.avgAttendance,
    color: d.avgAttendance >= 95 ? 'bg-emerald-500' : d.avgAttendance >= 90 ? 'bg-teal-500' : 'bg-amber-500',
  }))

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Staff Performance</h1>
          <p className="text-xs text-muted-foreground">Employee performance metrics and rankings</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="h-7 rounded-md border bg-background px-3 text-xs"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(e.target.value)}
            className="h-7 rounded-md border bg-background px-3 text-xs"
          >
            {TIME_PERIODS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Performance</p>
              <p className="text-lg font-bold">{avgOverall}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-950">
              <UserCheck className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Attendance</p>
              <p className="text-lg font-bold">{avgAttendance}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <Star className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Guest Satisfaction</p>
              <p className="text-lg font-bold">{avgSatisfaction}/5</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Staff Tracked</p>
              <p className="text-lg font-bold">{filteredData.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-3">
              {topPerformers.map((emp) => (
                <div key={emp.employeeId} className="flex items-center gap-2 rounded-lg border p-4">
                  <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold',
                    emp.rank === 1 && 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                    emp.rank === 2 && 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
                    emp.rank === 3 && 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
                  )}>
                    {emp.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.position}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('text-sm font-bold', getScoreColor(emp.overallScore))}>{emp.overallScore}%</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={cn('h-full rounded-full', getScoreBg(emp.overallScore))} style={{ width: `${emp.overallScore}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2 lg:grid-cols-2">
        {/* Performance by Department Bar Chart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Attendance by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={deptChartData} maxValue={100} />
          </CardContent>
        </Card>

        {/* Department Performance Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Department Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[280px]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Staff</TableHead>
                    <TableHead className="text-center">Attendance</TableHead>
                    <TableHead className="text-center">Satisfaction</TableHead>
                    <TableHead className="text-center">Punctuality</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptPerformance.map((dept) => (
                    <TableRow key={dept.department}>
                      <TableCell className="font-medium">{dept.department}</TableCell>
                      <TableCell className="text-center">{dept.employeeCount}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn('font-medium', getScoreColor(dept.avgAttendance))}>{dept.avgAttendance}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{dept.avgSatisfaction}/5</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn('font-medium', getScoreColor(dept.avgPunctuality))}>{dept.avgPunctuality}%</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Employee Ranking Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-600" />
            Employee Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead className="w-[80px]">Rank</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="text-center">Attendance</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Tasks</TableHead>
                  <TableHead className="text-center hidden lg:table-cell">Guest Sat.</TableHead>
                  <TableHead className="text-center hidden lg:table-cell">Punctuality</TableHead>
                  <TableHead className="text-center">Overall</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No performance data available
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((emp) => (
                    <TableRow key={emp.employeeId}>
                      <TableCell>{getRankBadge(emp.rank)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                            emp.overallScore >= 90 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                            emp.overallScore >= 80 ? 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          )}>
                            {emp.avatar}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">{emp.department}</TableCell>
                      <TableCell className="text-center">
                        <span className={cn('text-sm font-medium', getScoreColor(emp.attendanceRate))}>{emp.attendanceRate}%</span>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell text-xs">{emp.tasksCompleted}</TableCell>
                      <TableCell className="text-center hidden lg:table-cell text-xs">
                        <span className="font-medium">{emp.guestSatisfaction}</span>
                        <Star className="inline h-3 w-3 text-amber-400 ml-0.5" />
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        <span className={cn('text-sm font-medium', getScoreColor(emp.punctuality))}>{emp.punctuality}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', getScoreBg(emp.overallScore))}
                              style={{ width: `${emp.overallScore}%` }}
                            />
                          </div>
                          <span className={cn('text-sm font-bold min-w-[32px]', getScoreColor(emp.overallScore))}>
                            {emp.overallScore}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
