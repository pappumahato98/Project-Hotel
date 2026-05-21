import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

export interface WakeUpCall {
  id: string;
  guest_id: string | null;
  reservation_id: string | null;
  room_id: string | null;
  guest_name: string;
  room_number: string;
  call_time: string;
  call_date: string;
  status: string;
  attempts: number;
  completed_at: string | null;
  completed_by: string | null;
  notes: string | null;
  created_at: string;
}

export function useWakeUpCalls() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["wake-up-calls"],
    queryFn: async () => {
      const { data, error } = await db
        .from("wake_up_calls")
        .select("*")
        .order("call_date", { ascending: true })
        .order("call_time", { ascending: true });
      if (error) throw error;
      return data as WakeUpCall[];
    },
  });

  const scheduleCall = useMutation({
    mutationFn: async (call: Omit<WakeUpCall, "id" | "created_at" | "status" | "attempts" | "completed_at" | "completed_by">) => {
      const { data, error } = await db.from("wake_up_calls").insert(call).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wake-up-calls"] });
      toast.success("Wake-up call scheduled");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCallStatus = useMutation({
    mutationFn: async ({ id, status, completed_by }: { id: string; status: string; completed_by?: string }) => {
      const updates: any = { status };
      if (status === "completed") {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = completed_by;
      }
      if (status === "retry") {
        updates.status = "pending";
        // increment attempts done in SQL
      }
      const { data, error } = await db.from("wake_up_calls").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wake-up-calls"] }),
  });

  const cancelCall = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("wake_up_calls").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wake-up-calls"] });
      toast.success("Wake-up call cancelled");
    },
  });

  return { ...query, scheduleCall, updateCallStatus, cancelCall };
}
