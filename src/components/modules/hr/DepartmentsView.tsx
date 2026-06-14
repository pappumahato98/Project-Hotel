'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Building2, Users, DollarSign, UserCircle, Plus, ChevronRight, X } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency } from '@/lib/format'

interface Employee {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  department: string
  position: string
  role: string
  hireDate?: string
  salary?: number
  status: string
}

interface DepartmentData {
  name: string
  employees: Employee[]
  head: Employee | null
  count: number
  avgSalary: number
  totalSalary: number
  activeCount: number
}

function fetchEmployees() {
  return apiFetch('/api/employees')
}

export function DepartmentsView() {
  const [selectedDept, setSelectedDept] = useState<DepartmentData | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newDeptName, setNewDeptName] = useState('')
  const [newDeptDesc, setNewDeptDesc] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
  })

  // Build departments from employees
  const departments: DepartmentData[] = (() => {
    if (!data?.employees) return []
    const map = new Map<string, Employee[]>()
    for (const emp of data.employees as Employee[]) {
      const dept = emp.department || 'Unassigned'
      if (!map.has(dept)) map.set(dept, [])
      map.get(dept)!.push(emp)
    }
    const result: DepartmentData[] = []
    for (const [name, employees] of map) {
      const activeEmps = employees.filter((e) => e.status === 'active')
      const salaries = employees.map((e) => e.salary ?? 0)
      const head = employees.find((e) =>
        e.role === 'admin' || e.role === 'gm' || e.role === 'manager'
      )
      result.push({
        name,
        employees,
        head: head ?? null,
        count: employees.length,
        avgSalary: salaries.length > 0 ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : 0,
        totalSalary: salaries.reduce((a, b) => a + b, 0),
        activeCount: activeEmps.length,
      })
    }
    result.sort((a, b) => b.count - a.count)
    return result
  })()

  const totalDepts = departments.length
  const totalStaff = data?.employees?.length ?? 0
  const totalSalary = departments.reduce((sum, d) => sum + d.totalSalary, 0)
  const avgSalary = totalStaff > 0 ? Math.round(totalSalary / totalStaff) : 0

  function handleAddDepartment() {
    if (!newDeptName.trim()) {
      toast.error('Department name is required')
      return
    }
    toast.info(`Department "${newDeptName}" created. Add employees via Staff Directory.`)
    setShowAddDialog(false)
    setNewDeptName('')
    setNewDeptDesc('')
  }

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Departments</h1>
          <p className="text-xs text-muted-foreground">Overview of all hotel departments and their staff</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Department
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <Building2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Departments</p>
              <p className="text-lg font-bold">{totalDepts}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-950">
              <Users className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Staff</p>
              <p className="text-lg font-bold">{totalStaff}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <DollarSign className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Payroll</p>
              <p className="text-lg font-bold">{formatCurrency(totalSalary)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Salary</p>
              <p className="text-lg font-bold">{formatCurrency(avgSalary)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Department Cards */}
      {isLoading ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-5 w-[100px] mb-3" />
              <Skeleton className="h-4 w-[200px]" />
            </Card>
          ))}
        </div>
      ) : departments.length === 0 ? (
        <Card className="p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-lg font-medium">No departments yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add a department to get started</p>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <Card key={dept.name} className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedDept(dept)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{dept.name}</h3>
                    <p className="text-xs text-muted-foreground">{dept.activeCount} active</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Staff</span>
                  <span className="font-medium">{dept.count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Avg Salary</span>
                  <span className="font-medium">{dept.avgSalary > 0 ? formatCurrency(dept.avgSalary) : '—'}</span>
                </div>
                {dept.head && (
                  <div className="flex items-center gap-2 pt-1">
                    <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs truncate">Head: {dept.head.firstName} {dept.head.lastName}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Department Detail Dialog */}
      <Dialog open={!!selectedDept} onOpenChange={() => setSelectedDept(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
              {selectedDept?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedDept?.count} staff member{selectedDept?.count !== 1 ? 's' : ''} &middot; Avg Salary: {selectedDept ? formatCurrency(selectedDept.avgSalary) : ''}
            </DialogDescription>
          </DialogHeader>
          {selectedDept && (
            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{selectedDept.count}</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Total</p>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3 text-center">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{selectedDept.activeCount}</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Active</p>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{formatCurrency(selectedDept.totalSalary)}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">Total Payroll</p>
                </div>
              </div>

              {/* Employee List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Staff Members</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="max-h-[350px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Salary</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedDept.employees.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              No staff in this department
                            </TableCell>
                          </TableRow>
                        ) : (
                          selectedDept.employees.map((emp) => (
                            <TableRow key={emp.id}>
                              <TableCell className="font-medium">
                                {emp.firstName} {emp.lastName}
                              </TableCell>
                              <TableCell className="text-sm">{emp.position}</TableCell>
                              <TableCell>
                                <span className="capitalize text-xs">{emp.role.replace('_', ' ')}</span>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={emp.status} />
                              </TableCell>
                              <TableCell className="text-right">
                                {emp.salary ? formatCurrency(emp.salary) : '—'}
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
          )}
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) { setShowAddDialog(false); setNewDeptName(''); setNewDeptDesc('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
            <DialogDescription>Create a new department. You can assign employees via the Staff Directory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deptName">Department Name *</Label>
              <Input
                id="deptName"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. Room Service"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deptDesc">Description</Label>
              <Textarea
                id="deptDesc"
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
                placeholder="Brief description of the department"
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowAddDialog(false); setNewDeptName(''); setNewDeptDesc('') }}>Cancel</Button>
              <Button className="flex-1" onClick={handleAddDepartment}>Create Department</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
