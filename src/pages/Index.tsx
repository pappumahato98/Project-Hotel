import React from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentBookings } from "@/components/dashboard/RecentBookings";
import { RoomStatusGrid } from "@/components/dashboard/RoomStatusGrid";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { OccupancyBarChart } from "@/components/dashboard/OccupancyBarChart";
import { GuestTrendLineChart } from "@/components/dashboard/GuestTrendLineChart";
import { BedDouble, Users, TrendingUp, CalendarCheck, ShieldAlert, Loader2 } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useIsAdmin } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocalization } from "@/contexts/LocalizationContext";

const Index = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const { isAdmin } = useIsAdmin();
  const { formatDate, formatAmount, t } = useLocalization();

  if (isLoading) {
    return (
      <MainLayout title={t('nav.dashboard')} subtitle={t('dashboard.syncing')}>
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout fixedHeight title={t('nav.dashboard')} subtitle={formatDate(new Date())}>
      <div className="flex flex-col h-full overflow-y-auto pr-2 scrollbar-hide p-4 lg:p-8">
      {/* Security Alert */}
      {isAdmin && stats?.securityAlerts !== undefined && stats.securityAlerts > 0 && (
        <Card className="mb-6 border-destructive/50 bg-destructive/5 animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-destructive flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              {t('dashboard.security_advisory')}
            </CardTitle>
            <Badge variant="destructive">{t('dashboard.action_required')}</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Detected <strong>{stats.securityAlerts}</strong> security-related events in the last 24 hours.
              Please review the audit logs in the Admin Console.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6">
        <MetricCard
          title={t('dashboard.occupancy_rate')}
          value={stats?.occupancyRate || "0%"}
          change="+2.1% from yesterday"
          changeType="positive"
          icon={BedDouble}
          delay={0}
          link="/front-desk"
        />
        <MetricCard
          title={t('dashboard.total_guests')}
          value={stats?.totalGuests || 0}
          change="Registered profiles"
          changeType="neutral"
          icon={Users}
          delay={50}
          link="/guests"
        />
        <MetricCard
          title={t('dashboard.revenue')}
          value={stats?.todayRevenue ? formatAmount(parseFloat(stats.todayRevenue.replace(/[^0-9.-]+/g,""))) : formatAmount(0)}
          change="New revenue streams"
          changeType="positive"
          icon={TrendingUp}
          delay={100}
          link="/finance"
        />
        <MetricCard
          title={t('dashboard.pending_bookings')}
          value={stats?.pendingBookings || 0}
          change="Require confirmation"
          changeType="neutral"
          icon={CalendarCheck}
          delay={150}
          link="/reservations"
        />
      </div>

      {/* Revenue Chart (full width) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 mb-6">
        <RevenueChart />
        <QuickActions />
      </div>

      {/* Bar + Line Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-6">
        <OccupancyBarChart />
        <GuestTrendLineChart />
      </div>

      {/* Bookings & Room Status */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5">
        <RecentBookings />
        <RoomStatusGrid />
      </div>
      </div>
    </MainLayout>
  );
};

export default Index;
