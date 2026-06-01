import { NextResponse } from 'next/server'

// Sample attendance data for today
const attendanceData = [
  { employeeId: 'emp-001', name: 'Raj Sharma', department: 'Front Desk', position: 'Receptionist', checkIn: '08:55', checkOut: null, status: 'present', late: false },
  { employeeId: 'emp-002', name: 'Sita Thapa', department: 'Front Desk', position: 'Shift Supervisor', checkIn: '09:12', checkOut: null, status: 'present', late: true },
  { employeeId: 'emp-003', name: 'Hari Adhikari', department: 'Housekeeping', position: 'HK Supervisor', checkIn: '06:58', checkOut: null, status: 'present', late: false },
  { employeeId: 'emp-004', name: 'Maya Gurung', department: 'Housekeeping', position: 'Room Attendant', checkIn: '07:15', checkOut: null, status: 'present', late: true },
  { employeeId: 'emp-005', name: 'Bikash Lama', department: 'Food & Beverage', position: 'F&B Manager', checkIn: '08:45', checkOut: null, status: 'present', late: false },
  { employeeId: 'emp-006', name: 'Anita Rai', department: 'Food & Beverage', position: 'Waitress', checkIn: '09:30', checkOut: null, status: 'present', late: true },
  { employeeId: 'emp-007', name: 'Dipak KC', department: 'Kitchen', position: 'Head Chef', checkIn: '06:30', checkOut: null, status: 'present', late: false },
  { employeeId: 'emp-008', name: 'Pramila Devi', department: 'Kitchen', position: 'Sous Chef', checkIn: '06:45', checkOut: null, status: 'present', late: false },
  { employeeId: 'emp-009', name: 'Suman Maharjan', department: 'Engineering', position: 'Maintenance Tech', checkIn: null, checkOut: null, status: 'absent', late: false },
  { employeeId: 'emp-010', name: 'Krishti Poudel', department: 'Engineering', position: 'Electrician', checkIn: '08:50', checkOut: null, status: 'present', late: false },
  { employeeId: 'emp-011', name: 'Ramesh Budhathoki', department: 'Security', position: 'Security Guard', checkIn: '06:00', checkOut: '14:05', status: 'present', late: false },
  { employeeId: 'emp-012', name: 'Nirmala Shrestha', department: 'Accounts', position: 'Accountant', checkIn: '09:45', checkOut: null, status: 'present', late: true },
  { employeeId: 'emp-013', name: 'Gopal Basnet', department: 'Accounts', position: 'Finance Manager', checkIn: '09:00', checkOut: null, status: 'present', late: false },
  { employeeId: 'emp-014', name: 'Srijana Tamang', department: 'Sales & Marketing', position: 'Sales Executive', checkIn: '09:30', checkOut: null, status: 'present', late: true },
  { employeeId: 'emp-015', name: 'Arun Neupane', department: 'HR', position: 'HR Manager', checkIn: '09:02', checkOut: null, status: 'present', late: false },
  { employeeId: 'emp-016', name: 'Binita Magar', department: 'Spa', position: 'Therapist', checkIn: null, checkOut: null, status: 'on_leave', late: false },
  { employeeId: 'emp-017', name: 'Prakash Oli', department: 'IT', position: 'IT Manager', checkIn: '09:10', checkOut: null, status: 'present', late: true },
  { employeeId: 'emp-018', name: 'Srijana Karki', department: 'Front Desk', position: 'Concierge', checkIn: null, checkOut: null, status: 'absent', late: false },
  { employeeId: 'emp-019', name: 'Tika Ram', department: 'Banquet', position: 'Banquet Manager', checkIn: '08:30', checkOut: null, status: 'present', late: false },
  { employeeId: 'emp-020', name: 'Laxmi Pokharel', department: 'Laundry', position: 'Laundry Staff', checkIn: '07:00', checkOut: null, status: 'present', late: false },
]

export async function GET() {
  try {
    const departments = [...new Set(attendanceData.map((a) => a.department))]
    const present = attendanceData.filter((a) => a.status === 'present').length
    const absent = attendanceData.filter((a) => a.status === 'absent').length
    const onLeave = attendanceData.filter((a) => a.status === 'on_leave').length
    const late = attendanceData.filter((a) => a.late).length

    const departmentSummary = departments.map((dept) => {
      const deptEmployees = attendanceData.filter((a) => a.department === dept)
      return {
        department: dept,
        total: deptEmployees.length,
        present: deptEmployees.filter((e) => e.status === 'present').length,
        absent: deptEmployees.filter((e) => e.status === 'absent').length,
        onLeave: deptEmployees.filter((e) => e.status === 'on_leave').length,
        late: deptEmployees.filter((e) => e.late).length,
      }
    })

    return NextResponse.json({
      date: new Date().toISOString().split('T')[0],
      attendance: attendanceData,
      summary: { present, absent, onLeave, late, total: attendanceData.length },
      departmentSummary,
    })
  } catch (error) {
    console.error('Attendance API error:', error)
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
  }
}
