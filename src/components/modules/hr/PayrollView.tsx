'use client'
import { toast } from 'sonner'
import { useState } from 'react'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Download, DollarSign, TrendingUp, TrendingDown, Users, Banknote, Loader2 } from 'lucide-react'
import { formatNPR } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────
interface PayrollEmployee {
  employeeId: string
  name: string
  department: string
  position: string
  baseSalary: number
  variablePay: number
  overtime: number
  deductions: number
  netPay: number
}

interface DeptTotal {
  department: string
  employeeCount: number
  totalBaseSalary: number
  totalVariablePay: number
  totalDeductions: number
  totalNetPay: number
}

interface PayrollData {
  month: string
  employees: PayrollEmployee[]
  departmentTotals: DeptTotal[]
  summary: {
    totalBaseSalary: number
    totalVariablePay: number
    totalOvertime: number
    totalDeductions: number
    totalNetPay: number
    employeeCount: number
  }
}

interface PayrollComparison {
  currentMonth: PayrollData | null
  previousMonth: PayrollData | null
}

function escapeCsvField(value: string | number | null | undefined): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function getMonthStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function getPreviousMonthStr(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number)
  const d = new Date(year, month - 2, 1)
  return getMonthStr(d)
}

function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number)
  const d = new Date(year, month - 1, 1)
  return d.toLocaleString('default', { month: 'long', year: 'numeric' })
}

