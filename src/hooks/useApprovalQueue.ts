import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ApprovalItem {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  amount: number | null;
  description: string | null;
  requested_by: string | null;
  requested_at: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
}

const db = supabase as any;

export function useApprovalQueue(statusFilter?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["approval-queue", statusFilter],
    queryFn: async () => {
      let q = db.from("approval_queue").select("*").order("requested_at", { ascending: false });
      if (statusFilter) q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as ApprovalItem[];
    },
  });

  const submitForApproval = useMutation({
    mutationFn: async (item: Omit<ApprovalItem, "id" | "created_at" | "requested_at" | "status" | "approved_by" | "approved_at" | "rejection_reason">) => {
      const { data, error } = await db.from("approval_queue").insert(item).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["approval-queue"] }),
  });

  const approveItem = useMutation({
    mutationFn: async ({ id, approvedBy }: { id: string; approvedBy: string }) => {
      const { data, error } = await db
        .from("approval_queue")
        .update({ status: "approved", approved_by: approvedBy, approved_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["approval-queue"] }),
  });

  const rejectItem = useMutation({
    mutationFn: async ({ id, approvedBy, reason }: { id: string; approvedBy: string; reason: string }) => {
      const { data, error } = await db
        .from("approval_queue")
        .update({ status: "rejected", approved_by: approvedBy, approved_at: new Date().toISOString(), rejection_reason: reason })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["approval-queue"] }),
  });

  return { ...query, submitForApproval, approveItem, rejectItem };
}
