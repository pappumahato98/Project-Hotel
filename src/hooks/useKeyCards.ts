import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

export interface KeyCardLog {
  id: string;
  guest_id: string | null;
  reservation_id: string | null;
  room_id: string | null;
  room_number: string;
  guest_name: string;
  card_number: string;
  action: string;
  reason: string | null;
  issued_by: string | null;
  returned_at: string | null;
  created_at: string;
}

export function useKeyCards() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["key-card-logs"],
    queryFn: async () => {
      const { data, error } = await db
        .from("key_card_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as KeyCardLog[];
    },
  });

  const issueCard = useMutation({
    mutationFn: async (log: Omit<KeyCardLog, "id" | "created_at" | "returned_at">) => {
      const { data, error } = await db.from("key_card_logs").insert({ ...log, action: "issued" }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key-card-logs"] });
      toast.success("Key card issued");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const returnCard = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db
        .from("key_card_logs")
        .update({ returned_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      // Also log a return action
      const original = data as KeyCardLog;
      await db.from("key_card_logs").insert({
        guest_id: original.guest_id,
        reservation_id: original.reservation_id,
        room_id: original.room_id,
        room_number: original.room_number,
        guest_name: original.guest_name,
        card_number: original.card_number,
        action: "returned",
        issued_by: original.issued_by,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key-card-logs"] });
      toast.success("Key card returned");
    },
  });

  const replaceCard = useMutation({
    mutationFn: async ({ oldId, newCardNumber, reason }: { oldId: string; newCardNumber: string; reason: string }) => {
      // Mark old card as replaced
      const { data: old } = await db.from("key_card_logs").select("*").eq("id", oldId).single();
      if (!old) throw new Error("Card not found");
      // Log replacement
      const { error } = await db.from("key_card_logs").insert({
        guest_id: old.guest_id,
        reservation_id: old.reservation_id,
        room_id: old.room_id,
        room_number: old.room_number,
        guest_name: old.guest_name,
        card_number: newCardNumber,
        action: "replaced",
        reason,
        issued_by: old.issued_by,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["key-card-logs"] });
      toast.success("Key card replaced");
    },
  });

  return { ...query, issueCard, returnCard, replaceCard };
}