export function PayrollView() {
  const queryClient = useQueryClient()
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(getMonthStr(today))

  const previousMonth = getPreviousMonthStr(selectedMonth)

  // Fetch current month payroll
  const { data, isLoading } = useQuery<PayrollData>({
    queryKey: ['payroll', selectedMonth],
    queryFn: () => apiFetch(`/api/payroll?month=${selectedMonth}`),
  })

  // Fetch previous month payroll for comparison
  const { data: prevData } = useQuery<PayrollData>({
    queryKey: ['payroll', previousMonth],
    queryFn: () => apiFetch(`/api/payroll?month=${previousMonth}`),
  })

  // Process Payroll mutation
  const processMutation = useMutation({
    mutationFn: () => apiFetch('/api/payroll', {
      method: 'POST',
      body: JSON.stringify({ month: selectedMonth }),
    }),
    onSuccess: () => {
      toast.success('Payroll processed successfully')
      queryClient.invalidateQueries({ queryKey: ['payroll'] })
    },
    onError: () => toast.error('Failed to process payroll'),
  })

  const handleExportPayroll = () => {
    if (!data?.employees) {
      toast.error('No payroll data to export')
      return
    }
    const rows: string[][] = [
      ['Employee Name', 'Position', 'Department', 'Base Salary', 'Variable Pay', 'Overtime', 'Deductions', 'Net Pay'],
      ...data.employees.map((emp: PayrollEmployee) => [
        emp.name,
        emp.position,
        emp.department,
        String(emp.baseSalary),
        String(emp.variablePay),
        String(emp.overtime),
        String(emp.deductions),
        String(emp.netPay),
      ]),
    ]
    if (data.summary) {
      rows.push([])
      rows.push(['TOTAL', '', '', String(data.summary.totalBaseSalary), String(data.summary.totalVariablePay), String(data.summary.totalOvertime ?? 0), String(data.summary.totalDeductions), String(data.summary.totalNetPay)])
    }
    const csvContent = rows.map(r => r.map(escapeCsvField).join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll-${selectedMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Payroll exported as CSV')
  }

  // Trend calculations
  const trendTotalNetPay = prevData?.summary && data?.summary
    ? data.summary.totalNetPay - prevData.summary.totalNetPay
    : null
  const trendTotalBaseSalary = prevData?.summary && data?.summary
    ? data.summary.totalBaseSalary - prevData.summary.totalBaseSalary
    : null

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Monthly Payroll</h1>
          <p className="text-xs text-muted-foreground">
            Payroll summary for {data?.month || formatMonthLabel(selectedMonth)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-7 text-[11px] rounded-md border border-input bg-background px-2 text-foreground"
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-7 text-[11px]"
            onClick={handleExportPayroll}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            size="sm"
            className="gap-2 h-7 text-[11px]"
            onClick={() => processMutation.mutate()}
            disabled={processMutation.isPending}
          >
            {processMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Banknote className="h-3.5 w-3.5" />
            )}
            Process Payroll
          </Button>
        </div>
      </div>

      {/* Month Comparison Indicator */}
      {prevData?.summary && data?.summary && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>vs previous month ({formatMonthLabel(previousMonth)})</span>
          {trendTotalNetPay !== null && (
            <Badge
              variant="outline"
              className={cn(
                trendTotalNetPay >= 0
                  ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300'
                  : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300',
                'text-[10px]',
              )}
            >
              {trendTotalNetPay >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {trendTotalNetPay >= 0 ? '+' : ''}{formatNPR(trendTotalNetPay)} net pay
            </Badge>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Employees</p>
              <p className="text-lg font-bold">{data?.summary?.employeeCount ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Base Salaries</p>
              <p className="text-lg font-bold">{data?.summary ? formatNPR(data.summary.totalBaseSalary) : '—'}</p>
              {trendTotalBaseSalary !== null && trendTotalBaseSalary !== 0 && (
                <p className={cn('text-[10px]', trendTotalBaseSalary > 0 ? 'text-green-600' : 'text-red-600')}>
                  {trendTotalBaseSalary > 0 ? '+' : ''}{formatNPR(trendTotalBaseSalary)}
                </p>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Variable Pay</p>
              <p className="text-lg font-bold">{data?.summary ? formatNPR(data.summary.totalVariablePay) : '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
              <Banknote className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Net Pay</p>
              <p className="text-lg font-bold">{data?.summary ? formatNPR(data.summary.totalNetPay) : '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Department Totals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Department Totals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[250px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Employees</TableHead>
                  <TableHead className="text-right">Base Salary</TableHead>
                  <TableHead className="text-right">Variable Pay</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Total Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-[80px]" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : data?.departmentTotals?.map((dept: DeptTotal) => (
                      <TableRow key={dept.department}>
                        <TableCell className="font-medium">{dept.department}</TableCell>
                        <TableCell className="text-center">{dept.employeeCount}</TableCell>
                        <TableCell className="text-right">{formatNPR(dept.totalBaseSalary)}</TableCell>
                        <TableCell className="text-right">{formatNPR(dept.totalVariablePay)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatNPR(dept.totalDeductions)}</TableCell>
                        <TableCell className="text-right font-bold">{formatNPR(dept.totalNetPay)}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Individual Payroll */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Individual Payroll Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden md:table-cell">Position</TableHead>
                  <TableHead className="text-right">Base Salary</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Variable Pay</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Overtime</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 12 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-[80px]" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : data?.employees?.map((emp: PayrollEmployee) => (
                      <TableRow key={emp.employeeId}>
                        <TableCell className="font-medium">{emp.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{emp.position}</TableCell>
                        <TableCell className="text-right">{formatNPR(emp.baseSalary)}</TableCell>
                        <TableCell className="text-right hidden md:table-cell text-green-600">{formatNPR(emp.variablePay)}</TableCell>
                        <TableCell className="text-right hidden lg:table-cell">{formatNPR(emp.overtime)}</TableCell>
                        <TableCell className="text-right text-red-600">{formatNPR(emp.deductions)}</TableCell>
                        <TableCell className="text-right font-bold">{formatNPR(emp.netPay)}</TableCell>
                      </TableRow>
                    ))}
                {data?.employees && (
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{data?.summary ? formatNPR(data.summary.totalBaseSalary) : ''}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">{data?.summary ? formatNPR(data.summary.totalVariablePay) : ''}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell">{data?.summary ? formatNPR(data.summary.totalOvertime) : ''}</TableCell>
                    <TableCell className="text-right text-red-600">{data?.summary ? formatNPR(data.summary.totalDeductions) : ''}</TableCell>
                    <TableCell className="text-right">{data?.summary ? formatNPR(data.summary.totalNetPay) : ''}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
