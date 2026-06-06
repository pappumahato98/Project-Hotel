'use client'

import { useNavigationStore } from '@/lib/store'
import { EmployeesView } from './EmployeesView'
import { DepartmentsView } from './DepartmentsView'
import { AttendanceView } from './AttendanceView'
import { PayrollView } from './PayrollView'
import { SchedulesView } from './SchedulesView'
import { PerformanceView } from './PerformanceView'

export default function HrModule() {
  const { activeSubModule } = useNavigationStore()

  switch (activeSubModule) {
    case 'employees':
      return <EmployeesView />
    case 'departments':
      return <DepartmentsView />
    case 'attendance':
      return <AttendanceView />
    case 'payroll':
      return <PayrollView />
    case 'schedules':
      return <SchedulesView />
    case 'performance':
      return <PerformanceView />
    default:
      return <EmployeesView />
  }
}
