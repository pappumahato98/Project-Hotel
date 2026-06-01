'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Download, DollarSign, TrendingUp, Users, Banknote } from 'lucide-react'
import { formatNPR } from '@/lib/utils'

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

async function fetchPayroll() {
  const res = await fetch('/api/payroll')
  if (!res.ok) throw new Error('Failed to fetch payroll')
  return res.json()
}

export function PayrollView() {
  const { data, isLoading } = useQuery({
    queryKey: ['payroll'],
    queryFn: fetchPayroll,
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monthly Payroll</h1>
          <p className="text-sm text-muted-foreground">
            Payroll summary for {data?.month ?? '...'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Employees</p>
              <p className="text-2xl font-bold">{data?.summary?.employeeCount ?? '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Base Salaries</p>
              <p className="text-lg font-bold">{data?.summary ? formatNPR(data.summary.totalBaseSalary) : '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <TrendingUp className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Variable Pay</p>
              <p className="text-lg font-bold">{data?.summary ? formatNPR(data.summary.totalVariablePay) : '—'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
              <Banknote className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Net Pay</p>
              <p className="text-lg font-bold">{data?.summary ? formatNPR(data.summary.totalNetPay) : '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Department Totals */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Department Totals</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[250px]">
            <Table>
              <TableHeader>
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
          <CardTitle className="text-base">Individual Payroll Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
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
                        <TableCell className="hidden md:table-cell text-sm">{emp.position}</TableCell>
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
