import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FinancialPeriod {
  id: string;
  name: string;
  period_type: string;
  start_date: string;
  end_date: string;
  fiscal_year: number;
  status: string;
  closed_by: string | null;
  closed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const db = supabase as any;

export function useFinancialPeriods() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["financial-periods"],
    queryFn: async () => {
      const { data, error } = await db
        .from("financial_periods")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as FinancialPeriod[];
    },
  });

  const createPeriod = useMutation({
    mutationFn: async (period: Omit<FinancialPeriod, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await db.from("financial_periods").insert(period).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financial-periods"] }),
  });

  const closePeriod = useMutation({
    mutationFn: async ({ id, closedBy }: { id: string; closedBy: string }) => {
      const { data, error } = await db
        .from("financial_periods")
        .update({ status: "closed", closed_by: closedBy, closed_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["financial-periods"] }),
  });

  return { ...query, createPeriod, closePeriod };
}
