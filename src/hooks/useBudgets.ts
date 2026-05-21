import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Budget {
  id: string;
  name: string;
  type: string;
  fiscal_year: number;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lines?: BudgetLine[];
}

export interface BudgetLine {
  id: string;
  budget_id: string;
  account_id: string | null;
  department: string | null;
  period_label: string | null;
  budgeted_amount: number;
  actual_amount: number;
  notes: string | null;
  created_at: string;
}

const db = supabase as any;

export function useBudgets() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["budgets"],
    queryFn: async () => {
      const { data, error } = await db
        .from("budgets")
        .select("*, lines:budget_lines(*)")
        .order("fiscal_year", { ascending: false });
      if (error) throw error;
      return data as Budget[];
    },
  });

  const createBudget = useMutation({
    mutationFn: async ({ lines, ...budget }: Omit<Budget, "id" | "created_at" | "updated_at"> & { lines?: Omit<BudgetLine, "id" | "budget_id" | "created_at">[] }) => {
      const { data: b, error: bErr } = await db.from("budgets").insert(budget).select().single();
      if (bErr) throw bErr;

      if (lines?.length) {
        const lineItems = lines.map(l => ({ ...l, budget_id: b.id }));
        const { error: lErr } = await db.from("budget_lines").insert(lineItems);
        if (lErr) throw lErr;
      }
      return b;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
  });

  const updateBudgetStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await db.from("budgets").update({ status }).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
  });

  return { ...query, createBudget, updateBudgetStatus };
}
