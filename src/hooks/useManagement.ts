import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ManagementKPIs {
  occupancy: number;
  adr: number;
  revpar: number;
  totalRevenue: number;
  roomRevenue: number;
  fbRevenue: number;
  otherRevenue: number;
  marketSegmentation: { name: string; value: number }[];
  guestMovement: { label: string; count: number }[];
  comparisons: {
    yesterday: Partial<ManagementKPIs>;
    lastYear: Partial<ManagementKPIs>;
    budget: Partial<ManagementKPIs>;
  };
}

export const useManagement = (date: Date = new Date()) => {
  const dateStr = date.toISOString().split("T")[0];

  return useQuery({
    queryKey: ["management_kpis", dateStr],
    queryFn: async () => {
      // 1. Fetch Reservations for segmentation and revenue
      const { data: reservations, error: resError } = await (supabase as any)
        .from("reservations")
        .select(`
          id, total_amount, check_in_date, check_out_date, status,
          market_segment, is_walk_in, is_complimentary, no_show_at
        `);
      if (resError) throw resError;

      // 2. Fetch Rooms for occupancy metrics
      const { data: rooms, error: roomsError } = await (supabase as any)
        .from("rooms")
        .select("id, status, is_out_of_order, is_under_maintenance");
      if (roomsError) throw roomsError;

      // 3. Fetch POS transactions for F&B revenue
      const { data: posTrans, error: posError } = await (supabase as any)
        .from("pos_transactions")
        .select("total, created_at");
      if (posError) throw posError;

      // Calculate Today's Stats
      const todayRes = reservations.filter((r: any) => r.check_in_date === dateStr || (r.status === 'checked_in' && r.check_in_date <= dateStr && r.check_out_date > dateStr));
      const confirmedToday = todayRes.filter((r: any) => r.status !== 'cancelled');

      const totalRooms = rooms.length;
      const oooRooms = rooms.filter((r: any) => r.is_out_of_order || r.status === 'out_of_order').length;
      const roomsAvailable = totalRooms - oooRooms;
      const roomsSold = confirmedToday.length;

      const houseOccupancy = totalRooms > 0 ? (roomsSold / totalRooms) * 100 : 0;
      const roomRevenue = confirmedToday.reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0);
      const adr = roomsSold > 0 ? roomRevenue / roomsSold : 0;
      const revpar = totalRooms > 0 ? roomRevenue / totalRooms : 0;

      const fbRevenue = posTrans
        .filter((t: any) => t.created_at.startsWith(dateStr))
        .reduce((sum: number, t: any) => sum + (t.total || 0), 0);

      // Market Segmentation
      const segments: Record<string, number> = {};
      confirmedToday.forEach((r: any) => {
        const seg = r.market_segment || 'Other';
        segments[seg] = (segments[seg] || 0) + 1;
      });

      // Guest Movement
      const movement = {
        arrivals: reservations.filter((r: any) => r.check_in_date === dateStr).length,
        departures: reservations.filter((r: any) => r.check_out_date === dateStr).length,
        noShows: reservations.filter((r: any) => r.no_show_at?.startsWith(dateStr)).length,
        walkIns: confirmedToday.filter((r: any) => r.is_walk_in).length,
      };

      return {
        occupancy: Math.round(houseOccupancy * 10) / 10,
        adr: Math.round(adr * 100) / 100,
        revpar: Math.round(revpar * 100) / 100,
        totalRevenue: roomRevenue + fbRevenue,
        roomRevenue,
        fbRevenue,
        otherRevenue: 0,
        marketSegmentation: Object.entries(segments).map(([name, value]) => ({ name, value })),
        guestMovement: Object.entries(movement).map(([label, count]) => ({ label, count })),
        comparisons: {
          yesterday: {},
          lastYear: {},
          budget: {},
        }
      } as ManagementKPIs;
    },
  });
};
