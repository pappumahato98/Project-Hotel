'use client'

import { useNavigationStore } from '@/lib/store'
import { EmployeesView } from './EmployeesView'
import { AttendanceView } from './AttendanceView'
import { PayrollView } from './PayrollView'

export default function HrModule() {
  const { activeSubModule } = useNavigationStore()

  switch (activeSubModule) {
    case 'employees':
      return <EmployeesView />
    case 'attendance':
      return <AttendanceView />
    case 'payroll':
      return <PayrollView />
    default:
      return <EmployeesView />
  }
}
