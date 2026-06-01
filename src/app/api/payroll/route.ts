import { NextResponse } from 'next/server'

const payrollData = [
  { employeeId: 'emp-001', name: 'Raj Sharma', department: 'Front Desk', position: 'Receptionist', baseSalary: 25000, variablePay: 3000, overtime: 1500, deductions: 2750, netPay: 26750 },
  { employeeId: 'emp-002', name: 'Sita Thapa', department: 'Front Desk', position: 'Shift Supervisor', baseSalary: 35000, variablePay: 5000, overtime: 0, deductions: 4000, netPay: 36000 },
  { employeeId: 'emp-003', name: 'Hari Adhikari', department: 'Housekeeping', position: 'HK Supervisor', baseSalary: 30000, variablePay: 2000, overtime: 800, deductions: 3280, netPay: 29520 },
  { employeeId: 'emp-004', name: 'Maya Gurung', department: 'Housekeeping', position: 'Room Attendant', baseSalary: 18000, variablePay: 1000, overtime: 1200, deductions: 2020, netPay: 18180 },
  { employeeId: 'emp-005', name: 'Bikash Lama', department: 'Food & Beverage', position: 'F&B Manager', baseSalary: 55000, variablePay: 8000, overtime: 0, deductions: 6300, netPay: 56700 },
  { employeeId: 'emp-006', name: 'Anita Rai', department: 'Food & Beverage', position: 'Waitress', baseSalary: 16000, variablePay: 2500, overtime: 500, deductions: 1900, netPay: 17100 },
  { employeeId: 'emp-007', name: 'Dipak KC', department: 'Kitchen', position: 'Head Chef', baseSalary: 65000, variablePay: 10000, overtime: 0, deductions: 7500, netPay: 67500 },
  { employeeId: 'emp-008', name: 'Pramila Devi', department: 'Kitchen', position: 'Sous Chef', baseSalary: 45000, variablePay: 6000, overtime: 0, deductions: 5100, netPay: 45900 },
  { employeeId: 'emp-010', name: 'Krishti Poudel', department: 'Engineering', position: 'Maintenance Tech', baseSalary: 22000, variablePay: 1500, overtime: 2000, deductions: 2550, netPay: 22950 },
  { employeeId: 'emp-011', name: 'Ramesh Budhathoki', department: 'Security', position: 'Security Guard', baseSalary: 18000, variablePay: 1000, overtime: 1500, deductions: 2050, netPay: 18450 },
  { employeeId: 'emp-012', name: 'Nirmala Shrestha', department: 'Accounts', position: 'Accountant', baseSalary: 40000, variablePay: 4000, overtime: 0, deductions: 4400, netPay: 39600 },
  { employeeId: 'emp-013', name: 'Gopal Basnet', department: 'Accounts', position: 'Finance Manager', baseSalary: 60000, variablePay: 7000, overtime: 0, deductions: 6700, netPay: 60300 },
  { employeeId: 'emp-014', name: 'Srijana Tamang', department: 'Sales & Marketing', position: 'Sales Executive', baseSalary: 35000, variablePay: 12000, overtime: 0, deductions: 4700, netPay: 42300 },
  { employeeId: 'emp-015', name: 'Arun Neupane', department: 'HR', position: 'HR Manager', baseSalary: 50000, variablePay: 5000, overtime: 0, deductions: 5500, netPay: 49500 },
  { employeeId: 'emp-017', name: 'Prakash Oli', department: 'IT', position: 'IT Manager', baseSalary: 55000, variablePay: 6000, overtime: 0, deductions: 6100, netPay: 54900 },
  { employeeId: 'emp-019', name: 'Tika Ram', department: 'Banquet', position: 'Banquet Manager', baseSalary: 40000, variablePay: 8000, overtime: 500, deductions: 4850, netPay: 43650 },
  { employeeId: 'emp-020', name: 'Laxmi Pokharel', department: 'Laundry', position: 'Laundry Staff', baseSalary: 15000, variablePay: 800, overtime: 600, deductions: 1640, netPay: 14760 },
]

export async function GET() {
  try {
    const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' })

    const totalBaseSalary = payrollData.reduce((s, e) => s + e.baseSalary, 0)
    const totalVariablePay = payrollData.reduce((s, e) => s + e.variablePay, 0)
    const totalOvertime = payrollData.reduce((s, e) => s + e.overtime, 0)
    const totalDeductions = payrollData.reduce((s, e) => s + e.deductions, 0)
    const totalNetPay = payrollData.reduce((s, e) => s + e.netPay, 0)

    const departments = [...new Set(payrollData.map((e) => e.department))]
    const departmentTotals = departments.map((dept) => {
      const deptEmployees = payrollData.filter((e) => e.department === dept)
      return {
        department: dept,
        employeeCount: deptEmployees.length,
        totalBaseSalary: deptEmployees.reduce((s, e) => s + e.baseSalary, 0),
        totalVariablePay: deptEmployees.reduce((s, e) => s + e.variablePay, 0),
        totalDeductions: deptEmployees.reduce((s, e) => s + e.deductions, 0),
        totalNetPay: deptEmployees.reduce((s, e) => s + e.netPay, 0),
      }
    })

    return NextResponse.json({
      month,
      employees: payrollData,
      departmentTotals,
      summary: { totalBaseSalary, totalVariablePay, totalOvertime, totalDeductions, totalNetPay, employeeCount: payrollData.length },
    })
  } catch (error) {
    console.error('Payroll API error:', error)
    return NextResponse.json({ error: 'Failed to fetch payroll' }, { status: 500 })
  }
}
