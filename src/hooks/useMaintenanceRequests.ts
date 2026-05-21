import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MaintenanceRequest {
  id: string;
  request_number: string;
  room: string;
  issue: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  assigned_to: string | null;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useMaintenanceRequests = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["maintenance-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("maintenance_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MaintenanceRequest[];
    },
  });

  const createRequest = useMutation({
    mutationFn: async (req: { room: string; issue: string; description: string; priority: string }) => {
      const number = `MNT-${Date.now().toString().slice(-6)}`;
      const { data, error } = await (supabase as any)
        .from("maintenance_requests")
        .insert({ ...req, request_number: number })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
      toast.success("Maintenance request created");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === "completed") update.completed_at = new Date().toISOString();
      const { error } = await (supabase as any)
        .from("maintenance_requests")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return { ...query, createRequest, updateStatus };
};
