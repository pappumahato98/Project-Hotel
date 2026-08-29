import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { queryKeys } from "@/lib/queryKeys";

export interface GuestMessage {
  id: string;
  guest_id: string;
  room_id: string | null;
  sender_name: string | null;
  message_text: string;
  message_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  guests?: { first_name: string; last_name: string; id: string } | null;
  rooms?: { room_number: string } | null;
}

export const useGuestMessages = () => {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: queryKeys.guests.messages,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("guest_messages")
        .select(`*, guests (first_name, last_name, id), rooms (room_number)`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as GuestMessage[];
    },
  });

  const createMessage = useMutation({
    mutationFn: async (message: {
      guest_id: string;
      sender_name: string;
      message_text: string;
      message_type: string;
      room_id?: string;
    }) => {
      const { data, error } = await (supabase as any)
        .from("guest_messages")
        .insert([message])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.messages });
      toast.success("Message recorded for guest");
    },
  });

  const updateMessageStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await (supabase as any)
        .from("guest_messages")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.messages });
    },
  });

  return {
    messages,
    isLoading,
    createMessage,
    updateMessageStatus
  };
};
