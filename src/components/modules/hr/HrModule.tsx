'use client'

import { useNavigationStore } from '@/lib/store'
import { EmployeesView } from './EmployeesView'
import { DepartmentsView } from './DepartmentsView'
import { AttendanceView } from './AttendanceView'
import { PayrollView } from './PayrollView'
import { SchedulesView } from './SchedulesView'
import { PerformanceView } from './PerformanceView'
import { LeaveManagementView } from './LeaveManagementView'
import { TrainingView } from './TrainingView'
import { ShiftExchangeView } from './ShiftExchangeView'
import { RecruitmentView } from './RecruitmentView'
import { EmployeeDocumentsView } from './EmployeeDocumentsView'
import { GrievancesView } from './GrievancesView'

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
    case 'leave':
      return <LeaveManagementView />
    case 'training':
      return <TrainingView />
    case 'shift-exchange':
      return <ShiftExchangeView />
    case 'recruitment':
      return <RecruitmentView />
    case 'documents':
      return <EmployeeDocumentsView />
    case 'grievances':
      return <GrievancesView />
    default:
      return <EmployeesView />
  }
}
