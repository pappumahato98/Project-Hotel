import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export const useInvoices = () => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ["invoices-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("invoices")
        .select("*, guest:guests(first_name, last_name), reservation:reservations(reservation_code)")
        .order("invoice_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  // Realtime subscription for invoices
  useEffect(() => {
    const channel = supabase
      .channel("frontdesk-invoices-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["invoices-list"] });
          queryClient.invalidateQueries({ queryKey: ["guest_folios"] });
          queryClient.invalidateQueries({ queryKey: ["reservations"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["invoices-list"] });
          queryClient.invalidateQueries({ queryKey: ["payments-list"] });
          queryClient.invalidateQueries({ queryKey: ["guest_folios"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

export const usePayments = () => {
  return useQuery({
    queryKey: ["payments-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payments")
        .select("*, guest:guests(first_name, last_name)")
        .order("payment_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });
};

export const useBillingStats = () => {
  return useQuery({
    queryKey: ["billing-stats"],
    queryFn: async () => {
      const [invRes, payRes] = await Promise.all([
        (supabase as any).from("invoices").select("total, status, balance_due"),
        (supabase as any).from("payments").select("amount, status"),
      ]);
      const invoices = invRes.data || [];
      const payments = payRes.data || [];

      const totalRevenue = invoices.reduce((s: number, i: any) => s + (i.total || 0), 0);
      const pendingAmount = invoices
        .filter((i: any) => i.status === "pending" || i.status === "draft")
        .reduce((s: number, i: any) => s + (i.balance_due || 0), 0);
      const pendingCount = invoices.filter((i: any) => i.status === "pending" || i.status === "draft").length;
      const successPayments = payments.filter((p: any) => p.status === "completed").length;
      const totalPayments = payments.length;
      const successRate = totalPayments > 0 ? ((successPayments / totalPayments) * 100).toFixed(1) : "0";

      return { totalRevenue, pendingAmount, pendingCount, successRate };
    },
  });
};
