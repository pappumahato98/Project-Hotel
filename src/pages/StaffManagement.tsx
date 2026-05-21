import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUIPreferences } from "@/hooks/useSettings";
import {
  Users,
  UserCircle,
  Settings,
  Bell,
  ShieldCheck,
  FileText,
  Loader2,
  Info,
  Smartphone
} from "lucide-react";
import { useIsAdmin, useIsManager } from "@/hooks/useUserRole";
import { useSearchParams, useNavigate } from "react-router-dom";
import { StaffDirectoryTab } from "@/components/staff/StaffDirectoryTab";
import { PersonalDetailsTab } from "@/components/staff/PersonalDetailsTab";
import { PreferencesTab } from "@/components/staff/PreferencesTab";
import { AlertsTab } from "@/components/staff/AlertsTab";
import { SecurityTab } from "@/components/staff/SecurityTab";
import { LogsReportTab } from "@/components/staff/LogsReportTab";
import { SchedulesTab } from "@/components/staff/SchedulesTab";
import { AttendanceTab } from "@/components/staff/AttendanceTab";
import { StaffAnalyticsTab } from "@/components/staff/StaffAnalyticsTab";
import { PayrollTab } from "@/components/staff/PayrollTab";
import { LeaveTab } from "@/components/staff/LeaveTab";
import { PerformanceTab } from "@/components/staff/PerformanceTab";
import { cn } from "@/lib/utils";
import { CalendarDays, Clock as ClockIcon, BarChart3, DollarSign, CalendarX, Award } from "lucide-react";

const StaffManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, isLoading: loadingAdmin } = useIsAdmin();
  const { isManager, isLoading: loadingManager } = useIsManager();

  const activeTab = searchParams.get("tab") || (isAdmin || isManager ? "directory" : "details");

  const handleTabChange = (value: string) => {
    setSearchParams(prev => {
      prev.set("tab", value);
      return prev;
    });
  };

  if (loadingAdmin || loadingManager) {
    return (
      <MainLayout title="Staff Management" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const canSeeRestricted = isAdmin || isManager;

  return (
    <MainLayout fixedHeight title="Staff Management" subtitle="Manage employees and your professional profile">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full h-full flex flex-col overflow-hidden">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 flex-1 overflow-hidden p-4 sm:p-6">
          <aside className="w-full md:w-64 flex-shrink-0 md:h-full md:overflow-y-auto scrollbar-hide">
            <TabsList
              className={cn(
                "flex md:flex-col h-auto w-full bg-card/50 border border-border/50 p-2 gap-1 overflow-x-auto md:overflow-visible justify-start md:items-stretch rounded-xl scrollbar-hide transition-all duration-300",
              )}
            >
              {canSeeRestricted && (
                <TabsTrigger value="directory" className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
                  <Users className="h-4 w-4" />
                  <span className="whitespace-nowrap">Staff Directory</span>
                </TabsTrigger>
              )}

              <TabsTrigger value="details" className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
                <UserCircle className="h-4 w-4" />
                <span className="whitespace-nowrap">My Profile</span>
              </TabsTrigger>

              <TabsTrigger value="preferences" className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
                <Settings className="h-4 w-4" />
                <span className="whitespace-nowrap">Preferences</span>
              </TabsTrigger>

              <TabsTrigger value="attendance" className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
                <ClockIcon className="h-4 w-4" />
                <span className="whitespace-nowrap">Attendance</span>
              </TabsTrigger>

              <TabsTrigger value="schedules" className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
                <CalendarDays className="h-4 w-4" />
                <span className="whitespace-nowrap">Schedules</span>
              </TabsTrigger>

              <TabsTrigger value="payroll" className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
                <DollarSign className="h-4 w-4" />
                <span className="whitespace-nowrap">Payroll</span>
              </TabsTrigger>

              <TabsTrigger value="leave" className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
                <CalendarX className="h-4 w-4" />
                <span className="whitespace-nowrap">Leave</span>
              </TabsTrigger>

              <TabsTrigger value="performance" className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
                <Award className="h-4 w-4" />
                <span className="whitespace-nowrap">Performance</span>
              </TabsTrigger>

              <TabsTrigger value="alerts" className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
                <Bell className="h-4 w-4" />
                <span className="whitespace-nowrap">Alerts</span>
              </TabsTrigger>

              <TabsTrigger value="security" className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
                <ShieldCheck className="h-4 w-4" />
                <span className="whitespace-nowrap">Security</span>
              </TabsTrigger>

              <TabsTrigger value="logs" className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
                <FileText className="h-4 w-4" />
                <span className="whitespace-nowrap">Logs Report</span>
              </TabsTrigger>

              <TabsTrigger value="analytics" className="justify-start gap-3 px-4 py-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
                <BarChart3 className="h-4 w-4" />
                <span className="whitespace-nowrap">Analytics</span>
              </TabsTrigger>
            </TabsList>
          </aside>

          <main className="flex-1 min-w-0 overflow-y-auto pr-2 scrollbar-hide">
            <TabsContent value="directory" className="mt-0 focus-visible:outline-none">
              {canSeeRestricted && <StaffDirectoryTab />}
            </TabsContent>

            <TabsContent value="details" className="mt-0 focus-visible:outline-none">
              <PersonalDetailsTab />
            </TabsContent>

            <TabsContent value="preferences" className="mt-0 focus-visible:outline-none">
              <PreferencesTab />
            </TabsContent>

            <TabsContent value="alerts" className="mt-0 focus-visible:outline-none">
              <AlertsTab />
            </TabsContent>

            <TabsContent value="security" className="mt-0 focus-visible:outline-none">
              <SecurityTab />
            </TabsContent>

            <TabsContent value="schedules" className="mt-0 focus-visible:outline-none">
              <SchedulesTab />
            </TabsContent>

            <TabsContent value="payroll" className="mt-0 focus-visible:outline-none">
              <PayrollTab />
            </TabsContent>

            <TabsContent value="leave" className="mt-0 focus-visible:outline-none">
              <LeaveTab />
            </TabsContent>

            <TabsContent value="performance" className="mt-0 focus-visible:outline-none">
              <PerformanceTab />
            </TabsContent>

            <TabsContent value="attendance" className="mt-0 focus-visible:outline-none">
              <AttendanceTab />
            </TabsContent>

            <TabsContent value="logs" className="mt-0 focus-visible:outline-none">
              <LogsReportTab />
            </TabsContent>

            <TabsContent value="analytics" className="mt-0 focus-visible:outline-none">
              <StaffAnalyticsTab />
            </TabsContent>
          </main>
        </div>
      </Tabs>
    </MainLayout>
  );
};

export default StaffManagement;
