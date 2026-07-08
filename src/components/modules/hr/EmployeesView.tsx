'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Search, Users, Plus, Pencil, Trash2, Building2, DollarSign, UserCheck, UserX, X } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDateShort } from '@/lib/format'

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

interface EmployeeFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  position: string
  role: string
  hireDate: string
  salary: string
  status: string
}

const emptyForm: EmployeeFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  position: '',
  role: 'staff',
  hireDate: '',
  salary: '',
  status: 'active',
}

const DEPARTMENTS = [
  'Front Desk',
  'Housekeeping',
  'Food & Beverage',
  'Kitchen',
  'Engineering',
  'Spa & Wellness',
  'Security',
  'Accounting',
  'Sales & Marketing',
  'Management',
  'Human Resources',
  'IT',
]

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'gm', label: 'General Manager' },
  { value: 'manager', label: 'Manager' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'staff', label: 'Staff' },
]

function fetchEmployees(department?: string, status?: string) {
  const params = new URLSearchParams()
  if (department) params.set('department', department)
  if (status) params.set('status', status)
  return apiFetch(`/api/employees?${params.toString()}`)
}

export function EmployeesView() {
  const queryClient = useQueryClient()
  const [filterDept, setFilterDept] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  // Add/Edit dialog state
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [form, setForm] = useState<EmployeeFormData>(emptyForm)

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['employees', filterDept, filterStatus],
    queryFn: () => fetchEmployees(filterDept || undefined, filterStatus || undefined),
  })

  const departments = data?.departmentBreakdown ? Object.keys(data.departmentBreakdown) : []

  const filteredEmployees = data?.employees?.filter((emp: Employee) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      emp.firstName.toLowerCase().includes(q) ||
      emp.lastName.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q) ||
      emp.position.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q)
    )
  })

  // Stats
  const activeCount = data?.employees?.filter((e: Employee) => e.status === 'active').length ?? 0
  const onLeaveCount = data?.employees?.filter((e: Employee) => e.status === 'on_leave').length ?? 0
  const totalSalary = data?.employees?.reduce((sum: number, e: Employee) => sum + (e.salary ?? 0), 0) ?? 0

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (formData: EmployeeFormData) => {
      return apiFetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          salary: formData.salary ? Number(formData.salary) : null,
          hireDate: formData.hireDate || null,
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employee added successfully')
      closeFormDialog()
    },
    onError: () => {
      toast.error('Failed to add employee')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: EmployeeFormData }) => {
      return apiFetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          salary: formData.salary ? Number(formData.salary) : null,
          hireDate: formData.hireDate || null,
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employee updated successfully')
      closeFormDialog()
    },
    onError: () => {
      toast.error('Failed to update employee')
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/api/employees/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employee deleted successfully')
      setDeleteTarget(null)
      if (selectedEmployee?.id === deleteTarget?.id) setSelectedEmployee(null)
    },
    onError: () => {
      toast.error('Failed to delete employee')
    },
  })

  function openCreateDialog() {
    setEditingEmployee(null)
    setForm(emptyForm)
    setShowFormDialog(true)
  }

  function openEditDialog(emp: Employee) {
    setEditingEmployee(emp)
    setForm({
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email ?? '',
      phone: emp.phone ?? '',
      department: emp.department,
      position: emp.position,
      role: emp.role,
      hireDate: emp.hireDate ? emp.hireDate.split('T')[0] : '',
      salary: emp.salary ? String(emp.salary) : '',
      status: emp.status,
    })
    setShowFormDialog(true)
  }

  function closeFormDialog() {
    setShowFormDialog(false)
    setEditingEmployee(null)
    setForm(emptyForm)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName || !form.lastName) {
      toast.error('First name and last name are required')
      return
    }
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, formData: form })
    } else {
      createMutation.mutate(form)
    }
  }

  function handleDelete() {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id)
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-1 flex-col gap-2 p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-sm font-semibold text-gray-700 dark:text-gray-200 tracking-tight">Staff Directory</h1>
          <p className="text-xs text-muted-foreground">Manage and view all hotel staff members</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px]">
            {data?.total ?? 0} employees
          </Badge>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Staff</p>
              <p className="text-lg font-bold">{data?.total ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-lg font-bold">{activeCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
              <UserX className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">On Leave</p>
              <p className="text-lg font-bold">{onLeaveCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-950">
              <DollarSign className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Salary</p>
              <p className="text-lg font-bold">{activeCount > 0 ? formatCurrency(Math.round(totalSalary / (data?.employees?.length ?? 1))) : '—'}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Department Breakdown */}
      {departments.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {departments.map((dept: string) => (
            <Card key={dept} className="p-4 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setFilterDept(filterDept === dept ? '' : dept)}>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground truncate">{dept}</p>
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
              <p className="mt-1 text-lg font-bold">{data?.departmentBreakdown?.[dept] ?? 0}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-xs pl-9"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => setFilterDept(e.target.value)}
          className="h-7 rounded-md border bg-background px-3 text-xs"
        >
          <option value="">All Departments</option>
          {departments.map((d: string) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="h-7 rounded-md border bg-background px-3 text-xs"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="resigned">Resigned</option>
          <option value="terminated">Terminated</option>
        </select>
        {(filterDept || filterStatus || searchQuery) && (
          <button
            type="button"
            onClick={() => { setFilterDept(''); setFilterStatus(''); setSearchQuery('') }}
            className="inline-flex items-center justify-center size-7 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shrink-0"
            title="Clear all filters"
          >
            <X className="size-3.5" strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Employee Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_2px_0_rgb(0_0_0/0.05)] dark:shadow-[0_1px_2px_0_rgb(0_0_0/0.3)]">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead className="hidden lg:table-cell">Hire Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Salary</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-[100px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredEmployees?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No employees found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees?.map((emp: Employee) => (
                    <TableRow
                      key={emp.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <TableCell className="font-medium">
                        {emp.firstName} {emp.lastName}
                      </TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell>{emp.position}</TableCell>
                      <TableCell>
                        <span className="capitalize text-xs">{emp.role.replace('_', ' ')}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={emp.status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {emp.phone ?? '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {emp.hireDate ? formatDateShort(emp.hireDate) : '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {emp.salary ? formatCurrency(emp.salary) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(emp)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(emp)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Employee Detail Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee?.firstName} {selectedEmployee?.lastName}
            </DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xl font-bold">
                  {selectedEmployee.firstName[0]}{selectedEmployee.lastName[0]}
                </div>
                <div>
                  <p className="text-lg font-semibold">{selectedEmployee.firstName} {selectedEmployee.lastName}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmployee.position}</p>
                  <StatusBadge status={selectedEmployee.status} />
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Department:</span>
                  <span className="font-medium">{selectedEmployee.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Role:</span>
                  <span className="capitalize font-medium">{selectedEmployee.role.replace('_', ' ')}</span>
                </div>
                {selectedEmployee.phone && (
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">{selectedEmployee.phone}</span>
                  </div>
                )}
                {selectedEmployee.email && (
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{selectedEmployee.email}</span>
                  </div>
                )}
                {selectedEmployee.hireDate && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Hire Date:</span>
                    <span className="font-medium">{formatDateShort(selectedEmployee.hireDate)}</span>
                  </div>
                )}
                {selectedEmployee.salary && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Salary:</span>
                    <span className="font-medium">{formatCurrency(selectedEmployee.salary)}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => { openEditDialog(selectedEmployee); setSelectedEmployee(null) }}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button variant="outline" className="flex-1 gap-2 text-destructive hover:text-destructive" onClick={() => { setDeleteTarget(selectedEmployee); setSelectedEmployee(null) }}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={showFormDialog} onOpenChange={(open) => { if (!open) closeFormDialog() }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
            <DialogDescription>
              {editingEmployee ? 'Update employee details below.' : 'Fill in the details to add a new employee.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="First name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+977-98XXXXXXXX"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  placeholder="e.g. Receptionist"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hireDate">Hire Date</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={form.hireDate}
                  onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salary">Salary</Label>
                <Input
                  id="salary"
                  type="number"
                  value={form.salary}
                  onChange={(e) => setForm({ ...form, salary: e.target.value })}
                  placeholder="e.g. 50000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                    <SelectItem value="resigned">Resigned</SelectItem>
                    <SelectItem value="terminated">Terminated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={closeFormDialog}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingEmployee ? 'Update Employee' : 'Add Employee'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.firstName} {deleteTarget?.lastName}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
