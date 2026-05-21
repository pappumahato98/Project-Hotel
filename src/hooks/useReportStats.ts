import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useReportStats = () => {
  return useQuery({
    queryKey: ["report-stats"],
    queryFn: async () => {
      const [resResult, roomResult, posResult, invResult, expResult] = await Promise.all([
        (supabase as any).from("reservations").select("id, status, total_amount, check_in_date").order("check_in_date", { ascending: true }),
        supabase.from("rooms").select("id, status, price_per_night"),
        (supabase as any).from("pos_transactions").select("id, total, created_at"),
        (supabase as any).from("invoices").select("id, total, status, invoice_date"),
        (supabase as any).from("expenses").select("id, amount, status, expense_date"),
      ]);

      const reservations = resResult.data || [];
      const rooms = roomResult.data || [];
      const posTransactions = posResult.data || [];
      const invoices = invResult.data || [];
      const expenses = expResult.data || [];

      const totalRooms = rooms.length;
      const occupiedRooms = rooms.filter((r: any) => r.status === "occupied").length;
      const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

      const totalReservationRevenue = reservations.reduce((sum: number, r: any) => sum + (r.total_amount || 0), 0);
      const totalPOSRevenue = posTransactions.reduce((sum: number, t: any) => sum + (t.total || 0), 0);
      const totalInvoiceRevenue = invoices.reduce((sum: number, i: any) => sum + (i.total || 0), 0);
      const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

      // Monthly aggregation for charts
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const monthStr = String(month).padStart(2, "0");
        const monthReservations = reservations.filter((r: any) => r.check_in_date?.startsWith(`2025-${monthStr}`) || r.check_in_date?.startsWith(`2026-${monthStr}`));
        const monthPOS = posTransactions.filter((t: any) => t.created_at?.includes(`-${monthStr}-`));
        return {
          month: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],
          reservations: monthReservations.length,
          revenue: monthReservations.reduce((s: number, r: any) => s + (r.total_amount || 0), 0),
          posRevenue: monthPOS.reduce((s: number, t: any) => s + (t.total || 0), 0),
        };
      });

      // Revenue by source
      const revenueBySource = [
        { source: "Room Bookings", amount: totalReservationRevenue, color: "hsl(var(--primary))" },
        { source: "Restaurant (POS)", amount: totalPOSRevenue, color: "hsl(var(--success))" },
        { source: "Invoiced", amount: totalInvoiceRevenue, color: "hsl(var(--info))" },
      ].filter(s => s.amount > 0);

      // ADR
      const confirmedRes = reservations.filter((r: any) => r.status === "checked_in" || r.status === "confirmed" || r.status === "checked_out");
      const adr = confirmedRes.length > 0
        ? confirmedRes.reduce((s: number, r: any) => s + (r.total_amount || 0), 0) / confirmedRes.length
        : 0;

      return {
        occupancyRate,
        totalRooms,
        occupiedRooms,
        totalReservationRevenue,
        totalPOSRevenue,
        totalInvoiceRevenue,
        totalExpenses,
        adr,
        monthlyData,
        revenueBySource,
        reservationCount: reservations.length,
        posCount: posTransactions.length,
        invoiceCount: invoices.length,
      };
    },
  });
};
