import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [
        roomsResult,
        guestsCount,
        reservationsResult,
        pendingCount,
        securityCount
      ] = await Promise.all([
        supabase.from("rooms").select("status"),
        supabase.from("guests").select("*", { count: "exact", head: true }),
        supabase.from("reservations").select("total_amount").eq("check_in_date", today),
        supabase.from("reservations").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("audit_log").select("*", { count: "exact", head: true }).or("action.ilike.%fail%,action.ilike.%unauthorized%").gte("created_at", today)
      ]);

      if (roomsResult.error) throw roomsResult.error;
      if (guestsCount.error) throw guestsCount.error;
      if (reservationsResult.error) throw reservationsResult.error;
      if (pendingCount.error) throw pendingCount.error;
      if (securityCount.error) throw securityCount.error;

      const rooms = roomsResult.data || [];
      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter(r => r.status === 'occupied').length;
      const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
      const todayRevenue = (reservationsResult.data || []).reduce((sum, res) => sum + Number(res.total_amount), 0);

      return {
        occupancyRate: `${occupancyRate}%`,
        totalGuests: guestsCount.count || 0,
        todayRevenue: formatCurrency(todayRevenue),
        pendingBookings: pendingCount.count || 0,
        securityAlerts: securityCount.count || 0
      };
    },
    staleTime: 1000 * 60 * 2,
  });
};
