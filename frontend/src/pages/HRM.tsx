import { useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, Calendar, Clock, UserPlus, Search, Briefcase, Award,
  TrendingUp, FileText, DollarSign, CalendarDays, Loader2
} from "lucide-react";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { PayrollPanel } from "@/components/hr/PayrollPanel";
import { LeaveManagement } from "@/components/hr/LeaveManagement";
import { HRReportsTab } from "@/components/hr/HRReportsTab";
import { useStaffMembers, useStaffDepartments } from "@/hooks/useStaffMembers";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useSearchParams } from "react-router-dom";

const HRM = () => {
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();
  const { data: employees = [], isLoading: staffLoading } = useStaffMembers();
  const { data: departments = [] } = useStaffDepartments();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "employees";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
  };

  if (roleLoading) {
    return (
      <MainLayout title="HR Management" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <Clock className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = !selectedDept || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const stats = [
    { label: "Total Employees", value: employees.length, icon: Users, color: "text-primary" },
    { label: "Departments", value: departments.length, icon: Briefcase, color: "text-blue-400" },
    { label: "On Leave", value: employees.filter(e => e.status === "on_leave").length, icon: Calendar, color: "text-amber-400" },
    { label: "Active", value: employees.filter(e => e.status === "active").length, icon: UserPlus, color: "text-success" },
  ];

  return (
    <MainLayout fixedHeight title="HRM Management" subtitle="Employee management and HR operations">
      <div className="flex flex-col h-full overflow-hidden">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 px-4 sm:px-6 flex-shrink-0">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">
                    {staffLoading ? <Skeleton className="h-8 w-10" /> : stat.value}
                  </p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden space-y-6">
        <div className="px-4 sm:px-6">
        <TabsList>
          <TabsTrigger value="employees" className="gap-2"><Users className="h-4 w-4" />Employees</TabsTrigger>
          <TabsTrigger value="payroll" className="gap-2"><DollarSign className="h-4 w-4" />Payroll</TabsTrigger>
          <TabsTrigger value="leave" className="gap-2"><CalendarDays className="h-4 w-4" />Leave</TabsTrigger>
          <TabsTrigger value="reports" className="gap-2"><TrendingUp className="h-4 w-4" />Reports</TabsTrigger>
        </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide p-4 sm:p-6">
        <TabsContent value="employees" className="mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card variant="elevated">
              <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/staff?tab=directory")}>
                  <UserPlus className="h-4 w-4" />Add Employee
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => navigate("/staff?tab=schedules")}>
                  <Calendar className="h-4 w-4" />Schedule Shifts
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleTabChange("payroll")}>
                  <Clock className="h-4 w-4" />Time & Attendance
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleTabChange("leave")}>
                  <FileText className="h-4 w-4" />Leave Requests
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleTabChange("reports")}>
                  <Award className="h-4 w-4" />Performance Reviews
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => handleTabChange("payroll")}>
                  <TrendingUp className="h-4 w-4" />Payroll Reports
                </Button>
              </CardContent>
            </Card>

            <Card variant="elevated" className="lg:col-span-3">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Employees</CardTitle>
                    <CardDescription>Manage staff records</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search..." value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-48" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pt-2">
                  <Button variant={selectedDept === null ? "secondary" : "outline"} size="sm" onClick={() => setSelectedDept(null)}>All</Button>
                  {departments.map(dept => (
                    <Button key={dept} variant={selectedDept === dept ? "secondary" : "outline"} size="sm"
                      onClick={() => setSelectedDept(dept)}>{dept}</Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {staffLoading ? (
                  <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Hire Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No employees found. Add staff via Staff Management.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredEmployees.map((emp) => (
                            <TableRow key={emp.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                                    <span className="text-sm font-semibold text-primary">
                                      {emp.first_name[0]}{emp.last_name[0]}
                                    </span>
                                  </div>
                                  <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{emp.department}</TableCell>
                              <TableCell>{emp.position}</TableCell>
                              <TableCell>
                                <Badge variant="outline"
                                  className={emp.status === "active"
                                    ? "bg-success/20 text-success border-success/30"
                                    : "bg-amber-500/20 text-amber-400 border-amber-500/30"}>
                                  {emp.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {new Date(emp.hire_date).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="mt-0 focus-visible:outline-none"><PayrollPanel /></TabsContent>
        <TabsContent value="leave" className="mt-0 focus-visible:outline-none"><LeaveManagement /></TabsContent>
        <TabsContent value="reports" className="mt-0 focus-visible:outline-none"><HRReportsTab /></TabsContent>
        </div>
      </Tabs>
      </div>
    </MainLayout>
  );
};

const HRMPage = () => (
  <ErrorBoundary>
    <HRM />
  </ErrorBoundary>
);

export default HRMPage;
