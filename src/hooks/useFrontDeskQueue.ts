import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface QueueEntry {
  id: string;
  guest_id: string | null;
  reservation_id: string | null;
  guest_name: string;
  requested_room_type: string;
  priority: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  guests?: { first_name: string; last_name: string } | null;
  reservations?: { reservation_code: string } | null;
}

export const useFrontDeskQueue = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ["front_desk_queue"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("front_desk_queue")
        .select(`*, guests (first_name, last_name), reservations (reservation_code)`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as QueueEntry[];
    },
  });

  const addToQueue = useMutation({
    mutationFn: async (entry: {
      guest_name: string;
      requested_room_type: string;
      priority: string;
      notes: string;
      guest_id?: string;
      reservation_id?: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from("front_desk_queue")
        .insert([entry])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["front_desk_queue"] });
      toast({ title: "Guest added to queue" });
    },
  });

  const updateQueueStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await (supabase as any)
        .from("front_desk_queue")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["front_desk_queue"] });
    },
  });

  const deleteFromQueue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("front_desk_queue")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["front_desk_queue"] });
    },
  });

  return {
    queue,
    isLoading,
    addToQueue,
    updateQueueStatus,
    deleteFromQueue
  };
};
